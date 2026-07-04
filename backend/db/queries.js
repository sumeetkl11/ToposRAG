import db from './index.js';

/**
 * Inserts a new repository registry record.
 * @param {string} name - Repository name
 * @param {string} rootPath - Absolute path to repository root
 * @param {string} gitBranch - Currently checked-out branch name
 * @param {string} commitHash - Current commit SHA hash
 * @returns {Promise<Object>} The inserted repository record
 */
export async function insertRepository(name, rootPath, gitBranch = null, commitHash = null, userId = null) {
  const checkSql = `SELECT * FROM repositories WHERE root_path = $1 AND user_id = $2;`;
  const existing = await db.query(checkSql, [rootPath, userId]);
  if (existing.rows.length > 0) {
    const updateSql = `
      UPDATE repositories 
      SET name = $1, git_branch = $2, commit_hash = $3, updated_at = NOW()
      WHERE root_path = $4 AND user_id = $5
      RETURNING *;
    `;
    const res = await db.query(updateSql, [name, gitBranch, commitHash, rootPath, userId]);
    return res.rows[0];
  }

  const sql = `
    INSERT INTO repositories (name, root_path, git_branch, commit_hash, user_id, updated_at)
    VALUES ($1, $2, $3, $4, $5, NOW())
    RETURNING *;
  `;
  const res = await db.query(sql, [name, rootPath, gitBranch, commitHash, userId]);
  return res.rows[0];
}

/**
 * Gets a repository by its unique identifier.
 * @param {string} repositoryId 
 * @returns {Promise<Object|null>}
 */
export async function getRepositoryById(repositoryId, userId = null) {
  const sql = `SELECT * FROM repositories WHERE id = $1 AND user_id = $2;`;
  const res = await db.query(sql, [repositoryId, userId]);
  return res.rows[0] || null;
}

/**
 * Lists all registered repositories.
 * @returns {Promise<Array>}
 */
export async function listRepositories(userId = null) {
  const sql = `SELECT * FROM repositories WHERE user_id = $1 ORDER BY updated_at DESC;`;
  const res = await db.query(sql, [userId]);
  return res.rows;
}

/**
 * Inserts or updates file metadata inside a repository.
 * @param {string} repositoryId - Owner repository UUID
 * @param {string} filePath - Path relative to repository root
 * @param {string} language - Programming language parsed
 * @param {string} checksum - File content SHA-256 hash
 * @param {number} sizeBytes - Size of file in bytes
 * @returns {Promise<Object>}
 */
export async function insertFile(repositoryId, filePath, language, checksum, sizeBytes) {
  const sql = `
    INSERT INTO files (repository_id, file_path, language, checksum, size_bytes, last_modified)
    VALUES ($1, $2, $3, $4, $5, NOW())
    ON CONFLICT (repository_id, file_path) DO UPDATE
    SET language = $3, checksum = $4, size_bytes = $5, last_modified = NOW()
    RETURNING *;
  `;
  const res = await db.query(sql, [repositoryId, filePath, language, checksum, sizeBytes]);
  return res.rows[0];
}

/**
 * Inserts a semantic chunk of code text.
 * @param {string} repositoryId 
 * @param {string} fileId 
 * @param {number} chunkIndex 
 * @param {string} content 
 * @param {number} tokenCount 
 * @param {number} lineStart 
 * @param {number} lineEnd 
 * @param {Object} metadata 
 * @returns {Promise<Object>}
 */
export async function insertChunk(repositoryId, fileId, chunkIndex, content, tokenCount, lineStart, lineEnd, metadata = {}) {
  const sql = `
    INSERT INTO chunks (repository_id, file_id, chunk_index, content, token_count, line_start, line_end, metadata)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *;
  `;
  const res = await db.query(sql, [
    repositoryId,
    fileId,
    chunkIndex,
    content,
    tokenCount,
    lineStart,
    lineEnd,
    JSON.stringify(metadata)
  ]);
  return res.rows[0];
}

/**
 * Updates the vector embedding of a specific chunk.
 * @param {string} chunkId - Chunk UUID
 * @param {Array<number>} embedding - 768-dimension array representing vector
 * @returns {Promise<Object>}
 */
