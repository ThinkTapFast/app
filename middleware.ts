import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

// Define protected routes that require authentication
const isProtectedRoute = createRouteMatcher([
  '/content(.*)',
  '/dashboard(.*)',
  '/settings(.*)',
  '/billing(.*)',
  '/api/v1(.*)',
]);

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/api/webhooks(.*)',
  '/api/health',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/onboarding(.*)',
]);

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const { pathname } = req.nextUrl;
  
  // Skip authentication for public routes
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }
  
  // Protect routes that require authentication
  if (isProtectedRoute(req)) {
    const { userId } = await auth();
    
    if (!userId) {
      // Redirect to sign-in for dashboard routes
      if (pathname.startsWith('/content') || pathname.startsWith('/dashboard')) {
        return NextResponse.redirect(new URL('/sign-in', req.url));
      }
      
      // Return 401 for API routes
      if (pathname.startsWith('/api/v1')) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Authentication required' },
          { status: 401 }
        );
      }
    }
    
    // NOTE: ABAC permission checks are now handled in individual API route handlers
    // to keep middleware lightweight and under Vercel's 1MB Edge Runtime limit
  }
  
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
