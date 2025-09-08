'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { createPaddleCheckout } from '@/server/actions/billing/paddle-checkout';
import type { Plan } from '@prisma/client';

interface PaddleCheckoutButtonProps {
  organizationId: string;
  plan: Plan;
  billingInterval?: 'monthly' | 'yearly';
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export function PaddleCheckoutButton({
  organizationId,
  plan,
  billingInterval = 'monthly',
  children,
  disabled = false,
  className,
}: PaddleCheckoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    if (disabled || isLoading) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const result = await createPaddleCheckout({
        organizationId,
        plan,
        billingInterval,
      });

      if (result.success && result.checkoutUrl) {
        // Redirect to Paddle checkout
        window.location.href = result.checkoutUrl;
      } else {
        setError(result.error || 'Failed to create checkout session');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Checkout error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        onClick={handleCheckout}
        disabled={disabled || isLoading}
        className={className}
      >
        {isLoading ? 'Creating checkout...' : children}
      </Button>
      
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

// Example usage component
export function PlanUpgradeCard({ 
  organizationId, 
  currentPlan = 'FREE' 
}: { 
  organizationId: string; 
  currentPlan?: Plan;
}) {
  const plans = [
    {
      name: 'Pro',
      plan: 'PRO' as Plan,
      price: '$29',
      features: ['1,000 content generations', '10 projects', 'API access'],
    },
    {
      name: 'Business',
      plan: 'BUSINESS' as Plan,
      price: '$99',
      features: ['Unlimited content', 'Unlimited projects', 'Team collaboration'],
    },
    {
      name: 'Agency',
      plan: 'AGENCY' as Plan,
      price: '$299',
      features: ['White-label solution', 'Custom domain', 'Priority support'],
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
      {plans.map((planOption) => (
        <div
          key={planOption.plan}
          className="border rounded-lg p-6 space-y-4 hover:shadow-lg transition-shadow"
        >
          <div className="text-center">
            <h3 className="text-xl font-semibold">{planOption.name}</h3>
            <p className="text-3xl font-bold text-blue-600">{planOption.price}</p>
            <p className="text-sm text-gray-500">per month</p>
          </div>
          
          <ul className="space-y-2">
            {planOption.features.map((feature) => (
              <li key={feature} className="flex items-center space-x-2">
                <span className="text-green-500">✓</span>
                <span className="text-sm">{feature}</span>
              </li>
            ))}
          </ul>
          
          <PaddleCheckoutButton
            organizationId={organizationId}
            plan={planOption.plan}
            billingInterval="monthly"
            disabled={currentPlan === planOption.plan}
            className="w-full"
          >
            {currentPlan === planOption.plan 
              ? 'Current Plan' 
              : `Upgrade to ${planOption.name}`
            }
          </PaddleCheckoutButton>
        </div>
      ))}
    </div>
  );
}
