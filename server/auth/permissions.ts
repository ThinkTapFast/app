// server/auth/permissions.ts - ABAC permission configurations

import type { 
  PermissionContext, 
  RolePermissions, 
  ContentResource,
  ProjectResource,
  WorkspaceResource,
  OrganizationResource,
  ApiKeyResource,
  UserResource,
  PermissionCheck,
  OrganizationalRole,
  WorkspaceRole,
  ProjectRole
} from './types';
import type { Plan } from '@prisma/client';

// Helper functions for permission checking
export function isOwner(context: PermissionContext, resourceOwnerId?: string): boolean {
  return context.user.id === resourceOwnerId;
}

export function hasOrganizationRole(
  context: PermissionContext, 
  orgId: string, 
  requiredRole: OrganizationalRole
): boolean {
  const membership = context.user.memberships.find(m => m.organization.id === orgId);
  if (!membership) return false;

  // Check if user has the required role or higher
  const roleHierarchy: OrganizationalRole[] = ['viewer', 'member', 'admin', 'owner'];
  const userRoles = membership.membershipRoles.map(mr => mr.role.name as OrganizationalRole);
  const requiredLevel = roleHierarchy.indexOf(requiredRole);
  
  return userRoles.some(role => roleHierarchy.indexOf(role) >= requiredLevel);
}

export function hasWorkspaceRole(
  context: PermissionContext, 
  workspaceId: string, 
  requiredRole: WorkspaceRole
): boolean {
  const membership = context.user.workspaceMemberships.find(m => m.workspace.id === workspaceId);
  if (!membership) return false;

  const roleHierarchy: WorkspaceRole[] = ['viewer', 'editor', 'admin'];
  const userRoles = membership.roles.map(r => r.role.name as WorkspaceRole);
  const requiredLevel = roleHierarchy.indexOf(requiredRole);
  
  return userRoles.some(role => roleHierarchy.indexOf(role) >= requiredLevel);
}

export function hasProjectRole(
  context: PermissionContext, 
  projectId: string, 
  requiredRole: ProjectRole
): boolean {
  const membership = context.user.projectMemberships.find(m => m.project.id === projectId);
  if (!membership) return false;

  const roleHierarchy: ProjectRole[] = ['viewer', 'collaborator', 'editor', 'owner'];
  const userRoles = membership.roles.map(r => r.role.name as ProjectRole);
  const requiredLevel = roleHierarchy.indexOf(requiredRole);
  
  return userRoles.some(role => roleHierarchy.indexOf(role) >= requiredLevel);
}

export function hasPlanAccess(context: PermissionContext, orgId: string, requiredPlan: Plan): boolean {
  const membership = context.user.memberships.find(m => m.organization.id === orgId);
  if (!membership) return false;

  const planHierarchy: Plan[] = ['FREE', 'PRO', 'BUSINESS', 'AGENCY', 'CUSTOM'];
  const currentPlan = membership.organization.plan;
  const requiredLevel = planHierarchy.indexOf(requiredPlan);
  const currentLevel = planHierarchy.indexOf(currentPlan);
  
  return currentLevel >= requiredLevel;
}

