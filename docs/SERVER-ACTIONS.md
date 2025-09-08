# Server Actions Documentation

This document provides comprehensive documentation for the server actions system in the `server/actions/` folder.

## 📁 Folder Structure

```
server/actions/
├── auth/
│   └── permissions.ts    # Permission-wrapped server action utilities
├── billing/
│   └── organization-actions.ts  # Organization and billing management
└── content/
    ├── content.actions.ts       # Content CRUD operations
    └── project.actions.ts       # Project management operations
```

## 🎯 Core Philosophy

The server actions system follows these principles:

1. **Permission-First**: Every action checks permissions before execution
2. **Type Safety**: Full TypeScript integration with Prisma types
3. **Error Handling**: Comprehensive error handling with meaningful messages
4. **Revalidation**: Automatic cache invalidation where needed
5. **Modularity**: Organized by domain (auth, billing, content)

## 🔐 Authentication Layer (`auth/permissions.ts`)

### Purpose
Provides a wrapper system for server actions that automatically handles:
- Authentication verification
- Permission checking
- Context extraction
- Error handling
- Cache revalidation

### Core Function: `withPermissionAction`

```typescript
export async function withPermissionAction<T extends unknown[], R>(
  resource: ResourceType,        // The resource being accessed
  action: Action,               // The action being performed
  actionFn: (...args: T) => Promise<R>,  // The actual action function
  context?: {
    orgId?: string;
    workspaceId?: string;
    projectId?: string;
    extractContextFromArgs?: (...args: T) => { orgId?: string; workspaceId?: string; projectId?: string };
    redirectOnFailure?: string;   // Where to redirect on permission failure
    revalidateOnSuccess?: string; // What to revalidate on success
  }
) => (...args: T) => Promise<R>
```

#### Features:
- **Automatic Authentication**: Ensures user is authenticated before proceeding
- **Permission Validation**: Checks ABAC permissions for the specific resource/action
- **Context Extraction**: Can extract IDs from function arguments automatically
- **Error Handling**: Provides consistent error responses
- **Cache Management**: Handles Next.js revalidation automatically

#### Usage Examples:

```typescript
// Simple permission check
const deleteProject = withPermissionAction(
  'project',
  'delete',
  async (projectId: string) => {
    await db.project.delete({ where: { id: projectId } });
  }
);

// With context extraction
const updateContent = withPermissionAction(
  'content',
  'update',
  async (contentId: string, orgId: string, data: UpdateContentData) => {
    return await db.content.update({
      where: { id: contentId },
      data
    });
  },
  {
    extractContextFromArgs: (contentId, orgId) => ({ orgId }),
    revalidateOnSuccess: '/dashboard/content'
  }
);

// With redirect handling
const inviteUser = withPermissionAction(
  'user',
  'invite',
  async (email: string, orgId: string, role: string) => {
    // Invitation logic
  },
  {
    extractContextFromArgs: (email, orgId) => ({ orgId }),
    redirectOnFailure: '/dashboard/settings',
    revalidateOnSuccess: '/dashboard/team'
  }
);
```

### Permission Error Handling

The wrapper provides consistent error handling:
- **Authentication Errors**: Redirects to sign-in page
- **Permission Errors**: Returns structured error response or redirects
- **Validation Errors**: Returns detailed validation feedback
- **System Errors**: Logs errors and returns generic failure message

## 💰 Billing Actions (`billing/organization-actions.ts`)

### Purpose
Handles organization management and billing operations with proper permission checking.

### Key Actions:

#### Organization Management
```typescript
// Create new organization
export async function createOrganizationAction(data: {
  name: string;
  plan?: Plan;
  settings?: OrganizationSettings;
}): Promise<Organization>

// Update organization settings
export async function updateOrganizationAction(
  orgId: string,
  data: Partial<Organization>
): Promise<Organization>

// Delete organization (owner only)
export async function deleteOrganizationAction(
  orgId: string
): Promise<{ success: boolean }>
```

#### Billing Operations
```typescript
// Upgrade/downgrade organization plan
export async function updateOrganizationPlanAction(
  orgId: string,
  newPlan: Plan,
  paymentMethodId?: string
): Promise<{ success: boolean; subscriptionId?: string }>

// Get billing information
export async function getBillingInfoAction(
  orgId: string
): Promise<BillingInfo>

// Handle subscription webhook
export async function handleSubscriptionWebhookAction(
  eventData: SubscriptionEvent
): Promise<{ success: boolean }>
```

