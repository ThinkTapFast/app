'use server';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { checkPermission } from '@/server/auth/abac';
import { createPermissionContext } from '@/server/auth/clerk-helpers';
import { db } from '@/server/db/client';
import { PaddleClient } from '@/server/payment';
import { PADDLE_PLANS } from '@/constants/config/paddle';
import type { Plan } from '@prisma/client';

interface CreateCheckoutParams {
  organizationId: string;
  plan: Plan;
  billingInterval: 'monthly' | 'yearly';
}

interface CreateCheckoutResult {
  success: boolean;
  checkoutUrl?: string;
  error?: string;
}

/**
 * Create a Paddle checkout session for plan subscription
 */
export async function createPaddleCheckout({
  organizationId,
  plan,
  billingInterval,
}: CreateCheckoutParams): Promise<CreateCheckoutResult> {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      redirect('/sign-in');
    }

    // Check permissions to manage billing for this organization
    const context = await createPermissionContext(organizationId);
    if (!context) {
      return {
        success: false,
        error: 'Unable to create permission context.',
      };
    }

    const permissionResult = await checkPermission(context, 'billing', 'manage');
    if (!permissionResult.allowed) {
      return {
        success: false,
        error: 'You do not have permission to manage billing for this organization.',
      };
    }

    // Get organization details with subscription fields
    const organization = await db.organization.findUnique({
      where: { id: organizationId },
      include: {
        memberships: {
          where: { userId },
          include: { user: true },
        },
      },
    });

    if (!organization || organization.memberships.length === 0) {
      return {
        success: false,
        error: 'Organization not found or you are not a member.',
      };
    }

    // Check if plan is valid for checkout (not FREE)
    if (plan === 'FREE') {
      return {
        success: false,
        error: 'Free plan does not require checkout.',
      };
    }

    // Get plan configuration
    const planConfig = PADDLE_PLANS[plan];
    if (!planConfig?.paddlePriceId) {
      return {
        success: false,
        error: 'Invalid plan or plan not available for checkout.',
      };
    }

    // Check if organization already has an active subscription
    if (organization.paddleSubscriptionId && organization.subscriptionStatus === 'ACTIVE') {
      return {
        success: false,
        error: 'Organization already has an active subscription. Use the upgrade/downgrade feature instead.',
      };
    }

    // Get user details for checkout
    const user = organization.memberships[0].user;
    
    // Create Paddle checkout session
    const checkoutResult = await PaddleClient.createCheckout({
      items: [
        {
          price_id: planConfig.paddlePriceId,
          quantity: 1,
        },
      ],
      customer_email: user.email,
      custom_data: {
        organizationId,
        plan,
        billingInterval,
        userId,
      },
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing/success`,
      // No discount_id for now, but can be added later
    });

    return {
      success: true,
      checkoutUrl: (checkoutResult as { url: string }).url,
    };
  } catch (error) {
    console.error('Error creating Paddle checkout:', error);
    return {
      success: false,
      error: 'Failed to create checkout session. Please try again.',
    };
  }
}

/**
 * Get current organization subscription details
 */
export async function getOrganizationSubscription(organizationId: string) {
  try {
    const { userId } = await auth();
    if (!userId) {
      redirect('/sign-in');
    }

    // Check read permissions for billing
    const context = await createPermissionContext(organizationId);
    if (!context) {
      return {
        success: false,
        error: 'Unable to create permission context.',
      };
    }

    const permissionResult = await checkPermission(context, 'billing', 'read');
    if (!permissionResult.allowed) {
      return {
        success: false,
        error: 'You do not have permission to view billing for this organization.',
      };
    }

    const organization = await db.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        plan: true,
        subscriptionStatus: true,
        paddleSubscriptionId: true,
        paddleCustomerId: true,
        subscriptionCurrentPeriodStart: true,
        subscriptionCurrentPeriodEnd: true,
        subscriptionCancelAtPeriodEnd: true,
      },
    });

    if (!organization) {
      return {
        success: false,
        error: 'Organization not found.',
      };
    }

    return {
      success: true,
      subscription: organization,
    };
  } catch (error) {
    console.error('Error getting organization subscription:', error);
    return {
      success: false,
      error: 'Failed to get subscription details.',
    };
  }
}

/**
 * Cancel organization subscription
 */
export async function cancelOrganizationSubscription(organizationId: string) {
  try {
    const { userId } = await auth();
    if (!userId) {
      redirect('/sign-in');
    }

    // Check permissions to manage billing
    const context = await createPermissionContext(organizationId);
    if (!context) {
      return {
        success: false,
        error: 'Unable to create permission context.',
      };
    }

    const permissionResult = await checkPermission(context, 'billing', 'manage');
    if (!permissionResult.allowed) {
      return {
        success: false,
        error: 'You do not have permission to manage billing for this organization.',
      };
    }

    const organization = await db.organization.findUnique({
      where: { id: organizationId },
      select: {
        paddleSubscriptionId: true,
        subscriptionStatus: true,
      },
    });

    if (!organization?.paddleSubscriptionId) {
      return {
        success: false,
        error: 'No active subscription found.',
      };
    }

    if (organization.subscriptionStatus !== 'ACTIVE') {
      return {
        success: false,
        error: 'Subscription is not active.',
      };
    }

    // Cancel subscription in Paddle (will be effective at period end)
    await PaddleClient.cancelSubscription(
      organization.paddleSubscriptionId,
      'next_billing_period'
    );

    // Update local status - the webhook will handle the final update
    await db.organization.update({
      where: { id: organizationId },
      data: {
        subscriptionCancelAtPeriodEnd: true,
      },
    });

    return {
      success: true,
      message: 'Subscription will be canceled at the end of the current billing period.',
    };
  } catch (error) {
    console.error('Error canceling subscription:', error);
    return {
      success: false,
      error: 'Failed to cancel subscription. Please try again.',
    };
  }
}

/**
 * Resume a canceled subscription
 */
export async function resumeOrganizationSubscription(organizationId: string) {
  try {
    const { userId } = await auth();
    if (!userId) {
      redirect('/sign-in');
    }

    // Check permissions to manage billing
    const context = await createPermissionContext(organizationId);
    if (!context) {
      return {
        success: false,
        error: 'Unable to create permission context.',
      };
    }

    const permissionResult = await checkPermission(context, 'billing', 'manage');
    if (!permissionResult.allowed) {
      return {
        success: false,
        error: 'You do not have permission to manage billing for this organization.',
      };
    }

    const organization = await db.organization.findUnique({
      where: { id: organizationId },
      select: {
        paddleSubscriptionId: true,
        subscriptionStatus: true,
        subscriptionCancelAtPeriodEnd: true,
      },
    });

    if (!organization?.paddleSubscriptionId) {
      return {
        success: false,
        error: 'No subscription found.',
      };
    }

    if (!organization.subscriptionCancelAtPeriodEnd) {
      return {
        success: false,
        error: 'Subscription is not set to be canceled.',
      };
    }

    // Resume subscription in Paddle
    await PaddleClient.resumeSubscription(organization.paddleSubscriptionId);

    // Update local status - the webhook will handle the final update
    await db.organization.update({
      where: { id: organizationId },
      data: {
        subscriptionCancelAtPeriodEnd: false,
      },
    });

    return {
      success: true,
      message: 'Subscription has been resumed successfully.',
    };
  } catch (error) {
    console.error('Error resuming subscription:', error);
    return {
      success: false,
      error: 'Failed to resume subscription. Please try again.',
    };
  }
}

/**
 * Upgrade or downgrade organization plan
 */
export async function changeOrganizationPlan({
  organizationId,
  newPlan,
  billingInterval,
}: {
  organizationId: string;
  newPlan: Plan;
  billingInterval: 'monthly' | 'yearly';
}) {
  try {
    const { userId } = await auth();
    if (!userId) {
      redirect('/sign-in');
    }

    // Check permissions to manage billing
    const context = await createPermissionContext(organizationId);
    if (!context) {
      return {
        success: false,
        error: 'Unable to create permission context.',
      };
    }

    const permissionResult = await checkPermission(context, 'billing', 'manage');
    if (!permissionResult.allowed) {
      return {
        success: false,
        error: 'You do not have permission to manage billing for this organization.',
      };
    }

    const organization = await db.organization.findUnique({
      where: { id: organizationId },
      select: {
        plan: true,
        paddleSubscriptionId: true,
        subscriptionStatus: true,
      },
    });

    if (!organization) {
      return {
        success: false,
        error: 'Organization not found.',
      };
    }

    // If changing to FREE plan, cancel subscription instead
    if (newPlan === 'FREE') {
      return await cancelOrganizationSubscription(organizationId);
    }

    // If no current subscription, create new one
    if (!organization.paddleSubscriptionId) {
      return await createPaddleCheckout({
        organizationId,
        plan: newPlan,
        billingInterval,
      });
    }

    // Get new plan configuration
    const planConfig = PADDLE_PLANS[newPlan];
    if (!planConfig?.paddlePriceId) {
      return {
        success: false,
        error: 'Invalid plan configuration.',
      };
    }

    // Update subscription in Paddle
    await PaddleClient.updateSubscription(organization.paddleSubscriptionId, {
      items: [
        {
          price_id: planConfig.paddlePriceId,
          quantity: 1,
        },
      ],
      proration_billing_mode: 'prorated_immediately',
      custom_data: {
        organizationId,
        plan: newPlan,
        billingInterval,
        userId,
      },
    });

    return {
      success: true,
      message: 'Plan change initiated. You will be charged prorated amount.',
    };
  } catch (error) {
    console.error('Error changing plan:', error);
    return {
      success: false,
      error: 'Failed to change plan. Please try again.',
    };
  }
}
