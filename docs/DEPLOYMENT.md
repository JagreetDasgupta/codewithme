# Deployment Guide

## Quick Start

### 1. Install Dependencies

```bash
npm install
npm run install:all
```

### 2. Set Up Environment Variables

Copy the example environment file and configure:

```bash
# Backend
cp backend/env.example backend/.env
# Edit backend/.env with your configuration

# Frontend
cp frontend/.env.example frontend/.env
# Edit frontend/.env with your configuration
```

### 3. Set Up Database

```bash
# Start PostgreSQL and Redis (using Docker)
docker-compose up -d postgres redis

# Run migrations
cd backend
npm run migrate
```

### 4. Start Services

**Development:**
```bash
# Using Docker Compose (recommended)
docker-compose up

# Or individually
npm run start:local
```

**Production:**
```bash
# Build
npm run build:all

# Start
npm start
```

## Production Deployment

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 14+
- Redis 7+
- Domain name with SSL certificate

### Step 1: Environment Configuration

1. Set `NODE_ENV=production`
2. Configure strong `JWT_SECRET` (min 32 characters)
3. Set production database credentials
4. Configure Redis connection
5. Set `FRONTEND_URL` to your production domain
6. (Optional) Configure Sentry DSN for error tracking

### Step 2: Database Setup

```bash
# Run migrations
cd backend
npm run migrate

# Or manually
psql -h <host> -U <user> -d <database> -f src/scripts/init-db.sql
```

### Step 3: Build Docker Images

```bash
docker-compose -f docker-compose.prod.yml build
```

### Step 4: Deploy

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Step 5: Verify

```bash
# Check health
curl https://api.yourdomain.com/api/v1/health

# Check logs
docker-compose logs -f
```

## Environment Variables Reference

See `backend/env.example` for all available environment variables.

### Required for Production

- `NODE_ENV=production`
- `JWT_SECRET` (strong secret, min 32 chars)
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `REDIS_HOST`, `REDIS_PORT`
- `FRONTEND_URL` (production domain)

### Optional

- `SENTRY_DSN` (for error tracking)
- `LOG_LEVEL` (default: info)
- `APP_VERSION` (for release tracking)

## Security Checklist

- [ ] Strong JWT secret configured
- [ ] Database uses SSL in production
- [ ] Redis password set
- [ ] HTTPS/SSL enabled
- [ ] CORS configured for production domains only
- [ ] Rate limiting enabled (default: enabled)
- [ ] Security headers configured (Helmet)
- [ ] Environment variables secured
- [ ] Database backups configured
- [ ] Firewall rules configured

## Monitoring

### Health Checks

```bash
# API Health
GET /api/v1/health

# Response includes:
# - Service status
# - Database connection status
# - Redis connection status
# - Uptime
```

### Logs

```bash
# Docker logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f sandbox

# Application logs (if file logging enabled)
tail -f backend/logs/combined.log
tail -f backend/logs/error.log
```

### Error Tracking

If Sentry is configured, errors are automatically tracked. Check your Sentry dashboard for:
- Error rates
- Performance metrics
- User impact

## Scaling

### Horizontal Scaling

1. Use Redis pub/sub for multi-instance support
2. Configure load balancer with session affinity for WebSockets
3. Use database read replicas for read-heavy workloads
4. Scale Docker containers based on load

### Vertical Scaling

1. Increase database connection pool size
2. Increase Redis memory
3. Increase container resources (CPU, memory)

## Backup & Recovery

### Database Backups

```bash
# Manual backup
pg_dump -h <host> -U <user> <database> > backup.sql

# Restore
psql -h <host> -U <user> <database> < backup.sql
```

### Automated Backups

Set up cron job or use managed database service with automatic backups.

## Troubleshooting

### Common Issues

1. **Database connection errors**
   - Check database is running
   - Verify credentials
   - Check network connectivity
   - Verify SSL settings

2. **Redis connection errors**
   - Check Redis is running
   - Verify password if set
   - Check network connectivity

3. **Rate limiting issues**
   - Check rate limit configuration
   - Verify IP is not blocked
   - Check Redis is accessible

4. **Migration errors**
   - Check database permissions
   - Verify migration files are correct
   - Check for conflicting migrations

## Rollback Procedure

1. Stop current deployment
2. Restore previous Docker images
3. Rollback database migrations (if needed)
4. Restart services
5. Verify functionality

## Support

For issues, check:
- Application logs
- Health check endpoint
- Sentry dashboard (if configured)
- Database logs
- Docker logs

