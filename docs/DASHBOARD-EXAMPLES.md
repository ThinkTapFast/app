// Example usage for ThinkTapFast dashboard structure

// app/(dashboard)/page.tsx - Dashboard home page
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import { DashboardStats } from '@/components/dashboard/stats';
import { RecentContent } from '@/components/dashboard/recent-content';

export default function DashboardPage() {
  return (
    <PermissionWrapper requireAuth>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        
        <DashboardStats />
        <RecentContent />
        
        {/* Only show admin features to admins */}
        <PermissionWrapper 
          requireRole="admin"
          fallback={null}
        >
          <AdminPanel />
        </PermissionWrapper>
      </div>
    </PermissionWrapper>
  );
}

// app/content/page.tsx - Content management page
import { useCanPerform } from '@/components/ui/permission-wrapper';
import { createContent } from '@/server/actions/content/content-actions';

export default function ContentPage() {
  const { canCreateContent, canDeleteContent } = useCanPerform();
  
  return (
    <PermissionWrapper requireAuth>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Content</h1>
          
          {canCreateContent && (
            <form action={createContent}>
              <input name="title" placeholder="Content title" />
              <input name="projectId" type="hidden" value="default-project" />
              <button type="submit">Create Content</button>
            </form>
          )}
        </div>
        
        <ContentList showDeleteButton={canDeleteContent} />
      </div>
    </PermissionWrapper>
  );
}

// Server Action example with ABAC
// server/actions/content/content-actions.ts
import { withPermissionAction } from '@/server/actions/auth/permissions';

export const createContent = withPermissionAction(
  'content',
  'create',
  async ({ title, projectId }, { context }) => {
    return await db.content.create({
      data: {
        title,
        projectId,
        authorId: context.user.id,
        status: 'draft',
      },
    });
  }
);

export const deleteContent = withPermissionAction(
  'content',
  'delete',
  async ({ contentId }, { context }) => {
    // Check if user owns this content or has admin role
    const content = await db.content.findUnique({
      where: { id: contentId },
      select: { authorId: true },
    });
    
    if (!content) {
      throw new Error('Content not found');
    }
    
    // Allow if user is author or has admin role
    const isAuthor = content.authorId === context.user.id;
    const isAdmin = context.userRoles.some(role => 
      role.name === 'admin' || role.name === 'owner'
    );
    
    if (!isAuthor && !isAdmin) {
      throw new Error('Permission denied: Can only delete your own content');
    }
    
    return await db.content.delete({
      where: { id: contentId },
    });
  }
);

// API route example for external developers
// app/api/v1/content/route.ts
import { requirePermission } from '@/server/auth/middleware';
import { getCurrentUserWithRoles } from '@/server/auth/clerk-helpers';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  // Check permission
  const permissionResult = await requirePermission('content', 'create');
  if (!permissionResult.success) {
    return Response.json(
      { error: permissionResult.error },
      { status: permissionResult.status }
    );
  }
  
  const user = await getCurrentUserWithRoles();
  const { title, content } = await req.json();
  
  // Create content logic here...
  const newContent = await db.content.create({
    data: {
      title,
      content,
      authorId: user.id,
      // Get default project or from header/query
      projectId: req.headers.get('x-project-id') || 'default',
    },
  });
  
  return Response.json({ 
    success: true, 
    data: newContent 
  });
}
