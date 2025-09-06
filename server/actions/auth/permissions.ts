'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireAuth, getCurrentUserWithRoles, createPermissionContext } from '@/server/auth/clerk-helpers';
import { checkPermission } from '@/server/auth/abac';
import type { ResourceType, Action } from '@/server/auth/types';

/**
 * Server action wrapper that requires authentication and specific permissions
 */
export async function withPermissionAction<T extends unknown[], R>(
  resource: ResourceType,
  action: Action,
  actionFn: (...args: T) => Promise<R>,
  context?: {
    orgId?: string;
    workspaceId?: string;
    projectId?: string;
    extractContextFromArgs?: (...args: T) => { orgId?: string; workspaceId?: string; projectId?: string };
    redirectOnFailure?: string;
    revalidateOnSuccess?: string;
  }
) {
  return async (...args: T): Promise<R> => {
    try {
      // Require authentication
      await requireAuth();
      
      // Extract context from arguments if provided
      let permissionContext = context || {};
      if (context?.extractContextFromArgs) {
        const extractedContext = context.extractContextFromArgs(...args);
        permissionContext = { ...permissionContext, ...extractedContext };
      }
      
      // Create permission context
      const ctx = await createPermissionContext(
        permissionContext.orgId,
        permissionContext.workspaceId,
        permissionContext.projectId
      );
      
      if (!ctx) {
        throw new Error('Unable to create permission context');
      }
      
      // Check permission
      const result = await checkPermission(ctx, resource, action);
      
      if (!result.allowed) {
        if (context?.redirectOnFailure) {
          redirect(context.redirectOnFailure);
        }
        throw new Error(result.reason || 'Insufficient permissions');
      }
      
      // Execute the action
      const actionResult = await actionFn(...args);
      
      // Revalidate if specified
      if (context?.revalidateOnSuccess) {
        revalidatePath(context.revalidateOnSuccess);
      }
      
      return actionResult;
    } catch (error) {
      if (context?.redirectOnFailure && error instanceof Error && error.message.includes('permission')) {
        redirect(context.redirectOnFailure);
      }
      throw error;
    }
  };
}

/**
 * Check if current user has permission (doesn't throw, returns boolean)
 */
export async function checkUserPermission(
  resource: ResourceType,
  action: Action,
  context?: {
    orgId?: string;
    workspaceId?: string;
    projectId?: string;
    resourceData?: Record<string, unknown>;
  }
): Promise<boolean> {
  try {
    const user = await getCurrentUserWithRoles();
    if (!user) return false;
    
    const ctx = await createPermissionContext(
      context?.orgId,
      context?.workspaceId,
      context?.projectId
    );
    
    if (!ctx) return false;
    
    const result = await checkPermission(ctx, resource, action, context?.resourceData);
    return result.allowed;
  } catch (error) {
    console.error('Error checking user permission:', error);
    return false;
  }
}

/**
 * Get user's permissions for a specific context
 */
export async function getUserPermissions(context?: {
  orgId?: string;
  workspaceId?: string;
  projectId?: string;
}) {
  try {
    const user = await getCurrentUserWithRoles();
    if (!user) return null;
    
    const ctx = await createPermissionContext(
      context?.orgId,
      context?.workspaceId,
      context?.projectId
    );
    
    if (!ctx) return null;
    
    // Check common permissions
    const permissions = {
      organization: {
        create: await checkPermission(ctx, 'organization', 'create').then(r => r.allowed),
        read: await checkPermission(ctx, 'organization', 'read').then(r => r.allowed),
        update: await checkPermission(ctx, 'organization', 'update').then(r => r.allowed),
        delete: await checkPermission(ctx, 'organization', 'delete').then(r => r.allowed),
        invite: await checkPermission(ctx, 'organization', 'invite').then(r => r.allowed),
        manage: await checkPermission(ctx, 'organization', 'manage').then(r => r.allowed),
      },
      workspace: {
        create: await checkPermission(ctx, 'workspace', 'create').then(r => r.allowed),
        read: await checkPermission(ctx, 'workspace', 'read').then(r => r.allowed),
        update: await checkPermission(ctx, 'workspace', 'update').then(r => r.allowed),
        delete: await checkPermission(ctx, 'workspace', 'delete').then(r => r.allowed),
        manage: await checkPermission(ctx, 'workspace', 'manage').then(r => r.allowed),
      },
      project: {
        create: await checkPermission(ctx, 'project', 'create').then(r => r.allowed),
        read: await checkPermission(ctx, 'project', 'read').then(r => r.allowed),
        update: await checkPermission(ctx, 'project', 'update').then(r => r.allowed),
        delete: await checkPermission(ctx, 'project', 'delete').then(r => r.allowed),
        manage: await checkPermission(ctx, 'project', 'manage').then(r => r.allowed),
      },
      content: {
        create: await checkPermission(ctx, 'content', 'create').then(r => r.allowed),
        read: await checkPermission(ctx, 'content', 'read').then(r => r.allowed),
        update: await checkPermission(ctx, 'content', 'update').then(r => r.allowed),
        delete: await checkPermission(ctx, 'content', 'delete').then(r => r.allowed),
        export: await checkPermission(ctx, 'content', 'export').then(r => r.allowed),
        publish: await checkPermission(ctx, 'content', 'publish').then(r => r.allowed),
        schedule: await checkPermission(ctx, 'content', 'schedule').then(r => r.allowed),
      },
      apikey: {
        create: await checkPermission(ctx, 'apikey', 'create').then(r => r.allowed),
        read: await checkPermission(ctx, 'apikey', 'read').then(r => r.allowed),
        update: await checkPermission(ctx, 'apikey', 'update').then(r => r.allowed),
        delete: await checkPermission(ctx, 'apikey', 'delete').then(r => r.allowed),
      },
      billing: {
        read: await checkPermission(ctx, 'billing', 'read').then(r => r.allowed),
        update: await checkPermission(ctx, 'billing', 'update').then(r => r.allowed),
      },
    };
    
    return permissions;
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return null;
  }
}
