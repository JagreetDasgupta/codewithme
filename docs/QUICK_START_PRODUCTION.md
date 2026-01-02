# Quick Start: Production Deployment Checklist

## Pre-Deployment Checklist

### 1. Environment Variables

Create `.env.production` files for each service:

**Backend (.env.production)**
```env
NODE_ENV=production
PORT=4000
FRONTEND_URL=https://yourdomain.com
JWT_SECRET=<generate-strong-secret>
JWT_EXPIRES_IN=24h
DB_HOST=<production-db-host>
DB_PORT=5432
DB_USER=<db-user>
DB_PASSWORD=<strong-password>
DB_NAME=codewithme_prod
REDIS_HOST=<redis-host>
REDIS_PORT=6379
REDIS_PASSWORD=<redis-password>
SANDBOX_URL=http://sandbox:5000
LOG_LEVEL=info
```

**Frontend (.env.production)**
```env
VITE_API_URL=https://api.yourdomain.com
VITE_SANDBOX_URL=https://sandbox.yourdomain.com
```

### 2. Database Setup

```bash
# Run migrations
cd backend
npm run migrate:up

# Or manually run init-db.sql
psql -h <db-host> -U <user> -d codewithme_prod -f src/scripts/init-db.sql
```

### 3. Security Checklist

- [ ] Change all default passwords
- [ ] Use strong JWT secret (min 32 characters)
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS for production domains only
- [ ] Set up rate limiting
- [ ] Enable security headers
- [ ] Review and restrict Docker socket access
- [ ] Set up firewall rules
- [ ] Enable database SSL connections
- [ ] Use Redis AUTH

### 4. Docker Production Build

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Or build individually
cd backend && docker build -t codewithme-backend:prod -f Dockerfile.prod .
cd frontend && docker build -t codewithme-frontend:prod -f Dockerfile.prod .
cd sandbox && docker build -t codewithme-sandbox:prod -f Dockerfile.prod .
```

### 5. Health Checks

Verify all services are healthy:

```bash
# Backend
curl https://api.yourdomain.com/api/v1/health

# Frontend
curl https://yourdomain.com

# Sandbox
curl https://sandbox.yourdomain.com/api/v1/health
```

### 6. Monitoring Setup

- [ ] Set up error tracking (Sentry)
- [ ] Configure log aggregation
- [ ] Set up uptime monitoring
- [ ] Create alerting rules
- [ ] Set up performance monitoring

### 7. Backup Strategy

- [ ] Configure database backups (daily)
- [ ] Set up Redis persistence
- [ ] Backup Docker volumes
- [ ] Test restore procedures

### 8. Load Testing

```bash
# Test with k6 or similar
k6 run load-test.js
```

### 9. SSL/TLS Certificates

- [ ] Obtain SSL certificates (Let's Encrypt)
- [ ] Configure nginx/reverse proxy
- [ ] Enable HTTP/2
- [ ] Set up certificate auto-renewal

### 10. DNS Configuration

- [ ] Point domain to server IP
- [ ] Configure subdomains (api, sandbox)
- [ ] Set up CNAME records if needed

## Deployment Steps

1. **Build and push images** to container registry
2. **Deploy to production** (Kubernetes, Docker Swarm, or VPS)
3. **Run database migrations**
4. **Verify health checks**
5. **Monitor logs** for errors
6. **Test critical paths** (login, session creation, code execution)
7. **Enable monitoring** and alerts
8. **Document** deployment process

## Post-Deployment

- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Verify all features work
- [ ] Test with real users
- [ ] Set up regular backups
- [ ] Schedule security updates

## Rollback Plan

1. Keep previous version images tagged
2. Document rollback procedure
3. Test rollback in staging
4. Have database migration rollback scripts ready

