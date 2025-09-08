import { PADDLE_PLANS } from '@/constants/config/paddle';
import { AllPaddleWebhookEvents } from '@/constants/config/paddle-webhooks';
import { env } from '@/env.mjs';
import crypto from 'crypto';

// Paddle API client configuration
const PADDLE_API_BASE_URL = env.NODE_ENV === 'production' 
  ? 'https://api.paddle.com' 
  : 'https://sandbox-api.paddle.com';

// Headers for Paddle API requests
const getHeaders = () => ({
  'Authorization': `Bearer ${env.PADDLE_API_KEY}`,
  'Content-Type': 'application/json',
});

// Generic API request function
async function paddleRequest<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  const url = `${PADDLE_API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getHeaders(),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Paddle API error: ${response.status} - ${error}`);
  }

  return response.json();
}

// Paddle API client class
export class PaddleClient {
  // Create a checkout session
  static async createCheckout(checkoutData: {
    items: Array<{
      price_id: string;
      quantity: number;
    }>;
    customer_id?: string;
    customer_email?: string;
    custom_data?: Record<string, unknown>;
    return_url?: string;
    discount_id?: string;
  }) {
    return paddleRequest('/checkout-sessions', {
      method: 'POST',
      body: JSON.stringify(checkoutData),
    });
  }

  // Get subscription details
  static async getSubscription(subscriptionId: string) {
    return paddleRequest(`/subscriptions/${subscriptionId}`);
  }

  // Update subscription
  static async updateSubscription(
    subscriptionId: string, 
    updateData: {
      items?: Array<{
        price_id: string;
        quantity: number;
      }>;
      proration_billing_mode?: 'prorated_immediately' | 'prorated_next_billing_period' | 'do_not_bill';
      collection_mode?: 'automatic' | 'manual';
      billing_details?: {
        enable_checkout?: boolean;
        purchase_order_number?: string;
        additional_information?: string;
      };
      custom_data?: Record<string, unknown>;
    }
  ) {
    return paddleRequest(`/subscriptions/${subscriptionId}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    });
  }

  // Cancel subscription
  static async cancelSubscription(
    subscriptionId: string,
    effective_from: 'next_billing_period' | 'immediately' = 'next_billing_period'
  ) {
    return paddleRequest(`/subscriptions/${subscriptionId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ effective_from }),
    });
  }

  // Pause subscription
  static async pauseSubscription(
    subscriptionId: string,
    effective_from: 'next_billing_period' | 'immediately' = 'next_billing_period'
  ) {
    return paddleRequest(`/subscriptions/${subscriptionId}/pause`, {
      method: 'POST',
      body: JSON.stringify({ effective_from }),
    });
  }

  // Resume subscription
  static async resumeSubscription(
    subscriptionId: string,
    effective_from: 'next_billing_period' | 'immediately' = 'next_billing_period'
  ) {
    return paddleRequest(`/subscriptions/${subscriptionId}/resume`, {
      method: 'POST',
      body: JSON.stringify({ effective_from }),
    });
  }

  // Get customer details
  static async getCustomer(customerId: string) {
    return paddleRequest(`/customers/${customerId}`);
  }

  // Create customer
  static async createCustomer(customerData: {
    name?: string;
    email: string;
    custom_data?: Record<string, unknown>;
  }) {
    return paddleRequest('/customers', {
      method: 'POST',
      body: JSON.stringify(customerData),
    });
  }

  // Update customer
  static async updateCustomer(
    customerId: string,
    customerData: {
      name?: string;
      email?: string;
      custom_data?: Record<string, unknown>;
    }
  ) {
    return paddleRequest(`/customers/${customerId}`, {
      method: 'PATCH',
      body: JSON.stringify(customerData),
    });
  }

  // Get transaction details
  static async getTransaction(transactionId: string) {
    return paddleRequest(`/transactions/${transactionId}`);
  }

  // List transactions for a customer
  static async listCustomerTransactions(customerId: string) {
    return paddleRequest(`/transactions?customer_id=${customerId}`);
  }

  // List subscriptions for a customer
  static async listCustomerSubscriptions(customerId: string) {
    return paddleRequest(`/subscriptions?customer_id=${customerId}`);
  }
}

