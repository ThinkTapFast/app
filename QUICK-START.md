# 🏃 Quick Start - Build MVP Today

## 📋 What You Have vs What You Need

### ✅ **Already Built (90% Backend Done!)**
- Authentication (Clerk)
- Database schema (Prisma)
- Permission system (ABAC)
- Server actions for content CRUD
- Middleware for auth
- Docker setup
- Deployment configs

### ❌ **What's Missing (UI + AI Integration)**
- Dashboard pages
- Content generation UI
- AI provider integrations (OpenAI, Stability AI)
- Billing integration (Paddle)
- API routes for `/api/v1/`

---

## 🎯 **TODAY'S MISSION: Get Content Generation Working**

### Step 1: Setup Environment (15 min)

```bash
# 1. Copy environment template
cp .env.development .env.development.local

# 2. Add these required keys to .env.development.local:

# Clerk (you probably have these)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx

# OpenAI (sign up at platform.openai.com)
OPENAI_API_KEY=sk-xxx

# Stability AI (sign up at stability.ai)
STABILITY_API_KEY=sk-xxx

# 3. Setup database
bun run db:setup    # This creates tables + seeds test data

# 4. Start dev server
bun dev
```

### Step 2: Create AI Clients (30 min)

Create these 3 files:

#### File 1: `lib/ai/openai-client.ts`
```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateText(prompt: string, options?: {
  tone?: 'professional' | 'casual' | 'friendly' | 'formal';
  length?: 'short' | 'medium' | 'long';
}) {
  const systemPrompt = `You are a helpful AI content generator. 
Tone: ${options?.tone || 'professional'}
Length: ${options?.length || 'medium'}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt }
    ],
    temperature: 0.7,
    max_tokens: options?.length === 'short' ? 500 : options?.length === 'long' ? 2000 : 1000,
  });

  return completion.choices[0].message.content;
}
```

#### File 2: `lib/ai/image-generator.ts`
```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateImage(prompt: string, options?: {
  style?: 'natural' | 'digital-art' | 'photographic';
  size?: '1024x1024' | '1792x1024' | '1024x1792';
}) {
  const response = await openai.images.generate({
    model: "dall-e-3",
    prompt: prompt,
    size: options?.size || '1024x1024',
    quality: "standard",
    n: 1,
  });

  return response.data[0].url;
}
```

#### File 3: `lib/usage-tracker.ts`
```typescript
import { db } from '@/server/db/client';

export async function trackUsage(orgId: string, type: 'text' | 'image') {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Find or create usage record for this month
  let usage = await db.usage.findFirst({
    where: {
      orgId,
      periodStart: { lte: now },
      periodEnd: { gte: now },
    },
  });

  if (!usage) {
    usage = await db.usage.create({
      data: {
        orgId,
        periodStart: monthStart,
        periodEnd: monthEnd,
        tokensIn: 0,
        tokensOut: 0,
        itemsGenerated: 0,
      },
    });
  }

  // Increment count
  await db.usage.update({
    where: { id: usage.id },
    data: { itemsGenerated: { increment: 1 } },
  });

  return usage;
}

