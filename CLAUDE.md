# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HIKEathon 2025 is a hackathon web application built as a Nuxt 3 SPA with Supabase backend. Teams interact with AI models via IONOS Model Hub, generate images, and collaborate during a 48-hour event.

## Development Commands

```bash
# Install dependencies
pnpm install

# Run development server (port 4000, accessible at http://localhost:4000/hikeathon-2025/)
pnpm dev

# Build for production (GitHub Pages deployment)
pnpm build

# Preview production build
pnpm preview

# Type checking
pnpm typecheck

# Linting
pnpm lint

# Run unit tests
pnpm test:unit

# Run unit tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run a single test file (replace path as needed)
pnpm test:unit test/unit/stores/auth.test.ts

# Run E2E tests
pnpm test:e2e

# Run E2E tests with UI
pnpm test:e2e:ui

# Test IONOS API connection
./test.sh

# Run Edge Functions locally
supabase functions serve

# Check for type errors and lint issues before committing
pnpm typecheck && pnpm lint
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
- `broadcasts.ts`: Real-time broadcast messages
- `admin.ts`: Admin panel state

### Services Layer
- `telemetry.ts`: Usage tracking and metrics aggregation
- `todos.ts`: Todo list management
- `broadcast.ts`: Real-time messaging service
- `pdf.ts`: PDF processing and text extraction
- `image.ts`: Image generation client
- `rag.ts`: RAG (Retrieval-Augmented Generation) implementation
- `monitoring.ts`: System health and performance monitoring

### Utilities
- `crypto.ts`: AES-256-GCM encryption/decryption for team tokens
- `api-client.ts`: HTTP client wrapper for API calls
- `sanitize.ts`: Input sanitization and validation

### Middleware
- `auth.global.ts`: Global authentication guard
- `auth.ts`: Route-specific authentication
- `admin.ts`: Admin-only route protection

## Security Architecture

- **Token Encryption**: AES-256-GCM with PBKDF2 (600k iterations)
- **Team Authentication**: 8-character codes with encrypted token storage
- **CORS Handling**: Supabase Edge Functions proxy external APIs
- **CSP Headers**: Configured in `nuxt.config.ts` for security

## Environment Setup

### Initial Setup

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your Supabase credentials
```

### Required Environment Variables

Set these in `.env`:
```
NUXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NUXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

The IONOS API token is stored as a Supabase secret and accessed via Edge Functions (see README.md for management instructions).

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

- **Unit Tests**: Vitest with Vue Test Utils (`test/unit/`)
  - Component tests (e.g., `AppHeader.test.ts`)
  - Store tests (e.g., `auth.test.ts`)
  - Service tests (e.g., `telemetry.test.ts`)
- **E2E Tests**: Playwright (`test/e2e/`)
  - User journey tests
  - Performance tests
  - Security tests
  - Page objects in `test/e2e/pages/`
- **Manual API Tests**: `test.sh` script for IONOS API validation
- **Test Setup**: Global setup/teardown in `test/e2e/` for E2E, mocks in `test/mocks/`

## API Integration

IONOS Model Hub integration:
- Base URL: `https://openai.inference.de-txl.ionos.com/v1`
- Streaming support for chat completions via SSE
- Image generation endpoints
- Rate limiting and retry logic handled in Edge Functions
- Default chat model: `gpt-oss-120b`
- Default image model: `flux-1-schnell`

## Important Implementation Notes

### Request Flow
1. Team authenticates with 8-character code → `auth-validate` Edge Function
2. Encrypted IONOS token retrieved from database
3. Requests proxied through Edge Functions to avoid CORS and protect tokens
4. Telemetry aggregated per team per hour (not raw logs)

### Key Features
- **Streaming Chat**: Stop button support, message editing, re-send
- **File Uploads**: PDF & TXT support (max 5MB) with text extraction
- **Real-time Updates**: Supabase Realtime for broadcasts, todos, countdown
- **Admin Features**: Telemetry dashboard, broadcast management, todo creation
- **PWA Support**: Service worker registration in `nuxt.config.ts`

### Chunk Strategy
Manual code splitting in Vite config:
- `vendor`: Vue core, Pinia, VueUse
- `supabase`: Supabase client
- `crypto`: bcryptjs, jsonwebtoken
- `ui`: Chart.js components
- `markdown`: Marked, Highlight.js

## Development Workflows

### Before Committing
Always run type checking and linting to catch issues early:
```bash
pnpm typecheck && pnpm lint
```

### Debugging Edge Functions
When testing locally:
```bash
# Terminal 1: Start Edge Functions emulator
supabase functions serve

# Terminal 2: Start dev server (will use local functions)
pnpm dev
```

### Checking Edge Function Logs
View logs from deployed functions in Supabase Dashboard:
1. Go to https://app.supabase.com
2. Select your project
3. Navigate to **Edge Functions**
4. Select the function name to see real-time logs

This is essential when debugging 401 errors or API issues in production.

### PDF Extraction Testing
PDF handling uses pdf.js. If you modify PDF processing:
```bash
pnpm test:watch test/unit/services/pdf.test.ts
```

Note: The PDF.js worker uses a bundled `.js` file (not external CDN) to work with Nuxt's build system.