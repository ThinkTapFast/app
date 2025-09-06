// Custom database-related types
// Note: Import Prisma types directly from '@prisma/client' where needed
// Example: import { User, Organization, Plan, PlatformRole, Scope } from '@prisma/client'

export type HealthStatus = 'healthy' | 'warning' | 'error'

export interface DatabaseConfig {
  url: string
  maxConnections?: number
  logLevel?: 'query' | 'info' | 'warn' | 'error'
}

// Clerk Integration Types
export interface ClerkUserData {
  id: string
  emailAddresses: Array<{
    emailAddress: string
    verification?: {
      status: string
    }
  }>
  firstName?: string
  lastName?: string
  imageUrl?: string
  username?: string
}

export interface CreateUserFromClerk {
  clerkId: string
  email: string
  firstName?: string
  lastName?: string
  fullname?: string
  image?: string
  username?: string
  emailVerified?: boolean
  phoneNumber?: string
}

// RBAC Types
export interface RoleWithPermissions {
  id: string
  name: string
  scope: string
  isSystem: boolean
  permissions: Array<{
    id: string
    key: string
    description: string | null
  }>
}

export interface UserPermissions {
  organization: string[]
  workspace: Record<string, string[]>
  project: Record<string, string[]>
}

export interface CreateRoleData {
  name: string
  scope: 'ORGANIZATION' | 'WORKSPACE' | 'PROJECT'
  orgId?: string
  permissionIds: string[]
}

// API Key Types
export interface ApiKeyWithScopes {
  id: string
  label: string | null
  scopes: string[]
  createdAt: Date
  lastUsed: Date | null
  expiresAt: Date | null
}

export interface CreateApiKeyData {
  label?: string
  scopes: string[]
  expiresAt?: Date
}

// Content Generation Types
export interface ContentInput {
  prompt: string
  tone: string
  length: string
  category?: string
  keywords?: string[]
}

export interface ContentOutput {
  versions: ContentVersion[]
}

export interface ContentVersion {
  id: number
  text: string
  title?: string
  subject?: string
  timestamp: string
}

// Usage & Analytics Types
export interface UsagePeriod {
  start: Date
  end: Date
}

export interface UsageEventData {
  orgId: string
  userId?: string
  scope: 'ORGANIZATION' | 'WORKSPACE' | 'PROJECT'
  eventType: string
  tokensIn?: number
  tokensOut?: number
  meta?: Record<string, unknown>
}

export interface UsageMetrics {
  totalTokensIn: number
  totalTokensOut: number
  totalItems: number
  dailyAverage: number
  monthlyTrend: number
}

// Audit & Notifications Types
export interface AuditLogEntry {
  id: string
  actorUserId: string | null
  entityType: string
  entityId: string
  action: string
  oldValue: Record<string, unknown> | null
  newValue: Record<string, unknown> | null
  createdAt: Date
  actor?: {
    fullname: string | null
    email: string
  }
}

export interface NotificationData {
  userId: string
  orgId?: string
  type: string
  message?: string
  payload?: Record<string, unknown>
}

// Comment Types
export interface CommentWithAuthor {
  id: string
  body: string
  createdAt: Date
  updatedAt: Date
  author: {
    id: string
    fullname: string | null
    image: string | null
  }
}

export interface CreateCommentData {
  body: string
  projectId?: string
  contentId?: string
}

// Tag Types
export interface TagWithCounts {
  id: string
  name: string
  projectCount: number
  contentCount: number
}

export interface CreateTagData {
  name: string
}

// Organization Settings Types
export interface OrganizationConfig {
  brandColors?: string[]
  defaultTone?: string
  contentGuidelines?: string
  autoApprovalEnabled?: boolean
  requireLegalReview?: boolean
  maxContentLength?: number
  [key: string]: unknown
}

// Super Admin Types
export interface PlatformAnalytics {
  totalUsers: number
  totalOrganizations: number
  activeSubscriptions: number
  monthlyRevenue: number
  topPlan: string
  growthRate: number
}

export interface SystemHealth {
  dbStatus: HealthStatus
  apiStatus: HealthStatus
  queueStatus: HealthStatus
  storageUsage: number
  uptime: string
}

// Extended types with relations
export interface OrganizationWithMemberships {
  id: string
  name: string
  slug: string
  plan: string // Use Plan enum from @prisma/client where needed
  memberships: Array<{
    id: string
    user: {
      id: string
      clerkId: string
      email: string
      fullname: string | null
      image: string | null
      platformRole: string
    }
    membershipRoles: Array<{
      role: {
        id: string
        name: string
        scope: string
      }
    }>
  }>
  settings?: {
    config: Record<string, unknown>
  }
}

export interface ProjectWithContent {
  id: string
  name: string
  projectType: string
  contents: Array<{
    id: string
    kind: string
    status: string
    createdAt: Date
    updatedAt: Date
  }>
  projectTags: Array<{
    tag: {
      id: string
      name: string
    }
  }>
  comments: Array<CommentWithAuthor>
}

export interface WorkspaceWithProjects {
  id: string
  name: string
  projects: ProjectWithContent[]
  memberships: Array<{
    id: string
    user: {
      id: string
      fullname: string | null
      email: string
    }
    roles: Array<{
      role: {
        name: string
        scope: string
      }
    }>
  }>
}

export interface UserWithMemberships {
  id: string
  clerkId: string
  email: string
  username: string | null
  fullname: string | null
  image: string | null
  platformRole: string
  emailVerified: boolean
  phoneNumber: string | null
  lastSignIn: Date | null
  memberships: Array<{
    id: string
    organization: {
      id: string
      name: string
      slug: string
      plan: string
    }
    membershipRoles: Array<{
      role: {
        id: string
        name: string
        scope: string
      }
    }>
  }>
  workspaceMemberships: Array<{
    id: string
    workspace: {
      id: string
      name: string
      organization: {
        name: string
        slug: string
      }
    }
    roles: Array<{
      role: {
        name: string
        scope: string
      }
    }>
  }>
  projectMemberships: Array<{
    id: string
    project: {
      id: string
      name: string
      workspace: {
        name: string
        organization: {
          name: string
        }
      }
    }
    roles: Array<{
      role: {
        name: string
        scope: string
      }
    }>
  }>
}

export interface ContentWithVersions {
  id: string
  kind: string
  status: string
  input: Record<string, unknown>
  output: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
  versions: Array<{
    id: string
    version: number
    output: Record<string, unknown>
    createdAt: Date
    author?: {
      fullname: string | null
      email: string
    }
  }>
  contentTags: Array<{
    tag: {
      id: string
      name: string
    }
  }>
  comments: Array<CommentWithAuthor>
}