// Webhook verification utility
export class PaddleWebhookVerifier {
  /**
   * Verify Paddle webhook signature
   * @param payload - Raw webhook payload (string)
   * @param signature - Paddle-Signature header value
   * @param secret - Webhook signing secret
   * @returns boolean indicating if signature is valid
   */
  static verifySignature(
    payload: string,
    signature: string,
    secret: string = env.PADDLE_WEBHOOK_SECRET
  ): boolean {
    try {
      // Extract timestamp and signatures from header
      const parts = signature.split(';');
      const timestampPart = parts.find(part => part.startsWith('ts='));
      const signaturePart = parts.find(part => part.startsWith('h1='));

      if (!timestampPart || !signaturePart) {
        return false;
      }

      const timestamp = timestampPart.split('=')[1];
      const receivedSignature = signaturePart.split('=')[1];

      // Create expected signature
      const signedPayload = `${timestamp}:${payload}`;
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(signedPayload, 'utf8')
        .digest('hex');

      // Compare signatures
      return crypto.timingSafeEqual(
        Buffer.from(receivedSignature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      return false;
    }
  }

  /**
   * Parse and validate webhook payload
   * @param payload - Raw webhook payload
   * @param signature - Paddle-Signature header
   * @returns Parsed webhook event or null if invalid
   */
  static parseWebhook(
    payload: string,
    signature: string
  ): AllPaddleWebhookEvents | null {
    // Verify signature first
    if (!this.verifySignature(payload, signature)) {
      console.error('Invalid webhook signature');
      return null;
    }

    try {
      const event = JSON.parse(payload) as AllPaddleWebhookEvents;
      
      // Basic validation
      if (!event.event_id || !event.event_type || !event.data) {
        console.error('Invalid webhook payload structure');
        return null;
      }

      return event;
    } catch (error) {
      console.error('Failed to parse webhook payload:', error);
      return null;
    }
  }
}

// Plan management utilities
export class PaddlePlanManager {
  /**
   * Get plan details by Paddle price ID
   */
  static getPlanByPriceId(priceId: string) {
    return Object.values(PADDLE_PLANS).find(plan => 
      plan.paddlePriceId === priceId
    );
  }

  /**
   * Get plan details by internal plan name
   */
  static getPlanByName(planName: string) {
    return PADDLE_PLANS[planName as keyof typeof PADDLE_PLANS];
  }

  /**
   * Check if a plan upgrade is valid
   */
  static isValidUpgrade(fromPlan: string, toPlan: string): boolean {
    const planOrder = ['FREE', 'PRO', 'BUSINESS', 'AGENCY', 'CUSTOM'];
    const fromIndex = planOrder.indexOf(fromPlan);
    const toIndex = planOrder.indexOf(toPlan);
    
    return fromIndex < toIndex;
  }

  /**
   * Check if a plan downgrade is valid
   */
  static isValidDowngrade(fromPlan: string, toPlan: string): boolean {
    const planOrder = ['FREE', 'PRO', 'BUSINESS', 'AGENCY', 'CUSTOM'];
    const fromIndex = planOrder.indexOf(fromPlan);
    const toIndex = planOrder.indexOf(toPlan);
    
    return fromIndex > toIndex;
  }

  /**
   * Get billing cycle from price ID (all plans are monthly for now)
   */
  static getBillingCycle(priceId: string): 'monthly' | 'yearly' | null {
    const plan = this.getPlanByPriceId(priceId);
    if (plan && plan.interval === 'month') return 'monthly';
    // Note: Currently all plans are monthly, but ready for yearly when needed
    return null;
  }

  /**
   * Calculate proration amount for plan changes
   */
  static calculateProration(
    fromPriceId: string,
    toPriceId: string,
    daysRemaining: number,
    totalDaysInCycle: number
  ): number {
    const fromPlan = this.getPlanByPriceId(fromPriceId);
    const toPlan = this.getPlanByPriceId(toPriceId);
    
    if (!fromPlan || !toPlan) return 0;

    const fromPrice = fromPlan.price;
    const toPrice = toPlan.price;
    
    // Calculate unused portion of current plan
    const unusedAmount = (fromPrice * daysRemaining) / totalDaysInCycle;
    
    // Calculate new plan amount for remaining period
    const newAmount = (toPrice * daysRemaining) / totalDaysInCycle;
    
    return newAmount - unusedAmount;
  }
}

// Export default client instance
export default PaddleClient;
