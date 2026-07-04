import express from 'express';
import passport from 'passport';
import authController from '../controllers/authController.js';
import { verifyJWT } from '../middleware/authMiddleware.js';

const router = express.Router();

// ── Google OAuth Routes ──
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: 'http://localhost:3000/login?error=auth_failed', session: false }),
  authController.handleOAuthCallback
);

// ── GitHub OAuth Routes ──
router.get(
  '/github',
  passport.authenticate('github', { scope: ['user:email'], session: false })
);

router.get(
  '/github/callback',
  passport.authenticate('github', { failureRedirect: 'http://localhost:3000/login?error=auth_failed', session: false }),
  authController.handleOAuthCallback
);

// ── Session Profiles & Logouts ──
router.get('/me', verifyJWT, authController.getCurrentUser);
router.post('/logout', authController.logout);

export default router;
