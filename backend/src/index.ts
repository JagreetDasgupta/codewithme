import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { setupWebSocketServer } from './websocket';
import { setupYjsWebSocketServer } from './collaboration';
import { setupLspGateway } from './lsp/gateway';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { apiLimiter } from './middleware/rateLimiter';
import { sanitizeInput } from './utils/inputSanitizer';
import { initSentry } from './utils/sentry';
import logger from './utils/logger';

// Load environment variables
dotenv.config();

// Initialize Sentry for error tracking (must be before other imports)
initSentry();

const app = express();

// Trust proxy for Render/Vercel/Cloudflare (required for rate limiting and IP detection)
app.set('trust proxy', 1);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: (process.env.FRONTEND_URL?.split(',') || []).concat(['http://localhost:3000', 'http://localhost:3001']),
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow WebSocket connections
}));

// CORS configuration
app.use(cors({
  origin: (process.env.FRONTEND_URL?.split(',') || []).concat(['http://localhost:3000', 'http://localhost:3001']),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID'],
}));

// Request logging (must be before routes)
app.use(requestLogger);

// Input sanitization (must be before body parsing)
app.use(sanitizeInput);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting (apply to all routes)
app.use('/api/v1', apiLimiter);

// API routes
app.use('/api/v1', routes);

// Error handling middleware
app.use(errorHandler);

// Set up Socket.IO for real-time communication
setupWebSocketServer(io);

// Set up Y.js WebSocket server for collaborative editing
setupYjsWebSocketServer(server);

// Set up LSP gateway for language diagnostics
setupLspGateway(server);

// Run database migrations on startup (in production, run separately)
if (process.env.RUN_MIGRATIONS === 'true') {
  import('./migrations/migrate').then(({ runMigrations }) => {
    runMigrations().catch(err => {
      logger.error('Failed to run migrations:', err);
      process.exit(1);
    });
  });
}

// Start the server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`, {
    environment: process.env.NODE_ENV || 'development',
    version: process.env.APP_VERSION || '1.0.0'
  });
});

export { app, server };