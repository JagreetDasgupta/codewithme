import pool from '../config/database';
import logger from '../utils/logger';
import fs from 'fs';
import path from 'path';

// Get migrations directory - works when running as script or imported
const migrationsDir = path.resolve(__dirname);

interface Migration {
  version: string;
  filename: string;
  sql: string;
}

/**
 * Get all migration files sorted by version
 */
const getMigrations = (): Migration[] => {
  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  return files.map(file => {
    const version = file.split('_')[0];
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    return { version, filename: file, sql };
  });
};

/**
 * Create migrations table if it doesn't exist
 */
const createMigrationsTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      version VARCHAR(50) UNIQUE NOT NULL,
      filename VARCHAR(255) NOT NULL,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;
  await pool.query(query);
};

/**
 * Get applied migrations
 */
const getAppliedMigrations = async (): Promise<string[]> => {
  const result = await pool.query('SELECT version FROM migrations ORDER BY version');
  return result.rows.map(row => row.version);
};

/**
 * Apply a migration
 */
const applyMigration = async (migration: Migration) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Execute migration SQL
    await client.query(migration.sql);
    
    // Record migration
    await client.query(
      'INSERT INTO migrations (version, filename) VALUES ($1, $2)',
      [migration.version, migration.filename]
    );
    
    await client.query('COMMIT');
    logger.info(`Applied migration: ${migration.filename}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Run all pending migrations
 */
export const runMigrations = async () => {
  try {
    logger.info('Starting database migrations...');
    
    await createMigrationsTable();
    const applied = await getAppliedMigrations();
    const migrations = getMigrations();
    
    const pending = migrations.filter(m => !applied.includes(m.version));
    
    if (pending.length === 0) {
      logger.info('No pending migrations');
      return;
    }
    
    logger.info(`Found ${pending.length} pending migration(s)`);
    
    for (const migration of pending) {
      try {
        await applyMigration(migration);
      } catch (error) {
        logger.error(`Failed to apply migration ${migration.filename}:`, error);
        throw error;
      }
    }
    
    logger.info('All migrations applied successfully');
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  }
};

// Run migrations if called directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      logger.info('Migrations completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Migrations failed:', error);
      process.exit(1);
    });
}
