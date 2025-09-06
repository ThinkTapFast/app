// server/auth/abac.ts - Main ABAC permission system

import type { 
  PermissionContext, 
  ResourceType, 
  Action, 
  PermissionResult,
  OrganizationalRole,
  WorkspaceRole,
  ProjectRole
} from './types';
import type { Plan } from '@prisma/client';

// Helper functions for permission checking
export function isResourceOwner(context: PermissionContext, resourceOwnerId?: string): boolean {
  return context.user.id === resourceOwnerId;
}

export function hasOrganizationRole(
  context: PermissionContext, 
  orgId: string, 
  requiredRole: OrganizationalRole
): boolean {
  const membership = context.user.memberships.find(m => m.organization.id === orgId);
  if (!membership) return false;

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

export function getUserPlan(context: PermissionContext, orgId?: string): Plan {
  if (!orgId) {
    // Use the first organization's plan if no specific org
    const firstMembership = context.user.memberships[0];
    return firstMembership?.organization.plan || 'FREE';
  }
  
  const membership = context.user.memberships.find(m => m.organization.id === orgId);
  return membership?.organization.plan || 'FREE';
}

// Main permission checking function
export async function checkPermission(
  context: PermissionContext,
  resource: ResourceType,
  action: Action,
  resourceData?: Record<string, unknown>
): Promise<PermissionResult> {
  try {
    const plan = getUserPlan(context, context.organizationId);
    
    // Plan-based permission checking
    const allowed = await checkPlanPermission(plan, context, resource, action, resourceData);
    
    return {
      allowed,
      reason: allowed ? undefined : `Insufficient permissions for ${action} on ${resource}`
    };
  } catch (error) {
    console.error('Permission check error:', error);
    return {
      allowed: false,
      reason: 'Permission check failed'
    };
  }
}

// Plan-based permission checking
async function checkPlanPermission(
  plan: Plan,
  context: PermissionContext,
  resource: ResourceType,
  action: Action,
  resourceData?: Record<string, unknown>
): Promise<boolean> {
  switch (resource) {
    case 'content':
      return checkContentPermission(plan, context, action, resourceData);
    
    case 'project':
      return checkProjectPermission(plan, context, action, resourceData);
    
    case 'workspace':
      return checkWorkspacePermission(plan, context, action, resourceData);
    
    case 'organization':
      return checkOrganizationPermission(plan, context, action, resourceData);
    
    case 'apikey':
      return checkApiKeyPermission(plan, context, action, resourceData);
    
    case 'user':
      return checkUserPermission(plan, context, action, resourceData);
    
    case 'billing':
      return checkBillingPermission(plan, context, action, resourceData);
    
    default:
      return false;
  }
}

// Content permissions
function checkContentPermission(
  plan: Plan,
  context: PermissionContext,
  action: Action,
  resourceData?: Record<string, unknown>
): boolean {
  const userId = context.user.id;
  const contentUserId = resourceData?.userId as string;
  const contentProjectId = resourceData?.projectId as string;

  switch (action) {
    case 'create':
      return plan !== 'FREE' || true; // Free users can create with limits
    
    case 'read':
      return true; // All plans can read
    
    case 'update':
      if (plan === 'FREE') {
        return userId === contentUserId; // Only own content
      }
      if (userId === contentUserId) return true;
      return contentProjectId ? hasProjectRole(context, contentProjectId, 'editor') : false;
    
    case 'delete':
      if (plan === 'FREE') {
        return userId === contentUserId;
      }
      if (userId === contentUserId) return true;
      return contentProjectId ? hasProjectRole(context, contentProjectId, 'owner') : false;
    
    case 'export':
      return plan !== 'FREE'; // No export for free
    
    case 'publish':
    case 'schedule':
      return plan === 'PRO' || plan === 'BUSINESS' || plan === 'AGENCY' || plan === 'CUSTOM';
    
    default:
      return false;
  }
}

// Project permissions
function checkProjectPermission(
  plan: Plan,
  context: PermissionContext,
  action: Action,
  resourceData?: Record<string, unknown>
): boolean {
  const projectId = resourceData?.id as string;

  switch (action) {
    case 'create':
      return plan !== 'FREE' || true; // Free users with limits
    
    case 'read':
      return true;
    
    case 'update':
      return projectId ? hasProjectRole(context, projectId, 'editor') : false;
    
    case 'delete':
      return projectId ? hasProjectRole(context, projectId, 'owner') : false;
    
    case 'manage':
      return (plan === 'BUSINESS' || plan === 'AGENCY' || plan === 'CUSTOM') &&
             projectId ? hasProjectRole(context, projectId, 'owner') : false;
    
    default:
      return false;
  }
}

// Workspace permissions
function checkWorkspacePermission(
  plan: Plan,
  context: PermissionContext,
  action: Action,
  resourceData?: Record<string, unknown>
): boolean {
  const workspaceId = resourceData?.id as string;
  const orgId = resourceData?.orgId as string;

  switch (action) {
    case 'create':
      if (plan === 'FREE') return false;
      return orgId ? hasOrganizationRole(context, orgId, 'admin') : false;
    
    case 'read':
      return true;
    
    case 'update':
    case 'delete':
      return workspaceId ? hasWorkspaceRole(context, workspaceId, 'admin') : false;
    
    case 'manage':
      return (plan === 'BUSINESS' || plan === 'AGENCY' || plan === 'CUSTOM') &&
             workspaceId ? hasWorkspaceRole(context, workspaceId, 'admin') : false;
    
    default:
      return false;
  }
}

// Organization permissions
function checkOrganizationPermission(
  plan: Plan,
  context: PermissionContext,
  action: Action,
  resourceData?: Record<string, unknown>
): boolean {
  const orgId = resourceData?.id as string;

  switch (action) {
    case 'create':
      return true; // All users can create organizations
    
    case 'read':
      return true;
    
    case 'update':
      return orgId ? hasOrganizationRole(context, orgId, 'admin') : false;
    
    case 'delete':
      return orgId ? hasOrganizationRole(context, orgId, 'owner') : false;
    
    case 'invite':
      if (plan === 'FREE') return false;
      if (plan === 'PRO') return orgId ? hasOrganizationRole(context, orgId, 'admin') : false;
      return orgId ? hasOrganizationRole(context, orgId, 'member') : false;
    
    case 'manage':
      return orgId ? hasOrganizationRole(context, orgId, 'admin') : false;
    
    default:
      return false;
  }
}

// API Key permissions
function checkApiKeyPermission(
  plan: Plan,
  context: PermissionContext,
  action: Action,
  resourceData?: Record<string, unknown>
): boolean {
  const orgId = resourceData?.orgId as string;

  if (plan === 'FREE') return false; // No API access for free

  switch (action) {
    case 'create':
    case 'update':
    case 'delete':
      return orgId ? hasOrganizationRole(context, orgId, 'admin') : false;
    
    case 'read':
      return orgId ? hasOrganizationRole(context, orgId, 'member') : false;
    
    default:
      return false;
  }
}

// User permissions
function checkUserPermission(
  plan: Plan,
  context: PermissionContext,
  action: Action,
  resourceData?: Record<string, unknown>
): boolean {
  const orgId = resourceData?.orgId as string;

  switch (action) {
    case 'invite':
      if (plan === 'FREE') return false;
      if (plan === 'PRO') return orgId ? hasOrganizationRole(context, orgId, 'admin') : false;
      return orgId ? hasOrganizationRole(context, orgId, 'member') : false;
    
    case 'manage':
      return orgId ? hasOrganizationRole(context, orgId, 'admin') : false;
    
    default:
      return false;
  }
}

// Billing permissions
function checkBillingPermission(
  plan: Plan,
  context: PermissionContext,
  action: Action,
  resourceData?: Record<string, unknown>
): boolean {
  const orgId = resourceData?.orgId as string;

  switch (action) {
    case 'read':
      return orgId ? hasOrganizationRole(context, orgId, 'admin') : false;
    
    case 'update':
      return orgId ? hasOrganizationRole(context, orgId, 'owner') : false;
    
    default:
      return false;
  }
}

// Convenience function similar to your examples
export function can(user: PermissionContext['user']) {
  return {
    async perform(action: Action, resource: ResourceType, data?: Record<string, unknown>) {
      const context: PermissionContext = { user };
      const result = await checkPermission(context, resource, action, data);
      return result.allowed;
    },

    // Specific helpers
    async createContent(projectId?: string) {
      const context: PermissionContext = { user, projectId };
      const result = await checkPermission(context, 'content', 'create');
      return result.allowed;
    },

    async updateContent(contentData: { id: string; userId: string; projectId: string }) {
      const context: PermissionContext = { user, projectId: contentData.projectId };
      const result = await checkPermission(context, 'content', 'update', contentData);
      return result.allowed;
    },

    async deleteProject(projectData: { id: string }) {
      const context: PermissionContext = { user };
      const result = await checkPermission(context, 'project', 'delete', projectData);
      return result.allowed;
    },

    async inviteUser(orgId: string) {
      const context: PermissionContext = { user, organizationId: orgId };
      const result = await checkPermission(context, 'user', 'invite', { orgId });
      return result.allowed;
    },
  };
}

// Export the main check function for use in middleware and API routes
export { checkPermission as default };
