import db from '../db/index.js';

/**
 * Controller to fetch runtime stats, database connection states, and schema details.
 */
export async function getSystemInfo(req, res, next) {
  try {
    console.log('[SystemInfo] GET /api/system/info request received');

    // 1. Gather database status & characteristics
    let dbStatus = 'disconnected';
    let dbEngine = 'PostgreSQL';
    let dbProvider = 'Neon (Serverless)';
    let dbSsl = 'rejectUnauthorized: false';
    let dbPoolMax = '20 connections';
    let pgVectorVersion = 'Not Installed';

    try {
      // Run quick query to verify DB connection and get engine version
      const dbCheck = await db.query('SELECT version();');
      if (dbCheck && dbCheck.rows.length > 0) {
        dbStatus = 'connected';
        const fullVersion = dbCheck.rows[0].version;
        // Simplify pg version (e.g. "PostgreSQL 16.3")
        const match = fullVersion.match(/PostgreSQL \d+(\.\d+)?/);
        dbEngine = match ? match[0] : 'PostgreSQL';
      }

      // Check pgvector extension details
      const vectorCheck = await db.query("SELECT extversion FROM pg_extension WHERE extname = 'vector';");
      if (vectorCheck && vectorCheck.rows.length > 0) {
        pgVectorVersion = vectorCheck.rows[0].extversion;
      }
    } catch (dbErr) {
      console.error('[SystemInfo] Database validation check failed:', dbErr.message);
    }

    // Resolve provider details from connection strings
    if (process.env.DATABASE_URL) {
      dbProvider = process.env.DATABASE_URL.includes('neon.tech') ? 'Neon (Serverless)' : 'PostgreSQL';
    } else {
      dbProvider = process.env.PG_HOST || 'localhost';
      dbSsl = process.env.PG_SSL === 'true' ? 'rejectUnauthorized: false' : 'disabled';
    }
    dbPoolMax = `${db.pool?.options?.max || 20} connections`;

    // 2. Scan schema table counts
    const tablesList = [
      { table: 'users', note: 'OAuth profiles' },
      { table: 'repositories', note: 'Codebase registry' },
      { table: 'files', note: 'Parsed file index' },
      { table: 'chunks', note: 'vector(768) embeddings' },
      { table: 'dependency_edges', note: 'Import graph' },
      { table: 'documentation', note: 'Generated docs' },
      { table: 'chat_sessions', note: 'RAG sessions' },
      { table: 'chat_messages', note: 'Q&A history' }
    ];

    const tables = [];
    for (const item of tablesList) {
      if (dbStatus === 'connected') {
        try {
          const countRes = await db.query(`SELECT COUNT(*) FROM "${item.table}";`);
          tables.push({
            table: item.table,
            note: item.note,
            rowCount: parseInt(countRes.rows[0].count, 10),
            exists: true
          });
        } catch (e) {
          tables.push({
            table: item.table,
            note: item.note,
            rowCount: 0,
            exists: false
          });
        }
      } else {
        tables.push({
          table: item.table,
          note: item.note,
          rowCount: 0,
          exists: false
        });
      }
    }

    // 3. Node.js runtime properties
    const runtime = {
      runtime: `Node.js ${process.version}`,
      auth: 'Passport.js + JWT',
      port: process.env.PORT ? `:${process.env.PORT}` : ':5000',
      apiBase: '/api/',
      aiSdk: '@google/genai',
      uptime: process.uptime(),
      platform: process.platform
    };

    return res.status(200).json({
      success: true,
      runtime,
      database: {
        status: dbStatus,
        engine: dbEngine,
        provider: dbProvider,
        ssl: dbSsl,
        poolMax: dbPoolMax,
        extension: pgVectorVersion !== 'Not Installed' ? `pgvector (${pgVectorVersion})` : 'pgvector (missing)'
      },
      tables
    });
  } catch (error) {
    console.error('[SystemInfo] Unexpected controller crash:', error);
    next(error);
  }
}

/**
 * Controller to fetch system information and table counts, optionally scoped to a single codebase.
 */
