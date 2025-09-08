# Server Authentication & Authorization System

This document provides comprehensive documentation for the authentication and authorization system in the `server/auth/` folder.

## 📁 Folder Structure

```
server/auth/
├── abac.ts              # Attribute-Based Access Control (ABAC) implementation
├── clerk-helpers.ts     # Clerk integration and helper functions
├── middleware.ts        # Authentication middleware for Next.js
├── permissions.ts       # Plan-based permission configurations
└── types/
    └── index.ts         # Unified type definitions
```

## 🔐 Core Components

### 1. Types System (`types/index.ts`)

**Purpose**: Unified type definitions leveraging Prisma's generated types for consistent typing across the authentication system.

#### Key Types:

```typescript
// Re-exported Prisma types
export type {
  User, Organization, Workspace, Project, Content,
  Role, Permission, Membership, MembershipRole, Plan, Scope
}

// Extended user type with relationships
export type UserWithMemberships = User & {
  memberships: Array<Membership & {
    organization: Organization;
    membershipRoles: Array<MembershipRole & {
      role: Role & {
        rolePermissions: Array<{ permission: Permission }>;
      };
    }>;
  }>;
  workspaceMemberships?: Array<{ workspace: Workspace; roles: Array<{ role: Role }> }>;
  projectMemberships?: Array<{ project: Project; roles: Array<{ role: Role }> }>;
}
```

#### Core Permission Types:

- **ResourceType**: `'content' | 'project' | 'workspace' | 'organization' | 'apikey' | 'user' | 'billing'`
- **Action**: `'create' | 'read' | 'update' | 'delete' | 'export' | 'publish' | 'schedule' | 'invite' | 'manage'`
- **PermissionContext**: Contains user, organization, workspace, and project context
- **Role Types**: `OrganizationalRole`, `WorkspaceRole`, `ProjectRole` with proper hierarchies

### 2. ABAC Implementation (`abac.ts`)

**Purpose**: Core Attribute-Based Access Control system with plan-based permissions and role hierarchies.

#### Key Functions:

##### Permission Checking
```typescript
// Main permission checker
export async function checkPermission(
  context: PermissionContext,
  resource: ResourceType,
  action: Action,
  resourceData?: Record<string, unknown>
): Promise<PermissionResult>

// Convenience wrapper
export function can(user: UserWithMemberships) {
  return {
    async perform(action: Action, resource: ResourceType, data?: Record<string, unknown>),
    async createContent(projectId?: string),
    async updateContent(contentData: { id: string; userId: string; projectId: string }),
    async deleteProject(projectData: { id: string }),
    async inviteUser(orgId: string)
  }
}
```

##### Role Hierarchy Helpers
```typescript
// Organization role checking with hierarchy
export function hasOrganizationRole(
  context: PermissionContext, 
  orgId: string, 
  requiredRole: OrganizationalRole
): boolean

// Workspace role checking with hierarchy
export function hasWorkspaceRole(
  context: PermissionContext, 
  workspaceId: string, 
  requiredRole: WorkspaceRole
): boolean

// Project role checking with hierarchy
export function hasProjectRole(
  context: PermissionContext, 
  projectId: string, 
  requiredRole: ProjectRole
): boolean
```

#### Role Hierarchies:

1. **Organizational**: `viewer < member < admin < owner`
2. **Workspace**: `viewer < editor < admin`
3. **Project**: `viewer < collaborator < editor < owner`

#### Resource-Specific Permissions:

##### Content Permissions:
- **Create**: Available to all plans (with limits for FREE)
- **Read**: Available to all users
- **Update**: Owner always, project editors for PRO+
- **Delete**: Owner always, project owners for PRO+
- **Export**: PRO+ plans only
- **Publish/Schedule**: PRO+ plans only

##### Project Permissions:
- **Create**: All plans (with FREE plan limits)
- **Read**: All users
- **Update**: Project editors and above
- **Delete**: Project owners only
- **Manage**: BUSINESS/AGENCY/CUSTOM plans with owner role

##### Organization Permissions:
- **Create**: All users can create organizations
- **Update**: Organization admins and above
- **Delete**: Organization owners only
- **Invite**: PRO+ plans, admin+ for PRO, member+ for BUSINESS/AGENCY

### 3. Clerk Integration (`clerk-helpers.ts`)

**Purpose**: Seamless integration with Clerk authentication service and permission context creation.

#### Key Functions:

```typescript
// Get current authenticated user with full role data
export async function getCurrentUserWithRoles(): Promise<UserWithMemberships | null>

// Require authentication (throws/redirects if not authenticated)
export async function requireAuth(): Promise<UserWithMemberships>

// Create permission context for ABAC
export async function createPermissionContext(
  orgId?: string,
  workspaceId?: string,
  projectId?: string
): Promise<PermissionContext | null>

// Get user's organizations
export async function getUserOrganizations(): Promise<Organization[]>

// Role checking utilities
export async function hasRole(orgId: string, role: string): Promise<boolean>
export async function requireRole(orgId: string, role: string): Promise<void>
```

