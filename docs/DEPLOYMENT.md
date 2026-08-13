# TOLOG ONE - Deployment Guide

**Version:** 1.0  
**Date:** 2026-08-13  
**Target:** Docker + Docker Compose, scalable to Kubernetes

---

## 1. Overview

TOLOG ONE is designed for production deployment with:
- Docker containerization
- Docker Compose for local/small deployments
- PostgreSQL database
- Environment-based configuration
- Zero-downtime deployments (future)
- Automated backups
- Monitoring and logging

---

## 2. Architecture

```
┌──────────────────────────────────────────────────────────┐
│ Frontend (React SPA)                                     │
│ Built: dist/                                             │
│ Served by: nginx                                         │
└─────────────────┬──────────────────────────────────────┘
                  │ HTTPS
┌─────────────────▼──────────────────────────────────────┐
│ Backend (Node.js + Fastify)                             │
│ Port: 3000                                              │
│ Process: node dist/index.js                             │
└─────────────────┬──────────────────────────────────────┘
                  │ TCP
┌─────────────────▼──────────────────────────────────────┐
│ PostgreSQL Database                                      │
│ Port: 5432                                              │
│ Data: /var/lib/postgresql/data                          │
└──────────────────────────────────────────────────────────┘
```

---

## 3. Environment Variables

### 3.1 Backend Environment Variables

Create `.env` file (never commit to git):

```bash
# Node Environment
NODE_ENV=production
LOG_LEVEL=info

# Database
DATABASE_URL=postgresql://tolog_user:secure_password@postgres:5432/tolog_one
DATABASE_POOL_SIZE=20
DATABASE_POOL_IDLE_TIMEOUT=30000

# Authentication
JWT_SECRET=your-long-random-secret-minimum-32-chars
JWT_REFRESH_SECRET=your-long-random-refresh-secret-minimum-32-chars
JWT_ACCESS_EXPIRY=900
JWT_REFRESH_EXPIRY=604800

# Server
API_PORT=3000
API_HOST=0.0.0.0
FRONTEND_URL=https://tolog.one
API_URL=https://api.tolog.one

# AI Providers
AI_DEFAULT_PROVIDER=gemini
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.0-flash
CLAUDE_API_KEY=your-claude-api-key
CLAUDE_MODEL=claude-3-5-sonnet-20241022

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_REDIS_URL=redis://redis:6379

# Monitoring
SENTRY_DSN=optional-sentry-dsn
DATADOG_API_KEY=optional-datadog-key

# Email (if needed for verification)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@tolog.one
SMTP_PASS=smtp-password

# Storage (optional - for user data exports, etc.)
S3_BUCKET=tolog-one-prod
S3_REGION=eu-west-1
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
```

**Template file (.env.example - commit to git):**

```bash
# Node Environment
NODE_ENV=production
LOG_LEVEL=info

# Database
DATABASE_URL=postgresql://tolog_user:password@postgres:5432/tolog_one
DATABASE_POOL_SIZE=20
DATABASE_POOL_IDLE_TIMEOUT=30000

# Authentication
JWT_SECRET=replace-with-actual-secret
JWT_REFRESH_SECRET=replace-with-actual-secret
JWT_ACCESS_EXPIRY=900
JWT_REFRESH_EXPIRY=604800

# Server
API_PORT=3000
API_HOST=0.0.0.0
FRONTEND_URL=https://tolog.one
API_URL=https://api.tolog.one

# AI Providers
AI_DEFAULT_PROVIDER=gemini
GEMINI_API_KEY=replace-with-actual-key
GEMINI_MODEL=gemini-2.0-flash
CLAUDE_API_KEY=replace-with-actual-key
CLAUDE_MODEL=claude-3-5-sonnet-20241022

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_REDIS_URL=redis://redis:6379

# Monitoring
SENTRY_DSN=
DATADOG_API_KEY=

# Email
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=

# Storage
S3_BUCKET=
S3_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
```

**Status:** PLANNED

---

### 3.2 Frontend Environment Variables

Create `frontend/.env` (never commit to git):

```bash
VITE_API_BASE_URL=https://api.tolog.one
VITE_APP_NAME=TOLOG ONE
VITE_APP_VERSION=1.0.0
VITE_ENVIRONMENT=production
```

Template `frontend/.env.example`:

```bash
VITE_API_BASE_URL=https://api.tolog.one
VITE_APP_NAME=TOLOG ONE
VITE_APP_VERSION=1.0.0
VITE_ENVIRONMENT=production
```

