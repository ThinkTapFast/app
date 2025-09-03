# ThinkTapFast 🚀

AI-powered SaaS platform for generating **content (text, images, voice, video)** for businesses and social media.

---

## 📖 Project Overview

ThinkTapFast is a scalable and maintainable SaaS platform built with **Next.js 15** across **4 separate repositories**.  
The main app follows a modular structure for clean separation of global utilities, features, and documentation.

---

## 🏗️ Repository Structure

### 4 Separate Repositories:

- **`app`** (Private) → Main SaaS application with Next.js 15
- **`marketing-site`** (Public) → Astro + Tailwind landing page
- **`blog`** (Public) → Content marketing and tutorials
- **`docs`** (Public) → Developer & user documentation

### Main App (`app` repo) Structure:

```
/app → Next.js app routes & server actions (internal use)
/api/v1 → External developer API endpoints
/components → Global reusable UI components
/lib → Global helpers, hooks, and utils
/hooks → Global React hooks
/types → Global TypeScript types
/constants → Prompts, config, and static data
  ├── prompts/ → AI context engineering prompts
  └── config/ → App configuration

/features/[feature-name]/
├── components → Feature-specific UI
├── lib → Feature-specific utils/services
├── hooks → Feature-specific React hooks
├── types → Feature-specific types
└── api → Feature API routes (if needed)
```

---

## 🎨 UI Libraries

