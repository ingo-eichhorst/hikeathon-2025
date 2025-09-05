# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HIKEathon 2025 is a hackathon web application built as a Nuxt 3 SPA with Supabase backend. Teams interact with AI models via IONOS Model Hub, generate images, and collaborate during a 48-hour event.

## Development Commands

```bash
# Install dependencies
pnpm install

# Run development server (default port 3000)
pnpm dev

# Build for production (GitHub Pages deployment)
pnpm build

# Preview production build
pnpm preview

# Type checking
pnpm typecheck

# Linting
pnpm lint

# Test IONOS API connection
./test.sh
```

## Architecture

### Frontend Stack
- **Nuxt 3** configured as SPA (`ssr: false`) for GitHub Pages deployment
- **Vue 3** with Composition API
- **Pinia** for state management (stores in `/stores`)
- **Tailwind CSS** for styling
- **TypeScript** with strict mode enabled

### Backend Services
- **Supabase** for database, auth, and real-time features
- **Edge Functions** in `/supabase/functions/` for API proxying:
  - `auth-validate`: Team authentication
  - `proxy-chat`: IONOS Model Hub chat proxy with streaming
  - `proxy-images`: Image generation proxy
  - `search-web`: Web search integration
  - `fetch-url`: URL content fetching
  - `get-models`: Available models listing

### Key Stores
- `auth.ts`: Team authentication and session management
- `chat.ts`: Chat messages and streaming state
- `settings.ts`: App preferences and system prompts
- `images.ts`: Generated images management

## Security Architecture

- **Token Encryption**: AES-256-GCM with PBKDF2 (600k iterations)
- **Team Authentication**: 8-character codes with encrypted token storage
- **CORS Handling**: Supabase Edge Functions proxy external APIs
- **CSP Headers**: Configured in `nuxt.config.ts` for security

## Environment Variables

Required in `.env`:
```
NUXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NUXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Database Schema

Main tables in Supabase:
- `teams`: Team registration and encrypted tokens
- `telemetry`: Usage metrics per team/hour
- `todos`: Global task list
- `team_todos`: Team-specific progress
- `broadcasts`: Admin messages
- `settings`: Global configuration

## Deployment

Configured for GitHub Pages with:
- Base URL: `/hikeathon-2025/`
- Build assets directory: `assets/`
- Static generation via `pnpm generate`

## Testing Approach

- Component testing with Vitest
- E2E testing with Playwright
- Manual API testing via `test.sh` script

## API Integration

IONOS Model Hub integration:
- Base URL: `https://openai.inference.de-txl.ionos.com`
- Streaming support for chat completions
- Image generation endpoints
- Rate limiting and retry logic handled in Edge Functions