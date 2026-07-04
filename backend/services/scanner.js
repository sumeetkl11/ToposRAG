import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';
import queries from '../db/queries.js';
import db from '../db/index.js';

const IGNORED_DIRS = ['node_modules', '.git', '.next', 'dist', 'build', 'coverage', 'out', 'vendor', 'target'];
const SUPPORTED_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.py', '.go'];

// Helper to initialize Google Gen AI
function getAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return null;
  }
  return new GoogleGenAI({ apiKey });
}

/**
 * Asynchronously traverses directory recursively with strict path policy and limits.
 */
async function scanDirectoryAsync(dir, fileList = [], stats = { totalBytes: 0, fileCount: 0 }) {
  const MAX_FILE_COUNT = 1000;
  const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB max per file
  const MAX_TOTAL_BYTES = 50 * 1024 * 1024; // 50MB max total codebase size

  const files = await fs.promises.readdir(dir);
  for (const file of files) {
    if (stats.fileCount > MAX_FILE_COUNT) {
      throw new Error(`Ingestion limit exceeded: Maximum allowed file count is ${MAX_FILE_COUNT}.`);
    }
    if (stats.totalBytes > MAX_TOTAL_BYTES) {
      throw new Error(`Ingestion limit exceeded: Maximum allowed codebase size is 50MB.`);
    }

    const fullPath = path.join(dir, file);
    if (IGNORED_DIRS.includes(file)) continue;

    try {
      const stat = await fs.promises.stat(fullPath);
      if (stat.isDirectory()) {
        await scanDirectoryAsync(fullPath, fileList, stats);
      } else {
        const ext = path.extname(file).toLowerCase();
        if (SUPPORTED_EXTENSIONS.includes(ext)) {
          if (stat.size > MAX_FILE_SIZE) {
            console.warn(`[Scanner] Skipping large file: ${fullPath} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
            continue;
          }
          fileList.push({
            fullPath,
            sizeBytes: stat.size
          });
          stats.fileCount += 1;
          stats.totalBytes += stat.size;
        }
      }
    } catch (err) {
      console.warn(`[Scanner] Warning: Could not access ${fullPath} - ${err.message}`);
    }
  }
  return fileList;
}

/**
 * Redacts typical secrets (API keys, connection strings, tokens) from code content
 * before chunking, embedding, or storing.
 */
function redactSecrets(text) {
  const secretRegex = /(apiKey|api_key|token|password|passwd|secret|jwt_secret|client_secret|database_url|connectionstring)\s*[:=]\s*['"`]([^\n'"`]{8,})['"`]/gi;
  return text.replace(secretRegex, (match, key, val) => {
    return `${key}: '[REDACTED_SECRET]'`;
  });
}

/**
 * Split code contents into chunks by line blocks.
 */
function chunkContent(content, maxChunkChars = 1500) {
  const lines = content.split('\n');
  const chunks = [];
  let currentChunk = [];
  let currentLength = 0;
  let startLine = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    currentChunk.push(line);
    currentLength += line.length + 1;

    if (currentLength >= maxChunkChars || i === lines.length - 1) {
      chunks.push({
        content: currentChunk.join('\n'),
        lineStart: startLine,
        lineEnd: i + 1
      });
      currentChunk = [];
      currentLength = 0;
      startLine = i + 2;
    }
  }
  return chunks;
}

/**
 * Parses import lines from JS/TS code.
 */
function parseImports(content) {
  const imports = [];
  // Match ES6 imports: import ... from './path'
  const importRegex = /import\s+.*?\s+from\s+['"](.*?)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }

  // Match require: require('./path')
  const requireRegex = /require\(['"](.*?)['"]\)/g;
  while ((match = requireRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  return imports;
}

/**
 * Helper to execute list of async tasks with a limit on concurrent executions.
 */
async function runWithConcurrencyLimit(tasks, limit = 5) {
  const executing = new Set();
  for (const task of tasks) {
    const p = Promise.resolve().then(() => task());
    executing.add(p);
    const clean = () => executing.delete(p);
    p.then(clean, clean);
    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }
  return Promise.all(executing);
}

/**
 * Helper to query content embedding with exponential backoff retries.
 */
async function embedWithRetry(ai, chunkContent, retries = 3, delay = 1000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const embedRes = await ai.models.embedContent({
        model: 'text-embedding-004',
        contents: chunkContent
      });
      return embedRes.embedding?.values || null;
    } catch (err) {
      if (attempt === retries) throw err;
      const backoffDelay = delay * Math.pow(2, attempt - 1);
      console.warn(`[Scanner] Embedding attempt ${attempt} failed. Retrying in ${backoffDelay}ms... Error: ${err.message}`);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
    }
  }
  return null;
}

/**
 * Orchestrates async repository file structure scanning, idempotence checking,
 * AST dependency resolution, chunking, and concurrent vector indexing.
 */
export async function parseRepository(repositoryId, rootPath) {
  console.log(`[Scanner] Starting repository ingestion on: ${rootPath}`);
  
  // 1. Traverse files asynchronously (non-blocking)
  const filesList = await scanDirectoryAsync(rootPath);
  console.log(`[Scanner] Traversed codebase. Found ${filesList.length} files to audit.`);
  
  const ai = getAIClient();
  if (!ai) {
    console.warn('[Scanner] [WARNING]: Gemini API key is missing. Skipping vector embedding steps.');
  }

  // 2. Fetch existing files from Neon DB to check hashes (idempotence)
  const existingFilesList = await queries.getRepositoryFiles(repositoryId);
  const dbFilesByPath = new Map(existingFilesList.map(f => [f.file_path, f]));
  const processedPaths = new Set();
  const dbFilesMap = new Map();

  const embeddingTasks = [];

  // 3. Process discovered files
  for (const { fullPath, sizeBytes } of filesList) {
    try {
      const relativePath = path.relative(rootPath, fullPath).replace(/\\/g, '/');
      processedPaths.add(relativePath);

      const rawContent = await fs.promises.readFile(fullPath, 'utf8');
      
      // Safety step: redact secrets before any storage or API calls
      const cleanContent = redactSecrets(rawContent);
      const checksum = crypto.createHash('sha256').update(cleanContent).digest('hex');
      const ext = path.extname(fullPath).toLowerCase().substring(1);
      const language = ext === 'py' ? 'python' : ext === 'go' ? 'go' : ext;

      const existingFile = dbFilesByPath.get(relativePath);
      let dbFile = null;

      // Idempotency Check: if checksum matches, skip parser & embedding steps!
      if (existingFile && existingFile.checksum === checksum) {
        console.log(`[Scanner] IDEMPOTENT: File unchanged. Skipping re-index for: ${relativePath}`);
        dbFile = existingFile;
        dbFilesMap.set(relativePath, { dbFile, content: cleanContent });
        continue;
      }

      // If file has changed or is new, upsert metadata
      console.log(`[Scanner] INDEXING: File changed or new. Processing: ${relativePath}`);
      dbFile = await queries.insertFile(repositoryId, relativePath, language, checksum, sizeBytes);
      dbFilesMap.set(relativePath, { dbFile, content: cleanContent });

      // Clean up stale chunks associated with this file to prevent duplicate chunk cluttering
      if (existingFile) {
        await db.query('DELETE FROM chunks WHERE file_id = $1;', [dbFile.id]);
      }

      // Generate line-bounded code chunks
      const chunks = chunkContent(cleanContent);
      for (let idx = 0; idx < chunks.length; idx++) {
        const chunk = chunks[idx];
        const tokenCount = Math.ceil(chunk.content.length / 4);

        // Store code chunk text
        const dbChunk = await queries.insertChunk(
          repositoryId,
          dbFile.id,
          idx,
          chunk.content,
          tokenCount,
          chunk.lineStart,
          chunk.lineEnd,
          { language, path: relativePath }
        );

        // Queue concurrent embedding task
        if (ai) {
          embeddingTasks.push(async () => {
            try {
              const embedding = await embedWithRetry(ai, chunk.content);
              if (embedding) {
                await queries.updateEmbedding(dbChunk.id, embedding);
              }
            } catch (err) {
              console.error(`[Scanner] Failed to embed chunk ${idx} for ${relativePath}:`, err.message);
            }
          });
        }
      }
    } catch (err) {
      console.error(`[Scanner] Failed to parse file ${fullPath}:`, err.message);
    }
  }

  // 4. Clean up deleted files (files present in DB but deleted in host directory)
  for (const [relPath, fileRecord] of dbFilesByPath.entries()) {
    if (!processedPaths.has(relPath)) {
      console.log(`[Scanner] DELETED: File no longer exists. Removing index for: ${relPath}`);
      await db.query('DELETE FROM files WHERE id = $1;', [fileRecord.id]);
    }
  }

  // 5. Execute vector embedding generation in parallel (max 5 concurrent calls)
  if (embeddingTasks.length > 0) {
    console.log(`[Scanner] Dispatching ${embeddingTasks.length} parallel embedding tasks (concurrency limit = 5)...`);
    await runWithConcurrencyLimit(embeddingTasks, 5);
    console.log('[Scanner] All embedding tasks finished.');
  }

  // 6. Build dependency import mapping (avoid duplicate edges)
  console.log('[Scanner] Building codebase import relationships...');
  for (const [sourcePath, { dbFile, content }] of dbFilesMap.entries()) {
    const imports = parseImports(content);
    const sourceDir = path.dirname(sourcePath);

    for (const importRef of imports) {
      if (importRef.startsWith('.')) {
        let resolvedPath = path.posix.join(sourceDir, importRef);
        
        let foundTarget = null;
        for (const targetPath of dbFilesMap.keys()) {
          const targetWithoutExt = targetPath.replace(/\.[^/.]+$/, "");
          if (targetWithoutExt === resolvedPath || targetPath === resolvedPath) {
            foundTarget = dbFilesMap.get(targetPath).dbFile;
            break;
          }
          if (resolvedPath + '/index' === targetWithoutExt) {
            foundTarget = dbFilesMap.get(targetPath).dbFile;
            break;
          }
        }

        if (foundTarget) {
          try {
            // Deduplicate: verify that the relationship edge does not exist before writing
            const edgeCheck = await db.query(
              'SELECT id FROM dependency_edges WHERE repository_id = $1 AND source_file = $2 AND target_file = $3 AND relationship_type = $4;',
              [repositoryId, dbFile.id, foundTarget.id, 'IMPORTS']
            );
            if (edgeCheck.rows.length === 0) {
              await queries.insertDependencyEdge(
                repositoryId,
                dbFile.id,
                foundTarget.id,
                'IMPORTS'
              );
            }
          } catch (err) {
            console.error('[Scanner] Failed to write import relationship edge:', err.message);
          }
        }
      }
    }
  }

  console.log(`[Scanner] Ingestion completed successfully for repository: ${repositoryId}`);
}

export default {
  parseRepository
};
