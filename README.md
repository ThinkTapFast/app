# ThinkTapFast ⚡

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript&logoColor=white)](https://typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.0-2D3748?logo=prisma&logoColor=white)](https://prisma.io/)
[![Neon](https://img.shields.io/badge/Neon-Postgres-00E599?logo=postgresql&logoColor=white)](https://neon.tech/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.0-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Paddle](https://img.shields.io/badge/Paddle-Payments-4A90E2?logo=paddle&logoColor=white)](https://paddle.com/)

AI-powered SaaS platform for generating **content (text, images, voice, video)** for businesses and social media creators.

## ✨ Features

- 🤖 **AI Content Generation** - Text, images, voice, and video
- 🎯 **Business Categories** - Presets for different industries
- 👥 **Team Workspaces** - Collaborate with role-based access
- 📊 **Analytics Dashboard** - Track usage and performance
- 🔌 **Developer API** - `/api/v1/` endpoints for integrations
- 📄 **Export Options** - PDF, CSV, and direct copy
- 💳 **Flexible Plans** - Free, Pro, Business, and Agency tiers

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router + Server Actions)
- **Database**: Neon Postgres + Prisma ORM
- **Authentication**: Clerk / NextAuth
- **Payments**: Paddle
- **UI**: shadcn/ui + Tailwind CSS
- **Deployment**: Docker + Vercel
- **Monitoring**: Sentry + PostHog

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/abdelkabirouadoukou/app.git
cd app

# Install dependencies
bun install

# Set up environment variables
cp .env.development .env.development.local
cp .env.production .env.production.local

# Set up database
bunx prisma generate
bunx prisma db push

# Start development server
bun dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the app.

## 🔗 Related Repositories

- 🌐 [Marketing Site](https://github.com/abdelkabirouadoukou/marketing-site) - Astro landing page
- 📝 [Blog](https://github.com/abdelkabirouadoukou/blog) - Content & tutorials
- 📘 [Documentation](https://github.com/abdelkabirouadoukou/docs) - Developer guides

## 📁 Project Structure

```
/app                # Next.js App Router
/app/api/v1         # External developer API
/components         # Global UI components
/features           # Feature-specific modules
/lib                # Global utilities
/hooks              # Global React hooks
/constants/prompts  # AI context engineering
```

## 🔑 Environment Variables

> [!NOTE]
> Plz see the .env.development and .env.production files for all available environment variables.

## 📊 API Rate Limits

| Plan     | Daily Requests | Rate Limit |
| -------- | -------------- | ---------- |
| Free     | 50             | 30/min     |
| Pro      | 1,000          | 120/min    |
| Business | 10,000         | 500/min    |

## 🤝 Contributing

This is a private repository. For bug reports or feature requests, please contact the team.

## 📄 License

Private - All rights reserved

---

Built with ❤️ for creators and businesses who want to **save time, cut costs, and scale creativity**.
