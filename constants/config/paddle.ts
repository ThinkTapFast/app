import { env } from '@/env.mjs';
import type { Plan } from '@prisma/client';

// Paddle API configuration
export const PADDLE_CONFIG = {
  apiKey: env.PADDLE_API_KEY,
  clientSideToken: env.NEXT_PUBLIC_PADDLE_CLIENT_SIDE_TOKEN,
  environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
  apiUrl: process.env.NODE_ENV === 'production' 
    ? 'https://api.paddle.com' 
    : 'https://sandbox-api.paddle.com',
} as const;

// Plan configuration with Paddle product/price IDs
export const PADDLE_PLANS = {
  FREE: {
    name: 'Free Plan',
    price: 0,
    currency: 'USD',
    interval: 'month',
    features: [
      '10 content generations per month',
      '1 project',
      'Basic templates',
      'Community support'
    ],
    limits: {
      content: 10,
      projects: 1,
      teamMembers: 1,
      apiRequests: 0,
      storage: '100MB'
    },
    // No Paddle product ID for free plan
    paddleProductId: null,
    paddlePriceId: null,
  },
  PRO: {
    name: 'Pro Plan',
    price: 29,
    currency: 'USD',
    interval: 'month',
    features: [
      '1,000 content generations per month',
      '10 projects',
      'Premium templates',
      'PDF export',
      'API access',
      'Priority support'
    ],
    limits: {
      content: 1000,
      projects: 10,
      teamMembers: 5,
      apiRequests: 1000,
      storage: '5GB'
    },
    // Replace with your actual Paddle product/price IDs
    paddleProductId: 'pro_product_id_from_paddle',
    paddlePriceId: 'pro_price_id_from_paddle',
  },
  BUSINESS: {
    name: 'Business Plan',
    price: 99,
    currency: 'USD',
    interval: 'month',
    features: [
      'Unlimited content generations',
      'Unlimited projects',
      'Custom templates',
      'Advanced analytics',
      'Team collaboration',
      'Priority support',
      'API access'
    ],
    limits: {
      content: -1, // Unlimited
      projects: -1,
      teamMembers: 25,
      apiRequests: 10000,
      storage: '50GB'
    },
    paddleProductId: 'business_product_id_from_paddle',
    paddlePriceId: 'business_price_id_from_paddle',
  },
  AGENCY: {
    name: 'Agency Plan',
    price: 299,
    currency: 'USD',
    interval: 'month',
    features: [
      'Everything in Business',
      'White-label solution',
      'Custom domain',
      'Advanced API',
      'Dedicated support',
      'Custom integrations'
    ],
    limits: {
      content: -1,
      projects: -1,
      teamMembers: 100,
      apiRequests: 50000,
      storage: '200GB'
    },
    paddleProductId: 'agency_product_id_from_paddle',
    paddlePriceId: 'agency_price_id_from_paddle',
  },
  CUSTOM: {
    name: 'Custom Plan',
    price: 0, // Custom pricing
    currency: 'USD',
    interval: 'month',
    features: [
      'Custom features',
      'Custom limits',
      'Dedicated infrastructure',
      'SLA guarantees',
      'Custom integrations'
    ],
    limits: {
      content: -1,
      projects: -1,
      teamMembers: -1,
      apiRequests: -1,
      storage: 'Unlimited'
    },
    paddleProductId: 'custom_product_id_from_paddle',
    paddlePriceId: 'custom_price_id_from_paddle',
  },
} as const satisfies Record<Plan, {
  name: string;
  price: number;
  currency: string;
  interval: string;
  features: string[];
  limits: {
    content: number;
    projects: number;
    teamMembers: number;
    apiRequests: number;
    storage: string;
  };
  paddleProductId: string | null;
  paddlePriceId: string | null;
}>;

// Paddle webhook events we handle
export const PADDLE_WEBHOOK_EVENTS = {
  SUBSCRIPTION_CREATED: 'subscription.created',
  SUBSCRIPTION_UPDATED: 'subscription.updated',
  SUBSCRIPTION_CANCELED: 'subscription.canceled',
  SUBSCRIPTION_PAUSED: 'subscription.paused',
  SUBSCRIPTION_RESUMED: 'subscription.resumed',
  TRANSACTION_COMPLETED: 'transaction.completed',
  TRANSACTION_UPDATED: 'transaction.updated',
  CUSTOMER_CREATED: 'customer.created',
  CUSTOMER_UPDATED: 'customer.updated',
} as const;

// Payment method configuration
export const PAYMENT_METHODS = {
  CARD: 'card',
  PAYPAL: 'paypal',
  GOOGLE_PAY: 'google_pay',
  APPLE_PAY: 'apple_pay',
} as const;

// Checkout configuration
export const CHECKOUT_CONFIG = {
  allowedPaymentMethods: [
    PAYMENT_METHODS.CARD,
    PAYMENT_METHODS.PAYPAL,
    PAYMENT_METHODS.GOOGLE_PAY,
    PAYMENT_METHODS.APPLE_PAY,
  ],
  collectTaxId: true,
  showAddDiscounts: true,
  showPaymentMethodChoice: true,
  variant: 'overlay' as const,
} as const;

// Helper functions
export function getPlanConfig(plan: Plan) {
  return PADDLE_PLANS[plan];
}

export function getPaddlePriceId(plan: Plan): string | null {
  return PADDLE_PLANS[plan].paddlePriceId;
}

export function getPlanByPaddlePriceId(priceId: string): Plan | null {
  for (const [plan, config] of Object.entries(PADDLE_PLANS)) {
    if (config.paddlePriceId === priceId) {
      return plan as Plan;
    }
  }
  return null;
}

export function isPaidPlan(plan: Plan): boolean {
  return plan !== 'FREE' && PADDLE_PLANS[plan].price > 0;
}

export function canUpgradeTo(currentPlan: Plan, targetPlan: Plan): boolean {
  const planHierarchy = ['FREE', 'PRO', 'BUSINESS', 'AGENCY', 'CUSTOM'] as const;
  const currentIndex = planHierarchy.indexOf(currentPlan);
  const targetIndex = planHierarchy.indexOf(targetPlan);
  
  return targetIndex > currentIndex;
}

export function canDowngradeTo(currentPlan: Plan, targetPlan: Plan): boolean {
  const planHierarchy = ['FREE', 'PRO', 'BUSINESS', 'AGENCY', 'CUSTOM'] as const;
  const currentIndex = planHierarchy.indexOf(currentPlan);
  const targetIndex = planHierarchy.indexOf(targetPlan);
  
  return targetIndex < currentIndex;
}
