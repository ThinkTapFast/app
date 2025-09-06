import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import type { UserWithRoles, PermissionContext } from './types';
import { db } from '../db/client';

/**
 * Get the current authenticated user from Clerk with full RBAC data
 */
export async function getCurrentUserWithRoles(): Promise<UserWithRoles | null> {
  try {
    const { userId } = await auth();
    if (!userId) return null;

    const user = await db.user.findUnique({
      where: { clerkId: userId },
      include: {
        memberships: {
          include: {
            organization: true,
            membershipRoles: {
              include: {
                role: {
                  include: {
                    rolePermissions: {
                      include: {
                        permission: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        workspaceMemberships: {
          include: {
            workspace: true,
            roles: {
              include: {
                role: {
                  include: {
                    rolePermissions: {
                      include: {
                        permission: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        projectMemberships: {
          include: {
            project: true,
            roles: {
              include: {
                role: {
                  include: {
                    rolePermissions: {
                      include: {
                        permission: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    return user;
  } catch (error) {
    console.error('Error fetching user with roles:', error);
    return null;
  }
}

/**
 * Require authentication - redirect to sign-in if not authenticated
 */
export async function requireAuth(): Promise<UserWithRoles> {
  const user = await getCurrentUserWithRoles();
  if (!user) {
    redirect('/sign-in');
  }
  return user;
}

/**
 * Create permission context for the current user
 */
export async function createPermissionContext(
  organizationId?: string,
  workspaceId?: string,
  projectId?: string
): Promise<PermissionContext | null> {
  const user = await getCurrentUserWithRoles();
  if (!user) return null;

  return {
    user,
    organizationId,
    workspaceId,
    projectId,
  };
}

/**
 * Get user's organizations
 */
export async function getUserOrganizations(): Promise<Array<{ id: string; name: string; plan: string }>> {
  const user = await getCurrentUserWithRoles();
  if (!user) return [];

  return user.memberships.map(membership => ({
    id: membership.organization.id,
    name: membership.organization.name,
    plan: membership.organization.plan,
  }));
}

/**
 * Check if user is a member of an organization
 */
export async function isOrganizationMember(orgId: string): Promise<boolean> {
  const user = await getCurrentUserWithRoles();
  if (!user) return false;

  return user.memberships.some(membership => membership.organization.id === orgId);
}

/**
 * Get the current user's Clerk data
 */
export async function getClerkUser() {
  return await currentUser();
}

/**
 * Get user by Clerk ID (used in webhooks)
 */
export async function getUserByClerkId(clerkId: string): Promise<UserWithRoles | null> {
  try {
    const user = await db.user.findUnique({
      where: { clerkId },
      include: {
        memberships: {
          include: {
            organization: true,
            membershipRoles: {
              include: {
                role: {
                  include: {
                    rolePermissions: {
                      include: {
                        permission: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        workspaceMemberships: {
          include: {
            workspace: true,
            roles: {
              include: {
                role: {
                  include: {
                    rolePermissions: {
                      include: {
                        permission: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        projectMemberships: {
          include: {
            project: true,
            roles: {
              include: {
                role: {
                  include: {
                    rolePermissions: {
                      include: {
                        permission: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    return user;
  } catch (error) {
    console.error('Error fetching user by Clerk ID:', error);
    return null;
  }
}

/**
 * Sync user data from Clerk to database
 */
export async function syncUserFromClerk(clerkUser: ReturnType<typeof currentUser> extends Promise<infer T> ? NonNullable<T> : never): Promise<UserWithRoles | null> {
  try {
    const userData = {
      clerkId: clerkUser.id,
      email: clerkUser.emailAddresses[0]?.emailAddress || '',
      username: clerkUser.username,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
      fullname: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
      image: clerkUser.imageUrl,
      emailVerified: clerkUser.emailAddresses[0]?.verification?.status === 'verified',
      phoneNumber: clerkUser.phoneNumbers[0]?.phoneNumber,
      lastSignIn: clerkUser.lastSignInAt ? new Date(clerkUser.lastSignInAt) : null,
    };

    const user = await db.user.upsert({
      where: { clerkId: clerkUser.id },
      update: userData,
      create: userData,
    });

    return await getUserByClerkId(user.clerkId);
  } catch (error) {
    console.error('Error syncing user from Clerk:', error);
    return null;
  }
}
