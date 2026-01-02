import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';
import logger from '../utils/logger';

dotenv.config();

// Parse DATABASE_URL or use individual env vars
const getDatabaseConfig = (): PoolConfig => {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    // Use connection string directly
    // Enable SSL for cloud databases (Neon, Render, Supabase, Railway)
    const needsSSL = databaseUrl.includes('neon.tech') ||
      databaseUrl.includes('supabase.com') ||
      databaseUrl.includes('render.com') ||
      databaseUrl.includes('railway.app') ||
      process.env.DB_SSL === 'true';

    return {
      connectionString: databaseUrl,
      max: parseInt(process.env.DB_POOL_MAX || '20'),
      idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000'),
      connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT || '5000'),
      ssl: needsSSL ? { rejectUnauthorized: false } : false,
    };
  }


  // Fallback to individual env vars
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'codewithme',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    max: parseInt(process.env.DB_POOL_MAX || '20'),
    idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000'),
    connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT || '2000'),
    ssl: process.env.NODE_ENV === 'production' && process.env.DB_SSL === 'true' ? {
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
    } : false,
  };
};

const dbConfig = getDatabaseConfig();
const pool = new Pool(dbConfig);

// Handle pool errors
pool.on('error', (err) => {
  logger.error('Unexpected error on idle database client', err);
});

// Test database connection with retry logic
let retryCount = 0;
const maxRetries = 5;
const retryDelay = 2000;

const connectWithRetry = async () => {
  try {
    const client = await pool.connect();
    logger.info('Connected to PostgreSQL database successfully');
    client.release();
    retryCount = 0;
  } catch (err) {
    retryCount++;
    if (retryCount < maxRetries) {
      logger.warn(`Database connection failed (attempt ${retryCount}/${maxRetries}), retrying in ${retryDelay}ms...`);
      setTimeout(connectWithRetry, retryDelay);
    } else {
      logger.error('Failed to connect to database after multiple retries', err);
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
    }
  }
};

// Initial connection attempt
connectWithRetry();

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Closing database pool...');
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Closing database pool...');
  await pool.end();
  process.exit(0);
});

export default pool;
