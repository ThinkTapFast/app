import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { Webhook } from 'svix';
import type { WebhookEvent, UserJSON, DeletedObjectJSON } from '@clerk/nextjs/server';
import { db } from '@/server/db/client';

const SIGNING_SECRET = process.env.CLERK_WEBHOOK_SECRET;

if (!SIGNING_SECRET) {
  throw new Error('Error: Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env');
}

export async function POST(req: Request) {
  // Create new Svix instance with secret
  const wh = new Webhook(SIGNING_SECRET as string);

  // Get headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error: Missing Svix headers', {
      status: 400,
    });
  }

  // Get body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  let evt: WebhookEvent;

  // Verify payload with headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error: Could not verify webhook:', err);
    return new Response('Error: Verification error', {
      status: 400,
    });
  }

  // Handle different webhook events
  try {
    switch (evt.type) {
      case 'user.created':
        await handleUserCreated(evt.data);
        break;
      
      case 'user.updated':
        await handleUserUpdated(evt.data);
        break;
      
      case 'user.deleted':
        await handleUserDeleted(evt.data);
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

async function handleUserCreated(userData: UserJSON) {
  console.log('User created:', userData.id);
  
  try {
    const primaryEmail = userData.email_addresses.find(
      (email) => email.verification?.status === 'verified'
    )?.email_address || userData.email_addresses[0]?.email_address;

    if (!primaryEmail) {
      console.error('No email found for user:', userData.id);
      return;
    }

    // Create user in database
    const user = await db.user.create({
      data: {
        clerkId: userData.id,
        email: primaryEmail,
        username: userData.username || undefined,
        firstName: userData.first_name || undefined,
        lastName: userData.last_name || undefined,
        image: userData.image_url || undefined,
        lastSignIn: userData.last_sign_in_at ? new Date(userData.last_sign_in_at) : undefined,
      },
    });
    
    if (user) {
      // Create default organization for new user
      const organization = await db.organization.create({
        data: {
          name: `${user.firstName || user.username || 'User'}'s Organization`,
          slug: `${user.username || user.id}-org-${Date.now()}`,
          plan: 'FREE',
        },
      });

      // Create membership with owner role
      await createOrganizationMembership(user.id, organization.id);
      
      console.log(`Created default organization for user ${user.id}: ${organization.id}`);
    }
  } catch (error) {
    console.error('Error handling user created:', error);
    throw error;
  }
}

async function handleUserUpdated(userData: UserJSON) {
  console.log('User updated:', userData.id);
  
  try {
    const primaryEmail = userData.email_addresses.find(
      (email) => email.verification?.status === 'verified'
    )?.email_address || userData.email_addresses[0]?.email_address;

    if (!primaryEmail) {
      console.error('No email found for user:', userData.id);
      return;
    }

    // Update user data
    await db.user.update({
      where: { clerkId: userData.id },
      data: {
        email: primaryEmail,
        username: userData.username || undefined,
        firstName: userData.first_name || undefined,
        lastName: userData.last_name || undefined,
        image: userData.image_url || undefined,
        lastSignIn: userData.last_sign_in_at ? new Date(userData.last_sign_in_at) : undefined,
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

    // Soft delete user and related data
    await db.user.update({
      where: { clerkId: deletedData.id },
      data: { 
        deletedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Error handling user deleted:', error);
    throw error;
  }
}

async function createOrganizationMembership(userId: string, orgId: string) {
  try {
    // For now, create basic membership - full ABAC roles will be handled elsewhere
    const membership = await db.membership.create({
      data: {
        userId,
        orgId,
      },
    });

    return membership;
  } catch (error) {
    console.error('Error creating organization membership:', error);
    throw error;
  }
}
