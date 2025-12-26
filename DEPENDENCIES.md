# 📦 Required Dependencies for MVP

## Install AI SDKs

```bash
# OpenAI for text generation and DALL-E images
bun add openai

# Alternative: Anthropic Claude (optional)
bun add @anthropic-ai/sdk

# For image uploads/storage
bun add @vercel/blob  # or use AWS S3, Cloudinary
```

## Install UI Dependencies (if not already installed)

```bash
# These should already be in your package.json, but just in case:
bun add clsx tailwind-merge class-variance-authority

# For forms
bun add react-hook-form zod @hookform/resolvers

# For toasts/notifications
bun add sonner

# For copy-to-clipboard
bun add copy-to-clipboard
```

## Update package.json scripts

Add these to your `package.json` if missing:

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "prisma generate && next build --turbopack",
    "start": "next start",
    "postinstall": "prisma generate",
    
    // Keep all your existing db scripts...
  }
}
```

## Environment Variables Checklist

Create `.env.development.local` with:

```bash
# ===== REQUIRED FOR MVP =====

# Database (Neon)
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_xxx"
CLERK_SECRET_KEY="sk_test_xxx"
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/dashboard"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/onboarding"

# OpenAI (for text + images via DALL-E)
OPENAI_API_KEY="sk-proj-xxx"
OPENAI_ORG_ID="org-xxx"  # Optional

# ===== OPTIONAL (Add later) =====

# Stability AI (alternative to DALL-E)
STABILITY_API_KEY="sk-xxx"

# Anthropic Claude (alternative to OpenAI)
ANTHROPIC_API_KEY="sk-ant-xxx"

# Paddle (for billing - set up later)
PADDLE_API_KEY="xxx"
PADDLE_VENDOR_ID="xxx"
PADDLE_WEBHOOK_SECRET="xxx"
NEXT_PUBLIC_PADDLE_ENVIRONMENT="sandbox"

# Storage (optional - for image uploads)
BLOB_READ_WRITE_TOKEN="xxx"  # Vercel Blob
# OR
AWS_ACCESS_KEY_ID="xxx"
AWS_SECRET_ACCESS_KEY="xxx"
AWS_REGION="us-east-1"
AWS_S3_BUCKET="your-bucket"

# ===== OPTIONAL MONITORING =====

# Sentry (error tracking)
SENTRY_DSN="https://xxx@xxx.ingest.sentry.io/xxx"

# PostHog (analytics)
NEXT_PUBLIC_POSTHOG_KEY="phc_xxx"
NEXT_PUBLIC_POSTHOG_HOST="https://app.posthog.com"

# App Configuration
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

## API Keys - Where to Get Them

### 1. OpenAI
```
1. Go to https://platform.openai.com/
2. Sign up / Log in
3. Go to API Keys section
4. Create new secret key
5. Add at least $5 credit to your account
```

### 2. Clerk (You probably have this)
```
1. Go to https://clerk.com/
2. Create app
3. Get keys from Dashboard > API Keys
```

### 3. Neon Database (You probably have this)
```
1. Go to https://neon.tech/
2. Create project
3. Copy connection string
```

### 4. Paddle (For billing - optional for MVP)
```
1. Go to https://paddle.com/
2. Sign up for sandbox account
3. Get API keys from Developer Tools
4. Set up 3 products: FREE, PRO, BUSINESS
```

## Quick Installation

```bash
# In your project root
cd ~/Documents/ThinkTapFast/app

# Install AI dependencies
bun add openai

# Install form handling
bun add react-hook-form zod @hookform/resolvers

# Install notifications
bun add sonner

# Setup database
bun run db:setup

# Run migrations if any
bun run db:migrate

# Start dev server
bun dev
```

## Test OpenAI Connection

Create a test file to verify your API key works:

```typescript
// test-openai.ts
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function test() {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "user", content: "Say hello!" }
      ],
    });
    
    console.log('✅ OpenAI connected!');
    console.log('Response:', completion.choices[0].message.content);
  } catch (error) {
    console.error('❌ OpenAI error:', error);
  }
}

test();
```

Run it:
```bash
bunx tsx test-openai.ts
```

If you see "✅ OpenAI connected!" you're good to go!

## Common Issues

### Issue: "Module not found: Can't resolve 'openai'"
**Solution:** `bun add openai`

### Issue: "Invalid API key"
**Solution:** Check your `.env.development.local` has correct `OPENAI_API_KEY`

### Issue: "Insufficient credits"
**Solution:** Add $5+ to your OpenAI account

### Issue: "Database connection failed"
**Solution:** 
```bash
# Test connection
bunx prisma db push
# If fails, check DATABASE_URL in .env
```

### Issue: "Clerk not working"
**Solution:** 
```bash
# Make sure you have all Clerk env vars
# Check middleware.ts is properly configured
```

## Cost Estimates (MVP Testing)

**OpenAI Costs:**
- GPT-4: ~$0.03 per 1000 tokens (~$0.01-0.05 per generation)
- GPT-3.5-turbo: ~$0.002 per 1000 tokens (~$0.001 per generation)
- DALL-E 3: ~$0.04 per image

**Recommendation for testing:**
- Use GPT-3.5-turbo initially (10x cheaper)
- Switch to GPT-4 for production
- Budget $10-20 for MVP development testing

## Next Steps

1. ✅ Install dependencies: `bun add openai`
2. ✅ Get OpenAI API key and add credit
3. ✅ Update `.env.development.local`
4. ✅ Test connection with test script
5. ✅ Run `bun dev` and start building!

You're ready to build! 🚀
