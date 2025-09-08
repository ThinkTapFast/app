import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { Webhook } from 'svix';
import type { WebhookEvent, DeletedObjectJSON } from '@clerk/nextjs/server';
import { db } from '@/server/db/client';

const SIGNING_SECRET = process.env.CLERK_WEBHOOK_SECRET;

if (!SIGNING_SECRET) {
  throw new Error('Error: Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env');
}

// Types for webhook data
interface ClerkUserData {
  id: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  email_addresses: Array<{
    email_address: string;
    verification?: { status: string };
  }>;
  phone_numbers?: Array<{
    phone_number: string;
  }>;
  image_url?: string;
  last_sign_in_at?: number;
  created_at: number;
  updated_at: number;
}

interface ClerkSessionData {
  user_id: string;
  created_at: number;
}

export async function POST(req: Request) {
  const wh = new Webhook(SIGNING_SECRET as string);

  // Get headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error: Missing Svix headers', { status: 400 });
  }

  // Get and verify payload
  const payload = await req.json();
  const body = JSON.stringify(payload);

  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error: Could not verify webhook:', err);
    return new Response('Error: Verification error', { status: 400 });
  }

  // Handle different webhook events
  try {
    switch (evt.type) {
      case 'user.created':
        await handleUserCreated(evt.data as ClerkUserData);
        break;
      
      case 'user.updated':
        await handleUserUpdated(evt.data as ClerkUserData);
        break;
      
      case 'user.deleted':
        await handleUserDeleted(evt.data);
        break;
      
      case 'session.created':
        await handleSessionCreated(evt.data as ClerkSessionData);
        break;
      
      default:
        console.log(`Unhandled webhook event: ${evt.type}`);
    }

    return NextResponse.json({ 
      message: `Successfully processed ${evt.type}` 
    }, { status: 200 });

  } catch (error) {
    console.error(`Webhook Error for ${evt.type}:`, error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      type: evt.type 
    }, { status: 500 });
  }
}

async function handleUserCreated(userData: ClerkUserData) {
  console.log('User created:', userData.id);
  
  try {
    const user = await db.user.create({
      data: {
        clerkId: userData.id,
        email: userData.email_addresses[0]?.email_address || '',
        username: userData.username,
        firstName: userData.first_name,
        lastName: userData.last_name,
        fullname: `${userData.first_name || ''} ${userData.last_name || ''}`.trim(),
        image: userData.image_url,
        emailVerified: userData.email_addresses[0]?.verification?.status === 'verified',
        phoneNumber: userData.phone_numbers?.[0]?.phone_number,
        lastSignIn: userData.last_sign_in_at ? new Date(userData.last_sign_in_at) : null,
      },
    });
    
    // Create default organization for new user
    const organization = await db.organization.create({
      data: {
        name: `${user.firstName || user.username || 'User'}'s Organization`,
        slug: `${user.username || user.id}-org-${Date.now()}`,
        plan: 'FREE',
      },
    });

    // Create membership with owner role
    await createOrganizationMembership(user.id, organization.id, 'owner');
    
    console.log(`Created default organization for user ${user.id}: ${organization.id}`);
  } catch (error) {
    console.error('Error handling user created:', error);
    throw error;
  }
}

async function handleUserUpdated(userData: ClerkUserData) {
  console.log('User updated:', userData.id);
  
  try {
    await db.user.update({
      where: { clerkId: userData.id },
      data: {
        email: userData.email_addresses[0]?.email_address || '',
        username: userData.username,
        firstName: userData.first_name,
        lastName: userData.last_name,
        fullname: `${userData.first_name || ''} ${userData.last_name || ''}`.trim(),
        image: userData.image_url,
        emailVerified: userData.email_addresses[0]?.verification?.status === 'verified',
        phoneNumber: userData.phone_numbers?.[0]?.phone_number,
        lastSignIn: userData.last_sign_in_at ? new Date(userData.last_sign_in_at) : null,
      },
    });
  } catch (error) {
    console.error('Error handling user updated:', error);
    throw error;
  }
}

async function handleUserDeleted(deletedData: DeletedObjectJSON) {
  console.log('User deleted:', deletedData.id);
  
  try {
    if (!deletedData.id) {
      console.error('No user ID found in deleted data');
      return;
    }

    await db.user.update({
      where: { clerkId: deletedData.id },
      data: { 
        deletedAt: new Date(),
        isActive: false 
      },
    });
  } catch (error) {
    console.error('Error handling user deleted:', error);
    throw error;
  }
}

async function handleSessionCreated(sessionData: ClerkSessionData) {
  console.log('Session created for user:', sessionData.user_id);
  
  try {
    await db.user.update({
      where: { clerkId: sessionData.user_id },
      data: { lastSignIn: new Date() },
    });
  } catch (error) {
    console.error('Error handling session created:', error);
    // Don't throw error for session updates
  }
}

async function createOrganizationMembership(userId: string, orgId: string, roleName: string) {
  try {
    // Find or create the role
    let role = await db.role.findFirst({
      where: {
        name: roleName,
        scope: 'ORGANIZATION',
        orgId: orgId,
      },
    });

    if (!role) {
      role = await db.role.create({
        data: {
          name: roleName,
          scope: 'ORGANIZATION',
          orgId: orgId,
          isSystem: false,
        },
      });

      // Add default permissions for owner role
      if (roleName === 'owner') {
        const permissions = await db.permission.findMany({
          where: {
            key: {
              in: [
                'org.read', 'org.update', 'org.delete', 'org.invite', 'org.manage',
                'workspace.create', 'workspace.read', 'workspace.update', 'workspace.delete',
                'project.create', 'project.read', 'project.update', 'project.delete',
                'content.create', 'content.read', 'content.update', 'content.delete',
                'content.export', 'content.publish', 'apikey.create', 'apikey.read',
                'apikey.update', 'apikey.delete',
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
      data: { userId, orgId },
    });

    // Assign role to membership
    await db.membershipRole.create({
      data: {
        membershipId: membership.id,
        roleId: role.id,
      },
    });

    return membership;
  } catch (error) {
    console.error('Error creating organization membership:', error);
    throw error;
  }
}
