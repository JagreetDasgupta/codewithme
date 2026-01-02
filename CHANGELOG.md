## 1.2.0 (2024-12-08)

### Added
- **Production-Ready Features**:
  - Rate limiting middleware with different limits for auth, execution, and session creation
  - Request logging with correlation IDs for request tracking
  - Sentry integration for error tracking and monitoring
  - Enhanced health check endpoint with service status
  - Database connection pooling with retry logic
  - Input sanitization middleware to prevent XSS attacks
  - Database migration system for schema management
  - Environment configuration templates

- **Security Enhancements**:
  - Helmet.js security headers configuration
  - CORS configuration for multiple origins
  - Rate limiting on all API endpoints
  - Input sanitization on all requests
  - Enhanced error handling with Sentry integration

- **Infrastructure**:
  - Database connection retry logic
  - Connection pooling configuration
  - SSL support for production database connections
  - Graceful shutdown handling

### Changed
- Enhanced error handler with Sentry integration
- Improved database configuration with connection pooling
- Updated health check to include service status
- Enhanced logging with correlation IDs

### Fixed
- Database connection error handling
- Request tracking across services

## 1.1.0 (2025-12-08)

### Fixed
- Removed trailing comma in root `package.json` causing Vite/esbuild startup failure.
- Addressed bundling errors from `vscode-languageclient` by removing LSP imports in the frontend and shimming `vscode` in Vite config.
- Corrected `Login.tsx` error color variable to use `--error-color`.
- Resolved TypeScript build errors by removing unused variables, adjusting state declarations, and fixing component props.

### Added
- Authenticated top navigation bar (brand, user, logout) in `App.tsx`.
- Google Fonts (`Inter`) in `frontend/index.html` to improve typography.
- Responsive layout improvements for `InterviewSession` panels and video tiles.
- UI utility classes and modern styles in `App.css`.

### Testing
- Installed Playwright browsers and stabilized E2E by waiting for Monaco editor visibility.
- Frontend build succeeds (`npm run build`).

### Notes
- Language server (LSP) client integration is temporarily disabled in the frontend to avoid bundling conflicts; the backend gateway remains intact and can be re-enabled with a compatible browser LSP client setup.
