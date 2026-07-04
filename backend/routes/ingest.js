import express from 'express';
import ingestController from '../controllers/ingestController.js';
import { ingestRepoSchema, repositoryIdSchema, validateRequest } from '../schemas/api.js';
import { verifyJWT } from '../middleware/authMiddleware.js';

const router = express.Router();

// Enforce authentication on all ingestion endpoints
router.use(verifyJWT);

// Register and trigger repository scanner
router.post('/', validateRequest(ingestRepoSchema, 'body'), ingestController.ingestRepository);

// List all registered repositories
router.get('/', ingestController.listRepositories);

// Get specific repository metadata and files list
router.get('/:repositoryId', validateRequest(repositoryIdSchema, 'params'), ingestController.getRepositoryDetails);

// Delete specific repository metadata and tables cascadingly
router.delete('/:repositoryId', validateRequest(repositoryIdSchema, 'params'), ingestController.deleteRepository);

// Get dependency edges for React Flow visualization graph
router.get('/:repositoryId/graph', validateRequest(repositoryIdSchema, 'params'), ingestController.getRepositoryGraph);

export default router;