- [shadcn/ui](https://ui.shadcn.com) → for accessible, themeable UI
- [Heroicons](https://heroicons.com) → for icons
- [Framer Motion](https://www.framer.com/motion/) → animations
- [GSAP](https://greensock.com/gsap/) → advanced animations

---

## 📦 Tools & Integrations

- **Database**: Neon (Postgres) + Prisma ORM
- **Payments**: Paddle (replacing Stripe)
- **Authentication**: Clerk / NextAuth / BetterAuth / Kinde
- **Monitoring**: Sentry (error monitoring)
- **Testing**: Postman (API testing)
- **Deployment**: Docker (deployment & scaling)
- **Runtime**: Bun / Node.js
- **Exports**: PDF, CSV/Excel export capabilities

---

## 💳 Pricing Plans

- **Free** → Limited credits, basic features
- **Pro** → More credits, premium tools (PDF export, templates)
- **Business/Agency** → Unlimited credits, multi-user team support, white-label

---

## ✨ MVP Features

- Content generation (text, images, voice, video)
- Category presets for businesses & social media
- API access for developers via `/api/v1/`
- Workspace management
- Basic analytics & usage dashboard
- Export (PDF, CSV, copy-to-clipboard)

---

## 🔮 Post-MVP Features

- AI Agents for workflow automation
- Advanced analytics & insights
- Team collaboration & role-based access
- Marketplace for templates & integrations

---

## 🔌 API Architecture

### Internal vs External APIs:

- **Next.js Server Actions** → Internal app functionality (mutations, data fetching)
- **`/api/v1/`** → External developer API (rate-limited per plan)

### Developer API Routes & Limits:

- `/api/v1/generate` → Generate content (rate-limited per plan)
- `/api/v1/export/pdf` → Export content as PDF
- `/api/v1/export/csv` → Export data as CSV
- `/api/v1/analytics` → Usage data
- `/api/v1/auth` → Authentication
- `/api/v1/billing` → Plan management

**Rate Limits per plan**:

- Free: 50 requests/day
- Pro: 1000 requests/day
- Business: 10,000 requests/day + priority scaling

---

## 🔒 Source Code & Open Source Policy

- Main SaaS app → **Private** (`app` repo)
- Marketing site → **Public** (`marketing-site` repo)
- Blog → **Public** (`blog` repo)
- Documentation → **Public** (`docs` repo)
- Public packages → **Reusable templates & SDKs** (future consideration)

---

## 🤖 Copilot Rules & Guidelines

### 📁 Structure Rules

1. Always follow the 4-repository structure described above
2. Keep reusable code in `/lib`, `/types`, `/components`, `/hooks`
3. Keep feature-specific code isolated in `/features/[feature-name]`
4. Do not mix global and feature-specific code
5. Use TypeScript strictly everywhere
6. Store AI prompts in `/constants/prompts/` for context engineering

### 🎯 Code Style Rules

7. **NEVER use classes** → Always use simple functions and functional programming
8. Use **function declarations** for named functions: `function generateContent() {}`
9. Use **arrow functions** for inline callbacks: `const items = data.map(item => item.name)`
10. **No class components** → Only functional components with hooks

### 📝 Naming Conventions

11. **Functions**: Use camelCase with descriptive verbs
    - ✅ `generateContent()`, `validateUserInput()`, `fetchUserData()`
    - ❌ `content()`, `validate()`, `fetch()`

12. **Variables**: Use camelCase with descriptive nouns
    - ✅ `userProfile`, `contentTemplates`, `apiResponse`
    - ❌ `data`, `result`, `temp`

13. **Constants**: Use SCREAMING_SNAKE_CASE
    - ✅ `MAX_CONTENT_LENGTH`, `API_BASE_URL`, `DEFAULT_PLAN_LIMITS`
    - ❌ `maxLength`, `apiUrl`, `defaultLimits`

14. **Components**: Use PascalCase with descriptive names
    - ✅ `ContentGenerator`, `UserDashboard`, `PricingCard`
    - ❌ `Generator`, `Dashboard`, `Card`

15. **Files**: Use kebab-case for file names
    - ✅ `content-generator.tsx`, `user-dashboard.tsx`, `api-client.ts`
    - ❌ `ContentGenerator.tsx`, `UserDashboard.tsx`, `apiClient.ts`

### 🗂️ Folder Organization Rules

16. **Global hooks** → `/hooks/` (e.g., `useAuth.ts`, `useBilling.ts`)
17. **Feature hooks** → `/features/[name]/hooks/` (e.g., `useContentGenerator.ts`)
18. **AI Prompts** → `/constants/prompts/` organized by feature
19. **Configuration** → `/constants/config/` for app settings

### ⚡ Performance & Best Practices

20. Keep functions small and modular (max 20-30 lines)
21. Use **Server Actions** for internal mutations, **API routes** (`/api/v1/`) for external developers
22. Always use TypeScript interfaces and types
23. Write tests for all utility functions and APIs
24. Handle errors gracefully with proper try/catch blocks
25. Use React hooks properly (useState, useEffect, useCallback, useMemo)

### 🔧 Development Rules

26. For UI, always check Shadcn components first
27. Respect plan limits in all API design and implementation
28. Document all public APIs and complex functions
29. Keep commits small and descriptive
30. Use ESLint and Prettier for code formatting
31. Never hardcode secrets → use environment variables
32. Use **Paddle** for payment processing, not Stripe

### 🎨 Component Rules

33. Components should be **pure functions** that return JSX
34. Use custom hooks for complex state logic
35. Prefer composition over inheritance
36. Keep component props interfaces simple and well-typed

### 🔐 Authentication Rules

37. Use `auth()` helper in App Router components and server actions
38. Use `getAuth()` helper in API routes (including `/api/v1/auth`)
39. Always check authentication status before processing requests
40. Use authentication middleware for route protection
41. Include proper error handling for unauthorized requests
42. Never expose sensitive user data in API responses

### 🗄️ Database Rules

43. Use **Neon (Postgres) + Prisma ORM** for data persistence
44. Always use proper database relationships and constraints
45. Implement proper indexing for performance
46. Use Prisma migrations for schema changes
47. Keep database queries optimized and use proper error handling

### 🤖 AI Prompt Engineering Rules

48. Store all AI prompts in `/constants/prompts/` organized by functionality
49. Use clear, specific prompt templates with variables
50. Test prompts thoroughly before deployment
51. Version control prompt changes for consistency
52. Document prompt intent and expected outputs

---

## 🛣️ Implementation Priority

- [x] Main app repository setup with Next.js 15
- [ ] Neon database + Prisma ORM configuration
- [ ] Authentication system integration
- [ ] Paddle payment processing setup
- [ ] AI prompt engineering in `/constants/prompts/`
- [ ] Core content generation features
- [ ] External developer API (`/api/v1/`) implementation

---

## 📝 About

ThinkTapFast is built to **save time, cut costs, and scale creativity** for businesses and creators.  
It combines modular design, SaaS best practices, and developer-first APIs for long-term scalability across multiple specialized repositories.
