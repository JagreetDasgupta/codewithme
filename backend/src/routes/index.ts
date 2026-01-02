import express from 'express';
import authRoutes from './auth';
import sessionRoutes from './session';
import { protect } from '../middleware/auth';
import sandboxRoutes from './sandbox';
import pool from '../config/database';
import { getRedis, isRedisAvailable } from '../utils/redis';
import { authLimiter, executionLimiter, sessionLimiter } from '../middleware/rateLimiter';

const router = express.Router();

// Enhanced health check route
router.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.APP_VERSION || '1.0.0',
    services: {
      database: 'unknown',
      redis: 'not configured', // Redis is optional
    }
  };

  // Check database connection
  try {
    const dbResult = await pool.query('SELECT NOW()');
    health.services.database = 'connected';
  } catch (error) {
    health.services.database = 'disconnected';
    health.status = 'degraded';
  }

  // Check Redis connection (optional service)
  const redis = getRedis();
  if (redis) {
    try {
      await redis.ping();
      health.services.redis = 'connected';
    } catch (error) {
      health.services.redis = 'disconnected (optional)';
      // Don't degrade status for Redis - it's optional
    }
  } else {
    health.services.redis = 'not configured (optional)';
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Auth routes
router.use('/auth', authRoutes);

// Protected routes
router.use('/sessions', protect, sessionRoutes);

// Sandbox proxy routes (languages, execute)
router.use('/', sandboxRoutes);

export default router;