#### Usage Examples:

```typescript
// In server actions
const user = await requireAuth();
const context = await createPermissionContext(orgId);
const canEdit = await checkPermission(context, 'content', 'update', { userId: contentUserId });

// In API routes
const user = await getCurrentUserWithRoles();
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
```

### 4. Permission Configurations (`permissions.ts`)

**Purpose**: Plan-based permission matrices and role helper functions.

#### Plan-Based Permissions:

```typescript
// Shared enterprise permissions (BUSINESS & AGENCY)
const ENTERPRISE_PERMISSIONS: PlanPermissions = {
  content: { create: true, read: true, update: (context, resource) => {}, ... },
  project: { create: true, read: true, update: (context, resource) => {}, ... },
  // ... other resources
}

// Plan configurations
export const PLAN_PERMISSIONS: Record<Plan, PlanPermissions> = {
  FREE: { /* limited permissions */ },
  PRO: { /* enhanced permissions */ },
  BUSINESS: ENTERPRISE_PERMISSIONS,
  AGENCY: ENTERPRISE_PERMISSIONS,
  CUSTOM: { /* full permissions */ }
}
```

#### Helper Functions:

```typescript
// Check if user has specific organizational role
export function hasOrganizationRole(context, orgId, requiredRole): boolean

// Check plan access level
export function hasPlanAccess(context, orgId, requiredPlan): boolean

// Check resource ownership
export function isOwner(context, resourceOwnerId): boolean
```

### 5. Authentication Middleware (`middleware.ts`)

**Purpose**: Next.js middleware for route protection and authentication enforcement.

#### Features:
- Automatic route protection
- Role-based route access
- API route authentication
- Redirect handling for unauthenticated users

## 🚀 Usage Patterns

### 1. In Server Actions

```typescript
import { requireAuth, createPermissionContext } from '@/server/auth/clerk-helpers';
import { checkPermission } from '@/server/auth/abac';

export async function createContentAction(data: CreateContentData) {
  const user = await requireAuth();
  const context = await createPermissionContext(data.orgId, undefined, data.projectId);
  
  const result = await checkPermission(context, 'content', 'create');
  if (!result.allowed) {
    throw new Error(result.reason);
  }
  
  // Proceed with content creation
}
```

### 2. In API Routes

```typescript
import { getCurrentUserWithRoles } from '@/server/auth/clerk-helpers';
import { can } from '@/server/auth/abac';

export async function GET(request: NextRequest) {
  const user = await getCurrentUserWithRoles();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const canRead = await can(user).perform('read', 'content');
  if (!canRead) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  // Proceed with API logic
}
```

### 3. In Components (via Server Actions)

```typescript
import { withPermissionAction } from '@/server/actions/auth/permissions';

const deleteProject = withPermissionAction(
  'project',
  'delete',
  async (projectId: string) => {
    // Delete logic here
  },
  {
    extractContextFromArgs: (projectId) => ({ projectId }),
    redirectOnFailure: '/dashboard',
    revalidateOnSuccess: '/projects'
  }
);
```

## 🔒 Security Considerations

### 1. **Always Verify Context**: Ensure permission context includes all necessary IDs
### 2. **Plan Boundaries**: Respect plan limitations in all permission checks
### 3. **Role Hierarchies**: Use proper role hierarchy checking for inheritance
### 4. **Resource Ownership**: Always check resource ownership before allowing operations
### 5. **Error Handling**: Provide meaningful error messages without exposing system details

## 📊 Plan Limitations

| Plan | Content Creation | Projects | API Access | Team Members | Export |
|------|------------------|----------|------------|--------------|--------|
| FREE | 10/month | 1 | ❌ | 1 | ❌ |
| PRO | 1000/month | 10 | ✅ | 5 | ✅ |
| BUSINESS | Unlimited | Unlimited | ✅ | 25 | ✅ |
| AGENCY | Unlimited | Unlimited | ✅ | 100 | ✅ |
| CUSTOM | Custom | Custom | ✅ | Custom | ✅ |

## 🧪 Testing

The authentication system supports comprehensive testing through:

1. **Unit Tests**: Individual permission function testing
2. **Integration Tests**: Full permission flow testing
3. **Mock Data**: Test user and organization fixtures
4. **Role Simulation**: Testing different role combinations

## 📚 Related Documentation

- [ABAC Guide](./ABAC-GUIDE.md) - Detailed ABAC implementation guide
- [Dashboard Examples](./DASHBOARD-EXAMPLES.md) - UI integration examples
- [API Documentation](./API.md) - External API authentication
- [Database Schema](./DATABASE.md) - Prisma schema and relationships