export async function getSystemStats(req, res, next) {
  try {
    const { repoId } = req.query;
    const userId = req.user.id;

    // 1. Gather database status & characteristics
    let dbStatus = 'disconnected';
    let dbEngine = 'PostgreSQL';
    let dbProvider = 'Neon (Serverless)';
    let dbSsl = 'rejectUnauthorized: false';
    let dbPoolMax = '20 connections';
    let pgVectorVersion = 'Not Installed';

    try {
      const dbCheck = await db.query('SELECT version();');
      if (dbCheck && dbCheck.rows.length > 0) {
        dbStatus = 'connected';
        const fullVersion = dbCheck.rows[0].version;
        const match = fullVersion.match(/PostgreSQL \d+(\.\d+)?/);
        dbEngine = match ? match[0] : 'PostgreSQL';
      }

      const vectorCheck = await db.query("SELECT extversion FROM pg_extension WHERE extname = 'vector';");
      if (vectorCheck && vectorCheck.rows.length > 0) {
        pgVectorVersion = vectorCheck.rows[0].extversion;
      }
    } catch (dbErr) {
      console.error('[SystemStats] Database verification check failed:', dbErr.message);
    }

    if (process.env.DATABASE_URL) {
      dbProvider = process.env.DATABASE_URL.includes('neon.tech') ? 'Neon (Serverless)' : 'PostgreSQL';
    } else {
      dbProvider = process.env.PG_HOST || 'localhost';
      dbSsl = process.env.PG_SSL === 'true' ? 'rejectUnauthorized: false' : 'disabled';
    }
    dbPoolMax = `${db.pool?.options?.max || 20} connections`;

    // 2. Validate repository if repoId is provided
    if (repoId && dbStatus === 'connected') {
      const repoCheck = await db.query('SELECT id FROM repositories WHERE id = $1 AND user_id = $2;', [repoId, userId]);
      if (repoCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Repository not found',
          message: 'Specified repository not found or not owned by you.'
        });
      }
    }

    // 3. Scan schema table counts (repository-scoped if repoId is provided)
    const tablesList = [
      { 
        table: 'users', 
        note: 'OAuth profiles',
        query: 'SELECT COUNT(*) FROM users;',
        params: []
      },
      { 
        table: 'repositories', 
        note: 'Codebase registry',
        query: 'SELECT COUNT(*) FROM repositories WHERE user_id = $1;',
        params: [userId]
      },
      { 
        table: 'files', 
        note: 'Parsed file index',
        query: repoId 
          ? 'SELECT COUNT(*) FROM files WHERE repository_id = $1;' 
          : 'SELECT COUNT(*) FROM files f JOIN repositories r ON f.repository_id = r.id WHERE r.user_id = $1;',
        params: repoId ? [repoId] : [userId]
      },
      { 
        table: 'chunks', 
        note: 'vector(768) embeddings',
        query: repoId 
          ? 'SELECT COUNT(*) FROM chunks WHERE repository_id = $1;' 
          : 'SELECT COUNT(*) FROM chunks c JOIN repositories r ON c.repository_id = r.id WHERE r.user_id = $1;',
        params: repoId ? [repoId] : [userId]
      },
      { 
        table: 'dependency_edges', 
        note: 'Import graph',
        query: repoId 
          ? 'SELECT COUNT(*) FROM dependency_edges WHERE repository_id = $1;' 
          : 'SELECT COUNT(*) FROM dependency_edges de JOIN repositories r ON de.repository_id = r.id WHERE r.user_id = $1;',
        params: repoId ? [repoId] : [userId]
      },
      { 
        table: 'documentation', 
        note: 'Generated docs',
        query: repoId 
          ? 'SELECT COUNT(*) FROM documentation WHERE repository_id = $1;' 
          : 'SELECT COUNT(*) FROM documentation d JOIN repositories r ON d.repository_id = r.id WHERE r.user_id = $1;',
        params: repoId ? [repoId] : [userId]
      },
      { 
        table: 'chat_sessions', 
        note: 'RAG sessions',
        query: repoId 
          ? 'SELECT COUNT(*) FROM chat_sessions WHERE repository_id = $1;' 
          : 'SELECT COUNT(*) FROM chat_sessions s JOIN repositories r ON s.repository_id = r.id WHERE r.user_id = $1;',
        params: repoId ? [repoId] : [userId]
      },
      { 
        table: 'chat_messages', 
        note: 'Q&A history',
        query: repoId 
          ? 'SELECT COUNT(*) FROM chat_messages m JOIN chat_sessions s ON m.session_id = s.id WHERE s.repository_id = $1;' 
          : 'SELECT COUNT(*) FROM chat_messages m JOIN chat_sessions s ON m.session_id = s.id JOIN repositories r ON s.repository_id = r.id WHERE r.user_id = $1;',
        params: repoId ? [repoId] : [userId]
      }
    ];

    const tables = [];
    for (const item of tablesList) {
      if (dbStatus === 'connected') {
        try {
          const countRes = await db.query(item.query, item.params);
          tables.push({
            table: item.table,
            note: item.note,
            rowCount: parseInt(countRes.rows[0].count, 10),
            exists: true
          });
        } catch (e) {
          tables.push({
            table: item.table,
            note: item.note,
            rowCount: 0,
            exists: false
          });
        }
      } else {
        tables.push({
          table: item.table,
          note: item.note,
          rowCount: 0,
          exists: false
        });
      }
    }

    // 4. Node.js runtime properties
    const runtime = {
      runtime: `Node.js ${process.version}`,
      auth: 'Passport.js + JWT',
      port: process.env.PORT ? `:${process.env.PORT}` : ':5000',
      apiBase: '/api/',
      aiSdk: '@google/genai',
      uptime: process.uptime(),
      platform: process.platform
    };

    return res.status(200).json({
      success: true,
      runtime,
      database: {
        status: dbStatus,
        engine: dbEngine,
        provider: dbProvider,
        ssl: dbSsl,
        poolMax: dbPoolMax,
        extension: pgVectorVersion !== 'Not Installed' ? `pgvector (${pgVectorVersion})` : 'pgvector (missing)'
      },
      tables
    });
  } catch (error) {
    console.error('[SystemStats] Unexpected controller crash:', error);
    next(error);
  }
}

export default {
  getSystemInfo,
  getSystemStats
};
