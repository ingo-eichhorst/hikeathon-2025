# HIKEathon 2025

A Nuxt 3 web application for managing a 48-hour hackathon event with AI integration via IONOS Model Hub.

## Overview

HIKEathon 2025 is a collaborative platform where teams:
- Authenticate with team codes
- Chat with AI models (GPT, Llama, etc.)
- Generate images using AI
- Track usage and metrics
- Receive real-time broadcasts from event organizers

## Technology Stack

- **Frontend:** Nuxt 3 (Vue 3), Pinia, Tailwind CSS
- **Backend:** Supabase (PostgreSQL, Auth, Real-time)
- **AI APIs:** IONOS Model Hub (Chat, Image Generation)
- **Deployment:** GitHub Pages (SPA)

## Quick Start

### Prerequisites

- Node.js 18+ and pnpm
- Supabase project
- IONOS Model Hub API credentials

### Installation

```bash
# Install dependencies
pnpm install

# Create .env file with Supabase credentials
cp .env.example .env
# Edit .env with your Supabase URL and anon key
```

### Development

```bash
# Start dev server on http://localhost:4000/hikeathon-2025/
pnpm dev

# Run type checking
pnpm typecheck

# Run linting
pnpm lint

# Run tests
pnpm test:unit
pnpm test:e2e
```

### Production Build

```bash
# Build for GitHub Pages
pnpm build

# Preview production build
pnpm preview
```

## Configuration

### Environment Variables

**Frontend (.env file):**
```
NUXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NUXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### IONOS API Key Management

The IONOS API key is stored securely as a Supabase secret and used by Edge Functions.

#### Updating the IONOS API Key

**Step 1: Get your new token from IONOS**

1. Log in to [IONOS Model Hub](https://ionos.cloud)
2. Navigate to API Keys or Tokens section
3. Generate or copy your API token (JWT format)

**Step 2: Update the secret in Supabase**

Using the Supabase CLI:

```bash
supabase secrets set IONOS_TOKEN="your-new-token-here"
```

Or via the Supabase Dashboard:

1. Go to your project at https://app.supabase.com
2. Navigate to **Settings** → **Edge Functions**
3. Find the **Secrets** section
4. Update or create the `IONOS_TOKEN` secret
5. Paste your new token

**Step 3: Deploy the Edge Functions**

```bash
supabase functions deploy proxy-chat
supabase functions deploy proxy-images
supabase functions deploy get-models
```

**Step 4: Test**

1. Refresh your browser (hard refresh with Cmd+Shift+R)
2. Try sending a chat message or generating an image
3. Check the browser console for any 401 errors

#### Token Expiration

If you see `401 Unauthorized` errors with message "wrong or no api key provided":

1. The IONOS token has likely expired
2. Follow the steps above to get a new token
3. Update the secret in Supabase
4. Redeploy the Edge Functions

## Project Structure

```
├── components/           # Vue components
├── pages/               # Nuxt pages (routes)
├── stores/              # Pinia stores
├── composables/         # Vue composables
├── services/            # Business logic
├── utils/               # Helper utilities
├── plugins/             # Nuxt plugins
├── middleware/          # Route middleware
├── supabase/
│   ├── functions/       # Edge Functions (deno)
│   │   ├── proxy-chat/      # Chat API proxy
│   │   ├── proxy-images/    # Image generation proxy
│   │   ├── get-models/      # Model list endpoint
│   │   └── _shared/         # Shared utilities
│   ├── migrations/      # Database migrations
│   └── config.toml      # Supabase config
├── public/              # Static assets
├── test/                # Test files
└── nuxt.config.ts       # Nuxt configuration
```

## Key Features

### Authentication
- Team-based authentication with 8-character codes
- Session management with encryption
- Automatic token refresh

### Chat
- Real-time chat with multiple AI models
- Streaming support
- Message editing and re-send
- Stop button for long requests

### Image Generation
- IONOS Model Hub image generation
- Base64 image encoding/decoding
- Multiple model support (Flux, etc.)

### Admin Panel
- Telemetry dashboard
- Broadcast messages
- Todo list management
- System configuration

### Real-time Features
- Supabase Realtime subscriptions
- Broadcast notifications
- Live countdown
- Presence tracking

## API Documentation

### Edge Functions

All Edge Functions use the IONOS_TOKEN from Supabase secrets for authentication.

#### POST /functions/v1/proxy-chat
Proxy for IONOS chat completions API
```json
{
  "model": "gpt-oss-120b",
  "messages": [{
    "role": "user",
    "content": "Hello!"
  }],
  "stream": true
}
```

#### POST /functions/v1/proxy-images
Proxy for IONOS image generation API
```json
{
  "model": "flux-1-schnell",
  "prompt": "A beautiful landscape",
  "size": "1024x1024",
  "n": 1
}
```

#### GET /functions/v1/get-models
Get available IONOS models
```json
{
  "object": "list",
  "data": [...]
}
```

## Database Schema

Key tables:
- `teams` - Team registration and auth
- `telemetry` - Usage metrics
- `todos` - Global task list
- `team_todos` - Team progress tracking
- `broadcasts` - Admin messages
- `notifications` - User notifications
- `countdown` - Event countdown

## Deployment

### GitHub Pages

```bash
# Build and generate static files
pnpm build