export async function canGenerate(orgId: string): Promise<{ allowed: boolean; limit: number; used: number }> {
  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { plan: true },
  });

  const limits = {
    FREE: 10,
    PRO: 1000,
    BUSINESS: 999999,
    AGENCY: 999999,
    CUSTOM: 999999,
  };

  const limit = limits[org?.plan || 'FREE'];

  const now = new Date();
  const usage = await db.usage.findFirst({
    where: {
      orgId,
      periodStart: { lte: now },
      periodEnd: { gte: now },
    },
  });

  const used = usage?.itemsGenerated || 0;

  return {
    allowed: used < limit,
    limit,
    used,
  };
}
```

### Step 3: Create Generation API Route (20 min)

#### File: `app/api/v1/content/generate/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { generateText } from '@/lib/ai/openai-client';
import { generateImage } from '@/lib/ai/image-generator';
import { canGenerate, trackUsage } from '@/lib/usage-tracker';
import { createContent } from '@/server/actions/content/content.actions';
import { db } from '@/server/db/client';

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const user = await db.user.findUnique({
      where: { clerkId: userId },
      include: { memberships: { include: { organization: true } } },
    });

    if (!user || user.memberships.length === 0) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 });
    }

    const orgId = user.memberships[0].organizationId;

    // Check usage limits
    const usageCheck = await canGenerate(orgId);
    if (!usageCheck.allowed) {
      return NextResponse.json({
        error: 'Monthly limit reached',
        limit: usageCheck.limit,
        used: usageCheck.used,
      }, { status: 429 });
    }

    // Parse request
    const body = await req.json();
    const { prompt, type, tone, length, style, size } = body;

    let generatedContent: string | null = null;
    let imageUrl: string | null = null;

    // Generate based on type
    if (type === 'text') {
      generatedContent = await generateText(prompt, { tone, length });
    } else if (type === 'image') {
      imageUrl = await generateImage(prompt, { style, size });
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    // Get default project
    const project = await db.project.findFirst({
      where: { orgId },
      orderBy: { createdAt: 'asc' },
    });

    // Save to database
    const content = await createContent({
      kind: type,
      input: { prompt, tone, length, style, size },
      output: {
        versions: [{
          id: 1,
          text: generatedContent,
          imageUrl,
          timestamp: new Date().toISOString(),
        }],
      },
      projectId: project?.id,
    });

    // Track usage
    await trackUsage(orgId, type);

    return NextResponse.json({
      success: true,
      content: {
        id: content.id,
        text: generatedContent,
        imageUrl,
        createdAt: content.createdAt,
      },
    });
  } catch (error) {
    console.error('Generation error:', error);
    return NextResponse.json({
      error: 'Generation failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
```

### Step 4: Create Simple Dashboard (30 min)

#### File: `app/(dashboard)/layout.tsx`
```typescript
import { requireAuth } from '@/server/auth/clerk-helpers';
import Link from 'next/link';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white p-6">
        <h1 className="text-2xl font-bold mb-8">ThinkTapFast</h1>
        <nav className="space-y-2">
          <Link href="/dashboard" className="block py-2 px-4 rounded hover:bg-gray-800">
            Dashboard
          </Link>
          <Link href="/content/new" className="block py-2 px-4 rounded hover:bg-gray-800">
            Generate Content
          </Link>
          <Link href="/content" className="block py-2 px-4 rounded hover:bg-gray-800">
            My Content
          </Link>
          <Link href="/settings" className="block py-2 px-4 rounded hover:bg-gray-800">
            Settings
          </Link>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  );
}
```

#### File: `app/(dashboard)/page.tsx`
```typescript
import { requireAuth } from '@/server/auth/clerk-helpers';
import { db } from '@/server/db/client';
import Link from 'next/link';

export default async function DashboardPage() {
  const user = await requireAuth();
  
  const org = user.memberships[0]?.organization;
  const orgId = org?.id;

  // Get usage stats
  const now = new Date();
  const usage = await db.usage.findFirst({
    where: {
      orgId,
      periodStart: { lte: now },
      periodEnd: { gte: now },
    },
  });

  // Get recent content
  const recentContent = await db.content.findMany({
    where: { 
      project: { orgId } 
    },
    take: 5,
    orderBy: { createdAt: 'desc' },
  });

  const limits = {
    FREE: 10,
    PRO: 1000,
    BUSINESS: 'Unlimited',
    AGENCY: 'Unlimited',
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {user.name}!</h1>
        <p className="text-gray-600">Plan: {org?.plan}</p>
      </div>

      {/* Usage Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Content Generated</h3>
          <p className="text-3xl font-bold mt-2">{usage?.itemsGenerated || 0}</p>
          <p className="text-sm text-gray-500 mt-1">
            of {limits[org?.plan || 'FREE']} this month
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Projects</h3>
          <p className="text-3xl font-bold mt-2">
            {await db.project.count({ where: { orgId } })}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Team Members</h3>
          <p className="text-3xl font-bold mt-2">{org?.memberCount || 1}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-4">
          <Link
            href="/content/new?type=text"
            className="p-4 border-2 border-blue-500 rounded-lg hover:bg-blue-50 text-center"
          >
            <span className="text-2xl">📝</span>
            <h3 className="font-semibold mt-2">Generate Text</h3>
          </Link>
          <Link
            href="/content/new?type=image"
            className="p-4 border-2 border-purple-500 rounded-lg hover:bg-purple-50 text-center"
          >
            <span className="text-2xl">🎨</span>
            <h3 className="font-semibold mt-2">Generate Image</h3>
          </Link>
        </div>
      </div>

      {/* Recent Content */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Recent Content</h2>
        {recentContent.length === 0 ? (
          <p className="text-gray-500">No content yet. Start generating!</p>
        ) : (
          <ul className="space-y-2">
            {recentContent.map(item => (
              <li key={item.id} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded">
                <div>
                  <span className="font-medium">{item.kind}</span>
                  <span className="text-gray-500 text-sm ml-2">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <Link href={`/content/${item.id}`} className="text-blue-500 hover:underline">
                  View
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
```

### Step 5: Create Content Generator UI (45 min)

#### File: `app/(dashboard)/content/new/page.tsx`
```typescript
'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function NewContentPage() {
  const searchParams = useSearchParams();
  const initialType = searchParams.get('type') || 'text';

  const [type, setType] = useState(initialType);
  const [prompt, setPrompt] = useState('');
  const [tone, setTone] = useState('professional');
  const [length, setLength] = useState('medium');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  async function handleGenerate() {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/v1/content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, type, tone, length }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Generation failed');
      }

      setResult(data.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Generate Content</h1>

      {/* Type Selector */}
      <div className="flex gap-4">
        <button
          onClick={() => setType('text')}
          className={`px-4 py-2 rounded ${type === 'text' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          📝 Text
        </button>
        <button
          onClick={() => setType('image')}
          className={`px-4 py-2 rounded ${type === 'image' ? 'bg-purple-500 text-white' : 'bg-gray-200'}`}
        >
          🎨 Image
        </button>
      </div>

      {/* Prompt Input */}
      <div>
        <label className="block text-sm font-medium mb-2">Prompt</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={type === 'text' ? 'Write a blog post about...' : 'A beautiful sunset over...'}
          className="w-full p-4 border rounded-lg h-32 resize-none"
        />
      </div>

      {/* Settings */}
      {type === 'text' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Tone</label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="professional">Professional</option>
              <option value="casual">Casual</option>
              <option value="friendly">Friendly</option>
              <option value="formal">Formal</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Length</label>
            <select
              value={length}
              onChange={(e) => setLength(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="short">Short</option>
              <option value="medium">Medium</option>
              <option value="long">Long</option>
            </select>
          </div>
        </div>
      )}

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={!prompt || loading}
        className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        {loading ? 'Generating...' : '✨ Generate'}
      </button>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded">
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Generated Content</h2>
            <button
              onClick={() => navigator.clipboard.writeText(result.text || result.imageUrl)}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              📋 Copy
            </button>
          </div>
          
          {type === 'text' && (
            <div className="p-4 bg-gray-50 rounded whitespace-pre-wrap">
              {result.text}
            </div>
          )}

          {type === 'image' && result.imageUrl && (
            <img 
              src={result.imageUrl} 
              alt="Generated"
              className="max-w-full h-auto rounded"
            />
          )}
        </div>
      )}
    </div>
  );
}
```

---

## ✅ Test Your MVP

```bash
# 1. Start dev server
bun dev

# 2. Visit http://localhost:3000

# 3. Sign up/in with Clerk

# 4. You should see:
   - Dashboard with stats
   - Generate button
   - Recent content (empty initially)

# 5. Click "Generate Text" and try:
   Prompt: "Write a social media post about coffee"
   Tone: Casual
   Length: Short
   
# 6. Click Generate and wait 5-10 seconds

# 7. You should see generated text!
```

---

## 🎉 You Now Have:

✅ Working authentication  
✅ AI text generation  
✅ AI image generation  
✅ Usage tracking  
✅ Plan limits enforced  
✅ Basic dashboard  
✅ Content storage  

---

## 📅 Tomorrow's Tasks:

1. Create content list page (`/content`)
2. Create single content view (`/content/[id]`)
3. Add Paddle billing integration
4. Create settings page

You're 50% done with MVP! 🚀
