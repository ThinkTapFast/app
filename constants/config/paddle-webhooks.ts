// Common type aliases for Paddle webhooks
export type PaddleInterval = 'day' | 'week' | 'month' | 'year';
export type PaddleSubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'paused' | 'trialing';
export type PaddleCustomerStatus = 'active' | 'archived';
export type PaddleCollectionMode = 'automatic' | 'manual';
export type PaddleProductType = 'standard' | 'custom';
export type PaddleScheduledAction = 'cancel' | 'pause' | 'resume';
export type PaddleTaxMode = 'account_setting' | 'external' | 'internal';
export type PaddleTransactionOrigin = 'api' | 'subscription_charge' | 'subscription_payment_method_change' | 'subscription_update' | 'checkout';
export type PaddlePaymentStatus = 'captured' | 'authorized' | 'canceled' | 'error' | 'pending' | 'unknown';
export type PaddleEffectiveFrom = 'next_billing_period' | 'immediately';

// Paddle webhook event types based on Paddle API v4
export interface PaddleWebhookEvent {
  event_id: string;
  event_type: string;
  occurred_at: string;
  notification_id: string;
  data: unknown;
}

// Customer events
export interface CustomerCreatedEvent extends PaddleWebhookEvent {
  event_type: 'customer.created';
  data: {
    id: string;
    name: string;
    email: string;
    marketing_consent: boolean;
    status: PaddleCustomerStatus;
    custom_data: Record<string, unknown> | null;
    locale: string;
    created_at: string;
    updated_at: string;
  };
}

export interface CustomerUpdatedEvent extends PaddleWebhookEvent {
  event_type: 'customer.updated';
  data: {
    id: string;
    name: string;
    email: string;
    marketing_consent: boolean;
    status: PaddleCustomerStatus;
    custom_data: Record<string, unknown> | null;
    locale: string;
    created_at: string;
    updated_at: string;
  };
}

// Subscription events
export interface SubscriptionCreatedEvent extends PaddleWebhookEvent {
  event_type: 'subscription.created';
  data: {
    id: string;
    status: PaddleSubscriptionStatus;
    customer_id: string;
    address_id: string;
    business_id: string | null;
    currency_code: string;
    created_at: string;
    updated_at: string;
    started_at: string;
    first_billed_at: string;
    next_billed_at: string;
    paused_at: string | null;
    canceled_at: string | null;
    discount: {
      id: string;
      starts_at: string;
      ends_at: string | null;
    } | null;
    collection_mode: PaddleCollectionMode;
    billing_details: {
      enable_checkout: boolean;
      purchase_order_number: string;
      additional_information: string | null;
      payment_terms: {
        interval: PaddleInterval;
        frequency: number;
      };
    };
    current_billing_period: {
      starts_at: string;
      ends_at: string;
    };
    billing_cycle: {
      interval: PaddleInterval;
      frequency: number;
    };
    recurring_transaction_details: {
      tax_rates_used: Array<{
        tax_rate: string;
        totals: {
          subtotal: string;
          discount: string;
          tax: string;
          total: string;
        };
      }>;
      totals: {
        subtotal: string;
        discount: string;
        tax: string;
        total: string;
        credit: string;
        balance: string;
        grand_total: string;
        fee: string | null;
        earnings: string | null;
        currency_code: string;
      };
      line_items: Array<{
        id: string;
        price_id: string;
        quantity: number;
        proration: {
          rate: string;
          billing_period: {
            starts_at: string;
            ends_at: string;
          };
        } | null;
        tax_rate: string;
        unit_totals: {
          subtotal: string;
          discount: string;
          tax: string;
          total: string;
        };
        totals: {
          subtotal: string;
          discount: string;
          tax: string;
          total: string;
        };
        product: {
          id: string;
          name: string;
          description: string | null;
          type: 'standard' | 'custom';
          tax_category: string;
          image_url: string | null;
          custom_data: Record<string, unknown> | null;
          status: 'active' | 'archived';
          created_at: string;
          updated_at: string;
        };
      }>;
    };
    scheduled_change: {
      action: PaddleScheduledAction;
      effective_at: string;
      resume_at: string | null;
    } | null;
    management_urls: {
      update_payment_method: string;
      cancel: string;
    };
    items: Array<{
      status: 'active' | 'inactive' | 'trialing';
      quantity: number;
      recurring: boolean;
      created_at: string;
      updated_at: string;
      previously_billed_at: string | null;
      next_billed_at: string | null;
      trial_dates: {
        starts_at: string | null;
        ends_at: string | null;
      } | null;
      price: {
        id: string;
        product_id: string;
        description: string;
        type: PaddleProductType;
        billing_cycle: {
          interval: PaddleInterval;
          frequency: number;
        } | null;
        trial_period: {
          interval: PaddleInterval;
          frequency: number;
        } | null;
        tax_mode: PaddleTaxMode;
        unit_price: {
          amount: string;
          currency_code: string;
        };
        unit_price_overrides: Array<{
          country_codes: string[];
          unit_price: {
            amount: string;
            currency_code: string;
          };
        }>;
        quantity: {
          minimum: number;
          maximum: number;
        };
        status: 'active' | 'archived';
        custom_data: Record<string, unknown> | null;
        import_meta: Record<string, unknown> | null;
        created_at: string;
        updated_at: string;
      };
    }>;
    custom_data: Record<string, unknown> | null;
    import_meta: Record<string, unknown> | null;
  };
}

