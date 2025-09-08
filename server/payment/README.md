# Server Payment Module

This directory contains all payment-related server-side functionality.

## Structure

```
server/payment/
├── index.ts           # Main exports and module entry point
├── paddle.ts          # Paddle payment provider implementation
└── README.md          # This file
```

## Paddle Integration

The `paddle.ts` file contains the complete Paddle payment integration:

### Classes

- **`PaddleClient`** - Main API client for Paddle operations
  - Checkout session creation
  - Subscription management (create, update, cancel, pause, resume)
  - Customer management
  - Transaction and subscription queries

- **`PaddleWebhookVerifier`** - Webhook security and validation
  - Signature verification using HMAC-SHA256
  - Payload parsing and validation
  - Security best practices

- **`PaddlePlanManager`** - Plan management utilities
  - Plan lookup by price ID or name
  - Upgrade/downgrade validation
  - Proration calculations
  - Billing cycle management

### Usage Examples

```typescript
// Import from the main payment module
import { PaddleClient, PaddleWebhookVerifier, PaddlePlanManager } from '@/server/payment';

// Create a checkout session
const checkout = await PaddleClient.createCheckout({
  items: [{ price_id: 'pri_01234567890', quantity: 1 }],
  customer_email: 'user@example.com',
  custom_data: { organizationId: 'org_123' }
});

// Verify webhook signature
const isValid = PaddleWebhookVerifier.verifySignature(
  payload,
  signature,
  process.env.PADDLE_WEBHOOK_SECRET
);

// Get plan details
const plan = PaddlePlanManager.getPlanByName('PRO');
```

## Environment Variables

Required environment variables for Paddle integration:

```env
PADDLE_API_KEY=your_paddle_api_key
PADDLE_WEBHOOK_SECRET=your_webhook_signing_secret
NODE_ENV=production|development  # Determines API URL (sandbox vs production)
```

## Future Payment Providers

This module is designed to be extensible. To add new payment providers:

1. Create a new file: `server/payment/[provider].ts`
2. Implement similar classes and utilities
3. Export from `index.ts`
4. Update imports in consuming code

Example for future providers:
```typescript
// server/payment/stripe.ts
export class StripeClient { ... }
export class StripeWebhookVerifier { ... }

// server/payment/index.ts
export * from './stripe';
```

## Security Considerations

- All webhook payloads are verified using cryptographic signatures
- API keys are managed through environment variables
- Production vs sandbox environments are handled automatically
- Error handling includes proper logging without exposing sensitive data

## Related Files

- **Configuration**: `constants/config/paddle.ts` - Plan definitions and settings
- **Types**: `constants/config/paddle-webhooks.ts` - Webhook event type definitions
- **Server Actions**: `server/actions/billing/` - Business logic using payment APIs
- **API Routes**: `app/api/v1/webhooks/paddle/` - Webhook endpoint handlers