# Files are generated in .output/public/
# Configure GitHub Pages to deploy from this directory
```

### Supabase Edge Functions

```bash
# Login to Supabase
supabase login

# Deploy all functions
supabase functions deploy

# Or deploy specific function
supabase functions deploy proxy-chat
```

## Troubleshooting

### Chat/Image Generation returning 401 errors

**Issue:** `"Unauthorized, wrong or no api key provided to process this request"`

**Solution:**
1. Check if IONOS token is expired
2. Get a new token from IONOS Model Hub
3. Update the secret: `supabase secrets set IONOS_TOKEN="new-token"`
4. Deploy functions: `supabase functions deploy`
5. Hard refresh browser (Cmd+Shift+R)

### Supabase connection failing

**Issue:** `"Supabase credentials not configured"`

**Solution:**
1. Verify `.env` file has correct variables:
   - `NUXT_PUBLIC_SUPABASE_URL`
   - `NUXT_PUBLIC_SUPABASE_ANON_KEY`
2. Check variable names match exactly (case-sensitive)
3. Hard refresh browser
4. Check browser console for detailed errors

### Real-time features not working

**Issue:** Broadcasts, countdowns, or notifications not updating

**Solution:**
1. Check Supabase Realtime is enabled in project settings
2. Verify browser has access to WebSocket connections
3. Check RLS (Row Level Security) policies on tables
4. Look at browser console for connection errors

## Security Notes

- ✅ IONOS tokens stored in Supabase secrets (not in code)
- ✅ Team tokens encrypted with AES-256-GCM
- ✅ Database access restricted with RLS policies
- ✅ CORS headers properly configured
- ✅ No sensitive data in git history

## Development Tips

### Hot Module Replacement (HMR)

Changes to `.vue`, `.ts`, `.css` files auto-reload during development.

### Type Checking

TypeScript strict mode is enabled. Run type checking:
```bash
pnpm typecheck
```

### Debugging Edge Functions

```bash
# Run functions locally with emulator
supabase functions serve

# Deploy with debug logging
supabase functions deploy --debug
```

### Database Migrations

Migrations are in `supabase/migrations/`. Create new ones:
```bash
supabase migration new migration_name
```

## Contributing

1. Create a feature branch
2. Make changes
3. Test locally: `pnpm dev`, `pnpm test`
4. Commit with clear messages
5. Push and create a Pull Request

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review browser console for error messages
3. Check Supabase project logs
4. Review Edge Function logs in Supabase Dashboard

## License

Proprietary - HIKEathon 2025