**Status:** PLANNED

---

## 4. Docker Compose Setup

### 4.1 docker-compose.yml

```yaml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: tolog-postgres
    environment:
      POSTGRES_USER: ${DB_USER:-tolog_user}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-changeme}
      POSTGRES_DB: tolog_one
      POSTGRES_INITDB_ARGS: "--encoding=UTF8 --locale=en_US.UTF-8"
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/01-init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-tolog_user}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - tolog-network
    restart: unless-stopped

  # Redis for caching & rate limiting
  redis:
    image: redis:7-alpine
    container_name: tolog-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - tolog-network
    restart: unless-stopped

  # Backend API
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: tolog-backend
    environment:
      NODE_ENV: ${NODE_ENV:-development}
      DATABASE_URL: postgresql://${DB_USER:-tolog_user}:${DB_PASSWORD:-changeme}@postgres:5432/tolog_one
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      GEMINI_API_KEY: ${GEMINI_API_KEY}
      CLAUDE_API_KEY: ${CLAUDE_API_KEY}
      FRONTEND_URL: ${FRONTEND_URL:-http://localhost:5173}
      API_URL: ${API_URL:-http://localhost:3000}
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./backend/src:/app/src
    networks:
      - tolog-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Frontend
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        VITE_API_BASE_URL: ${API_URL:-http://localhost:3000}
    container_name: tolog-frontend
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - backend
    volumes:
      - ./frontend/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./frontend/ssl:/etc/nginx/ssl:ro  # For HTTPS certs
    networks:
      - tolog-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:80"]
      interval: 30s
      timeout: 10s
      retries: 3

networks:
  tolog-network:
    driver: bridge

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
```

**Status:** PLANNED

---

### 4.2 Backend Dockerfile

