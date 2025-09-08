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
    
    // Helper function to check multiple permissions for a resource
    const checkResourcePermissions = async (
      resource: ResourceType, 
      actions: Action[]
    ): Promise<Record<string, boolean>> => {
      const results = await Promise.all(
        actions.map(async (action) => {
          const result = await checkPermission(ctx, resource, action);
          return [action, result.allowed] as const;
        })
      );
      return Object.fromEntries(results);
    };
    
    // Check permissions for all resources
    const [organizationPerms, workspacePerms, projectPerms, contentPerms, apikeyPerms, billingPerms] = await Promise.all([
      checkResourcePermissions('organization', ['create', 'read', 'update', 'delete', 'invite', 'manage']),
      checkResourcePermissions('workspace', ['create', 'read', 'update', 'delete', 'manage']),
      checkResourcePermissions('project', ['create', 'read', 'update', 'delete', 'manage']),
      checkResourcePermissions('content', ['create', 'read', 'update', 'delete', 'export', 'publish', 'schedule']),
      checkResourcePermissions('apikey', ['create', 'read', 'update', 'delete']),
      checkResourcePermissions('billing', ['read', 'update']),
    ]);
    
    return {
      organization: organizationPerms,
      workspace: workspacePerms,
      project: projectPerms,
      content: contentPerms,
      apikey: apikeyPerms,
      billing: billingPerms,
    };
    
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return null;
  }
}
