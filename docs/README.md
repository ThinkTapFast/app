# ThinkTapFast Server Architecture Documentation

## 📚 Documentation Index

This folder contains comprehensive documentation for the ThinkTapFast server-side architecture, focusing on authentication, authorization, and server actions.

### 📖 Available Documentation

1. **[Server Authentication System](./SERVER-AUTH.md)** - Complete guide to the `server/auth/` folder
   - ABAC (Attribute-Based Access Control) implementation
   - Clerk integration and helpers
   - Type system and permission configurations
   - Role hierarchies and plan-based permissions

2. **[Server Actions System](./SERVER-ACTIONS.md)** - Complete guide to the `server/actions/` folder
   - Permission-wrapped server actions
   - Content and project management
   - Organization and billing operations
   - Security patterns and best practices

3. **[ABAC Implementation Guide](./ABAC-GUIDE.md)** - Detailed ABAC system implementation
4. **[Dashboard Examples](./DASHBOARD-EXAMPLES.md)** - UI integration examples

## 🏗️ Architecture Overview

The ThinkTapFast server architecture is built on several core principles:

### 🔐 Security-First Design
- **Authentication**: Clerk-based authentication with comprehensive user management
- **Authorization**: ABAC system with plan-based permissions and role hierarchies
- **Validation**: TypeScript-first with Prisma integration for type safety

