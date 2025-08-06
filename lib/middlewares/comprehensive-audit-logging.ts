/**
 * Comprehensive Audit Logging Middleware
 * Integrates all logging systems for complete user action and audit tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import { withUserActionAudit, logAuthenticationEvent, logDataAccessEvent } from '@/lib/middlewares/user-action-audit';
import { userActionLogger, logUserAction, logFailedUserAction } from '@/lib/services/user-action-logger';
import { performanceMetrics, recordApiRequest } from '@/lib/services/performance-metrics';
import { trackApiError } from '@/lib/services/error-tracking';
import { setupGlobalErrorHandling } from '@/lib/services/error-tracking';
import { getLogger } from '@/lib/utils/logging';
import { v4 as uuidv4 } from 'uuid';

const logger = getLogger('COMPREHENSIVE_AUDIT');

// Initialize global error handling
setupGlobalErrorHandling();

/**
 * Comprehensive audit logging middleware that combines all logging systems
 */
export function withComprehensiveAuditLogging<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const startTime = Date.now();
    const requestId = uuidv4();
    const timestamp = new Date();
    
    // Extract request context
    const context = {
      requestId,
      method: request.method,
      url: request.url,
      pathname: new URL(request.url).pathname,
      ip: extractClientIP(request),
      userAgent: request.headers.get('user-agent') || undefined,
      timestamp,
      userId: await extractUserIdFromRequest(request),
      sessionId: request.cookies.get('session_id')?.value
    };

    // Add request ID to headers for downstream services
    const requestWithContext = new NextRequest(request, {
      headers: {
        ...Object.fromEntries(request.headers.entries()),
        'x-request-id': requestId,
        'x-audit-timestamp': timestamp.toISOString()
      }
    });

    try {
      // Log request start
      logger.info(`Request started: ${context.method} ${context.pathname}`, {
        requestId,
        userId: context.userId,
        sessionId: context.sessionId,
        ip: context.ip,
        userAgent: context.userAgent,
        url: context.url
      });

      // Execute the handler
      const response = await handler(requestWithContext, ...args);
      const duration = Date.now() - startTime;
      const statusCode = response.status;
      const success = statusCode < 400;

      // Determine action and resource from path
      const { action, resource } = parseActionFromPath(context.pathname, context.method);

      // Log successful user action if user is authenticated
      if (context.userId && context.pathname.startsWith('/api/')) {
        await logUserAction(
          {
            userId: context.userId,
            sessionId: context.sessionId,
            requestId,
            ip: context.ip,
            userAgent: context.userAgent,
            timestamp
          },
          {
            action,
            resource,
            method: context.method,
            url: context.url,
            statusCode,
            duration,
            success,
            metadata: {
              requestSize: getRequestSize(request),
              responseSize: getResponseSize(response)
            }
          }
        );
      }

      // Record API request metrics
      recordApiRequest(
        context.method,
        context.pathname,
        statusCode,
        duration,
        {
          responseSize: getResponseSize(response),
          requestSize: getRequestSize(request),
          userId: context.userId,
          requestId
        }
      );

      // Log request completion
      logger.info(`Request completed: ${context.method} ${context.pathname} - ${statusCode}`, {
        requestId,
        userId: context.userId,
        sessionId: context.sessionId,
        statusCode,
        duration,
        success,
        ip: context.ip
      });

      // Add response headers with audit information
      response.headers.set('x-request-id', requestId);
      response.headers.set('x-response-time', duration.toString());
      response.headers.set('x-audit-logged', 'true');

      return response;

    } catch (error) {
      const duration = Date.now() - startTime;
      const { action, resource } = parseActionFromPath(context.pathname, context.method);

      // Track the API error
      const errorId = await trackApiError(
        error,
        {
          method: context.method,
          url: context.url,
          userId: context.userId,
          sessionId: context.sessionId,
          ip: context.ip,
          userAgent: context.userAgent
        },
        {
          statusCode: 500
        }
      );

      // Log failed user action if user is authenticated
      if (context.userId && context.pathname.startsWith('/api/')) {
        await logFailedUserAction(
          {
            userId: context.userId,
            sessionId: context.sessionId,
            requestId,
            ip: context.ip,
            userAgent: context.userAgent,
            timestamp
          },
          {
            action,
            resource,
            method: context.method,
            url: context.url,
            statusCode: 500,
            duration,
            success: false,
            metadata: {
              errorId,
              requestSize: getRequestSize(request)
            }
          },
          error as Error
        );
      }

      // Record failed API request metrics
      recordApiRequest(
        context.method,
        context.pathname,
        500,
        duration,
        {
          requestSize: getRequestSize(request),
          userId: context.userId,
          requestId
        }
      );

      // Log request failure
      logger.error(`Request failed: ${context.method} ${context.pathname}`, error as Error, {
        requestId,
        userId: context.userId,
        sessionId: context.sessionId,
        duration,
        ip: context.ip,
        errorId
      });

      throw error;
    }
  };
}

