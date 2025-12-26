/**
 * API Route Permission Helpers
 * 
 * Use these helpers in your API route handlers to check permissions.
 * This keeps middleware lightweight (under 1MB for Edge Runtime).
 * 
 * Example usage in API routes:
 * 
 * import { checkApiPermission } from '@/server/auth/api-permissions';
 * 
 * export async function POST(req: NextRequest) {
 *   const permissionCheck = await checkApiPermission('content', 'create');
 *   if (!permissionCheck.allowed) {
 *     return NextResponse.json({ error: permissionCheck.error }, { status: 403 });
 *   }
 *   
 *   // Your API logic here
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getCurrentUserWithRoles, createPermissionContext } from './clerk-helpers';
import { checkPermission } from './abac';
import type { ResourceType, Action } from './types';

interface PermissionCheckResult {
  allowed: boolean;
  error?: string;
  userId?: string;
}

/**
 * Check if the current user has permission to perform an action on a resource
 * Use this in your API route handlers
 */
export async function checkApiPermission(
  resource: ResourceType,
  action: Action,
  context?: { orgId?: string; workspaceId?: string; projectId?: string }
): Promise<PermissionCheckResult> {
  try {
    // Get authenticated user
    const { userId } = await auth();
    
    if (!userId) {
      return {
        allowed: false,
        error: 'Unauthorized - Authentication required'
      };
    }

    // Get user with roles (uses auth() internally)
    const user = await getCurrentUserWithRoles();
    
    if (!user) {
      return {
        allowed: false,
        error: 'User not found'
      };
    }

    // Create permission context
    const permissionContext = await createPermissionContext(
      context?.orgId,
      context?.workspaceId,
      context?.projectId
    );

    if (!permissionContext) {
      return {
        allowed: false,
        error: 'Failed to create permission context'
      };
    }

    // Check permission using ABAC
    const hasPermission = checkPermission(
      permissionContext,
      resource,
      action
    );

    if (!hasPermission) {
      return {
        allowed: false,
        error: `Forbidden - You don't have permission to ${action} ${resource}`
      };
    }

    return {
      allowed: true,
      userId
    };
  } catch (error) {
    console.error('Permission check error:', error);
    return {
      allowed: false,
      error: 'Internal server error during permission check'
    };
  }
}

/**
 * Middleware-style wrapper for API routes
 * Returns a Response if permission denied, null if allowed
 */
export async function requirePermission(
  resource: ResourceType,
  action: Action,
  context?: { orgId?: string; workspaceId?: string; projectId?: string }
): Promise<NextResponse | null> {
  const check = await checkApiPermission(resource, action, context);
  
  if (!check.allowed) {
    return NextResponse.json(
      { error: check.error },
      { status: check.error?.includes('Unauthorized') ? 401 : 403 }
    );
  }
  
  return null;
}
