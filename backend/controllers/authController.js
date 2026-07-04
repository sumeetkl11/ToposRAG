import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import jwt from 'jsonwebtoken';
import db from '../db/index.js';

// Helper to upsert OAuth user profiles in the Neon database
async function findOrCreateOAuthUser(email, name, provider, providerId) {
  // Try to find the user by provider credentials
  const checkProviderRes = await db.query(
    'SELECT * FROM users WHERE auth_provider = $1 AND provider_id = $2;',
    [provider, providerId]
  );
  if (checkProviderRes.rows.length > 0) {
    return checkProviderRes.rows[0];
  }

  // Try to find the user by email
  const checkEmailRes = await db.query(
    'SELECT * FROM users WHERE email = $1;',
    [email]
  );
  if (checkEmailRes.rows.length > 0) {
    const existingUser = checkEmailRes.rows[0];
    // Update existing user with provider link info
    const updateRes = await db.query(
      'UPDATE users SET auth_provider = $1, provider_id = $2 WHERE id = $3 RETURNING *;',
      [provider, providerId, existingUser.id]
    );
    return updateRes.rows[0];
  }

  // Create new user
  const insertRes = await db.query(
    'INSERT INTO users (email, name, auth_provider, provider_id) VALUES ($1, $2, $3, $4) RETURNING *;',
    [email, name || 'User', provider, providerId]
  );
  return insertRes.rows[0];
}

// ── Google OAuth Strategy Configuration ──
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: 'http://localhost:5000/api/auth/google/callback',
        state: true
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value || '';
          const name = profile.displayName || profile.name?.givenName || '';
          const providerId = profile.id;

          if (!email) {
            return done(new Error('Google profile does not contain an email address'));
          }

          const user = await findOrCreateOAuthUser(email, name, 'google', providerId);
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );
} else {
  console.warn('[Passport] Google OAuth is disabled (client credentials missing in .env)');
}

// ── GitHub OAuth Strategy Configuration ──
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: 'http://localhost:5000/api/auth/github/callback',
        scope: ['user:email'],
        state: true
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value || '';
          const name = profile.displayName || profile.username || '';
          const providerId = profile.id;

          if (!email) {
            return done(new Error('GitHub profile does not contain an email address'));
          }

          const user = await findOrCreateOAuthUser(email, name, 'github', providerId);
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );
} else {
  console.warn('[Passport] GitHub OAuth is disabled (client credentials missing in .env)');
}

/**
 * Common handler to process OAuth successes, set HttpOnly cookies, and redirect
 */
function handleOAuthCallback(req, res) {
  const user = req.user;
  if (!user) {
    return res.redirect('http://localhost:3000/login?error=auth_failed');
  }

  // Generate session token
  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    process.env.JWT_SECRET || 'topos_rag_session_secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  // Set the token inside HttpOnly secure session cookie
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  // Redirect client back to frontend dashboard
  res.redirect('http://localhost:3000/');
}

export default {
  handleOAuthCallback,
  
  // Get active session metadata
  getCurrentUser: (req, res) => {
    return res.status(200).json({
      success: true,
      user: req.user
    });
  },

  // Log user sessions out
  logout: (req, res) => {
    res.clearCookie('token');
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully.'
    });
  }
};
