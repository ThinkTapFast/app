// server/auth/middleware.ts - ABAC middleware for route protection

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getCurrentUserWithRoles, createPermissionContext } from './clerk-helpers';
import { checkPermission } from './abac';
import type { ResourceType, Action } from './types';

// Route patterns that require specific permissions
const PROTECTED_ROUTES: Record<string, { resource: ResourceType; action: Action; extractContext?: (req: NextRequest) => { orgId?: string; workspaceId?: string; projectId?: string } }> = {
  '/api/v1/organizations/:orgId': {
    resource: 'organization',
    action: 'read',
    extractContext: (req) => ({ orgId: req.nextUrl.pathname.split('/')[4] }),
  },
  '/api/v1/organizations/:orgId/workspaces': {
    resource: 'workspace',
    action: 'create',
    extractContext: (req) => ({ orgId: req.nextUrl.pathname.split('/')[4] }),
  },
  '/api/v1/organizations/:orgId/workspaces/:workspaceId': {
    resource: 'workspace',
    action: 'read',
    extractContext: (req) => ({ 
      orgId: req.nextUrl.pathname.split('/')[4],
      workspaceId: req.nextUrl.pathname.split('/')[6]
    }),
  },
  '/api/v1/workspaces/:workspaceId/projects': {
    resource: 'project',
    action: 'create',
    extractContext: (req) => ({ workspaceId: req.nextUrl.pathname.split('/')[4] }),
  },
  '/api/v1/projects/:projectId/contents': {
    resource: 'content',
    action: 'create',
    extractContext: (req) => ({ projectId: req.nextUrl.pathname.split('/')[4] }),
  },
  '/api/v1/content/:contentId': {
    resource: 'content',
    action: 'read',
    // contentId will be used to find project context in the route handler
  },
  '/api/v1/organizations/:orgId/api-keys': {
    resource: 'apikey',
    action: 'create',
    extractContext: (req) => ({ orgId: req.nextUrl.pathname.split('/')[4] }),
  },
  '/api/v1/organizations/:orgId/billing': {
    resource: 'billing',
    action: 'read',
    extractContext: (req) => ({ orgId: req.nextUrl.pathname.split('/')[4] }),
  },
};

// Map HTTP methods to actions
const METHOD_TO_ACTION: Record<string, Action> = {
  'GET': 'read',
  'POST': 'create',
  'PUT': 'update',
  'PATCH': 'update',
  'DELETE': 'delete',
};

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/api/webhooks',
  '/api/health',
  '/sign-in',
  '/sign-up',
  '/api/auth',
];

// Admin-only routes
const ADMIN_ROUTES = [
  '/api/admin',
  '/admin',
];

/**
 * Main ABAC middleware function
 */
export async function abacMiddleware(req: NextRequest): Promise<NextResponse | null> {
  const { pathname } = req.nextUrl;
  
  // Skip public routes
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return null; // Continue to next middleware
  }
  
  // Check authentication
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Authentication required' },
      { status: 401 }
    );
  }
  
  // Check admin routes
  if (ADMIN_ROUTES.some(route => pathname.startsWith(route))) {
    const user = await getCurrentUserWithRoles();
    if (!user || user.platformRole !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Admin access required' },
        { status: 403 }
      );
    }
    return null; // Continue
  }
  
  // Check route-specific permissions
  const routeConfig = findMatchingRoute(pathname);
  if (routeConfig) {
    const hasPermission = await checkRoutePermission(req, routeConfig);
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Insufficient permissions' },
        { status: 403 }
      );
    }
  }
  
  return null; // Continue to route handler
}

/**
 * Find matching route configuration
 */
function findMatchingRoute(pathname: string): { resource: ResourceType; action: Action; extractContext?: (req: NextRequest) => { orgId?: string; workspaceId?: string; projectId?: string } } | null {
  for (const [pattern, config] of Object.entries(PROTECTED_ROUTES)) {
    if (matchRoute(pattern, pathname)) {
      return config;
    }
  }
  return null;
}