export async function updateEmbedding(chunkId, embedding) {
  // Convert float array to PostgreSQL vector representation string '[0.1, 0.2, ...]'
  const vectorStr = `[${embedding.join(',')}]`;
  const sql = `
    UPDATE chunks
    SET embedding = $2
    WHERE id = $1
    RETURNING *;
  `;
  const res = await db.query(sql, [chunkId, vectorStr]);
  return res.rows[0];
}

/**
 * Performs Cosine Similarity Vector Search over indexed chunks in a repository.
 * @param {string} repositoryId 
 * @param {Array<number>} queryEmbedding - 768 float array
 * @param {number} limit - Maximum results (default 10)
 * @returns {Promise<Array>} Chunks with file metadata and similarity scores
 */
export async function searchRelevantCode(repositoryId, queryEmbedding, limit = 10) {
  const vectorStr = `[${queryEmbedding.join(',')}]`;
  const sql = `
    SELECT 
      c.id, 
      c.chunk_index, 
      c.content, 
      c.line_start, 
      c.line_end, 
      c.metadata,
      f.file_path, 
      f.language,
      (1 - (c.embedding <=> $2)) as similarity
    FROM chunks c
    JOIN files f ON c.file_id = f.id
    WHERE c.repository_id = $1 AND c.embedding IS NOT NULL
    ORDER BY c.embedding <=> $2
    LIMIT $3;
  `;
  const res = await db.query(sql, [repositoryId, vectorStr, limit]);
  return res.rows;
}

/**
 * Retrieves all file paths and sizes tracked inside a repository.
 * @param {string} repositoryId 
 * @returns {Promise<Array>}
 */
export async function getRepositoryFiles(repositoryId) {
  const sql = `SELECT * FROM files WHERE repository_id = $1 ORDER BY file_path ASC;`;
  const res = await db.query(sql, [repositoryId]);
  return res.rows;
}

/**
 * Deletes a repository and all corresponding files, chunks, and relations cascadingly.
 * @param {string} repositoryId 
 * @returns {Promise<Object>} Deleted repository record
 */
export async function deleteRepository(repositoryId, userId = null) {
  const sql = `DELETE FROM repositories WHERE id = $1 AND user_id = $2 RETURNING *;`;
  const res = await db.query(sql, [repositoryId, userId]);
  return res.rows[0];
}

/**
 * Inserts a directed codebase dependency edge.
 * @param {string} repositoryId 
 * @param {string} sourceFileId 
 * @param {string} targetFileId 
 * @param {string} relationshipType - IMPORTS, EXPORTS, CALLS, etc.
 * @returns {Promise<Object>}
 */
export async function insertDependencyEdge(repositoryId, sourceFileId, targetFileId, relationshipType) {
  const sql = `
    INSERT INTO dependency_edges (repository_id, source_file, target_file, relationship_type)
    VALUES ($1, $2, $3, $4)
    RETURNING *;
  `;
  const res = await db.query(sql, [repositoryId, sourceFileId, targetFileId, relationshipType]);
  return res.rows[0];
}

/**
 * Gets all dependency edges in a repository for graphing.
 * @param {string} repositoryId 
 * @returns {Promise<Array>}
 */
export async function getRepositoryDependencies(repositoryId) {
  const sql = `
    SELECT 
      de.id, 
      de.relationship_type,
      de.source_file,
      de.target_file,
      fs.file_path as source_path, 
      ft.file_path as target_path
    FROM dependency_edges de
    JOIN files fs ON de.source_file = fs.id
    JOIN files ft ON de.target_file = ft.id
    WHERE de.repository_id = $1;
  `;
  const res = await db.query(sql, [repositoryId]);
  return res.rows;
}

export default {
  insertRepository,
  getRepositoryById,
  listRepositories,
  insertFile,
  insertChunk,
  updateEmbedding,
  searchRelevantCode,
  getRepositoryFiles,
  deleteRepository,
  insertDependencyEdge,
  getRepositoryDependencies
};
