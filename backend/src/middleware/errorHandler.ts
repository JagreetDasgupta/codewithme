import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { captureException, addBreadcrumb } from '../utils/sentry';

interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  code?: string;
  details?: any;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  const isOperational = err.isOperational || false;

  // Log error with context
  const errorContext = {
    method: req.method,
    path: req.path,
    statusCode,
    message: err.message,
    stack: err.stack,
    userId: (req as any).user?.id,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    correlationId: req.correlationId,
    timestamp: new Date().toISOString()
  };

  // Add breadcrumb for Sentry
  addBreadcrumb(
    `Error: ${err.message}`,
    'error',
    statusCode >= 500 ? 'error' : 'warning',
    {
      path: req.path,
      method: req.method,
      statusCode
    }
  );

  // Send to Sentry for server errors
  if (statusCode >= 500) {
    logger.error('Server Error:', errorContext);
    captureException(err, {
      request: {
        method: req.method,
        url: req.path,
        headers: req.headers,
        query: req.query,
        body: req.body,
      },
      user: {
        id: (req as any).user?.id,
        ip: req.ip,
      },
      correlationId: req.correlationId,
    });
  } else {
    logger.warn('Client Error:', errorContext);
  }

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      status: 'error',
      message: 'Validation Error',
      errors: err.details || [err.message]
    });
  }

  if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      status: 'error',
      message: 'Authentication failed',
      code: 'UNAUTHORIZED'
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid ID format',
      code: 'INVALID_ID'
    });
  }

  // Send error response
  res.status(statusCode).json({
    status: 'error',
    message: isOperational ? err.message : 'Internal server error',
    code: err.code || 'INTERNAL_ERROR',
    ...(err.details && { details: err.details }),
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      context: errorContext
    })
  });
};

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  code?: string;
  details?: any;

  constructor(message: string, statusCode: number = 500, code?: string, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;
    this.details = details;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// Specific error classes
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden access') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
  }
}