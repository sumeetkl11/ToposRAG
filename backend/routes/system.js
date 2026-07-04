import express from 'express';
import { getSystemInfo, getSystemStats } from '../controllers/systemController.js';
import { verifyJWT } from '../middleware/authMiddleware.js';

const router = express.Router();

// Enforce authentication on all system endpoints
router.use(verifyJWT);

// Fetch dynamic system metadata and Neon database statuses
router.get('/info', getSystemInfo);
router.get('/stats', getSystemStats);

export default router;
