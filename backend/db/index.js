import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve paths for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from backend/.env (one level up from db/)
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { Pool } = pg;

const poolConfig = {
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
};

if (process.env.DATABASE_URL) {
  poolConfig.connectionString = process.env.DATABASE_URL;
  poolConfig.ssl = { rejectUnauthorized: false };
} else {
  poolConfig.user = process.env.PG_USER;
  poolConfig.host = process.env.PG_HOST;
  poolConfig.database = process.env.PG_DATABASE;
  poolConfig.password = process.env.PG_PASSWORD;
  poolConfig.port = parseInt(process.env.PG_PORT || '5432', 10);
  if (process.env.PG_SSL === 'true') {
    poolConfig.ssl = { rejectUnauthorized: false };
  }
}

const pool = new Pool(poolConfig);

// Handle pool error events
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

/**
 * Robust query helper to execute SQL queries.
 * @param {string} text - The SQL query text.
 * @param {Array} params - The query parameters.
 * @returns {Promise<pg.QueryResult>}
 */
export const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log(`[DB] Executed query in ${duration}ms (Rows: ${res.rowCount || 0})`);
    return res;
  } catch (error) {
    console.error('[DB] Query Error:', error.message);
    throw error;
  }
};

export default {
  query,
  pool,
};
