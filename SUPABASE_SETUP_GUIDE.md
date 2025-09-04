# Supabase Setup Guide for HIKEathon 2025

## Quick Setup Steps

### Option 1: Create a New Supabase Project

1. **Go to Supabase Dashboard**
   - Open: https://app.supabase.com
   - Sign in with GitHub, Google, or Email

2. **Create New Project**
   - Click "New Project" button
   - Fill in the following:
     - **Project name**: `hikeathon-2025`
     - **Database Password**: Choose a strong password (save this!)
     - **Region**: Choose the nearest region (preferably EU for GDPR)
   - Click "Create Project" (takes 1-2 minutes)

3. **Get Your Credentials**
   - Once project is ready, go to **Settings** (gear icon) in sidebar
   - Click **API** under Configuration section
   - You'll find:
     - **Project URL**: `https://xxxxxxxxxxxxxxxxxxxx.supabase.co`
     - **anon (public) key**: A long string starting with `eyJ...`

### Option 2: Use Existing Project

1. **Go to your project**: https://app.supabase.com
2. Navigate to **Settings > API**
3. Copy the Project URL and anon key

## Setting Up Credentials

### 1. Create `.env` file
```bash
cp .env.example .env
```

### 2. Add your credentials to `.env`:
```env
# Replace with your actual values
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Add `.env` to `.gitignore`:
```bash
echo ".env" >> .gitignore
```

## Database Setup

After setting up your project, you'll need to run the database migrations:

```bash
# Install Supabase CLI (if not installed)
brew install supabase/tap/supabase

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

## Test Your Connection

Create a test file `test-supabase.js`:

```javascript
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  const { data, error } = await supabase.from('teams').select('count')
  if (error) {
    console.error('Connection failed:', error.message)
  } else {
    console.log('✅ Successfully connected to Supabase!')
  }
}

testConnection()
```

## Troubleshooting

### Common Issues:

1. **"Invalid API key"**
   - Make sure you copied the complete key
   - Check that you're using the `anon` key, not the `service_role` key

2. **"Connection refused"**
   - Check your project URL is correct
   - Ensure your project is active (not paused)

3. **CORS errors**
   - Add your domain to allowed origins in Supabase dashboard
   - Go to Settings > API > CORS Allowed Origins

## Next Steps

Once your credentials are set up:
1. Run `pnpm install` to install dependencies
2. Run `pnpm dev` to start the development server
3. The app will automatically use the Supabase credentials from `.env`

## Security Notes

- **Never commit `.env` file** to Git
- The `anon` key is safe to use in the browser
- Keep the `service_role` key secret (server-side only)
- Use Row Level Security (RLS) policies for data protection

## Need Help?

- Supabase Docs: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com
- Project Issues: https://github.com/ingo-eichhorst/hikeathon-2025/issues