// components/ui/permission-wrapper.tsx - Simple permission wrapper for dashboard

'use client';

import { useUser } from '@clerk/nextjs';
import { ReactNode } from 'react';

interface PermissionWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  requireAuth?: boolean;
  requireRole?: 'owner' | 'admin' | 'member';
}

export function PermissionWrapper({
  children,
  fallback = <div className="text-center py-8 text-muted-foreground">Access denied</div>,
  requireAuth = true,
  requireRole,
}: PermissionWrapperProps) {
  const { user, isLoaded } = useUser();

  // Loading state
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Check authentication
  if (requireAuth && !user) {
    return <>{fallback}</>;
  }

  // Check role if specified
  if (requireRole && user) {
    const hasRole = user.organizationMemberships?.some(
      membership => 
        membership.role === `org:${requireRole}` || 
        (requireRole === 'member' && membership.role === 'org:admin') ||
        (requireRole === 'member' && membership.role === 'org:owner') ||
        (requireRole === 'admin' && membership.role === 'org:owner')
    );

    if (!hasRole) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
}

// Quick permission check hooks for dashboard
export function useIsAuthenticated() {
  const { user, isLoaded } = useUser();
  return { isAuthenticated: isLoaded && !!user, isLoaded };
}

export function useUserRole() {
  const { user, isLoaded } = useUser();
  
  const role = user?.organizationMemberships?.[0]?.role?.replace('org:', '') as 'owner' | 'admin' | 'member' | undefined;
  
  return {
    role,
    isOwner: role === 'owner',
    isAdmin: role === 'admin' || role === 'owner',
    isMember: !!role,
    isLoaded,
  };
}

// Permission check for specific actions
export function useCanPerform() {
  const { role, isLoaded } = useUserRole();
  
  return {
    canCreateContent: isLoaded && !!role,
    canDeleteContent: isLoaded && (role === 'admin' || role === 'owner'),
    canManageUsers: isLoaded && (role === 'admin' || role === 'owner'),
    canManageBilling: isLoaded && role === 'owner',
    canAccessSettings: isLoaded && (role === 'admin' || role === 'owner'),
    isLoaded,
  };
}
