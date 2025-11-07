# Portal UI - Deployment Guide

Complete guide to deploying the AI Workflow Portal UI alongside your existing infrastructure.

## 📋 Prerequisites

- Docker and Docker Compose installed
- Existing AI Workflow Infrastructure running (from main project)
- Ports 3002 available
- Node.js 20+ (for local development)

## 🚀 Quick Deployment (Docker)

### Step 1: Copy Files

Copy the entire `portal-ui` directory to your project root:

```bash
# Your project structure should look like:
ai-workflow-infrastructure/
├── portal-ui/              # ← New directory
├── portal-backend/
├── langgraph-service/
├── secrets-service/
├── docker-compose.yml
└── ...
```

### Step 2: Update docker-compose.yml

Add the Portal UI service to your existing `docker-compose.yml`:

```yaml
services:
  # ... existing services ...

  portal-ui:
    build: ./portal-ui
    container_name: portal-ui
    ports:
      - "3002:3002"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=http://portal-api:5000
      - NEXT_PUBLIC_ACTIVEPIECES_URL=http://activepieces-server:8080
      - NEXT_PUBLIC_FLOWISE_URL=http://flowise:3000
      - NEXT_PUBLIC_TEMPORAL_URL=http://temporal-ui:8088
      - NEXT_PUBLIC_GRAFANA_URL=http://grafana:3001
      - NEXT_PUBLIC_NANGO_URL=http://nango:3003
    networks:
      - ai-workflow-network
    depends_on:
      - portal-api
      - activepieces-server
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3002"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

networks:
  ai-workflow-network:
    driver: bridge
```

### Step 3: Build and Start

```bash
# Build the Portal UI image
docker-compose build portal-ui

# Start the Portal UI (and dependencies)
docker-compose up -d portal-ui

# Check logs
docker-compose logs -f portal-ui
```

### Step 4: Verify

```bash
# Check health
curl http://localhost:3002

# Should see Next.js page
```

Access at: **http://localhost:3002**

## 💻 Local Development Setup

### Step 1: Install Dependencies

```bash
cd portal-ui
npm install
```

### Step 2: Configure Environment

```bash
# Copy template
cp .env.local.template .env.local

# Edit variables
nano .env.local
```

Ensure `.env.local` contains:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_ACTIVEPIECES_URL=http://localhost:8080
NEXT_PUBLIC_FLOWISE_URL=http://localhost:3000
NEXT_PUBLIC_TEMPORAL_URL=http://localhost:8088
NEXT_PUBLIC_GRAFANA_URL=http://localhost:3001
NEXT_PUBLIC_NANGO_URL=http://localhost:3003
```

### Step 3: Run Development Server

```bash
npm run dev
```

Access at: **http://localhost:3002**

### Development Features

- ✅ Hot reload
- ✅ Fast refresh
- ✅ TypeScript checking
- ✅ Detailed error messages
- ✅ Source maps

## 🔧 Configuration

### Environment Variables

**Required:**
- `NEXT_PUBLIC_API_URL` - Portal Backend API URL
- `NEXT_PUBLIC_ACTIVEPIECES_URL` - Activepieces UI URL
- `NEXT_PUBLIC_FLOWISE_URL` - Flowise UI URL
- `NEXT_PUBLIC_TEMPORAL_URL` - Temporal UI URL
- `NEXT_PUBLIC_GRAFANA_URL` - Grafana URL
- `NEXT_PUBLIC_NANGO_URL` - Nango API URL

**Optional:**
- `NEXT_PUBLIC_APP_NAME` - Application name (default: "AI Workflow Portal")
- `NEXT_PUBLIC_APP_VERSION` - Version string (default: "3.0.0")

### Port Configuration

To change the port from 3002:

1. **Update package.json:**
```json
{
  "scripts": {
    "dev": "next dev -p 3003",
    "start": "next start -p 3003"
  }
}
```

2. **Update Dockerfile:**
```dockerfile
EXPOSE 3003
ENV PORT 3003
```

3. **Update docker-compose.yml:**
```yaml
ports:
  - "3003:3003"
```

## 🌐 Production Deployment

### Option 1: Docker Compose (Recommended)

Already covered in Quick Deployment above. This runs alongside your existing services.

### Option 2: Standalone Docker

```bash
# Build image
docker build -t ai-workflow-portal-ui:latest ./portal-ui