### 📦 Modular Structure
- **server/auth/**: Authentication and authorization system
- **server/actions/**: Business logic with permission enforcement
- **server/db/**: Database utilities and Prisma client
- **server/api/**: External API endpoints for developers

### 🎯 Permission-Driven Operations
Every operation in the system follows this flow:
1. **Authentication Check** - Verify user is signed in
2. **Permission Validation** - Check ABAC permissions for resource/action
3. **Business Logic** - Execute the actual operation
4. **Cache Invalidation** - Update relevant caches

## 🚀 Quick Start Guide

### 1. Understanding the Permission System

```typescript
// Import the necessary types and functions
import { requireAuth, createPermissionContext } from '@/server/auth/clerk-helpers';
import { checkPermission } from '@/server/auth/abac';

// Basic permission check
const user = await requireAuth();
const context = await createPermissionContext(orgId);
const result = await checkPermission(context, 'content', 'create');

if (!result.allowed) {
  throw new Error(result.reason);
}
```

### 2. Creating a Server Action

```typescript
import { withPermissionAction } from '@/server/actions/auth/permissions';

// Create a permission-wrapped action
export const createContentAction = withPermissionAction(
  'content',                    // Resource type
  'create',                     // Action
  async (data: CreateContentData) => {
    // Your business logic here
    return await db.content.create({ data });
  },
  {
    extractContextFromArgs: (data) => ({ orgId: data.orgId }),
    revalidateOnSuccess: '/dashboard/content'
  }
);
```

### 3. Using in Components

```typescript
// In your React component
async function handleCreateContent(data: CreateContentData) {
  try {
    const content = await createContentAction(data);
    toast.success('Content created successfully');
  } catch (error) {
    toast.error(error.message);
  }
}
```

## 🎛️ Plan-Based Feature Matrix

| Feature | FREE | PRO | BUSINESS | AGENCY | CUSTOM |
|---------|------|-----|----------|--------|--------|
| **Content Generation** | 10/month | 1000/month | Unlimited | Unlimited | Custom |
| **Projects** | 1 | 10 | Unlimited | Unlimited | Custom |
| **Team Members** | 1 | 5 | 25 | 100 | Custom |
| **API Access** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Export (PDF)** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Publishing** | ❌ | Basic | Advanced | Advanced | Custom |
| **Advanced Analytics** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **White-label** | ❌ | ❌ | ❌ | ✅ | ✅ |

## 🔑 Role Hierarchies

### Organizational Roles
```
viewer → member → admin → owner
  ↑        ↑       ↑       ↑
Read     Create  Manage  Delete
```

### Workspace Roles
```
viewer → editor → admin
  ↑        ↑       ↑
Read    Edit    Manage
```

### Project Roles
```
viewer → collaborator → editor → owner
  ↑          ↑           ↑        ↑
Read     Comment      Edit    Manage
```

## 🎨 Common Patterns

### 1. Resource Ownership Check
```typescript
// Check if user owns the resource
if (resource.userId === user.id) {
  // Allow operation
}
```

### 2. Plan Limitation Check
```typescript
// Check plan limits before operation
const plan = getUserPlan(context, orgId);
if (plan === 'FREE' && currentUsage >= limits.FREE.content) {
  throw new Error('Plan limit exceeded');
}
```

### 3. Role-Based Access
```typescript
// Check role hierarchy
if (hasOrganizationRole(context, orgId, 'admin')) {
  // Allow admin operation
}
```

### 4. Multi-Context Permission
```typescript
// Check permissions across multiple contexts
const context = await createPermissionContext(orgId, workspaceId, projectId);
const result = await checkPermission(context, 'content', 'update', resourceData);
```

## 🛡️ Security Guidelines

### ✅ Do's
- Always use `requireAuth()` in server actions
- Use `withPermissionAction` wrapper for business logic
- Validate all input data with TypeScript schemas
- Check plan limitations before operations
- Use proper error handling and logging
- Implement proper cache invalidation

### ❌ Don'ts
- Never skip authentication checks
- Don't hardcode permission logic in components
- Avoid exposing sensitive data in error messages
- Don't bypass the permission system
- Never trust client-side data without validation

## 🧪 Testing Strategy

### 1. Unit Tests
```typescript
// Test individual permission functions
describe('hasOrganizationRole', () => {
  it('should return true for admin role', () => {
    const result = hasOrganizationRole(mockContext, orgId, 'admin');
    expect(result).toBe(true);
  });
});
```

### 2. Integration Tests
```typescript
// Test full permission flows
describe('createContentAction', () => {
  it('should create content with valid permissions', async () => {
    const content = await createContentAction(validData);
    expect(content).toBeDefined();
  });
});
```

### 3. Permission Matrix Tests
```typescript
// Test all plan/role combinations
const testCases = [
  { plan: 'FREE', role: 'member', action: 'create', expected: true },
  { plan: 'FREE', role: 'viewer', action: 'delete', expected: false },
  // ... more test cases
];
```

## 📈 Performance Considerations

### Database Optimization
- Use proper indexes on frequently queried fields
- Implement pagination for large datasets
- Use database transactions for multi-step operations
- Cache user permissions at the request level

### Memory Management
- Avoid loading unnecessary user relationships
- Use select queries to limit data transfer
- Implement proper cleanup for long-running operations

### Monitoring
- Log permission checks for audit trails
- Monitor API rate limits and usage
- Track plan limitation hits for upgrade prompts
- Implement error tracking and alerting

## 🔄 Migration and Upgrades

### Database Migrations
```bash
# Run Prisma migrations
bunx prisma migrate dev --name add_new_permission

# Reset development database if needed
bunx prisma migrate reset
```

### Permission System Updates
When updating the permission system:
1. Update type definitions in `server/auth/types/`
2. Update permission matrices in `server/auth/permissions.ts`
3. Update ABAC logic in `server/auth/abac.ts`
4. Run comprehensive tests
5. Update documentation

## 📞 Support and Troubleshooting

### Common Issues

1. **Permission Denied Errors**
   - Check user role assignments
   - Verify organization membership
   - Check plan limitations

2. **Type Errors**
   - Ensure Prisma types are properly imported
   - Check TypeScript configuration
   - Regenerate Prisma client if needed

3. **Authentication Issues**
   - Verify Clerk configuration
   - Check environment variables
   - Ensure middleware is properly configured

### Debug Tools
```typescript
// Debug permission context
console.log('Permission Context:', {
  userId: context.user.id,
  organizationId: context.organizationId,
  memberships: context.user.memberships.map(m => ({
    orgId: m.organization.id,
    roles: m.membershipRoles.map(mr => mr.role.name)
  }))
});
```

## 📚 Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [Clerk Authentication](https://clerk.com/docs)
- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [TypeScript Best Practices](https://typescript-eslint.io/rules/)

---

**Note**: This documentation is maintained as part of the ThinkTapFast development process. Keep it updated as the system evolves.
