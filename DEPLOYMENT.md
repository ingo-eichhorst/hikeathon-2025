# Deployment Guide

## One-Command Deployment to GitHub Pages

Deploy your HIKEathon 2025 app to GitHub Pages with a single command:

```bash
pnpm run deploy
```

This command will:
1. Generate the static site (`nuxt generate`)
2. Deploy to GitHub Pages (`gh-pages -d .output/public`)

The app will be available at: **https://ingo-eichhorst.github.io/hikeathon-2025/**

## First-Time Setup

### 1. Enable GitHub Pages
1. Go to your repository: https://github.com/ingo-eichhorst/hikeathon-2025
2. Navigate to **Settings** → **Pages**
3. Under **Source**, select **Deploy from a branch**
4. Select branch: **gh-pages**
5. Select folder: **/ (root)**
6. Click **Save**

### 2. Set Environment Variables (Optional)
If you need to use different Supabase credentials for production:

Create `.env` file (not committed to git):
```env
NUXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NUXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Database Migrations

Before deploying, ensure your Supabase database is up to date:

```bash
# Apply all pending migrations
npx supabase db push
```

## Deployment Workflow

Typical deployment workflow:

```bash
# 1. Make your changes
# 2. Test locally
pnpm dev

# 3. Apply database migrations if needed
npx supabase db push

# 4. Deploy
pnpm run deploy
```

## Rollback

To rollback to a previous version:

```bash
# View deployment history
git log origin/gh-pages

# Rollback to specific commit
git checkout gh-pages
git reset --hard <commit-hash>
git push origin gh-pages --force
```

## Troubleshooting

### Deploy Command Fails
- Ensure you have committed your changes to git
- Check that you have push access to the repository
- Verify GitHub Pages is enabled in repository settings

### 404 Errors After Deployment
- Ensure `.nojekyll` file exists in `/public` directory (already included)
- Verify `baseURL` in `nuxt.config.ts` matches your GitHub Pages URL
- Check browser console for detailed error messages

### Environment Variables Not Working
- Environment variables must be prefixed with `NUXT_PUBLIC_` to be available in the browser
- Rebuild after changing environment variables: `pnpm run deploy`

## Additional Deployment Options

### Alternative: Manual GitHub Actions
You can also set up automatic deployment via GitHub Actions. Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm run generate
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: \${{ secrets.GITHUB_TOKEN }}
          publish_dir: .output/public
```

### Alternative: Deploy to Other Platforms

#### Vercel
```bash
pnpm add -D vercel
pnpm vercel
```

#### Netlify
```bash
pnpm add -D netlify-cli
pnpm netlify deploy --prod
```

#### Cloudflare Pages
```bash
pnpm run generate
# Upload .output/public via Cloudflare dashboard
```

## Production Checklist

Before deploying to production:

- [ ] Database migrations applied
- [ ] Environment variables configured
- [ ] Edge Functions deployed (`npx supabase functions deploy`)
- [ ] Testing completed
- [ ] Admin credentials secured
- [ ] Error tracking configured
- [ ] Performance tested
- [ ] Security headers verified