# Run container
docker run -d \
  --name portal-ui \
  -p 3002:3002 \
  -e NEXT_PUBLIC_API_URL=http://your-api-url:5000 \
  -e NEXT_PUBLIC_ACTIVEPIECES_URL=http://your-activepieces:8080 \
  --network ai-workflow-network \
  ai-workflow-portal-ui:latest
```

### Option 3: Vercel (Frontend UI)

You can deploy the Next.js UI to Vercel and point it at any publicly reachable API URL (including your Docker-hosted API) and Supabase.

1) Prepare environment variables in Vercel (Project → Settings → Environment Variables):

- `NEXT_PUBLIC_API_URL` → https://your-api-host.tld:5000
- `NEXT_PUBLIC_SUPABASE_URL` → https://YOUR-PROJECT.supabase.co
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → your-anon-key
- `NEXT_PUBLIC_APP_NAME` → AI Workflow Portal (optional)
- `NEXT_PUBLIC_APP_VERSION` → 3.0.0 (optional)
- `NEXT_PUBLIC_DEMO_MODE` → false (recommended)

2) Rewrites (already configured):

- We added a rewrite in `next.config.js` to proxy `/api/*` to `${NEXT_PUBLIC_API_URL}/api/*`. This avoids CORS issues on Vercel and keeps the browser calling same-origin.

3) Deployment options:

- Connect the GitHub repo in Vercel and import the project. Build command: `npm run build`. Output directory: `.next` (defaults are fine).
- Or use the Vercel CLI locally:

```bash
npm i -g vercel
vercel
```

4) Backend hosting:

- The Express API is not deployed on Vercel by default. Deploy it to any public host (Render/Railway/Fly/Docker on a VPS). Then set `NEXT_PUBLIC_API_URL` to that host.
- If you later want to move the API to Vercel Functions, you can port routes into `api/` pages; for now, the proxy rewrite is the simplest path.

5) Supabase:

- Ensure the Supabase project values above are set, and that the Auth user(s) exist. The UI will use Supabase Auth for login.

6) Test:

- Open your Vercel URL, sign in with `admin@example.com / admin123` or any user you created. Users and other data should flow via the proxy to your API.

**Note:** Production requires your API to be internet-accessible from Vercel; `localhost` will not work for Vercel previews.

### Option 4: Kubernetes

Example deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: portal-ui
spec:
  replicas: 2
  selector:
    matchLabels:
      app: portal-ui
  template:
    metadata:
      labels:
        app: portal-ui
    spec:
      containers:
      - name: portal-ui
        image: ai-workflow-portal-ui:latest
        ports:
        - containerPort: 3002
        env:
        - name: NEXT_PUBLIC_API_URL
          value: "http://portal-api:5000"
        # ... other env vars
---
apiVersion: v1
kind: Service
metadata:
  name: portal-ui
spec:
  selector:
    app: portal-ui
  ports:
  - port: 80
    targetPort: 3002
  type: LoadBalancer
```

## 🔐 SSL/TLS Setup

### Using Nginx Reverse Proxy

```nginx
server {
    listen 443 ssl http2;
    server_name portal.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Using Traefik

```yaml
services:
  portal-ui:
    # ... existing config ...
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.portal-ui.rule=Host(`portal.yourdomain.com`)"
      - "traefik.http.routers.portal-ui.entrypoints=websecure"
      - "traefik.http.routers.portal-ui.tls=true"
      - "traefik.http.routers.portal-ui.tls.certresolver=letsencrypt"
```

## 🧪 Testing Deployment

### Health Checks

```bash
# Basic health
curl http://localhost:3002

# API connectivity
curl http://localhost:3002/api/health

# Check all services
docker-compose ps
```

### Load Testing

```bash
# Install k6
brew install k6  # or download from k6.io

# Create test script
cat > load-test.js << 'EOF'
import http from 'k6/http';
import { check } from 'k6';

export default function() {
  const res = http.get('http://localhost:3002');
  check(res, {
    'status is 200': (r) => r.status === 200,
  });
}
EOF

# Run test
k6 run --vus 10 --duration 30s load-test.js
```

## 📊 Monitoring

### Application Logs

```bash
# Follow logs
docker-compose logs -f portal-ui

# Last 100 lines
docker-compose logs --tail=100 portal-ui

# With timestamps
docker-compose logs -t portal-ui
```

### Performance Monitoring

Add monitoring to docker-compose.yml:

```yaml
services:
  portal-ui:
    # ... existing config ...
    labels:
      - "prometheus.io/scrape=true"
      - "prometheus.io/port=3002"
      - "prometheus.io/path=/api/metrics"
```

### Error Tracking

Integrate Sentry (optional):

```bash
# Install Sentry SDK
cd portal-ui
npm install @sentry/nextjs

# Initialize
npx @sentry/wizard -i nextjs

# Add DSN to .env.local
NEXT_PUBLIC_SENTRY_DSN=your_dsn_here
```

## 🔄 Updates and Maintenance

### Updating the Portal UI

```bash
# Pull latest changes
git pull origin main

# Rebuild image
docker-compose build portal-ui

# Recreate container
docker-compose up -d portal-ui

# Verify
docker-compose ps portal-ui
```

### Database Migrations

No database migrations needed - Portal UI is stateless and uses the existing Portal Backend API.

### Backup Strategy

Portal UI is stateless. Focus backups on:
- Backend databases
- User uploaded files
- Configuration files

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Find process using port 3002
lsof -i :3002

# Kill process
kill -9 <PID>

# Or use different port (see Port Configuration above)
```

### Cannot Connect to Backend

```bash
# Check if backend is running
docker-compose ps portal-api

# Test connection
docker-compose exec portal-ui curl http://portal-api:5000/health

# Check network
docker network inspect ai-workflow-network
```

### Build Failures

```bash
# Clear Docker cache
docker-compose build --no-cache portal-ui

# Clear npm cache
cd portal-ui
rm -rf node_modules package-lock.json
npm install
```

### Runtime Errors

```bash
# Check environment variables
docker-compose exec portal-ui env | grep NEXT_PUBLIC

# Restart container
docker-compose restart portal-ui

# View detailed logs
docker-compose logs --tail=500 portal-ui
```

### TypeScript Errors

```bash
cd portal-ui

# Type check
npm run type-check

# Fix common issues
rm -rf .next
npm run build
```

## 📈 Performance Optimization

### Production Build

```bash
# Analyze bundle size
cd portal-ui
npm install --save-dev @next/bundle-analyzer

# Update next.config.js
# const withBundleAnalyzer = require('@next/bundle-analyzer')({
#   enabled: process.env.ANALYZE === 'true',
# })
# module.exports = withBundleAnalyzer(nextConfig)

# Run analysis
ANALYZE=true npm run build
```

### CDN Integration

For static assets, use a CDN:

```javascript
// next.config.js
module.exports = {
  assetPrefix: process.env.CDN_URL || '',
  // ...
}
```

### Caching Strategy

```nginx
# Nginx caching example
location /_next/static {
    proxy_pass http://localhost:3002;
    proxy_cache_valid 200 365d;
    proxy_cache_use_stale error timeout http_500 http_502 http_503 http_504;
}
```

## ✅ Deployment Checklist

Before going to production:

- [ ] All environment variables configured
- [ ] SSL/TLS certificates installed
- [ ] Firewall rules configured
- [ ] Monitoring set up
- [ ] Backup strategy in place
- [ ] Error tracking configured
- [ ] Load testing completed
- [ ] Security scan completed
- [ ] Documentation updated
- [ ] Team trained on new UI
- [ ] Rollback plan documented

## 🆘 Support

### Getting Help

1. Check logs: `docker-compose logs portal-ui`
2. Review this guide
3. Check main README.md
4. Review IMPLEMENTATION_SUMMARY.md
5. Check GitHub issues
6. Contact support team

### Common Questions

**Q: Do I need to modify the backend?**
A: No, the Portal UI works with the existing Portal Backend API.

**Q: Can I run this without Docker?**
A: Yes, use `npm run dev` for development or build and run with Node.js.

**Q: How do I add custom branding?**
A: Edit colors in `tailwind.config.js` and update `globals.css`.

**Q: Can I deploy to a subdirectory?**
A: Yes, set `basePath` in `next.config.js`.

**Q: How do I enable analytics?**
A: Add Google Analytics or Plausible to `app/layout.tsx`.

---

**Need immediate help?**
- Review logs: `docker-compose logs -f portal-ui`
- Check health: `curl http://localhost:3002/health`
- Restart service: `docker-compose restart portal-ui`

**Production-ready!** ✅

**Version**: 3.0.0  
**Last Updated**: November 2025
