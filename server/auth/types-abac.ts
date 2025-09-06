import type { Plan, Scope } from '@prisma/client';
import type { UserWithMemberships } from '@/types/db';

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

// Resource interfaces for type safety
export interface BaseResource {
  id: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export interface OrganizationResource extends BaseResource {
  name: string;
  slug: string;
  plan: Plan;
  orgId?: string; // For consistency with other resources
}

export interface WorkspaceResource extends BaseResource {
  name: string;
  orgId: string;
}

export interface ProjectResource extends BaseResource {
  name: string;
  projectType: string;
  workspaceId: string;
  orgId?: string; // Derived from workspace
}

export interface ContentResource extends BaseResource {
  kind: string;
  status: string;
  projectId: string;
  userId?: string; // Author ID
  workspaceId?: string; // Derived from project
  orgId?: string; // Derived from project
}

export interface ApiKeyResource extends BaseResource {
  label?: string;
  orgId: string;
  userId: string;
}

export interface UserResource extends BaseResource {
  email: string;
  clerkId: string;
  orgId?: string; // For organization-specific user operations
}

export interface BillingResource extends BaseResource {
  orgId: string;
  plan: Plan;
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
export type RolePermissions = Record<ResourceType, ResourcePermissions>;

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
export interface ContextExtractor<T = unknown> {
  orgId?: string;
  workspaceId?: string;
  projectId?: string;
}

export type ExtractContextFunction<T = unknown> = 
  | ((args: T) => ContextExtractor)
  | ((args: T) => Promise<ContextExtractor>);

// Server action permission configuration
export interface ActionPermissionConfig<T = unknown> {
  extractContextFromArgs?: ExtractContextFunction<T>;
  revalidateOnSuccess?: string | string[];
  requireOwnership?: boolean;
}

// Prisma JSON value types for content
export type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
export type JsonObject = { [key: string]: JsonValue };
export type JsonArray = JsonValue[];

// Content input/output types
export interface ContentInput {
  [key: string]: JsonValue;
}

export interface ContentOutput {
  [key: string]: JsonValue;
}
