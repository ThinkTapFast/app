import { PaddleWebhookVerifier } from '@/server/payment';
import { db } from '@/server/db/client';
import type { 
  AllPaddleWebhookEvents,
  SubscriptionCreatedEvent,
  SubscriptionUpdatedEvent,
  SubscriptionCanceledEvent,
  TransactionCompletedEvent 
} from '@/constants/config/paddle-webhooks';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    // Get raw body and signature
    const body = await req.text();
    const signature = req.headers.get('paddle-signature');

    if (!signature) {
      console.error('Missing Paddle signature');
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // Verify and parse webhook
    const event = PaddleWebhookVerifier.parseWebhook(body, signature);
    if (!event) {
      console.error('Invalid webhook signature or payload');
      return NextResponse.json({ error: 'Invalid webhook' }, { status: 400 });
    }

    console.log(`Processing Paddle webhook: ${event.event_type}`, {
      eventId: event.event_id,
      eventType: event.event_type,
    });

    // Handle different event types
    await handleWebhookEvent(event);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Paddle webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' }, 
      { status: 500 }
    );
  }
}

async function handleWebhookEvent(event: AllPaddleWebhookEvents) {
  switch (event.event_type) {
    case 'subscription.created':
      await handleSubscriptionCreated(event as SubscriptionCreatedEvent);
      break;
    
    case 'subscription.updated':
      await handleSubscriptionUpdated(event as SubscriptionUpdatedEvent);
      break;
    
    case 'subscription.canceled':
      await handleSubscriptionCanceled(event as SubscriptionCanceledEvent);
      break;
    
    case 'transaction.completed':
      await handleTransactionCompleted(event as TransactionCompletedEvent);
      break;
    
    default:
      console.log(`Unhandled webhook event: ${event.event_type}`);
  }
}

async function handleSubscriptionCreated(event: SubscriptionCreatedEvent) {
  const { data } = event;
  
  try {
    // Extract organization ID from custom data
    const organizationId = data.custom_data?.organizationId as string;
    
    if (!organizationId) {
      console.error('No organization ID in subscription custom data');
      return;
    }

    // Get the price ID to determine plan
    const priceId = data.items[0]?.price.id;
    if (!priceId) {
      console.error('No price ID found in subscription');
      return;
    }

    // Map price ID to plan (you'll need to implement this mapping)
    const planType = mapPriceIdToPlan(priceId);
    if (!planType) {
      console.error(`Unknown price ID: ${priceId}`);
      return;
    }

    // Update organization with subscription details
    await db.organization.update({
      where: { id: organizationId },
      data: {
        plan: planType,
        paddleSubscriptionId: data.id,
        paddleCustomerId: data.customer_id,
        subscriptionStatus: 'ACTIVE',
        subscriptionCurrentPeriodStart: new Date(data.current_billing_period.starts_at),
        subscriptionCurrentPeriodEnd: new Date(data.current_billing_period.ends_at),
        subscriptionCancelAtPeriodEnd: false,
      },
    });

    console.log(`Subscription created for organization ${organizationId}: ${data.id}`);
  } catch (error) {
    console.error('Error handling subscription created:', error);
    throw error;
  }
}

async function handleSubscriptionUpdated(event: SubscriptionUpdatedEvent) {
  const { data } = event;
  
  try {
    // Find organization by Paddle subscription ID
    const organization = await db.organization.findFirst({
      where: { paddleSubscriptionId: data.id },
    });

    if (!organization) {
      console.error(`Organization not found for subscription: ${data.id}`);
      return;
    }

    // Get the price ID to determine plan
    const priceId = data.items[0]?.price.id;
    if (!priceId) {
      console.error('No price ID found in subscription update');
      return;
    }

    const planType = mapPriceIdToPlan(priceId);
    if (!planType) {
      console.error(`Unknown price ID: ${priceId}`);
      return;
    }

    // Update organization with new subscription details
    await db.organization.update({
      where: { id: organization.id },
      data: {
        plan: planType,
        subscriptionStatus: data.status === 'active' ? 'ACTIVE' : 'INACTIVE',
        subscriptionCurrentPeriodStart: new Date(data.current_billing_period.starts_at),
        subscriptionCurrentPeriodEnd: new Date(data.current_billing_period.ends_at),
        subscriptionCancelAtPeriodEnd: Boolean(data.canceled_at),
      },
    });

    console.log(`Subscription updated for organization ${organization.id}: ${data.id}`);
  } catch (error) {
    console.error('Error handling subscription updated:', error);
    throw error;
  }
}

async function handleSubscriptionCanceled(event: SubscriptionCanceledEvent) {
  const { data } = event;
  
  try {
    // Find organization by Paddle subscription ID
    const organization = await db.organization.findFirst({
      where: { paddleSubscriptionId: data.id },
    });

    if (!organization) {
      console.error(`Organization not found for subscription: ${data.id}`);
      return;
    }

    // Update organization subscription status
    await db.organization.update({
      where: { id: organization.id },
      data: {
        subscriptionStatus: 'CANCELED',
        subscriptionCancelAtPeriodEnd: true,
        // Keep current period end date for grace period
      },
    });

    console.log(`Subscription canceled for organization ${organization.id}: ${data.id}`);
  } catch (error) {
    console.error('Error handling subscription canceled:', error);
    throw error;
  }
}

async function handleTransactionCompleted(event: TransactionCompletedEvent) {
  const { data } = event;
  
  try {
    // Log successful payment
    console.log(`Payment completed: ${data.id} for customer ${data.customer_id}`);
    
    // If this is for a subscription, the subscription.updated event will handle the main logic
    // This is mainly for logging and additional payment tracking if needed
    
    // You could store payment records here if needed
    // await db.payment.create({
    //   data: {
    //     paddleTransactionId: data.id,
    //     paddleCustomerId: data.customer_id,
    //     amount: parseInt(data.details.totals.total),
    //     currency: data.currency_code,
    //     status: 'completed',
    //     paidAt: new Date(data.billed_at),
    //   },
    // });
    
  } catch (error) {
    console.error('Error handling transaction completed:', error);
    throw error;
  }
}

// Helper function to map Paddle price IDs to plan types
function mapPriceIdToPlan(priceId: string): 'FREE' | 'PRO' | 'BUSINESS' | 'AGENCY' | 'CUSTOM' | null {
  // You'll need to map your actual Paddle price IDs to plan types
  // This should match the price IDs you set up in your Paddle dashboard
  const priceIdToPlanMap: Record<string, 'FREE' | 'PRO' | 'BUSINESS' | 'AGENCY' | 'CUSTOM'> = {
    'pri_pro_monthly': 'PRO',
    'pri_pro_yearly': 'PRO',
    'pri_business_monthly': 'BUSINESS',
    'pri_business_yearly': 'BUSINESS',
    'pri_agency_monthly': 'AGENCY',
    'pri_agency_yearly': 'AGENCY',
    // Add your actual Paddle price IDs here
  };

  return priceIdToPlanMap[priceId] || null;
}
