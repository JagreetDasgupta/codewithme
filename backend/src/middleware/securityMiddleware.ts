import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import crypto from 'crypto';
import logger from '../utils/logger';

/**
 * Security middleware collection for API protection
 */

/**
 * Rate limiting middleware
 */
export const createRateLimiter = (options?: {
    windowMs?: number;
    max?: number;
    message?: string;
}) => {
    return rateLimit({
        windowMs: options?.windowMs || 15 * 60 * 1000, // 15 minutes
        max: options?.max || 100, // limit each IP to 100 requests per windowMs
        message: options?.message || 'Too many requests, please try again later',
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
            logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
            res.status(429).json({
                status: 'error',
                message: options?.message || 'Too many requests, please try again later'
            });
        }
    });
};

/**
 * API-specific rate limiter (stricter)
 */
export const apiRateLimiter = createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute
    message: 'API rate limit exceeded'
});

/**
 * Auth rate limiter (very strict for login/register)
 */
export const authRateLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per 15 minutes
    message: 'Too many authentication attempts, please try again later'
});

/**
 * Code execution rate limiter
 */
export const executionRateLimiter = createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 executions per minute
    message: 'Code execution rate limit exceeded'
});

/**
 * Security headers middleware using helmet
 */
export const securityHeaders = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Required for Monaco
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "ws:", "wss:"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"]
        }
    },
    crossOriginEmbedderPolicy: false, // Required for Monaco workers
    crossOriginResourcePolicy: { policy: 'cross-origin' }
});

/**
 * Request ID middleware for tracking
 */
export const requestId = (req: Request, res: Response, next: NextFunction) => {
    const id = req.headers['x-request-id'] as string || crypto.randomUUID();
    req.requestId = id;
    res.setHeader('X-Request-ID', id);
    next();
};

declare global {
    namespace Express {
        interface Request {
            requestId?: string;
        }
    }
}

/**
 * Request logging middleware
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        const logData = {
            requestId: req.requestId,
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip,
            userAgent: req.headers['user-agent']
        };

        if (res.statusCode >= 400) {
            logger.warn('Request error', logData);
        } else {
            logger.info('Request completed', logData);
        }
    });

    next();
};

/**
 * CORS configuration for secure cross-origin requests
 */
export const corsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        const allowedOrigins = [
            process.env.FRONTEND_URL || 'http://localhost:3000',
            'http://localhost:5173',
            'http://localhost:4173'
        ];

        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            logger.warn(`CORS blocked origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposedHeaders: ['X-Request-ID'],
    maxAge: 86400 // 24 hours
};

/**
 * Input sanitization middleware
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
    const sanitize = (obj: any): any => {
        if (typeof obj === 'string') {
            // Remove potential XSS vectors
            return obj
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/javascript:/gi, '')
                .replace(/on\w+=/gi, '');
        }
        if (Array.isArray(obj)) {
            return obj.map(sanitize);
        }
        if (typeof obj === 'object' && obj !== null) {
            return Object.keys(obj).reduce((acc, key) => {
                acc[key] = sanitize(obj[key]);
                return acc;
            }, {} as any);
        }
        return obj;
    };

    if (req.body) {
        req.body = sanitize(req.body);
    }
    if (req.query) {
        req.query = sanitize(req.query);
    }

    next();
};

/**
 * SQL injection prevention (additional layer)
 */
export const preventSqlInjection = (req: Request, res: Response, next: NextFunction) => {
    const sqlPatterns = [
        /(\-\-)|(\#)/,  // Comment markers
        /(\')|(\%27)/,  // Single quotes
        /(\;)/,         // Semicolons
        /(\bOR\b)/i,    // OR keyword
        /(\bAND\b)/i,   // AND keyword
        /(\bDROP\b)/i,  // DROP keyword
        /(\bUNION\b)/i, // UNION keyword
        /(\bSELECT\b)/i // SELECT keyword (outside of expected contexts)
    ];

    const checkForSql = (value: string): boolean => {
        return sqlPatterns.some(pattern => pattern.test(value));
    };

    const checkObject = (obj: any): boolean => {
        if (typeof obj === 'string') {
            return checkForSql(obj);
        }
        if (Array.isArray(obj)) {
            return obj.some(checkObject);
        }
        if (typeof obj === 'object' && obj !== null) {
            return Object.values(obj).some(checkObject);
        }
        return false;
    };

    // Skip SQL check for code execution endpoints (code naturally contains these patterns)
    if (req.path.includes('/execute') || req.path.includes('/run')) {
        return next();
    }

    const hasSQL = checkObject(req.body) || checkObject(req.query);

    if (hasSQL) {
        logger.warn(`Potential SQL injection attempt from IP: ${req.ip}`, {
            path: req.path,
            body: JSON.stringify(req.body).substring(0, 200)
        });
        // Log but don't block - let parameterized queries handle it
    }

    next();
};

/**
 * Session validation middleware
 */
export const validateSession = (req: Request, res: Response, next: NextFunction) => {
    const sessionId = req.params.id || req.params.sessionId;

    if (sessionId && !isValidUUID(sessionId)) {
        return res.status(400).json({
            status: 'error',
            message: 'Invalid session ID format'
        });
    }

    next();
};

/**
 * UUID validation helper
 */
function isValidUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
}

/**
 * IP whitelist middleware (for admin routes)
 */
export const ipWhitelist = (allowedIPs: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const clientIP = req.ip || req.socket.remoteAddress || '';

        if (allowedIPs.length === 0 || allowedIPs.includes(clientIP)) {
            next();
        } else {
            logger.warn(`Blocked IP attempt: ${clientIP}`);
            res.status(403).json({
                status: 'error',
                message: 'Access denied'
            });
        }
    };
};
