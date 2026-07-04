import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './index.js';

// Resolve paths for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  const initSqlPath = path.resolve(__dirname, 'init.sql');
  console.log(`[Migration] Reading database schema from: ${initSqlPath}`);

  try {
    const sql = fs.readFileSync(initSqlPath, 'utf8');
    
    console.log('[Migration] Executing init.sql against the database...');
    await db.query(sql);
    
    console.log('[Migration] SUCCESS: All tables and indexes initialized successfully!');
  } catch (error) {
    console.error('[Migration] ERROR: Database migration failed!');
    console.error(error.message);
    process.exit(1);
  } finally {
    console.log('[Migration] Draining connection pool...');
    await db.pool.end();
  }
}

runMigration();
