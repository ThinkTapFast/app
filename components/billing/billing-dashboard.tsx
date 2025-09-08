'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PaddleCheckoutButton } from './paddle-checkout-button';
import type { Organization, Plan } from '@prisma/client';

interface BillingDashboardProps {
  organization: Organization;
  currentUsage?: {
    credits: number;
    projects: number;
    apiCalls: number;
  };
}

interface PlanLimits {
  credits: number;
  projects: number;
  apiCalls: number;
  features: string[];
}

const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  FREE: {
    credits: 100,
    projects: 3,
    apiCalls: 50,
    features: ['Basic content generation', 'Limited templates', 'Community support'],
  },
  PRO: {
    credits: 1000,
    projects: 10,
    apiCalls: 1000,
    features: ['Advanced content generation', 'All templates', 'API access', 'Priority support'],
  },
  BUSINESS: {
    credits: 10000,
    projects: 100,
    apiCalls: 10000,
    features: ['Unlimited content', 'Team collaboration', 'Custom templates', 'Analytics'],
  },
  AGENCY: {
    credits: 50000,
    projects: 500,
    apiCalls: 50000,
    features: ['White-label solution', 'Custom domain', 'Dedicated support', 'Advanced analytics'],
  },
  CUSTOM: {
    credits: 999999,
    projects: 999999,
    apiCalls: 999999,
    features: ['Everything in Agency', 'Custom integrations', 'Dedicated account manager'],
  },
};

function getStatusColor(status: string) {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800';
    case 'trialing':
      return 'bg-blue-100 text-blue-800';
    case 'canceled':
      return 'bg-red-100 text-red-800';
    case 'past_due':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function UsageCard({ 
  title, 
  current, 
  limit, 
  unit = '' 
}: { 
  title: string; 
  current: number; 
  limit: number; 
  unit?: string; 
}) {
  const percentage = limit > 0 ? Math.round((current / limit) * 100) : 0;
  const isNearLimit = percentage >= 80;
  const isOverLimit = percentage >= 100;

  // Helper functions for status display
  const getStatusText = () => {
    if (isOverLimit) return 'Over limit';
    if (isNearLimit) return 'Near limit';
    return 'Available';
  };

  const getStatusColor = () => {
    if (isOverLimit) return 'text-red-600';
    if (isNearLimit) return 'text-yellow-600';
    return 'text-gray-500';
  };

  const getProgressBarColor = () => {
    if (isOverLimit) return 'bg-red-500';
    if (isNearLimit) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-baseline space-x-1">
            <span className="text-2xl font-bold">{current.toLocaleString()}</span>
            <span className="text-sm text-gray-500">
              / {limit === 999999 ? '∞' : limit.toLocaleString()} {unit}
            </span>
          </div>
          
          {limit !== 999999 && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>{percentage}% used</span>
                <span className={getStatusColor()}>
                  {getStatusText()}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${getProgressBarColor()}`}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function BillingDashboard({ 
  organization, 
  currentUsage = { credits: 0, projects: 0, apiCalls: 0 } 
}: BillingDashboardProps) {
  const currentPlan = organization.plan;
  const limits = PLAN_LIMITS[currentPlan];
  
  const subscriptionStatus = organization.subscriptionStatus;
  const nextBillingDate = organization.subscriptionCurrentPeriodEnd;

  return (
    <div className="space-y-6">
      {/* Current Plan Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <span>{currentPlan} Plan</span>
                {subscriptionStatus && (
                  <Badge className={getStatusColor(subscriptionStatus)}>
                    {subscriptionStatus}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {nextBillingDate && `Next billing: ${new Date(nextBillingDate).toLocaleDateString()}`}
              </CardDescription>
            </div>
            
            {currentPlan !== 'CUSTOM' && (
              <div className="flex space-x-2">
                {currentPlan === 'FREE' && (
                  <PaddleCheckoutButton
                    organizationId={organization.id}
                    plan="PRO"
                    billingInterval="monthly"
                  >
                    Upgrade to Pro
                  </PaddleCheckoutButton>
                )}
                {(currentPlan === 'PRO' || currentPlan === 'FREE') && (
                  <PaddleCheckoutButton
                    organizationId={organization.id}
                    plan="BUSINESS"
                    billingInterval="monthly"
                  >
                    Upgrade to Business
                  </PaddleCheckoutButton>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-2">
            <h4 className="font-medium">Plan Features:</h4>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-1 text-sm text-gray-600">
              {limits.features.map((feature) => (
                <li key={feature} className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Usage Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <UsageCard
          title="Content Credits"
          current={currentUsage.credits}
          limit={limits.credits}
          unit="credits"
        />
        <UsageCard
          title="Projects"
          current={currentUsage.projects}
          limit={limits.projects}
          unit="projects"
        />
        <UsageCard
          title="API Calls"
          current={currentUsage.apiCalls}
          limit={limits.apiCalls}
          unit="calls"
        />
      </div>

      {/* Subscription Management */}
      {organization.paddleSubscriptionId && (
        <Card>
          <CardHeader>
            <CardTitle>Subscription Management</CardTitle>
            <CardDescription>
              Manage your subscription and billing preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Subscription ID:</span>
                <p className="text-gray-600 font-mono">{organization.paddleSubscriptionId}</p>
              </div>
              {organization.paddleCustomerId && (
                <div>
                  <span className="font-medium">Customer ID:</span>
                  <p className="text-gray-600 font-mono">{organization.paddleCustomerId}</p>
                </div>
              )}
            </div>
            
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                Update Payment Method
              </Button>
              <Button variant="outline" size="sm">
                Download Invoice
              </Button>
              <Button variant="destructive" size="sm">
                Cancel Subscription
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
