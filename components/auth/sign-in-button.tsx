'use client';

import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';

export function AuthButton() {
  return (
    <div className="flex items-center space-x-4">
      <SignedOut>
        <SignInButton mode="modal">
          <Button variant="default">
            Sign In
          </Button>
        </SignInButton>
      </SignedOut>
      
      <SignedIn>
        <UserButton 
          appearance={{
            elements: {
              avatarBox: "w-8 h-8"
            }
          }}
        />
      </SignedIn>
    </div>
  );
}

// Simple sign-in page component
export function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">
            Welcome to ThinkTapFast
          </h2>
          <p className="mt-2 text-gray-600">
            Sign in to test the Paddle checkout integration
          </p>
        </div>
        
        <div className="flex justify-center">
          <SignInButton mode="modal">
            <Button size="lg" className="w-full">
              Sign In with Clerk
            </Button>
          </SignInButton>
        </div>
        
        <div className="text-center text-sm text-gray-500">
          <p>Click above to sign in and test the billing dashboard</p>
        </div>
      </div>
    </div>
  );
}
