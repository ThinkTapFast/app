'use client';

import { SignedIn, SignedOut } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SignInPage } from './sign-in-button';

export function PaddleTestComponent() {
  return (
    <div className="container mx-auto py-8 px-4">
      <SignedOut>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">Paddle Checkout Test</h1>
          <p className="text-gray-600 mb-8">
            Sign in to test the Paddle payment integration
          </p>
        </div>
        <SignInPage />
      </SignedOut>

      <SignedIn>
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4">Paddle Integration Test</h1>
            <p className="text-gray-600">
              Test the Paddle checkout integration with different plans
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {/* Pro Plan Test */}
            <Card className="border-2 border-blue-200 hover:border-blue-400 transition-colors">
              <CardHeader className="text-center">
                <CardTitle className="text-xl">Pro Plan Test</CardTitle>
                <CardDescription>Test Paddle checkout with Pro plan</CardDescription>
                <div className="text-3xl font-bold text-blue-600">$29/mo</div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    1,000 content generations
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    10 projects
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    API access
                  </li>
                </ul>
                <Button 
                  className="w-full" 
                  onClick={() => alert('This would trigger Paddle checkout for PRO plan')}
                >
                  Test Pro Checkout
                </Button>
              </CardContent>
            </Card>

            {/* Business Plan Test */}
            <Card className="border-2 border-purple-200 hover:border-purple-400 transition-colors">
              <CardHeader className="text-center">
                <CardTitle className="text-xl">Business Plan Test</CardTitle>
                <CardDescription>Test Paddle checkout with Business plan</CardDescription>
                <div className="text-3xl font-bold text-purple-600">$99/mo</div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Unlimited content
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Unlimited projects
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Team collaboration
                  </li>
                </ul>
                <Button 
                  className="w-full" 
                  onClick={() => alert('This would trigger Paddle checkout for BUSINESS plan')}
                >
                  Test Business Checkout
                </Button>
              </CardContent>
            </Card>

            {/* Agency Plan Test */}
            <Card className="border-2 border-green-200 hover:border-green-400 transition-colors">
              <CardHeader className="text-center">
                <CardTitle className="text-xl">Agency Plan Test</CardTitle>
                <CardDescription>Test Paddle checkout with Agency plan</CardDescription>
                <div className="text-3xl font-bold text-green-600">$299/mo</div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    White-label solution
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Custom domain
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Priority support
                  </li>
                </ul>
                <Button 
                  className="w-full" 
                  onClick={() => alert('This would trigger Paddle checkout for AGENCY plan')}
                >
                  Test Agency Checkout
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="text-center space-y-4">
            <p className="text-sm text-gray-500">
              💡 These buttons currently show alerts. The actual Paddle checkout will be implemented once you have valid Paddle credentials.
            </p>
            <Button variant="outline" asChild>
              <a href="/billing">
                View Full Billing Dashboard
              </a>
            </Button>
          </div>
        </div>
      </SignedIn>
    </div>
  );
}
