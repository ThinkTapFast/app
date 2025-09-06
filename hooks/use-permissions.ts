// hooks/use-permissions.ts - Client-side permission checking hooks

'use client';

import React, { useCallback, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import type { ReactNode } from 'react';
import type { ResourceType, Action } from '@/server/auth/types';

/**
 * Hook for checking permissions on the client side
 * Note: This is for UI purposes only. Server-side validation is still required.
 */
export function usePermissions() {
  const { user, isLoaded } = useUser();

  const checkPermission = useCallback((
    resource: ResourceType,
    action: Action
  ): boolean => {
    if (!isLoaded || !user) {
      return false;
    }

    // Get user's organization memberships from Clerk metadata
    const orgMemberships = user.organizationMemberships || [];
    
    if (orgMemberships.length === 0) {
      return false;
    }

    // Simple client-side permission check based on role
    // This is a basic implementation - actual permissions are enforced server-side
    const hasAnyAdminRole = orgMemberships.some(membership => 
      membership.role === 'org:admin' || membership.role === 'org:owner'
    );

    const hasAnyMemberRole = orgMemberships.some(membership => 
      membership.role === 'org:member'
    );

    // Basic permission mapping (simplified for client-side)
    const adminPermissions = [
      'org.read', 'org.update', 'org.invite', 'org.manage',
      'workspace.create', 'workspace.read', 'workspace.update', 'workspace.delete',
      'project.create', 'project.read', 'project.update', 'project.delete',
      'content.create', 'content.read', 'content.update', 'content.delete', 'content.publish',
      'apikey.create', 'apikey.read', 'apikey.update', 'apikey.delete',
      'billing.read', 'billing.update',
    ];

    const memberPermissions = [
      'org.read',
      'workspace.read',
      'project.create', 'project.read', 'project.update',
      'content.create', 'content.read', 'content.update',
      'apikey.read',
    ];

    const permissionKey = `${resource}.${action}`;

    if (hasAnyAdminRole) {
      return adminPermissions.includes(permissionKey);
    }

    if (hasAnyMemberRole) {
      return memberPermissions.includes(permissionKey);
    }

    return false;
  }, [user, isLoaded]);

  const canRead = useCallback((resource: ResourceType) => {
    return checkPermission(resource, 'read');
  }, [checkPermission]);

  const canCreate = useCallback((resource: ResourceType) => {
    return checkPermission(resource, 'create');
  }, [checkPermission]);

  const canUpdate = useCallback((resource: ResourceType) => {
    return checkPermission(resource, 'update');
  }, [checkPermission]);

  const canDelete = useCallback((resource: ResourceType) => {
    return checkPermission(resource, 'delete');
  }, [checkPermission]);

  const canManage = useCallback((resource: ResourceType) => {
    return checkPermission(resource, 'manage');
  }, [checkPermission]);

  // Get current organization info
  const currentOrg = useMemo(() => {
    if (!user?.organizationMemberships?.length) return null;
    
    // Get the first organization (or you could implement org switching logic)
    const membership = user.organizationMemberships[0];
    return {
      id: membership.organization.id,
      name: membership.organization.name,
      role: membership.role,
      slug: membership.organization.slug,
    };
  }, [user]);

  // Check if user is admin in current org
  const isOrgAdmin = useMemo(() => {
    if (!currentOrg) return false;
    return currentOrg.role === 'org:admin' || currentOrg.role === 'org:owner';
  }, [currentOrg]);

  // Check if user is owner in current org
  const isOrgOwner = useMemo(() => {
    if (!currentOrg) return false;
    return currentOrg.role === 'org:owner';
  }, [currentOrg]);

  return {
    // Permission checking functions
    checkPermission,
    canRead,
    canCreate,
    canUpdate,
    canDelete,
    canManage,
    
    // Organization info
    currentOrg,
    isOrgAdmin,
    isOrgOwner,
    
    // Loading state
    isLoaded,
  };
}

/**
 * Simplified hook for quick permission checks
 */
export function useCanAccess(
  resource: ResourceType,
  action: Action
) {
  const { checkPermission, isLoaded } = usePermissions();
  
  return useMemo(() => ({
    canAccess: checkPermission(resource, action),
    isLoading: !isLoaded,
  }), [checkPermission, resource, action, isLoaded]);
}

/**
 * Hook for checking multiple permissions at once
 */
export function usePermissionSet(
  permissions: Array<{ resource: ResourceType; action: Action }>
) {
  const { checkPermission, isLoaded } = usePermissions();

  return useMemo(() => {
    const results: Record<string, boolean> = {};
    
    permissions.forEach(({ resource, action }) => {
      const key = `${resource}.${action}`;
      results[key] = checkPermission(resource, action);
    });

    return {
      permissions: results,
      isLoading: !isLoaded,
    };
  }, [checkPermission, permissions, isLoaded]);
}

/**
 * Component wrapper for permission-based rendering
 */
interface PermissionGateProps {
  resource: ResourceType;
  action: Action;
  children: ReactNode;
  fallback?: ReactNode;
  loading?: ReactNode;
}

export function PermissionGate({
  resource,
  action,
  children,
  fallback = null,
  loading = null,
}: PermissionGateProps): ReactNode {
  const { canAccess, isLoading } = useCanAccess(resource, action);

  if (isLoading) {
    return loading;
  }

  if (!canAccess) {
    return fallback;
  }

  return children;
}

/**
 * Higher-order component for permission-based component rendering
 */
export function withPermission<T extends object>(
  resource: ResourceType,
  action: Action
) {
  return function PermissionWrapper(WrappedComponent: React.ComponentType<T>) {
    return function WithPermissionComponent(props: T): ReactNode {
      const { canAccess, isLoading } = useCanAccess(resource, action);

      if (isLoading) {
        return React.createElement('div', null, 'Loading permissions...');
      }

      if (!canAccess) {
        return React.createElement('div', null, 'Access denied: Insufficient permissions');
      }

      return React.createElement(WrappedComponent, props);
    };
  };
}

/**
 * Utility function for client-side permission checking (non-hook)
 * Use this in non-React contexts
 */
export function checkPermissionOnClient(
  resource: ResourceType,
  action: Action,
  context?: { orgId?: string; workspaceId?: string; projectId?: string },
  user?: { organizationMemberships?: Array<{ role: string; organization: { id: string } }> }
): boolean {
  if (!user) {
    return false;
  }

  // Simple client-side check - server-side validation is authoritative
  const orgMemberships = user.organizationMemberships || [];
  
  if (orgMemberships.length === 0) {
    return false;
  }

  const hasAdminRole = orgMemberships.some((membership) => 
    membership.role === 'org:admin' || membership.role === 'org:owner'
  );

  const hasMemberRole = orgMemberships.some((membership) => 
    membership.role === 'org:member'
  );

  // Basic permissions for UI purposes
  const restrictedActions = ['delete', 'manage', 'publish', 'invite'];
  
  if (restrictedActions.includes(action)) {
    return hasAdminRole;
  }

  return hasAdminRole || hasMemberRole;
}