/**
 * Simple route pattern matching
 */
function matchRoute(pattern: string, pathname: string): boolean {
  const patternParts = pattern.split('/');
  const pathParts = pathname.split('/');
  
  if (patternParts.length !== pathParts.length) {
    return false;
  }
  
  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i];
    const pathPart = pathParts[i];
    
    if (patternPart.startsWith(':')) {
      // Dynamic segment, matches any value
      continue;
    }
    
    if (patternPart !== pathPart) {
      return false;
    }
  }
  
  return true;
}

/**
 * Check permissions for a specific route
 */
async function checkRoutePermission(
  req: NextRequest,
  routeConfig: { resource: ResourceType; action: Action; extractContext?: (req: NextRequest) => { orgId?: string; workspaceId?: string; projectId?: string } }
): Promise<boolean> {
  try {
    // Get user with roles
    const user = await getCurrentUserWithRoles();
    if (!user) return false;
    
    // Determine action from HTTP method or use route default
    const httpMethod = req.method;
    const action = METHOD_TO_ACTION[httpMethod] || routeConfig.action;
    
    // Extract context from URL
    let context: { orgId?: string; workspaceId?: string; projectId?: string } = {};
    if (routeConfig.extractContext) {
      context = routeConfig.extractContext(req);
    }
    
    // Create permission context
    const permissionContext = await createPermissionContext(
      context.orgId,
      context.workspaceId,
      context.projectId
    );
    
    if (!permissionContext) return false;
    
    // Check permission
    const result = await checkPermission(
      permissionContext,
      routeConfig.resource,
      action
    );
    
    return result.allowed;
  } catch (error) {
    console.error('Error checking route permission:', error);
    return false;
  }
}

/**
 * Helper function to require specific permission in route handlers
 */
export async function requirePermission(
  resource: ResourceType,
  action: Action,
  context?: { orgId?: string; workspaceId?: string; projectId?: string; resourceData?: Record<string, unknown> }
): Promise<{ success: true } | { success: false; error: string; status: number }> {
  try {
    // Get user with roles
    const user = await getCurrentUserWithRoles();
    if (!user) {
      return { success: false, error: 'Unauthorized', status: 401 };
    }
    
    // Create permission context
    const permissionContext = await createPermissionContext(
      context?.orgId,
      context?.workspaceId,
      context?.projectId
    );
    
    if (!permissionContext) {
      return { success: false, error: 'Unable to create permission context', status: 500 };
    }
    
    // Check permission
    const result = await checkPermission(
      permissionContext,
      resource,
      action,
      context?.resourceData
    );
    
    if (!result.allowed) {
      return { 
        success: false, 
        error: result.reason || 'Insufficient permissions', 
        status: 403 
      };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error requiring permission:', error);
    return { success: false, error: 'Permission check failed', status: 500 };
  }
}

/**
 * Helper function for Next.js API routes to check permissions
 */
export async function withPermission<T extends Record<string, unknown>>(
  resource: ResourceType,
  action: Action,
  context?: { orgId?: string; workspaceId?: string; projectId?: string; resourceData?: T }
) {
  const result = await requirePermission(resource, action, context);
  
  if (!result.success) {
    throw new Error(`Permission denied: ${result.error}`);
  }
  
  return result;
}

/**
 * Decorator for API route handlers to require permissions
 */
export function requirePermissions(
  resource: ResourceType,
  action: Action,
  extractContext?: (req: NextRequest) => { orgId?: string; workspaceId?: string; projectId?: string }
) {
  return function (target: object, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: unknown[]) {
      const req = args[0] as NextRequest;
      
      let context: { orgId?: string; workspaceId?: string; projectId?: string } = {};
      if (extractContext) {
        context = extractContext(req);
      }
      
      const permissionResult = await requirePermission(resource, action, context);
      if (!permissionResult.success) {
        return NextResponse.json(
          { error: permissionResult.error },
          { status: permissionResult.status }
        );
      }
      
      return method.apply(this, args);
    };
  };
}
