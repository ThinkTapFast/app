// server/auth/types/index.ts - Unified ABAC type definitions

import type { 
  User, 
  Organization, 
  Workspace, 
  Project, 
  Content,
  Role, 
  Permission, 
  Membership,
  MembershipRole,
  Plan, 
  Scope,
  Prisma
} from '@prisma/client';

// Re-export Prisma types for convenience
export type {
  User,
  Organization,
  Workspace,
  Project,
  Content,
  Role,
  Permission,
  Membership,
  MembershipRole,
  Plan,
  Scope,
  Prisma
};

// Complex user type with all relationships for ABAC
export type UserWithMemberships = User & {
  memberships: Array<
    Membership & {
      organization: Organization;
      membershipRoles: Array<
        MembershipRole & {
          role: Role & {
            rolePermissions: Array<{
              permission: Permission;
            }>;
          };
        }
      >;
    }
  >;
  workspaceMemberships?: Array<{
    workspace: Workspace;
    roles: Array<{
      role: Role & {
        rolePermissions: Array<{
          permission: Permission;
        }>;
      };
    }>;
  }>;
  projectMemberships?: Array<{
    project: Project;
    roles: Array<{
      role: Role & {
        rolePermissions: Array<{
          permission: Permission;
        }>;
      };
    }>;
  }>;
};

// Core ABAC types
export type ResourceType = 
  | 'organization' 
  | 'workspace' 
  | 'project' 
  | 'content' 
  | 'apikey' 
  | 'user' 
  | 'billing';

export type Action = 
  | 'create' 
  | 'read' 
  | 'update' 
  | 'delete' 
  | 'manage' 
  | 'invite' 
  | 'export' 
  | 'publish' 
  | 'schedule';

// Permission context for ABAC checks
export interface PermissionContext {
  user: UserWithMemberships;
  orgId?: string;
  workspaceId?: string;
  projectId?: string;
}

// Resource interfaces leveraging Prisma types
export interface ContentResource extends Pick<Content, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'> {
  userId?: string;
  projectId: string;
  workspaceId?: string; // Derived from project
  orgId?: string; // Derived from project
}

export interface ProjectResource extends Pick<Project, 'id' | 'name' | 'projectType' | 'workspaceId' | 'createdAt' | 'updatedAt' | 'deletedAt'> {
  orgId?: string; // Derived from workspace
}

export type WorkspaceResource = Pick<Workspace, 'id' | 'name' | 'orgId' | 'createdAt' | 'updatedAt' | 'deletedAt'>;

export interface OrganizationResource extends Pick<Organization, 'id' | 'name' | 'slug' | 'plan' | 'createdAt' | 'updatedAt' | 'deletedAt'> {
  orgId?: string; // For consistency
}

export interface ApiKeyResource {
  id: string;
  label?: string;
  orgId: string;
  userId: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export interface UserResource extends Pick<User, 'id' | 'email' | 'clerkId' | 'createdAt' | 'updatedAt' | 'deletedAt'> {
  orgId?: string; // For organization-specific user operations
}

export interface BillingResource {
  id: string;
  orgId: string;
  plan: Plan;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

// Union type for all resources
export type Resource = 
  | OrganizationResource 
  | WorkspaceResource 
  | ProjectResource 
  | ContentResource 
  | ApiKeyResource 
  | UserResource 
  | BillingResource;

// Permission function types
export type PermissionFunction = (
  context: PermissionContext, 
  resource?: Resource
) => boolean | Promise<boolean>;

export type PermissionValue = boolean | PermissionFunction;

// Resource permission mapping
export interface ResourcePermissions {
  create?: PermissionValue;
  read?: PermissionValue;
  update?: PermissionValue;
  delete?: PermissionValue;
  manage?: PermissionValue;
  invite?: PermissionValue;
  export?: PermissionValue;
  publish?: PermissionValue;
  schedule?: PermissionValue;
}

// Plan-based permissions system
export interface PlanPermissions {
  content: ResourcePermissions;
  project: ResourcePermissions;
  workspace: ResourcePermissions;
  organization: ResourcePermissions;
  apikey: ResourcePermissions;
  user?: ResourcePermissions;
  billing?: ResourcePermissions;
}

// Permission check result
export interface PermissionResult {
  allowed: boolean;
  reason?: string;
}

// Role hierarchy types
export type OrganizationalRole = 'owner' | 'admin' | 'member' | 'viewer';
export type WorkspaceRole = 'admin' | 'editor' | 'viewer';
export type ProjectRole = 'owner' | 'editor' | 'collaborator' | 'viewer';

// Context extraction types for server actions
export interface ContextExtractor {
  orgId?: string;
  workspaceId?: string;
  projectId?: string;
}

export type ExtractContextFunction<T = unknown> = 
  (args: T) => ContextExtractor;

// Server action permission configuration
export interface ActionPermissionConfig<T = unknown> {
  extractContextFromArgs?: ExtractContextFunction<T>;
  revalidateOnSuccess?: string | string[];
  requireOwnership?: boolean;
}

// Content JSON types (leveraging Prisma's JsonValue)
export type ContentInput = Prisma.JsonValue;
export type ContentOutput = Prisma.JsonValue;
