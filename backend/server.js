import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import session from 'express-session';

import db from './db/index.js';
import ingestRouter from './routes/ingest.js';
import chatRouter from './routes/chat.js';
import authRouter from './routes/auth.js';
import systemRouter from './routes/system.js';

// Resolve paths for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from backend/.env
dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// Apply Middlewares
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Basic Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
app.use(session({
  secret: process.env.JWT_SECRET || 'topos_rag_session_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 10 * 60 * 1000 // 10 mins
  }
}));
app.use(passport.initialize());

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/ingest', ingestRouter);
app.use('/api/chat', chatRouter);
app.use('/api/system', systemRouter);

// Centralized Express Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('[Error Boundary] Exception caught in API middleware:', err.stack || err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    error: err.name || 'InternalServerError',
    message: err.message || 'An unexpected server error occurred.'
  });
});

// Health Check Route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'ToposRAG Backend',
    database: 'connected',
    gemini: process.env.GEMINI_API_KEY ? 'configured' : 'missing'
  });
});

// Startup Function
async function startServer() {
  console.log('==================================================');
  console.log('Initializing ToposRAG Express Server...');
  
  try {
    // Verify database connection before binding to port
    console.log('[Startup] Verifying database connection pool...');
    const dbCheck = await db.query('SELECT NOW() as current_time;');
    console.log(`[Startup] Database pool connection successful! Timestamp: ${dbCheck.rows[0].current_time}`);
    
    // Dynamic non-destructive migrations
    console.log('[Startup] Running dynamic database migrations...');
    await db.query(`
      ALTER TABLE repositories 
      ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
    `);
    console.log('[Startup] Dynamic migrations applied successfully.');

    // Verify Google Gemini API
    console.log('[Startup] Verifying Google Gemini API configuration...');
    if (!process.env.GEMINI_API_KEY) {
      console.warn('[Startup] [WARNING] GEMINI_API_KEY is not defined in backend/.env.');
    } else {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      console.log('[Startup] Google Gemini API client initialized successfully.');
    }

    // Bind to specified port
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[Startup] Server running on host 0.0.0.0 and port ${PORT}`);
      console.log(`[Startup] Health-check available at: http://localhost:${PORT}/api/health`);
      console.log('==================================================');
    });
  } catch (error) {
    console.error('==================================================');
    console.error('[CRITICAL] Server failed to start: Database check or migration failed.');
    console.error('Error details:', error.message);
    console.error('==================================================');
    process.exit(1);
  }
}

startServer();
export default app;
