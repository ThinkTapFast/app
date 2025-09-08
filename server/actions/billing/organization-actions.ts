// Organization & billing server actions

'use server';

import { db } from '@/server/db/client';
import { withPermissionAction } from '@/server/actions/auth/permissions';
import { getCurrentUserWithRoles } from '@/server/auth/clerk-helpers';
import type { Organization, Plan } from '@prisma/client';

// Types for organization actions
interface CreateOrganizationInput {
  name: string;
  slug: string;
  plan?: Plan;
}

interface UpdateOrganizationInput {
  id: string;
  name?: string;
  slug?: string;
}

interface InviteUserInput {
  orgId: string;
  email: string;
  roleName: string;
}

interface OrganizationWithMembers extends Organization {
  memberships: Array<{
    id: string;
    user: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      email: string;
      image: string | null;
    };
    membershipRoles: Array<{
      role: {
        id: string;
        name: string;
      };
    }>;
  }>;
  _count: {
    workspaces: number;
    memberships: number;
  };
}

/**
 * Create new organization
 */
export const createOrganization = withPermissionAction(
  'organization',
  'create',
  async (data: CreateOrganizationInput): Promise<Organization> => {
    const user = await getCurrentUserWithRoles();
    if (!user) throw new Error('User not found');

    const organization = await db.organization.create({
      data: {
        name: data.name,
        slug: data.slug,
        plan: data.plan || 'FREE',
      },
    });

    // Create membership for the creator as owner
    await createOrganizationMembership(user.id, organization.id, 'owner');

    return organization;
  },
  {
    revalidateOnSuccess: '/dashboard/organizations',
  }
);

/**
 * Get organization by ID
 */
export const getOrganization = withPermissionAction(
  'organization',
  'read',
  async (orgId: string): Promise<OrganizationWithMembers | null> => {
    const organization = await db.organization.findUnique({
      where: { id: orgId },
      include: {
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                image: true,
              },
            },
            membershipRoles: {
              include: {
                role: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            workspaces: {
              where: { deletedAt: null },
            },
            memberships: true,
          },
        },
      },
    });

    return organization;
  },
  {
    extractContextFromArgs: (orgId: string) => ({ orgId }),
  }
);

/**
 * Update organization
 */
export const updateOrganization = withPermissionAction(
  'organization',
  'update',
  async (data: UpdateOrganizationInput): Promise<Organization> => {
    const updateData: Partial<Organization> = {};
    
    if (data.name) updateData.name = data.name;
    if (data.slug) updateData.slug = data.slug;

    const organization = await db.organization.update({
      where: { id: data.id },
      data: updateData,
    });

    return organization;
  },
  {
    extractContextFromArgs: (data: UpdateOrganizationInput) => ({
      orgId: data.id,
    }),
    revalidateOnSuccess: '/dashboard/organizations',
  }
);

/**
 * Delete organization
 */
export const deleteOrganization = withPermissionAction(
  'organization',
  'delete',
  async (orgId: string): Promise<{ success: boolean }> => {
    // Soft delete organization and cascade to related entities
    await db.organization.update({
      where: { id: orgId },
      data: { deletedAt: new Date() },
    });

    // Soft delete all workspaces
    await db.workspace.updateMany({
      where: { orgId },
      data: { deletedAt: new Date() },
    });

    // Soft delete all projects in the organization
    await db.project.updateMany({
      where: { workspace: { orgId } },
      data: { deletedAt: new Date() },
    });

    // Soft delete all contents in the organization
    await db.content.updateMany({
      where: { project: { workspace: { orgId } } },
      data: { deletedAt: new Date() },
    });

    return { success: true };
  },
  {
    extractContextFromArgs: (orgId: string) => ({ orgId }),
    revalidateOnSuccess: '/dashboard/organizations',
  }
);

/**
 * Invite user to organization
 */
