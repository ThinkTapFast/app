// server/auth/types.ts - ABAC types for ThinkTapFast

import type { User, Organization, Workspace, Project, Role as DBRole, Permission as DBPermission } from '@prisma/client';

// Core entities from your database
export type UserWithRoles = User & {
  memberships: Array<{
    organization: Organization;
    membershipRoles: Array<{
      role: DBRole & {
        rolePermissions: Array<{
          permission: DBPermission;
        }>;
      };
    }>;
  }>;
  workspaceMemberships: Array<{
    workspace: Workspace;
    roles: Array<{
      role: DBRole & {
        rolePermissions: Array<{
          permission: DBPermission;
        }>;
      };
    }>;
  }>;
  projectMemberships: Array<{
    project: Project;
    roles: Array<{
      role: DBRole & {
        rolePermissions: Array<{
          permission: DBPermission;
        }>;
      };
    }>;
  }>;
};

// Resource types for ABAC
export type ResourceType = 
  | 'organization' 
  | 'workspace' 
  | 'project' 
  | 'content' 
  | 'user' 
  | 'billing' 
  | 'apikey';

// Actions that can be performed
export type Action = 
  | 'create' 
  | 'read' 
  | 'update' 
  | 'delete' 
  | 'invite' 
  | 'manage' 
  | 'export' 
  | 'publish' 
  | 'schedule';

// Context for permission checking
export interface PermissionContext {
  user: UserWithRoles;
  organizationId?: string;
  workspaceId?: string;
  projectId?: string;
  resource?: unknown; // The actual resource being accessed
}

// Permission check result
export interface PermissionResult {
  allowed: boolean;
  reason?: string;
}

// Permission function type
export type PermissionCheck<T = unknown> = 
  | boolean 
  | ((context: PermissionContext, resource?: T) => boolean | Promise<boolean>);

// Role-based permissions configuration with proper typing
export interface RolePermissions {
  [resource: string]: {
    [action: string]: PermissionCheck<unknown>;
  };
}

// Resource-specific types for better type safety
export interface ContentResource {
  id: string;
  userId: string;
  projectId: string;
}

export interface ProjectResource {
  id: string;
  workspaceId: string;
}

export interface WorkspaceResource {
  id: string;
  orgId: string;
}

export interface OrganizationResource {
  id: string;
}

export interface ApiKeyResource {
  id: string;
  orgId: string;
}

export interface UserResource {
  id: string;
  orgId?: string;
}

// System roles that map to your Plan enum
export type SystemRole = 'free' | 'pro' | 'business' | 'agency' | 'admin';

// Organizational roles
export type OrganizationalRole = 'owner' | 'admin' | 'member' | 'viewer';

// Workspace roles
export type WorkspaceRole = 'admin' | 'editor' | 'viewer';

// Project roles
export type ProjectRole = 'owner' | 'editor' | 'collaborator' | 'viewer';