Create `backend/Dockerfile`:

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# Runtime stage
FROM node:20-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init curl

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy built application
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
```

**Status:** PLANNED

---

### 4.3 Frontend Dockerfile

Create `frontend/Dockerfile`:

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Build arguments
ARG VITE_API_BASE_URL=http://localhost:3000
ARG VITE_APP_VERSION=1.0.0

# Build application
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_APP_VERSION=$VITE_APP_VERSION
RUN npm run build

# Runtime stage
FROM nginx:alpine

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf
COPY default.conf /etc/nginx/conf.d/default.conf

# Expose ports
EXPOSE 80 443

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:80 || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

**Status:** PLANNED

---

### 4.4 Nginx Configuration

Create `frontend/nginx.conf`:

```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 10M;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript 
               application/json application/javascript application/xml+rss 
               application/rss+xml application/atom+xml image/svg+xml 
               text/x-component text/x-cross-domain-policy;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    include /etc/nginx/conf.d/*.conf;
}
```

Create `frontend/default.conf`:

```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
        expires 1h;
        add_header Cache-Control "public, max-age=3600";
    }

    # Static assets with longer cache
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # API proxy
    location /api/ {
        proxy_pass http://backend:3000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    # Deny access to hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
```

**Status:** PLANNED

---

## 5. Running Locally

### 5.1 Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for development)
- Git

### 5.2 Quick Start

```bash
# Clone repository
git clone https://github.com/pattologos12-glitch/Tolog-One.git
cd Tolog-One

# Copy environment templates
cp .env.example .env
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env

# Edit .env files with real values
nano .env
nano backend/.env
nano frontend/.env

# Start containers
docker-compose up -d

# Wait for services to be healthy
docker-compose ps

# Run database migrations
docker-compose exec backend npm run migrate

# Create first user (optional)
docker-compose exec backend npm run seed

# Access application
# Frontend: http://localhost
# Backend API: http://localhost:3000
# Database: localhost:5432
```

### 5.3 Development Mode

```bash
# Keep logs visible
docker-compose up

# In another terminal, watch backend code changes
docker-compose exec backend npm run dev

# Frontend (if needed)
cd frontend
npm run dev
```

### 5.4 Database Migrations

```bash
# Create new migration
docker-compose exec backend npm run migrate:create migration_name

# Run migrations
docker-compose exec backend npm run migrate:up

# Rollback migrations
docker-compose exec backend npm run migrate:down

# Check migration status
docker-compose exec backend npm run migrate:status
```

### 5.5 Database Backups

```bash
# Backup database
docker-compose exec postgres pg_dump -U tolog_user tolog_one > backup.sql

# Restore database
docker-compose exec -T postgres psql -U tolog_user tolog_one < backup.sql
```

**Status:** PLANNED

---

## 6. Production Deployment

### 6.1 Preparation Checklist

- [ ] Generate strong random secrets (JWT_SECRET, DB_PASSWORD, etc.)
- [ ] Set up PostgreSQL managed database (AWS RDS, DigitalOcean, etc.)
- [ ] Set up Redis (AWS ElastiCache, DigitalOcean, etc.)
- [ ] Configure domain name (DNS)
- [ ] Obtain SSL certificates (Let's Encrypt)
- [ ] Set up log aggregation (CloudWatch, Datadog, etc.)
- [ ] Set up monitoring (Prometheus, Grafana, etc.)
- [ ] Set up backups and disaster recovery
- [ ] Configure rate limiting and DDoS protection
- [ ] Run security audit

**Status:** PLANNED

---

### 6.2 Deployment Options

#### Option A: VPS (Linode, DigitalOcean, Hetzner)

1. Rent VPS
2. Install Docker & Docker Compose
3. Clone repository
4. Configure .env with production values
5. Run `docker-compose up -d`
6. Set up reverse proxy (nginx, Caddy)
7. Configure SSL with Let's Encrypt

#### Option B: Kubernetes (EKS, GKE, DigitalOcean)

1. Create Kubernetes cluster
2. Convert docker-compose to Helm charts (future document)
3. Deploy to cluster
4. Set up ingress for HTTPS
5. Configure auto-scaling

#### Option C: PaaS (Heroku, Railway, Render)

1. Push code to git
2. Connect to platform
3. Configure environment variables
4. Platform handles deployment

**Status:** PLANNED

---

### 6.3 Reverse Proxy Setup (Caddy)

Create `Caddyfile`:

```caddy
api.tolog.one {
    encode gzip
    reverse_proxy backend:3000 {
        header_uri -Authorization
    }
}

tolog.one {
    encode gzip
    root * /usr/share/nginx/html
    try_files {path} {path}/ /index.html
    file_server
}
```

Add to docker-compose.yml:

```yaml
caddy:
  image: caddy:latest
  ports:
    - "80:80"
    - "443:443"
  volumes:
    - ./Caddyfile:/etc/caddy/Caddyfile
    - caddy_data:/data
    - caddy_config:/config
  networks:
    - tolog-network
  depends_on:
    - backend
    - frontend
```

**Status:** PLANNED

---

## 7. Monitoring & Logging

### 7.1 Structured Logging

Backend logs to stdout in JSON format:

```json
{
  "timestamp": "2026-08-13T12:00:00.000Z",
  "level": "info",
  "logger": "conversation.service",
  "message": "Conversation created",
  "userId": "user-uuid",
  "conversationId": "conv-uuid",
  "requestId": "req-abc123",
  "duration_ms": 145
}
```

Forward to logging service:
- ELK Stack (Elasticsearch, Logstash, Kibana)
- Datadog
- CloudWatch
- Splunk

### 7.2 Metrics

Expose Prometheus metrics at `/metrics`:

```
# HELP tolog_http_requests_total Total HTTP requests
# TYPE tolog_http_requests_total counter
tolog_http_requests_total{method="GET",endpoint="/conversations",status="200"} 1542

# HELP tolog_http_request_duration_seconds HTTP request duration
# TYPE tolog_http_request_duration_seconds histogram
tolog_http_request_duration_seconds_bucket{endpoint="/api/messages",le="0.1"} 120
tolog_http_request_duration_seconds_bucket{endpoint="/api/messages",le="0.5"} 145

# HELP tolog_ai_requests_total AI provider requests
# TYPE tolog_ai_requests_total counter
tolog_ai_requests_total{provider="gemini",status="success"} 1234
tolog_ai_requests_total{provider="claude",status="error"} 5
```

**Status:** PLANNED

---

### 7.3 Health Checks

```bash
# API health
curl http://localhost:3000/health

# Provider status
curl http://localhost:3000/health/ai-providers

# Database connection
docker-compose exec postgres pg_isready -U tolog_user
```

**Status:** PLANNED

---

## 8. Scaling

### 8.1 Horizontal Scaling (Multiple Backend Instances)

```yaml
# docker-compose.yml
backend:
  build: ./backend
  deploy:
    replicas: 3  # 3 instances
  environment:
    DATABASE_URL: postgresql://...
    REDIS_URL: redis://redis:6379
```

Load balancing via Nginx or Caddy automatically distributes traffic.

**Status:** PLANNED

---

### 8.2 Database Scaling

- Read replicas for read-heavy workloads
- Connection pooling (PgBouncer)
- Sharding by user_id (at massive scale)
- Regular index optimization

**Status:** PLANNED

---

## 9. Backups & Disaster Recovery

### 9.1 Database Backups

**Automated daily backups:**

```bash
#!/bin/bash
# backup-db.sh
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/tolog_one_$DATE.sql.gz"

docker-compose exec -T postgres pg_dump -U tolog_user tolog_one | gzip > $BACKUP_FILE

# Upload to S3
aws s3 cp $BACKUP_FILE s3://tolog-backups/

# Keep only last 30 days
find $BACKUP_DIR -mtime +30 -delete
```

Add to crontab:
```bash
0 2 * * * /path/to/backup-db.sh  # Daily at 2 AM
```

### 9.2 Restoration Procedure

```bash
# List available backups
aws s3 ls s3://tolog-backups/

# Download backup
aws s3 cp s3://tolog-backups/tolog_one_20260813_020000.sql.gz .

# Restore
gunzip < tolog_one_20260813_020000.sql.gz | \
  docker-compose exec -T postgres psql -U tolog_user tolog_one

# Verify
docker-compose exec backend npm run db:check
```

**Status:** PLANNED

---

## 10. Updates & Rollouts

### 10.1 Zero-Downtime Deployment

```bash
# 1. Build new image
docker-compose build backend

# 2. Start new instances alongside old ones
docker-compose up -d --scale backend=2

# 3. Update load balancer to route to new instances
# (handled by orchestration platform)

# 4. Drain old instances (finish existing requests)
# (traffic naturally routes to new instances)

# 5. Stop old instances
docker-compose up -d --scale backend=1
```

**Status:** PLANNED

---

### 10.2 Database Migrations

Always backward compatible:

```bash
# Deploy new backend version (doesn't use new DB columns yet)
# Run migrations on database
docker-compose exec backend npm run migrate:up
# Update backend to use new columns
# Deploy updated backend
```

**Status:** PLANNED

---

## 11. Security in Deployment

### 11.1 Secrets Management

**Never commit secrets:**

```bash
# .env - NOT committed
DATABASE_URL=postgresql://user:password@host/db

# .env.example - committed
DATABASE_URL=postgresql://user:password@host/db
```

**Use managed secrets in production:**
- AWS Secrets Manager
- HashiCorp Vault
- Kubernetes Secrets

### 11.2 Network Security

```yaml
# docker-compose.yml
networks:
  tolog-network:
    driver: bridge
    driver_opts:
      com.docker.network.bridge.name: br_tolog

services:
  backend:
    networks:
      - tolog-network
    # Backend not exposed to host
    ports: []
  
  nginx:
    networks:
      - tolog-network
    # Only nginx exposed
    ports:
      - "80:80"
      - "443:443"
```

### 11.3 Regular Updates

```bash
# Update base images
docker-compose pull
docker-compose build --no-cache

# Update dependencies
npm update
npm audit fix

# Redeploy
docker-compose up -d
```

**Status:** PLANNED

---

## 12. Troubleshooting

### 12.1 Container Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail 100 backend
```

### 12.2 Database Connection Issues

```bash
# Test database connection
docker-compose exec backend node -e "
  const db = require('./dist/db');
  db.query('SELECT 1').then(() => console.log('OK')).catch(e => console.error(e));
"

# Check database status
docker-compose exec postgres pg_isready -U tolog_user

# Check Redis connection
docker-compose exec redis redis-cli ping
```

### 12.3 Memory Issues

```bash
# Check resource usage
docker stats

# Increase memory limit in docker-compose.yml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
```

**Status:** PLANNED

---

## 13. Implementation Checklist

- [ ] Docker files created (Backend, Frontend)
- [ ] Docker Compose configuration complete
- [ ] Environment variables documented
- [ ] Nginx configuration complete
- [ ] Backup strategy implemented
- [ ] Monitoring set up
- [ ] SSL certificates configured
- [ ] Database migrations ready
- [ ] Health checks configured
- [ ] Logging aggregation set up
- [ ] Rate limiting tested
- [ ] Security audit completed

---

**End of Deployment Guide**