export const inviteUserToOrganization = withPermissionAction(
  'organization',
  'invite',
  async (data: InviteUserInput): Promise<{ success: boolean; message: string }> => {
    // Check if user exists
    const existingUser = await db.user.findUnique({
      where: { email: data.email },
    });

    if (!existingUser) {
      // For now, return error - invitation system can be implemented later
      return { 
        success: false, 
        message: 'User not found. Please ask them to sign up first.' 
      };
    }

    // Check if user is already a member
    const existingMembership = await db.membership.findUnique({
      where: {
        userId_orgId: {
          userId: existingUser.id,
          orgId: data.orgId,
        },
      },
    });

    if (existingMembership) {
      return { 
        success: false, 
        message: 'User is already a member of this organization.' 
      };
    }

    // Create membership
    await createOrganizationMembership(existingUser.id, data.orgId, data.roleName);

    return { 
      success: true, 
      message: 'User invited successfully.' 
    };
  },
  {
    extractContextFromArgs: (data: InviteUserInput) => ({ orgId: data.orgId }),
    revalidateOnSuccess: '/dashboard/organizations',
  }
);

/**
 * Remove user from organization
 */
export const removeUserFromOrganization = withPermissionAction(
  'organization',
  'manage',
  async (orgId: string, userId: string): Promise<{ success: boolean }> => {
    // Delete membership and related roles
    await db.membershipRole.deleteMany({
      where: {
        membership: {
          userId,
          orgId,
        },
      },
    });

    await db.membership.delete({
      where: {
        userId_orgId: {
          userId,
          orgId,
        },
      },
    });

    return { success: true };
  },
  {
    extractContextFromArgs: (orgId: string) => ({ orgId }),
    revalidateOnSuccess: '/dashboard/organizations',
  }
);

/**
 * Update organization plan (billing)
 */
export const updateOrganizationPlan = withPermissionAction(
  'billing',
  'update',
  async (orgId: string, plan: Plan): Promise<Organization> => {
    const organization = await db.organization.update({
      where: { id: orgId },
      data: { plan },
    });

    return organization;
  },
  {
    extractContextFromArgs: (orgId: string) => ({ orgId }),
    revalidateOnSuccess: '/dashboard/billing',
  }
);

/**
 * Get user's organizations
 */
export async function getUserOrganizations(): Promise<OrganizationWithMembers[]> {
  const user = await getCurrentUserWithRoles();
  if (!user) return [];

  const organizations = await db.organization.findMany({
    where: {
      memberships: {
        some: {
          userId: user.id,
        },
      },
      deletedAt: null,
    },
    include: {
      memberships: {
        where: { userId: user.id },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              image: true,
            },
          },
          membershipRoles: {
            include: {
              role: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
      _count: {
        select: {
          workspaces: {
            where: { deletedAt: null },
          },
          memberships: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return organizations;
}

/**
 * Helper function to create organization membership with role
 */
async function createOrganizationMembership(userId: string, orgId: string, roleName: string) {
  // Find or create the role
  let role = await db.role.findFirst({
    where: {
      name: roleName,
      scope: 'ORGANIZATION',
      orgId: orgId,
    },
  });

  if (!role) {
    // Create the role if it doesn't exist
    role = await db.role.create({
      data: {
        name: roleName,
        scope: 'ORGANIZATION',
        orgId: orgId,
        isSystem: false,
      },
    });

    // Add default permissions for the role
    if (roleName === 'owner') {
      const permissions = await db.permission.findMany({
        where: {
          key: {
            in: [
              'org.read',
              'org.update',
              'org.delete',
              'org.invite',
              'org.manage',
              'workspace.create',
              'workspace.read',
              'workspace.update',
              'workspace.delete',
              'project.create',
              'project.read',
              'project.update',
              'project.delete',
              'content.create',
              'content.read',
              'content.update',
              'content.delete',
              'content.export',
              'content.publish',
              'apikey.create',
              'apikey.read',
              'apikey.update',
              'apikey.delete',
            ],
          },
        },
      });

      for (const permission of permissions) {
        await db.rolePermission.create({
          data: {
            roleId: role.id,
            permissionId: permission.id,
          },
        });
      }
    }
  }

  // Create membership
  const membership = await db.membership.create({
    data: {
      userId,
      orgId,
    },
  });

  // Assign role to membership
  await db.membershipRole.create({
    data: {
      membershipId: membership.id,
      roleId: role.id,
    },
  });

  return membership;
}
