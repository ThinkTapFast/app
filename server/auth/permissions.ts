import type { 
  PermissionContext, 
  PlanPermissions,
  OrganizationalRole,
  WorkspaceRole,
  ProjectRole,
  ContentResource,
  ProjectResource,
  WorkspaceResource,
  OrganizationResource,
  ApiKeyResource,
  UserResource
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
  const membership = context.user.workspaceMemberships?.find(m => m.workspace.id === workspaceId);
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
  const membership = context.user.projectMemberships?.find(m => m.project.id === projectId);
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

// System-wide permissions based on plans with proper typing
// Shared enterprise permissions for BUSINESS and AGENCY plans
const ENTERPRISE_PERMISSIONS: PlanPermissions = {
  content: {
    create: true,
    read: true,
    update: (context, resource) => {
      const contentRes = resource as ContentResource;
      return isOwner(context, contentRes?.userId) || 
             hasProjectRole(context, contentRes?.projectId, 'editor');
    },
    delete: (context, resource) => {
      const contentRes = resource as ContentResource;
      return isOwner(context, contentRes?.userId) || 
             hasProjectRole(context, contentRes?.projectId, 'owner');
    },
    export: true,
    publish: true,
    schedule: true,
    manage: true,
  },
  project: {
    create: true,
    read: true,
    update: (context, resource) => hasProjectRole(context, (resource as ProjectResource)?.id, 'editor'),
    delete: (context, resource) => hasProjectRole(context, (resource as ProjectResource)?.id, 'owner'),
    manage: true,
  },
  workspace: {
    create: true,
    read: true,
    update: (context, resource) => hasWorkspaceRole(context, (resource as WorkspaceResource)?.id, 'admin'),
    delete: (context, resource) => hasWorkspaceRole(context, (resource as WorkspaceResource)?.id, 'admin'),
    manage: true,
  },
  organization: {
    create: true,
    read: true,
    update: (context, resource) => hasOrganizationRole(context, (resource as OrganizationResource)?.id, 'admin'),
    delete: (context, resource) => hasOrganizationRole(context, (resource as OrganizationResource)?.id, 'owner'),
    invite: true,
    manage: true,
  },
  apikey: {
    create: true,
    read: true,
    update: (context, resource) => hasOrganizationRole(context, (resource as ApiKeyResource)?.orgId, 'admin'),
    delete: (context, resource) => hasOrganizationRole(context, (resource as ApiKeyResource)?.orgId, 'admin'),
  },
  user: {
    invite: true,
    manage: (context, resource) => hasOrganizationRole(context, (resource as UserResource)?.orgId || '', 'admin'),
  },
  billing: {
    read: (context, resource) => hasOrganizationRole(context, (resource as OrganizationResource)?.id, 'admin'),
    update: (context, resource) => hasOrganizationRole(context, (resource as OrganizationResource)?.id, 'owner'),
  },
};

export const SYSTEM_PERMISSIONS: Record<Plan, PlanPermissions> = {
  FREE: {
    content: {
      create: () => {
        // Check usage limits for free plan
        return true; // Implement usage checking logic
      },
      read: true,
      update: (context, resource) => isOwner(context, (resource as ContentResource)?.userId),
      delete: (context, resource) => isOwner(context, (resource as ContentResource)?.userId),
      export: false, // No export for free
    },
    project: {
      create: () => {
        // Limit number of projects for free plan
        return true; // Implement project limit checking
      },
      read: true,
      update: (context, resource) => hasProjectRole(context, (resource as ProjectResource)?.id, 'editor'),
      delete: (context, resource) => hasProjectRole(context, (resource as ProjectResource)?.id, 'owner'),
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
      update: (context, resource) => hasOrganizationRole(context, (resource as OrganizationResource)?.id, 'admin'),
      delete: (context, resource) => hasOrganizationRole(context, (resource as OrganizationResource)?.id, 'owner'),
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
      update: (context, resource) => isOwner(context, (resource as ContentResource)?.userId),
      delete: (context, resource) => isOwner(context, (resource as ContentResource)?.userId),
      export: true, // PDF export allowed
      publish: (context, resource) => isOwner(context, (resource as ContentResource)?.userId),
      schedule: (context, resource) => isOwner(context, (resource as ContentResource)?.userId),
    },
    project: {
      create: true,
      read: true,
      update: (context, resource) => hasProjectRole(context, (resource as ProjectResource)?.id, 'editor'),
      delete: (context, resource) => hasProjectRole(context, (resource as ProjectResource)?.id, 'owner'),
    },
    workspace: {
      create: (context, resource) => hasOrganizationRole(context, (resource as WorkspaceResource)?.orgId, 'admin'),
      read: true,
      update: (context, resource) => hasWorkspaceRole(context, (resource as WorkspaceResource)?.id, 'admin'),
      delete: (context, resource) => hasWorkspaceRole(context, (resource as WorkspaceResource)?.id, 'admin'),
    },
    organization: {
      create: true,
      read: true,
      update: (context, resource) => hasOrganizationRole(context, (resource as OrganizationResource)?.id, 'admin'),
      delete: (context, resource) => hasOrganizationRole(context, (resource as OrganizationResource)?.id, 'owner'),
      invite: (context, resource) => hasOrganizationRole(context, (resource as OrganizationResource)?.id, 'admin'),
    },
    apikey: {
      create: (context, resource) => hasOrganizationRole(context, (resource as ApiKeyResource)?.orgId, 'admin'),
      read: (context, resource) => hasOrganizationRole(context, (resource as ApiKeyResource)?.orgId, 'member'),
      update: (context, resource) => hasOrganizationRole(context, (resource as ApiKeyResource)?.orgId, 'admin'),
      delete: (context, resource) => hasOrganizationRole(context, (resource as ApiKeyResource)?.orgId, 'admin'),
    },
  },

  // Both BUSINESS and AGENCY use the same enterprise-level permissions
  BUSINESS: ENTERPRISE_PERMISSIONS,
  AGENCY: ENTERPRISE_PERMISSIONS,

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
