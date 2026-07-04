import fs from 'fs';
import path from 'path';
import queries from '../db/queries.js';
import { parseRepository } from '../services/scanner.js';

/**
 * Handles repository registration and ingestion triggering.
 */
export async function ingestRepository(req, res, next) {
  console.log('[Ingest] ► POST /api/ingest received');
  console.log('[Ingest]   Body:', JSON.stringify(req.body));
  try {
    const { name, rootPath, gitBranch, commitHash } = req.body;
    const userId = req.user.id;

    console.log(`[Ingest] Checking path exists: "${rootPath}"`);
    // Verify local directory path exists
    if (!fs.existsSync(rootPath)) {
      console.error(`[Ingest] ✗ Path not found: ${rootPath}`);
      return res.status(404).json({
        success: false,
        error: 'Directory not found',
        message: `The absolute directory path "${rootPath}" does not exist on this machine.`
      });
    }

    const stat = fs.statSync(rootPath);
    if (!stat.isDirectory()) {
      console.error(`[Ingest] ✗ Path is a file, not a directory: ${rootPath}`);
      return res.status(400).json({
        success: false,
        error: 'Invalid path',
        message: `The path "${rootPath}" is a file, not a directory.`
      });
    }

    // Path constraints and checks to prevent arbitrary filesystem traversal
    const absolutePath = path.resolve(rootPath);
    const workspacePath = path.resolve(process.cwd());
    const homePath = process.env.USERPROFILE || process.env.HOME || '';
    const isWithinWorkspace = absolutePath.startsWith(workspacePath);
    const isWithinHome = homePath ? absolutePath.startsWith(path.resolve(homePath)) : false;

    if (!isWithinWorkspace && !isWithinHome) {
      console.error(`[Ingest] ✗ Path security restriction triggered for path: ${absolutePath}`);
      return res.status(403).json({
        success: false,
        error: 'Access Denied',
        message: 'Security policy restriction: you are only allowed to scan repositories that are within your home directory or current workspace path.'
      });
    }

    console.log(`[Ingest] ✓ Path valid, inserting into DB...`);

    // Upsert into Neon DB
    const repo = await queries.insertRepository(
      name,
      absolutePath,
      gitBranch || 'main',
      commitHash || '',
      userId
    );
    console.log(`[Ingest] ✓ Repository inserted/updated: ${repo.id} ("${repo.name}")`);

    // Trigger background scanner ingestion asynchronously
    console.log(`[Ingest] ► Launching background scanner for repo ${repo.id}...`);
    parseRepository(repo.id, repo.root_path).catch((err) => {
      console.error('[Scanner] ✗ Background ingestion failed:', err.message);
    });

    return res.status(200).json({
      success: true,
      message: 'Repository registered successfully.',
      repository: repo
    });
  } catch (error) {
    console.error('[Ingest] ✗ Unexpected error:', error.message);
    next(error);
  }
}

/**
 * Lists all registered codebases from Neon DB.
 */
export async function listRepositories(req, res, next) {
  try {
    const repos = await queries.listRepositories(req.user.id);
    return res.status(200).json({
      success: true,
      repositories: repos
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Gets specific codebase registry details by id.
 */
export async function getRepositoryDetails(req, res, next) {
  try {
    const { repositoryId } = req.params;
    const repo = await queries.getRepositoryById(repositoryId, req.user.id);
    if (!repo) {
      return res.status(404).json({
        success: false,
        error: 'Repository not found',
        message: `No repository found with ID: ${repositoryId}`
      });
    }

    // Retrieve files associated with the repository
    const files = await queries.getRepositoryFiles(repositoryId);

    return res.status(200).json({
      success: true,
      repository: repo,
      filesCount: files.length,
      files: files
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Deletes a registered codebase, cascading down to all code chunks and relations.
 */
export async function deleteRepository(req, res, next) {
  try {
    const { repositoryId } = req.params;
    const repo = await queries.getRepositoryById(repositoryId, req.user.id);
    if (!repo) {
      return res.status(404).json({
        success: false,
        error: 'Repository not found',
        message: `Cannot delete repository. ID: ${repositoryId} not found.`
      });
    }

    const deletedRepo = await queries.deleteRepository(repositoryId, req.user.id);
    return res.status(200).json({
      success: true,
      message: `Repository "${deletedRepo.name}" and all associated metadata deleted successfully.`,
      repository: deletedRepo
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Gets dependency edges for graph visualization in frontend.
 */
export async function getRepositoryGraph(req, res, next) {
  try {
    const { repositoryId } = req.params;
    const repo = await queries.getRepositoryById(repositoryId, req.user.id);
    if (!repo) {
      return res.status(404).json({
        success: false,
        error: 'Repository not found',
        message: `No repository found with ID: ${repositoryId}`
      });
    }

    const edges = await queries.getRepositoryDependencies(repositoryId);
    return res.status(200).json({
      success: true,
      repositoryId: repositoryId,
      edgesCount: edges.length,
      edges: edges
    });
  } catch (error) {
    next(error);
  }
}

export default {
  ingestRepository,
  listRepositories,
  getRepositoryDetails,
  deleteRepository,
  getRepositoryGraph
};