#### Team Management
```typescript
// Invite team member
export async function inviteTeamMemberAction(
  orgId: string,
  email: string,
  role: OrganizationalRole
): Promise<{ success: boolean; inviteId: string }>

// Update member role
export async function updateMemberRoleAction(
  orgId: string,
  userId: string,
  newRole: OrganizationalRole
): Promise<{ success: boolean }>

// Remove team member
export async function removeMemberAction(
  orgId: string,
  userId: string
): Promise<{ success: boolean }>
```

### Permission Requirements:
- **Create Organization**: Any authenticated user
- **Update Organization**: Organization admin+
- **Delete Organization**: Organization owner only
- **Billing Operations**: Organization owner only
- **Team Management**: Organization admin+ (PRO plan admin+, BUSINESS+ member+)

## 📝 Content Actions (`content/content.actions.ts`)

### Purpose
Handles all content-related CRUD operations with plan-based limitations and permission checking.

### Key Actions:

#### Content CRUD
```typescript
// Create new content
export async function createContentAction(data: {
  title: string;
  type: ContentType;
  projectId?: string;
  orgId: string;
  templateId?: string;
  settings?: ContentSettings;
}): Promise<Content>

// Get content with permissions
export async function getContentAction(
  contentId: string,
  orgId: string
): Promise<Content | null>

// Update content
export async function updateContentAction(
  contentId: string,
  orgId: string,
  data: Partial<Content>
): Promise<Content>

// Delete content
export async function deleteContentAction(
  contentId: string,
  orgId: string
): Promise<{ success: boolean }>
```

#### Content Generation
```typescript
// Generate AI content
export async function generateContentAction(data: {
  prompt: string;
  type: ContentType;
  orgId: string;
  projectId?: string;
  settings?: GenerationSettings;
}): Promise<{ content: Content; credits: number }>

// Regenerate existing content
export async function regenerateContentAction(
  contentId: string,
  orgId: string,
  newPrompt?: string
): Promise<Content>
```

#### Content Export
```typescript
// Export content as PDF
export async function exportContentToPDFAction(
  contentId: string,
  orgId: string,
  format?: PDFFormat
): Promise<{ url: string; expiresAt: Date }>

// Export multiple content items
export async function exportMultipleContentAction(
  contentIds: string[],
  orgId: string,
  format: 'pdf' | 'csv' | 'json'
): Promise<{ url: string; expiresAt: Date }>
```

#### Content Publishing
```typescript
// Publish content to platform
export async function publishContentAction(
  contentId: string,
  orgId: string,
  platforms: PublishPlatform[],
  scheduleDate?: Date
): Promise<{ success: boolean; publishedTo: PublishPlatform[] }>

// Schedule content for later publishing
export async function scheduleContentAction(
  contentId: string,
  orgId: string,
  publishDate: Date,
  platforms: PublishPlatform[]
): Promise<{ success: boolean; scheduleId: string }>
```

### Plan Limitations:
- **FREE**: 10 content generations/month, no export, no publishing
- **PRO**: 1000 generations/month, PDF export, basic publishing
- **BUSINESS/AGENCY**: Unlimited, all export formats, advanced publishing
- **CUSTOM**: Custom limits and features

## 🚀 Project Actions (`content/project.actions.ts`)

### Purpose
Manages project organization and collaboration features with role-based permissions.

### Key Actions:

#### Project CRUD
```typescript
// Create new project
export async function createProjectAction(data: {
  name: string;
  description?: string;
  orgId: string;
  workspaceId?: string;
  isPublic?: boolean;
  settings?: ProjectSettings;
}): Promise<Project>

// Get project with team data
export async function getProjectAction(
  projectId: string,
  orgId: string
): Promise<Project & { team: ProjectMember[] }>

// Update project
export async function updateProjectAction(
  projectId: string,
  orgId: string,
  data: Partial<Project>
): Promise<Project>

// Delete project
export async function deleteProjectAction(
  projectId: string,
  orgId: string
): Promise<{ success: boolean }>
```

#### Project Collaboration
```typescript
// Add team member to project
export async function addProjectMemberAction(
  projectId: string,
  orgId: string,
  userId: string,
  role: ProjectRole
): Promise<{ success: boolean }>

// Update member role in project
export async function updateProjectMemberRoleAction(
  projectId: string,
  orgId: string,
  userId: string,
  newRole: ProjectRole
): Promise<{ success: boolean }>

// Remove member from project
export async function removeProjectMemberAction(
  projectId: string,
  orgId: string,
  userId: string
): Promise<{ success: boolean }>
```

#### Project Templates
```typescript
// Create project from template
export async function createProjectFromTemplateAction(
  templateId: string,
  orgId: string,
  projectName: string,
  customizations?: TemplateCustomization
): Promise<Project>

// Save project as template
export async function saveProjectAsTemplateAction(
  projectId: string,
  orgId: string,
  templateData: {
    name: string;
    description: string;
    isPublic: boolean;
  }
): Promise<ProjectTemplate>
```

