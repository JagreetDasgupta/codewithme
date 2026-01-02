import { createClient, RedisClientType } from 'redis';
import logger from './logger';

let client: RedisClientType | null = null;
let isConnected = false;

/**
 * Get Redis client. Returns null if Redis is not configured or unavailable.
 * This makes Redis completely optional for deployments without it.
 */
export const getRedis = (): RedisClientType | null => {
  // Skip Redis if not configured
  if (!process.env.REDIS_HOST && !process.env.REDIS_URL && !process.env.UPSTASH_REDIS_REST_URL) {
    return null;
  }

  if (client && isConnected) return client;
  if (client) return client; // Return existing client even if connecting

  try {
    // Support multiple Redis URL formats
    const url = process.env.REDIS_URL
      || process.env.UPSTASH_REDIS_REST_URL
      || `redis://${process.env.REDIS_HOST || '127.0.0.1'}:${process.env.REDIS_PORT || '6379'}`;

    client = createClient({ url }) as RedisClientType;

    client.on('error', (err) => {
      logger.warn('Redis Client Error (optional service, app will continue):', err.message);
      isConnected = false;
    });

    client.on('connect', () => {
      logger.info('Redis connected');
      isConnected = true;
    });

    client.connect().catch(err => {
      logger.warn('Redis connect error (optional service):', err.message);
    });

    return client;
  } catch (err) {
    logger.warn('Redis initialization skipped:', (err as Error).message);
    return null;
  }
};

/**
 * Check if Redis is available
 */
export const isRedisAvailable = (): boolean => {
  return client !== null && isConnected;
};

export const snapshotKey = (sessionId: string) => `session:${sessionId}:snapshots`;