/**
 * Authentication-specific audit logging middleware
 */
export function withAuthenticationAuditLogging<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return withComprehensiveAuditLogging(async (request: NextRequest, ...args: T) => {
    const context = {
      requestId: request.headers.get('x-request-id') || uuidv4(),
      ip: extractClientIP(request),
      userAgent: request.headers.get('user-agent') || undefined,
      timestamp: new Date()
    };

    try {
      const response = await handler(request, ...args);
      
      // Check if this is a login attempt
      if (request.nextUrl.pathname.includes('/login') && request.method === 'POST') {
        const responseData = await response.clone().json().catch(() => ({}));
        
        if (response.status === 200 && responseData.success) {
          // Successful login
          const sessionId = response.headers.get('set-cookie')?.match(/session_id=([^;]+)/)?.[1];
          const userId = responseData.userId || 'unknown';
          
          await logAuthenticationEvent(
            'login',
            {
              userId,
              sessionId,
              requestId: context.requestId,
              ip: context.ip,
              userAgent: context.userAgent,
              timestamp: context.timestamp
            },
            {
              method: 'password',
              provider: 'local'
            }
          );
        } else {
          // Failed login
          await logAuthenticationEvent(
            'login_failed',
            {
              userId: 'unknown',
              requestId: context.requestId,
              ip: context.ip,
              userAgent: context.userAgent,
              timestamp: context.timestamp
            },
            {
              reason: responseData.message || 'Invalid credentials',
              method: 'password',
              provider: 'local'
            }
          );
        }
      }

      // Check if this is a logout
      if (request.nextUrl.pathname.includes('/logout')) {
        const sessionId = request.cookies.get('session_id')?.value;
        const userId = await extractUserIdFromRequest(request);
        
        if (userId) {
          await logAuthenticationEvent(
            'logout',
            {
              userId,
              sessionId,
              requestId: context.requestId,
              ip: context.ip,
              userAgent: context.userAgent,
              timestamp: context.timestamp
            }
          );
        }
      }

      return response;
    } catch (error) {
      // Log authentication error
      await logAuthenticationEvent(
        'login_failed',
        {
          userId: 'unknown',
          requestId: context.requestId,
          ip: context.ip,
          userAgent: context.userAgent,
          timestamp: context.timestamp
        },
        {
          reason: (error as Error).message,
          method: 'password',
          provider: 'local'
        }
      );

      throw error;
    }
  });
}

/**
 * Data access audit logging middleware for sensitive operations
 */