### Permission Requirements:
- **Create Project**: All plans (with limits)
- **Update Project**: Project editor+
- **Delete Project**: Project owner only
- **Team Management**: Project admin+ (BUSINESS+ plans)
- **Templates**: PRO+ plans

## 🎨 Usage Patterns

### 1. Simple CRUD Operation

```typescript
// In your component
async function handleDeleteContent(contentId: string) {
  try {
    const result = await deleteContentAction(contentId, orgId);
    if (result.success) {
      toast.success('Content deleted successfully');
    }
  } catch (error) {
    toast.error(error.message);
  }
}
```

### 2. Complex Permission Context

```typescript
// Action with multiple context requirements
const updateProjectContent = withPermissionAction(
  'content',
  'update',
  async (contentId: string, projectId: string, orgId: string, data: ContentUpdate) => {
    return await db.content.update({
      where: { 
        id: contentId,
        projectId,
        project: { organizationId: orgId }
      },
      data
    });
  },
  {
    extractContextFromArgs: (contentId, projectId, orgId) => ({ 
      projectId, 
      orgId 
    }),
    revalidateOnSuccess: '/dashboard/content'
  }
);
```

### 3. Error Handling Pattern

```typescript
// Component usage with proper error handling
async function handleAction() {
  try {
    const result = await someAction(params);
    
    // Handle success
    toast.success('Operation completed');
    router.push('/dashboard');
    
  } catch (error) {
    // Handle different error types
    if (error.code === 'PERMISSION_DENIED') {
      toast.error('You don\'t have permission for this action');
    } else if (error.code === 'PLAN_LIMIT_EXCEEDED') {
      toast.error('Plan limit exceeded. Please upgrade your plan.');
    } else {
      toast.error('An unexpected error occurred');
    }
    
    console.error('Action failed:', error);
  }
}
```

## 🔒 Security Best Practices

### 1. **Always Use Permission Wrappers**
```typescript
// ✅ Good - Uses permission wrapper
const deleteProject = withPermissionAction('project', 'delete', deleteProjectImpl);

// ❌ Bad - Direct action without permission check
export async function deleteProject(id: string) {
  await db.project.delete({ where: { id } });
}
```

### 2. **Validate Input Data**
```typescript
// ✅ Good - Validates input
export async function updateContentAction(id: string, data: UpdateContentData) {
  const validated = updateContentSchema.parse(data);
  // ... proceed with validated data
}
```

### 3. **Handle Plan Limitations**
```typescript
// ✅ Good - Checks plan limits
export async function createContentAction(data: CreateContentData) {
  const user = await requireAuth();
  const usage = await getMonthlyUsage(user.orgId);
  const plan = await getUserPlan(user.orgId);
  
  if (plan === 'FREE' && usage.content >= 10) {
    throw new Error('Monthly content limit reached. Upgrade your plan.');
  }
  
  // ... proceed with creation
}
```

### 4. **Proper Error Context**
```typescript
// ✅ Good - Provides context in errors
catch (error) {
  console.error('Failed to update content:', {
    contentId,
    orgId,
    userId: user.id,
    error: error.message
  });
  
  throw new Error('Failed to update content. Please try again.');
}
```

## 📊 Performance Considerations

### 1. **Database Optimization**
- Use proper database indexes for frequent queries
- Implement pagination for large datasets
- Use select only necessary fields

### 2. **Caching Strategy**
- Cache user permissions at request level
- Use Next.js revalidation for data consistency
- Implement proper cache invalidation

### 3. **Error Handling**
- Log errors for monitoring
- Provide user-friendly error messages
- Implement retry mechanisms where appropriate

## 🧪 Testing

### Unit Testing Actions
```typescript
import { createContentAction } from '@/server/actions/content/content.actions';
import { mockUser, mockOrganization } from '@/tests/fixtures';

describe('createContentAction', () => {
  beforeEach(() => {
    // Setup test database and auth mocks
  });

  it('should create content with valid data', async () => {
    const result = await createContentAction({
      title: 'Test Content',
      type: 'text',
      orgId: mockOrganization.id
    });

    expect(result).toMatchObject({
      title: 'Test Content',
      type: 'text'
    });
  });

  it('should reject creation without permission', async () => {
    // Mock user without permission
    await expect(createContentAction(data)).rejects.toThrow('Permission denied');
  });
});
```

## 📚 Related Documentation

- [Server Auth Documentation](./SERVER-AUTH.md) - Authentication system details
- [ABAC Guide](./ABAC-GUIDE.md) - Permission system implementation
- [API Documentation](./API.md) - External API endpoints
- [Database Schema](./DATABASE.md) - Data model and relationships