export interface SubscriptionUpdatedEvent extends PaddleWebhookEvent {
  event_type: 'subscription.updated';
  data: SubscriptionCreatedEvent['data'];
}

export interface SubscriptionCanceledEvent extends PaddleWebhookEvent {
  event_type: 'subscription.canceled';
  data: {
    id: string;
    status: 'canceled';
    customer_id: string;
    canceled_at: string;
    effective_from: 'next_billing_period' | 'immediately';
  };
}

export interface SubscriptionPausedEvent extends PaddleWebhookEvent {
  event_type: 'subscription.paused';
  data: {
    id: string;
    status: 'paused';
    customer_id: string;
    paused_at: string;
    effective_from: 'next_billing_period' | 'immediately';
  };
}

export interface SubscriptionResumedEvent extends PaddleWebhookEvent {
  event_type: 'subscription.resumed';
  data: {
    id: string;
    status: 'active';
    customer_id: string;
    resumed_at: string;
    effective_from: 'next_billing_period' | 'immediately';
  };
}

// Transaction events
export interface TransactionCompletedEvent extends PaddleWebhookEvent {
  event_type: 'transaction.completed';
  data: {
    id: string;
    status: 'completed';
    customer_id: string;
    address_id: string;
    business_id: string | null;
    custom_data: Record<string, unknown> | null;
    currency_code: string;
    origin: 'api' | 'subscription_charge' | 'subscription_payment_method_change' | 'subscription_update' | 'checkout';
    subscription_id: string | null;
    invoice_id: string | null;
    invoice_number: string | null;
    collection_mode: 'automatic' | 'manual';
    discount_id: string | null;
    billing_details: {
      enable_checkout: boolean;
      purchase_order_number: string;
      additional_information: string | null;
      payment_terms: {
        interval: 'day' | 'week' | 'month' | 'year';
        frequency: number;
      };
    } | null;
    billing_period: {
      starts_at: string;
      ends_at: string;
    } | null;
    items: Array<{
      price_id: string;
      quantity: number;
      proration: {
        rate: string;
        billing_period: {
          starts_at: string;
          ends_at: string;
        };
      } | null;
    }>;
    details: {
      tax_rates_used: Array<{
        tax_rate: string;
        totals: {
          subtotal: string;
          discount: string;
          tax: string;
          total: string;
        };
      }>;
      totals: {
        subtotal: string;
        discount: string;
        tax: string;
        total: string;
        credit: string;
        balance: string;
        grand_total: string;
        fee: string | null;
        earnings: string | null;
        currency_code: string;
      };
      adjusted_totals: {
        subtotal: string;
        tax: string;
        total: string;
        grand_total: string;
        fee: string;
        earnings: string;
        currency_code: string;
      };
      payout_totals: {
        subtotal: string;
        discount: string;
        tax: string;
        total: string;
        credit: string;
        balance: string;
        grand_total: string;
        fee: string;
        earnings: string;
        currency_code: string;
      } | null;
      adjusted_payout_totals: {
        subtotal: string;
        tax: string;
        total: string;
        grand_total: string;
        fee: string;
        earnings: string;
        currency_code: string;
      } | null;
      line_items: Array<{
        id: string;
        price_id: string;
        quantity: number;
        proration: {
          rate: string;
          billing_period: {
            starts_at: string;
            ends_at: string;
          };
        } | null;
        tax_rate: string;
        unit_totals: {
          subtotal: string;
          discount: string;
          tax: string;
          total: string;
        };
        totals: {
          subtotal: string;
          discount: string;
          tax: string;
          total: string;
        };
        product: {
          id: string;
          name: string;
          description: string | null;
          type: 'standard' | 'custom';
          tax_category: string;
          image_url: string | null;
          custom_data: Record<string, unknown> | null;
          status: 'active' | 'archived';
          created_at: string;
          updated_at: string;
        };
      }>;
    };
    payments: Array<{
      payment_id: string;
      stored_payment_method_id: string;
      method_details: {
        card: {
          type: string;
          last_four: string;
          expiry_month: number;
          expiry_year: number;
          cardholder_name: string;
        };
      };
      status: 'captured' | 'authorized' | 'canceled' | 'error' | 'pending' | 'unknown';
      error_code: string | null;
      created_at: string;
      captured_at: string | null;
    }>;
    checkout: {
      url: string | null;
    } | null;
    created_at: string;
    updated_at: string;
    billed_at: string;
  };
}

export interface TransactionUpdatedEvent extends PaddleWebhookEvent {
  event_type: 'transaction.updated';
  data: TransactionCompletedEvent['data'];
}

// Union type for all webhook events
export type AllPaddleWebhookEvents = 
  | CustomerCreatedEvent
  | CustomerUpdatedEvent
  | SubscriptionCreatedEvent
  | SubscriptionUpdatedEvent
  | SubscriptionCanceledEvent
  | SubscriptionPausedEvent
  | SubscriptionResumedEvent
  | TransactionCompletedEvent
  | TransactionUpdatedEvent;

// Helper type to extract event data by event type
export type ExtractEventData<T extends AllPaddleWebhookEvents['event_type']> = 
  Extract<AllPaddleWebhookEvents, { event_type: T }>['data'];

// Webhook verification signature header
export interface PaddleWebhookHeaders {
  'paddle-signature': string;
}
