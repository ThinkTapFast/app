# ABAC Implementation Guide

## Overview

Your ThinkTapFast app now has a complete **Attribute-Based Access Control (ABAC)** system integrated with Clerk authentication. This system provides fine-grained permissions based on user roles, organization plans, and resource context.

## 🏗️ System Architecture

### 1. **Core Components**

- **`server/auth/types.ts`** - Type definitions for ABAC system
- **`server/auth/abac.ts`** - Main permission checking logic  
- **`server/auth/clerk-helpers.ts`** - Clerk integration utilities
- **`server/auth/middleware.ts`** - Route protection middleware
- **`server/db/seed-permissions.ts`** - Permission initialization

### 2. **Permission Scopes**

- **ORGANIZATION** - Organization-level permissions
- **WORKSPACE** - Workspace-level permissions  
- **PROJECT** - Project-specific permissions

### 3. **Plan-Based Restrictions**

- **FREE** - Basic permissions, limited features
- **PRO** - Enhanced permissions, premium features
- **BUSINESS** - Team permissions, advanced features
- **AGENCY** - Full permissions, white-label access
- **CUSTOM** - Flexible permission configuration

## 🚀 Quick Usage Examples

### 1. **Server Actions with ABAC**

```typescript
// server/actions/content/content-actions.ts
export const createContent = withPermissionAction(
  'content',
  'create',
  async ({ projectId, title, content }, { context }) => {
    return await db.content.create({
      data: {
        title,
        content,
        projectId,
        authorId: context.user.id,
      },
    });
  }
);
```

### 2. **Direct Permission Checking**

```typescript
import { checkPermission } from '@/server/auth/abac';
import { getCurrentUserWithRoles } from '@/server/auth/clerk-helpers';

async function myServerAction() {
  const user = await getCurrentUserWithRoles();
  
  const result = await checkPermission(
    user,
    'content',
    'create',
    { projectId: 'project-123' }
  );
  
  if (!result.allowed) {
    throw new Error(result.reason);
  }
  
  // Proceed with action...
}
```

### 3. **Route Protection Middleware**

```typescript
// middleware.ts (root level) - Updated for your dashboard structure
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { abacMiddleware } from '@/server/auth/middleware';

const isProtectedRoute = createRouteMatcher([
  '/content(.*)',     // Your content routes
  '/dashboard(.*)',   // Additional dashboard routes
  '/settings(.*)',
  '/billing(.*)',
  '/api/v1(.*)',     // External API routes
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect(); // Require authentication
    
    // Apply ABAC for API routes
    if (req.nextUrl.pathname.startsWith('/api/v1')) {
      return await abacMiddleware(req);
    }
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/(api|trpc)(.*)"],
};
```

### 4. **Component-Level Permission Checks**

```tsx
import { PermissionWrapper, useCanPerform } from '@/components/ui/permission-wrapper';

function ContentEditor() {
  const { canCreateContent, canDeleteContent } = useCanPerform();
  
  return (
    <PermissionWrapper requireAuth>
      <div className="space-y-4">
        {canCreateContent && (
          <button>Create Content</button>
        )}
        
        {canDeleteContent && (
          <button variant="destructive">Delete Content</button>
        )}
      </div>
    </PermissionWrapper>
  );
}

// Dashboard route protection
function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <PermissionWrapper 
      requireAuth 
      fallback={<div>Please sign in to access dashboard</div>}
    >
      {children}
    </PermissionWrapper>
  );
}
```

## 🔧 Setup Instructions

### 1. **Initialize Database Permissions**

```typescript
// Run this once to seed permissions
import { initializeABAC } from '@/server/db/seed-permissions';

await initializeABAC();
```

### 2. **Set Up Webhook Handler**

Your webhook is already configured at `/api/webhooks/clerk-sync/route.ts`. Make sure to:

1. Add `CLERK_WEBHOOK_SECRET` to your environment variables
2. Configure the webhook URL in Clerk Dashboard: `https://yourdomain.com/api/webhooks/clerk-sync`
3. Enable these events in Clerk:
   - `user.created`
   - `user.updated` 
   - `user.deleted`
   - `session.created`

### 3. **Environment Variables**

```env
# Clerk Configuration
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# Database
DATABASE_URL="postgresql://..."
```

## 🎯 Permission Examples

### Organization Level

```typescript
// Check if user can manage organization
const canManage = await checkPermission(user, 'org', 'manage', { orgId });

// Check if user can invite members (plan-restricted)
const canInvite = await checkPermission(user, 'org', 'invite', { orgId });
```

### Workspace Level

```typescript
// Check if user can create workspace
const canCreate = await checkPermission(user, 'workspace', 'create', { orgId });

// Check if user can delete workspace
const canDelete = await checkPermission(user, 'workspace', 'delete', { 
  orgId, 
  workspaceId 
});
```

### Project Level

```typescript
// Check if user can update project
const canUpdate = await checkPermission(user, 'project', 'update', { 
  orgId, 
  workspaceId, 
  projectId 
});
```

### Content Level

```typescript
// Check if user can publish content (plan-restricted)
const canPublish = await checkPermission(user, 'content', 'publish', { 
  orgId, 
  workspaceId, 
  projectId 
});
```

## 🔒 Plan Restrictions

The system automatically enforces plan-based restrictions:

```typescript
// FREE plan users cannot:
- Create API keys
- Export to PDF
- Publish content
- Access analytics

// PRO plan adds:
- API key management
- PDF export
- Content publishing
- Basic analytics

// BUSINESS plan adds:
- Team management
- Advanced analytics
- Multiple workspaces

// AGENCY plan adds:
- White-label features
- Custom branding
- Priority support
```

## 🛠️ Custom Permissions

### Adding New Permissions

1. **Add to permissions seed:**

```typescript
// server/db/seed-permissions.ts
const NEW_PERMISSION = {
  key: 'analytics.advanced',
  name: 'Advanced Analytics',
  description: 'Access advanced analytics features'
};
```

2. **Update role templates:**

```typescript
// Add to appropriate roles
const BUSINESS_ROLE = {
  name: 'admin',
  permissions: [
    ...existing_permissions,
    'analytics.advanced'
  ]
};
```

3. **Use in code:**

```typescript
const canViewAdvanced = await checkPermission(
  user, 
  'analytics', 
  'advanced', 
  context
);
```

## 🧪 Testing

### Server Action Testing

```typescript
// Test permission-protected actions
import { createContent } from '@/server/actions/content/content-actions';

// This will check permissions automatically
const result = await createContent({
  projectId: 'test-project',
  title: 'Test Content',
  content: 'Test content body'
});
```

### Permission Testing

```typescript
// Test specific permissions
import { checkPermission } from '@/server/auth/abac';

const hasPermission = await checkPermission(
  mockUser,
  'content',
  'create',
  { projectId: 'test-project' }
);

expect(hasPermission.allowed).toBe(true);
```

## 📝 Next Steps

1. **Test the webhook** by creating a new user in Clerk
2. **Seed permissions** by running the initialization script
3. **Implement client-side permission hooks** for UI components
4. **Add permission checks** to existing components
5. **Test plan upgrades** and permission changes

Your ABAC system is now fully implemented and ready to use! 🎉
