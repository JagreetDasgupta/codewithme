import logger from './logger';

/**
 * Sentry stub - Sentry is optional for cloud deployment
 * To enable, install @sentry/node and set SENTRY_DSN
 */

export const initSentry = () => {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    logger.info('Sentry not configured (optional). Error tracking disabled.');
    return;
  }
  // If SENTRY_DSN is provided but @sentry/node isn't installed, log warning
  logger.warn('Sentry DSN provided but @sentry/node not installed. Run: npm install @sentry/node');
};

export const captureException = (error: Error, context?: Record<string, any>) => {
  // No-op when Sentry not installed
  logger.error('Exception:', error.message, context || '');
};

export const captureMessage = (message: string, level: string = 'info') => {
  // No-op when Sentry not installed
  logger.info(`Sentry message: ${message}`);
};

export const addBreadcrumb = (message: string, category?: string, level?: string, data?: any) => {
  // No-op when Sentry not installed
};
