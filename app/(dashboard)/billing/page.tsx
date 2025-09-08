import { auth } from '@clerk/nextjs/server';
import { db } from '@/server/db/client';
import { BillingDashboard } from '@/components/billing/billing-dashboard';
import { SignInPage } from '@/components/auth/sign-in-button';

export default async function BillingPage() {
  const { userId } = await auth();
  
  if (!userId) {
    // Show sign-in page instead of redirecting
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">Billing & Subscription</h1>
          <p className="text-gray-600 mb-8">
            Sign in to view your billing dashboard and test Paddle checkout
          </p>
        </div>
        <SignInPage />
      </div>
    );
  }

  // Get user's organization
  const userWithMembership = await db.user.findUnique({
    where: { clerkId: userId },
    include: {
      memberships: {
        include: {
          organization: true,
        },
        take: 1, // Get primary organization
      },
    },
  });

  if (!userWithMembership?.memberships[0]) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Setup Required</h1>
          <p className="text-gray-600">
            Please complete your organization setup to access billing features.
          </p>
        </div>
      </div>
    );
  }

  const organization = userWithMembership.memberships[0].organization;

  // Mock usage data - replace with actual usage tracking
  const currentUsage = {
    credits: 250,
    projects: 5,
    apiCalls: 120,
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Billing & Usage</h1>
          <p className="text-gray-600">
            Manage your subscription and monitor your usage
          </p>
        </div>

        <BillingDashboard 
          organization={organization}
          currentUsage={currentUsage}
        />
      </div>
    </div>
  );
}
