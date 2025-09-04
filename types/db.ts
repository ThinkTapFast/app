// Custom database-related types
// Note: Import Prisma types directly from '@prisma/client' where needed
// Example: import { User, Organization, Plan, PlatformRole } from '@prisma/client'

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

export interface UsagePeriod {
  start: Date
  end: Date
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
    role: string // Use Role enum from @prisma/client where needed
    user: {
      id: string
      clerkId: string
      email: string
      fullname: string | null
      image: string | null
      platformRole: string
    }
  }>
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
}

export interface WorkspaceWithProjects {
  id: string
  name: string
  projects: ProjectWithContent[]
}

export interface UserWithMemberships {
  id: string
  clerkId: string
  email: string
  fullname: string | null
  image: string | null
  platformRole: string
  memberships: Array<{
    id: string
    role: string
    organization: {
      id: string
      name: string
      slug: string
      plan: string
    }
  }>
}
