# HIKEathon 2025 - Deployment Guide

## Overview

This guide covers deploying the HIKEathon 2025 platform to GitHub Pages with Supabase backend services.

## Prerequisites

- GitHub repository with Actions enabled
- Supabase project (free tier sufficient for development)
- IONOS Account with Model Hub access
- Domain name (optional)

## Environment Setup

### 1. Supabase Configuration

#### Create Project
1. Visit [supabase.com](https://supabase.com) and create new project
2. Wait for project initialization (2-3 minutes)
3. Note your project URL and API keys

#### Database Schema
Run the following SQL in Supabase SQL Editor:

```sql
-- Teams table
CREATE TABLE teams (
  id BIGSERIAL PRIMARY KEY,
  team_code VARCHAR(8) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  encrypted_token TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Telemetry table
CREATE TABLE telemetry (
  id BIGSERIAL PRIMARY KEY,
  team_code VARCHAR(8),
  event_type VARCHAR(50) NOT NULL,
  event_data JSONB,
  session_id VARCHAR(255),
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Global todos table
CREATE TABLE todos (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  priority INTEGER DEFAULT 5,
  status VARCHAR(20) DEFAULT 'pending',
  assigned_to VARCHAR(255),
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Team-specific todos
CREATE TABLE team_todos (
  id BIGSERIAL PRIMARY KEY,
  team_code VARCHAR(8) REFERENCES teams(team_code),
  todo_id BIGINT REFERENCES todos(id),
  status VARCHAR(20) DEFAULT 'pending',
  notes TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin broadcasts
CREATE TABLE broadcasts (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info',
  target_audience VARCHAR(100) DEFAULT 'all',
  active BOOLEAN DEFAULT true,
  created_by VARCHAR(255),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Global settings
CREATE TABLE settings (
  key VARCHAR(255) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_telemetry_team_code ON telemetry(team_code);
CREATE INDEX idx_telemetry_created_at ON telemetry(created_at);
CREATE INDEX idx_telemetry_event_type ON telemetry(event_type);
CREATE INDEX idx_team_todos_team_code ON team_todos(team_code);
CREATE INDEX idx_broadcasts_active ON broadcasts(active);
```

#### Row Level Security (RLS)
```sql
-- Enable RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Policies (basic - adjust based on your needs)
CREATE POLICY "Teams can view their own data" ON teams
  FOR ALL USING (auth.jwt() ->> 'team_code' = team_code);

CREATE POLICY "Teams can insert their telemetry" ON telemetry
  FOR INSERT WITH CHECK (auth.jwt() ->> 'team_code' = team_code);

CREATE POLICY "Public read access to broadcasts" ON broadcasts
  FOR SELECT USING (active = true);
```

#### Edge Functions Deployment

Deploy the Supabase Edge Functions:

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref [your-project-ref]

# Deploy all functions
supabase functions deploy auth-validate
supabase functions deploy proxy-chat
supabase functions deploy proxy-images
supabase functions deploy search-web
supabase functions deploy fetch-url
supabase functions deploy get-models

# Set function secrets
supabase secrets set IONOS_API_KEY=[your-ionos-api-key]
supabase secrets set ENCRYPTION_KEY=[your-32-char-encryption-key]
supabase secrets set SERPER_API_KEY=[your-serper-api-key]
```

### 2. GitHub Repository Setup

#### Environment Secrets

Add the following secrets in GitHub repository settings (Settings → Secrets and variables → Actions):

```
NUXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NUXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
```

#### GitHub Pages Configuration

1. Go to repository Settings → Pages
2. Set Source to "GitHub Actions"
3. The deployment workflow will handle the rest

### 3. IONOS Model Hub Setup

1. Register at [cloud.ionos.com](https://cloud.ionos.com)
2. Access Model Hub service
3. Generate API key
4. Add key to Supabase Edge Function secrets

## Deployment Process

### Automated Deployment

The platform uses GitHub Actions for CI/CD. Deployment triggers on:
- Push to `main` branch
- Manual workflow dispatch
- Pull request creation (testing only)

#### Deployment Workflow

1. **Test Phase**:
   - Install dependencies
   - Run ESLint
   - Type checking with TypeScript
   - Unit tests with Vitest
   - Security audit

2. **Build Phase**:
   - Static site generation with Nuxt
   - Asset optimization
   - Bundle analysis

3. **Deploy Phase**:
   - Deploy to GitHub Pages
   - Health check verification

4. **Post-Deploy**:
   - E2E tests with Playwright
   - Performance audit with Lighthouse

### Manual Deployment

If needed, you can deploy manually:

```bash
# Install dependencies
pnpm install

# Build for production
pnpm generate

# Deploy to GitHub Pages (if configured)
# Or upload .output/public to your hosting provider
```

## Configuration

### Production Environment

#### Nuxt Configuration

Key configuration for production in `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  ssr: false,
  app: {
    baseURL: '/hikeathon-2025/',
    buildAssetsDir: 'assets/'
  },
  nitro: {
    preset: 'static'
  },
  runtimeConfig: {
    public: {
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY
    }
  }
})
```

#### Security Headers

Content Security Policy and security headers are configured in `nuxt.config.ts`:

```typescript
meta: [
  { 
    'http-equiv': 'Content-Security-Policy', 
    content: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co https://ai-proxy.ionos.com;"
  },
  { 'http-equiv': 'X-Content-Type-Options', content: 'nosniff' },
  { 'http-equiv': 'X-Frame-Options', content: 'DENY' }
]
```

### Performance Optimization

#### Build Optimization

```typescript
vite: {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'pinia'],
          supabase: ['@supabase/supabase-js'],
          crypto: ['bcryptjs', 'jsonwebtoken']
        }
      }
    }
  }
}
```

#### Service Worker

Service worker is automatically registered for:
- Static asset caching
- Offline functionality
- Background sync

## Monitoring and Maintenance

### Health Monitoring

#### Health Check Endpoint

The platform includes a health check at `/api/health`:

```json
{
  "status": "healthy",
  "timestamp": "2025-09-05T12:00:00Z",
  "services": {
    "database": "connected",
    "storage": "available",
    "realtime": "active"
  }
}
```

#### Monitoring Setup

1. **Uptime Monitoring**: Use external service to ping health endpoint
2. **Error Tracking**: Configure Sentry for error monitoring
3. **Performance**: Use Lighthouse CI for performance monitoring
4. **Analytics**: Built-in telemetry system tracks usage

### Backup and Recovery

#### Automated Backups

Supabase provides automatic backups:
- Free tier: Daily backups, 7-day retention
- Pro tier: Point-in-time recovery, 30-day retention

#### Manual Backup

```bash
# Database backup
pg_dump "postgresql://[user]:[password]@[host]:5432/postgres" > backup.sql

