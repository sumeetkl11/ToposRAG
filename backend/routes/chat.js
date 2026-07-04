import express from 'express';
import chatController from '../controllers/chatController.js';
import { chatQuerySchema, validateRequest } from '../schemas/api.js';
import { verifyJWT } from '../middleware/authMiddleware.js';

const router = express.Router();

// Enforce authentication on all chat endpoints
router.use(verifyJWT);

// Semantic search and RAG answering endpoint
router.post('/query', validateRequest(chatQuerySchema, 'body'), chatController.queryRepository);

export default router;