export function withDataAccessAuditLogging<T extends any[]>(
  resourceType: string,
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return withComprehensiveAuditLogging(async (request: NextRequest, ...args: T) => {
    const userId = await extractUserIdFromRequest(request);
    const sessionId = request.cookies.get('session_id')?.value;
    const requestId = request.headers.get('x-request-id') || uuidv4();
    
    if (!userId) {
      return handler(request, ...args);
    }

    const context = {
      userId,
      sessionId,
      requestId,
      ip: extractClientIP(request),
      userAgent: request.headers.get('user-agent') || undefined,
      timestamp: new Date()
    };

    // Determine operation type from HTTP method
    const operation = getOperationFromMethod(request.method);
    
    // Extract resource ID from URL if available
    const resourceId = extractResourceIdFromUrl(request.nextUrl.pathname);

    try {
      // Get request body for create/update operations
      let requestBody;
      if (request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH') {
        try {
          requestBody = await request.clone().json();
        } catch {
          // Not JSON or empty body
        }
      }

      const response = await handler(request, ...args);
      
      // Get response data for logging
      let responseData;
      try {
        responseData = await response.clone().json();
      } catch {
        // Not JSON response
      }

      // Log data access event
      await logDataAccessEvent(
        context,
        operation,
        resourceType,
        resourceId,
        {
          fields: requestBody ? Object.keys(requestBody) : undefined,
          newValues: operation === 'create' || operation === 'update' ? requestBody : undefined,
          metadata: {
            statusCode: response.status,
            responseHasData: !!responseData,
            requestSize: getRequestSize(request),
            responseSize: getResponseSize(response)
          }
        }
      );

      return response;
    } catch (error) {
      // Log failed data access
      await logDataAccessEvent(
        context,
        operation,
        resourceType,
        resourceId,
        {
          metadata: {
            error: (error as Error).message,
            failed: true
          }
        }
      );

      throw error;
    }
  });
}

/**
 * Extract client IP from request headers
 */
function extractClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  return request.headers.get('x-real-ip') || 
         request.headers.get('cf-connecting-ip') || 
         request.headers.get('x-client-ip') || 
         'unknown';
}

/**
 * Extract user ID from request (placeholder - implement based on your auth system)
 */
async function extractUserIdFromRequest(request: NextRequest): Promise<string | undefined> {
  // This would typically involve JWT decoding or session lookup
  // For now, return undefined - implement based on your authentication system
  const sessionId = request.cookies.get('session_id')?.value;
  if (sessionId) {
    // TODO: Implement session lookup to get user ID
    return undefined;
  }
  return undefined;
}

/**
 * Parse action and resource from API path
 */
function parseActionFromPath(pathname: string, method: string): { action: string; resource: string } {
  const pathParts = pathname.split('/').filter(Boolean);
  
  if (pathParts[0] === 'api' && pathParts[1] === 'v1') {
    const resource = pathParts[2] || 'unknown';
    let action = method.toLowerCase();
    
    // Determine specific action based on method and path structure
    switch (method) {
      case 'GET':
        action = pathParts[3] ? 'read_specific' : 'read_list';
        break;
      case 'POST':
        action = 'create';
        break;
      case 'PUT':
      case 'PATCH':
        action = 'update';
        break;
      case 'DELETE':
        action = 'delete';
        break;
    }
    
    return { action, resource };
  }
  
  return { action: method.toLowerCase(), resource: 'unknown' };
}

/**
 * Get operation type from HTTP method
 */
function getOperationFromMethod(method: string): 'read' | 'create' | 'update' | 'delete' {
  switch (method) {
    case 'GET':
      return 'read';
    case 'POST':
      return 'create';
    case 'PUT':
    case 'PATCH':
      return 'update';
    case 'DELETE':
      return 'delete';
    default:
      return 'read';
  }
}

/**
 * Extract resource ID from URL path
 */
function extractResourceIdFromUrl(pathname: string): string | undefined {
  const pathParts = pathname.split('/').filter(Boolean);
  
  // Look for ID-like patterns (numbers or UUIDs)
  for (const part of pathParts) {
    if (/^\d+$/.test(part) || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(part)) {
      return part;
    }
  }
  
  return undefined;
}

/**
 * Get request size from headers
 */
function getRequestSize(request: NextRequest): number | undefined {
  const contentLength = request.headers.get('content-length');
  return contentLength ? parseInt(contentLength, 10) : undefined;
}

/**
 * Get response size from headers
 */
function getResponseSize(response: NextResponse): number | undefined {
  const contentLength = response.headers.get('content-length');
  return contentLength ? parseInt(contentLength, 10) : undefined;
}

// Export convenience functions for easy integration
export {
  logUserAction,
  logFailedUserAction,
  logAuthenticationEvent,
  logDataAccessEvent,
  recordApiRequest,
  trackApiError,
  performanceMetrics,
  userActionLogger
};