// System-wide permissions based on plans
export const SYSTEM_PERMISSIONS: Record<Plan, RolePermissions> = {
  FREE: {
    content: {
      create: (context) => {
        // Check usage limits for free plan
        return true; // Implement usage checking logic
      },
      read: true,
      update: (context, resource) => isOwner(context, resource?.userId),
      delete: (context, resource) => isOwner(context, resource?.userId),
      export: false, // No export for free
    },
    project: {
      create: (context) => {
        // Limit number of projects for free plan
        return true; // Implement project limit checking
      },
      read: true,
      update: (context, resource) => hasProjectRole(context, resource?.id, 'editor'),
      delete: (context, resource) => hasProjectRole(context, resource?.id, 'owner'),
    },
    workspace: {
      create: false, // No workspace creation for free
      read: true,
      update: false,
      delete: false,
    },
    organization: {
      create: true,
      read: true,
      update: (context, resource) => hasOrganizationRole(context, resource?.id, 'admin'),
      delete: (context, resource) => hasOrganizationRole(context, resource?.id, 'owner'),
      invite: false, // No team invites for free
    },
    apikey: {
      create: false, // No API access for free
      read: false,
      update: false,
      delete: false,
    },
  },
  
  PRO: {
    content: {
      create: true,
      read: true,
      update: (context, resource) => isOwner(context, resource?.userId),
      delete: (context, resource) => isOwner(context, resource?.userId),
      export: true, // PDF export allowed
      publish: (context, resource) => isOwner(context, resource?.userId),
      schedule: (context, resource) => isOwner(context, resource?.userId),
    },
    project: {
      create: true,
      read: true,
      update: (context, resource) => hasProjectRole(context, resource?.id, 'editor'),
      delete: (context, resource) => hasProjectRole(context, resource?.id, 'owner'),
    },
    workspace: {
      create: (context, resource) => hasOrganizationRole(context, resource?.orgId, 'admin'),
      read: true,
      update: (context, resource) => hasWorkspaceRole(context, resource?.id, 'admin'),
      delete: (context, resource) => hasWorkspaceRole(context, resource?.id, 'admin'),
    },
    organization: {
      create: true,
      read: true,
      update: (context, resource) => hasOrganizationRole(context, resource?.id, 'admin'),
      delete: (context, resource) => hasOrganizationRole(context, resource?.id, 'owner'),
      invite: (context, resource) => hasOrganizationRole(context, resource?.id, 'admin'),
    },
    apikey: {
      create: (context, resource) => hasOrganizationRole(context, resource?.orgId, 'admin'),
      read: (context, resource) => hasOrganizationRole(context, resource?.orgId, 'member'),
      update: (context, resource) => hasOrganizationRole(context, resource?.orgId, 'admin'),
      delete: (context, resource) => hasOrganizationRole(context, resource?.orgId, 'admin'),
    },
  },

  BUSINESS: {
    content: {
      create: true,
      read: true,
      update: (context, resource) => {
        return isOwner(context, resource?.userId) || 
               hasProjectRole(context, resource?.projectId, 'editor');
      },
      delete: (context, resource) => {
        return isOwner(context, resource?.userId) || 
               hasProjectRole(context, resource?.projectId, 'owner');
      },
      export: true,
      publish: true,
      schedule: true,
    },
    project: {
      create: true,
      read: true,
      update: (context, resource) => hasProjectRole(context, resource?.id, 'editor'),
      delete: (context, resource) => hasProjectRole(context, resource?.id, 'owner'),
      manage: (context, resource) => hasProjectRole(context, resource?.id, 'owner'),
    },
    workspace: {
      create: true,
      read: true,
      update: (context, resource) => hasWorkspaceRole(context, resource?.id, 'admin'),
      delete: (context, resource) => hasWorkspaceRole(context, resource?.id, 'admin'),
      manage: (context, resource) => hasWorkspaceRole(context, resource?.id, 'admin'),
    },
    organization: {
      create: true,
      read: true,
      update: (context, resource) => hasOrganizationRole(context, resource?.id, 'admin'),
      delete: (context, resource) => hasOrganizationRole(context, resource?.id, 'owner'),
      invite: (context, resource) => hasOrganizationRole(context, resource?.id, 'member'),
      manage: (context, resource) => hasOrganizationRole(context, resource?.id, 'admin'),
    },
    apikey: {
      create: true,
      read: true,
      update: (context, resource) => hasOrganizationRole(context, resource?.orgId, 'admin'),
      delete: (context, resource) => hasOrganizationRole(context, resource?.orgId, 'admin'),
    },
    user: {
      invite: (context, resource) => hasOrganizationRole(context, resource?.orgId, 'member'),
      manage: (context, resource) => hasOrganizationRole(context, resource?.orgId, 'admin'),
    },
  },

  AGENCY: {
    // Agency inherits all BUSINESS permissions plus additional ones
    ...{} as RolePermissions, // Will be populated by extending BUSINESS
    organization: {
      create: true,
      read: true,
      update: true,
      delete: (context, resource) => hasOrganizationRole(context, resource?.id, 'owner'),
      invite: true,
      manage: true,
    },
    workspace: {
      create: true,
      read: true,
      update: true,
      delete: (context, resource) => hasWorkspaceRole(context, resource?.id, 'admin'),
      manage: true,
    },
    project: {
      create: true,
      read: true,
      update: true,
      delete: (context, resource) => hasProjectRole(context, resource?.id, 'owner'),
      manage: true,
    },
    content: {
      create: true,
      read: true,
      update: true,
      delete: true,
      export: true,
      publish: true,
      schedule: true,
      manage: true,
    },
    apikey: {
      create: true,
      read: true,
      update: true,
      delete: true,
    },
    user: {
      invite: true,
      manage: true,
    },
    billing: {
      read: (context, resource) => hasOrganizationRole(context, resource?.orgId, 'admin'),
      update: (context, resource) => hasOrganizationRole(context, resource?.orgId, 'owner'),
    },
  },

  CUSTOM: {
    // Custom plans get full access - will be configured per customer
    content: { create: true, read: true, update: true, delete: true, export: true, publish: true, schedule: true, manage: true },
    project: { create: true, read: true, update: true, delete: true, manage: true },
    workspace: { create: true, read: true, update: true, delete: true, manage: true },
    organization: { create: true, read: true, update: true, delete: true, invite: true, manage: true },
    apikey: { create: true, read: true, update: true, delete: true },
    user: { invite: true, manage: true },
    billing: { read: true, update: true },
  },
};

// Copy BUSINESS permissions to AGENCY and extend
SYSTEM_PERMISSIONS.AGENCY = {
  ...SYSTEM_PERMISSIONS.BUSINESS,
  ...SYSTEM_PERMISSIONS.AGENCY,
};