# Restore backup
psql "postgresql://[user]:[password]@[host]:5432/postgres" < backup.sql
```

## Troubleshooting

### Common Issues

#### Build Failures

**Problem**: Build fails during GitHub Actions
**Solution**: 
1. Check environment variables are set
2. Verify all dependencies are in package.json
3. Review build logs for specific errors

#### Deployment Issues

**Problem**: Site not loading after deployment
**Solution**:
1. Check baseURL configuration matches repository name
2. Verify GitHub Pages is enabled
3. Check for 404 errors in browser console

#### API Connection Issues

**Problem**: Cannot connect to Supabase
**Solution**:
1. Verify Supabase project is running
2. Check API keys are correct
3. Ensure CORS settings allow your domain

### Debug Mode

Enable debug logging:

```bash
# Local development
DEBUG=nuxt:* npm run dev

# Production debugging (temporary)
NODE_ENV=development npm run start
```

## Security Considerations

### Production Security

1. **HTTPS Only**: Always use HTTPS in production
2. **Environment Variables**: Never commit secrets to repository
3. **API Keys**: Rotate keys regularly
4. **Access Control**: Implement proper authentication
5. **Input Validation**: Sanitize all user inputs

### Security Headers

Implemented security headers:
- Content-Security-Policy
- X-Content-Type-Options
- X-Frame-Options
- X-XSS-Protection
- Referrer-Policy

## Performance Requirements

### Target Metrics

- **Page Load Time**: < 3 seconds
- **Time to Interactive**: < 5 seconds
- **First Contentful Paint**: < 1.5 seconds
- **Lighthouse Score**: > 90
- **Core Web Vitals**: All in "Good" range

### Optimization Strategies

1. **Code Splitting**: Automatic with manual chunks
2. **Asset Compression**: Gzip/Brotli compression
3. **CDN**: GitHub Pages provides global CDN
4. **Caching**: Service worker caches static assets
5. **Bundle Size**: Monitored and optimized

## Scaling Considerations

### GitHub Pages Limits

- **Bandwidth**: 100GB/month
- **Storage**: 1GB repository size
- **Build Time**: 10 minutes max per build

### Supabase Limits

**Free Tier**:
- 500MB database
- 1GB file storage
- 2 million API requests/month

**Scaling Options**:
- Upgrade to Supabase Pro for higher limits
- Implement caching strategies
- Optimize database queries

## Post-Deployment Checklist

### Verification Steps

- [ ] Site loads correctly at production URL
- [ ] All navigation links work
- [ ] Authentication system functions
- [ ] Chat API responds correctly
- [ ] Image generation works
- [ ] Admin panel accessible
- [ ] Health check returns 200 OK
- [ ] Performance metrics meet targets
- [ ] Error tracking is working
- [ ] Backup systems are operational

### Go-Live Preparation

- [ ] Test with limited users
- [ ] Monitor error rates
- [ ] Verify all integrations
- [ ] Prepare support documentation
- [ ] Train support team
- [ ] Set up monitoring alerts
- [ ] Document rollback procedures

---

## Support Contacts

- **Technical Issues**: [GitHub Issues](https://github.com/ingo-eichhorst/hikeathon-2025/issues)
- **Supabase Support**: [Supabase Dashboard](https://supabase.com/dashboard/support)
- **IONOS Support**: [IONOS Cloud Support](https://cloud.ionos.com/support)

*Last Updated: September 2025*