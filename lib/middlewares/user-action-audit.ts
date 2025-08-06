/**
 * User Action Audit Middleware
 * Comprehensive tracking of user interactions for audit purposes
 */

import { NextRequest, NextResponse } from 'next/server';
import { auditLogger, auditUserAction, auditFailedUserAction } from '@/lib/services/audit-logger';
import { performanceLogger } from '@/lib/utils/logging';
import { v4 as uuidv4 } from 'uuid';

interface UserContext {
  userId?: string;
  sessionId?: string;
  ip: string;
  userAgent?: string;
  requestId: string;
}

interface ActionContext {
  method: string;
  pathname: string;
  resource: string;
  action: string;
  startTime: number;
}

/**
 * Extract user context from request
 */
async function extractUserContext(request: NextRequest): Promise<UserContext> {
  const requestId = uuidv4();
  const sessionId = request.cookies.get('session_id')?.value;
  const ip = extractClientIP(request);
  const userAgent = request.headers.get('user-agent') || undefined;
  
  // Extract user ID from session (this would need actual session lookup)
  let userId: string | undefined;
  if (sessionId) {
    try {
      // This would typically involve session lookup from database
      // For now, we'll extract from headers if available
      userId = request.headers.get('x-user-id') || undefined;
    } catch (error) {
      // Session lookup failed, continue without user ID
    }
  }

  return {
    userId,
    sessionId,
    ip,
    userAgent,
    requestId
  };
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
 * Determine action and resource from request
 */
function determineActionContext(request: NextRequest): ActionContext {
  const method = request.method;
  const pathname = new URL(request.url).pathname;
  
  // Parse resource and action from API path
  const pathParts = pathname.split('/').filter(Boolean);
  let resource = 'unknown';
  let action = method.toLowerCase();
  
  if (pathParts[0] === 'api' && pathParts[1] === 'v1') {
    resource = pathParts[2] || 'unknown';
    
    // Determine specific action based on method and path
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
      default:
        action = method.toLowerCase();
    }
  }
  
  return {
    method,
    pathname,
    resource,
    action,
    startTime: Date.now()
  };
}

/**
 * Extract request details for audit logging
 */
async function extractRequestDetails(request: NextRequest): Promise<Record<string, any>> {
  const details: Record<string, any> = {
    url: request.url,
    method: request.method,
    headers: sanitizeHeaders(request.headers),
    query: extractQueryParams(request.url)
  };

  // Add body for non-GET requests (with size limits)
  if (request.method !== 'GET') {
    try {
      const contentLength = request.headers.get('content-length');
      if (contentLength && parseInt(contentLength) < 10240) { // 10KB limit
        const body = await request.text();
        details.body = sanitizeRequestBody(body);
        
        // Recreate request with body for handler
        request = new NextRequest(request, { body });
      }
    } catch (error) {
      // Failed to read body, continue without it
    }
  }

  return details;
}

/**
 * Sanitize headers to remove sensitive information
 */
function sanitizeHeaders(headers: Headers): Record<string, string> {
  const sanitized: Record<string, string> = {};
  const sensitiveHeaders = [
    'authorization',
    'cookie',
    'x-api-key',
    'x-auth-token',
    'x-session-token',
    'x-csrf-token'
  ];

  headers.forEach((value, key) => {
    if (sensitiveHeaders.includes(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  });

  return sanitized;
}

/**
 * Extract query parameters from URL
 */
function extractQueryParams(url: string): Record<string, string> {
  try {
    const urlObj = new URL(url);
    const params: Record<string, string> = {};
    urlObj.searchParams.forEach((value, key) => {
      params[key] = value;
    });
    return params;
  } catch {
    return {};
  }
}

/**
 * Sanitize request body to remove sensitive information
 */
function sanitizeRequestBody(body: string): any {
  try {
    const parsed = JSON.parse(body);
    if (typeof parsed === 'object' && parsed !== null) {
      const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth', 'credential'];
      const sanitized = { ...parsed };
      
      for (const field of sensitiveFields) {
        if (field in sanitized) {
          sanitized[field] = '[REDACTED]';
        }
      }
      
      return sanitized;
    }
    return parsed;
  } catch {
    // Not JSON, return truncated string
    return body.length > 200 ? body.substring(0, 200) + '...' : body;
  }
}

/**
 * Middleware wrapper for user action audit logging
 */
export function withUserActionAudit<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const userContext = await extractUserContext(request);
    const actionContext = determineActionContext(request);
    
    // Add request ID to headers for downstream services
    const requestWithId = new NextRequest(request, {
      headers: {
        ...Object.fromEntries(request.headers.entries()),
        'x-request-id': userContext.requestId,
        'x-audit-enabled': 'true'
      }
    });

    try {
      // Extract request details for audit
      const requestDetails = await extractRequestDetails(requestWithId);
      
      // Log the start of user action
      performanceLogger.info(`User action started: ${actionContext.action} on ${actionContext.resource}`, {
        requestId: userContext.requestId,
        userId: userContext.userId,
        sessionId: userContext.sessionId,
        ip: userContext.ip,
        userAgent: userContext.userAgent,
        action: actionContext.action,
        resource: actionContext.resource,
        method: actionContext.method,
        pathname: actionContext.pathname
      });

      // Execute the handler
      const response = await handler(requestWithId, ...args);
      const duration = Date.now() - actionContext.startTime;
      
      // Log successful user action
      if (userContext.userId) {
        await auditUserAction(
          userContext.userId,
          {
            action: actionContext.action,
            resource: actionContext.resource,
            details: {
              ...requestDetails,
              statusCode: response.status,
              duration,
              success: response.status < 400
            }
          },
          {
            sessionId: userContext.sessionId,
            ip: userContext.ip,
            userAgent: userContext.userAgent,
            requestId: userContext.requestId
          }
        );
      }

      // Log performance metrics
      performanceLogger.performance(
        `${actionContext.action}_${actionContext.resource}`,
        duration,
        {
          statusCode: response.status,
          success: response.status < 400,
          userId: userContext.userId,
          sessionId: userContext.sessionId,
          requestId: userContext.requestId
        }
      );

      return response;
      
    } catch (error) {
      const duration = Date.now() - actionContext.startTime;
      
      // Log failed user action
      if (userContext.userId) {
        await auditFailedUserAction(
          userContext.userId,
          {
            action: actionContext.action,
            resource: actionContext.resource,
            details: {
              duration,
              error: (error as Error).message
            }
          },
          error as Error,
          {
            sessionId: userContext.sessionId,
            ip: userContext.ip,
            userAgent: userContext.userAgent,
            requestId: userContext.requestId
          }
        );
      }

      // Log error with detailed stack trace
      performanceLogger.error(
        `User action failed: ${actionContext.action} on ${actionContext.resource}`,
        error as Error,
        {
          duration,
          userId: userContext.userId,
          sessionId: userContext.sessionId,
          requestId: userContext.requestId,
          ip: userContext.ip,
          userAgent: userContext.userAgent,
          action: actionContext.action,
          resource: actionContext.resource,
          method: actionContext.method,
          pathname: actionContext.pathname,
          stack: (error as Error).stack
        }
      );

      throw error;
    }
  };
}

/**
 * Decorator for automatic user action audit logging on service methods
 */
export function auditUserActionMethod(
  resource: string,
  action?: string
) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const actionName = action || propertyName;

    descriptor.value = async function (...args: any[]): Promise<any> {
      const startTime = Date.now();
      const requestId = uuidv4();
      
      // Try to extract user context from arguments or this context
      const userId = extractUserIdFromContext(this, args);
      
      try {
        performanceLogger.info(`Service action started: ${actionName} on ${resource}`, {
          requestId,
          userId,
          service: target.constructor.name,
          method: propertyName,
          argsCount: args.length
        });

        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;

        // Log successful service action
        if (userId) {
          await auditUserAction(
            userId,
            {
              action: actionName,
              resource,
              details: {
                service: target.constructor.name,
                method: propertyName,
                duration,
                success: true,
                resultType: typeof result
              }
            },
            { requestId }
          );
        }

        performanceLogger.performance(
          `SERVICE_${resource}_${actionName}`,
          duration,
          {
            success: true,
            userId,
            service: target.constructor.name,
            method: propertyName,
            requestId
          }
        );

        return result;
        
      } catch (error) {
        const duration = Date.now() - startTime;

        // Log failed service action
        if (userId) {
          await auditFailedUserAction(
            userId,
            {
              action: actionName,
              resource,
              details: {
                service: target.constructor.name,
                method: propertyName,
                duration,
                success: false
              }
            },
            error as Error,
            { requestId }
          );
        }

        performanceLogger.error(
          `Service action failed: ${actionName} on ${resource}`,
          error as Error,
          {
            duration,
            userId,
            service: target.constructor.name,
            method: propertyName,
            requestId,
            stack: (error as Error).stack
          }
        );

        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Extract user ID from method context or arguments
 */
function extractUserIdFromContext(context: any, args: any[]): string | undefined {
  // Try to find user ID in various places
  if (context && context.userId) {
    return context.userId;
  }
  
  // Look for user ID in first argument (common pattern)
  if (args.length > 0 && typeof args[0] === 'string') {
    return args[0];
  }
  
  // Look for user ID in object arguments
  for (const arg of args) {
    if (arg && typeof arg === 'object' && arg.userId) {
      return arg.userId;
    }
  }
  
  return undefined;
}

/**
 * Log user login/logout events
 */
export async function logAuthenticationEvent(
  event: 'login' | 'logout' | 'login_failed',
  userId?: string,
  context: {
    ip?: string;
    userAgent?: string;
    sessionId?: string;
    reason?: string;
  } = {}
): Promise<void> {
  const severity = event === 'login_failed' ? 'medium' : 'low';
  
  await auditLogger.logSecurityEvent(
    {
      type: event === 'login_failed' ? 'failed_login' : event,
      severity,
      details: {
        event,
        reason: context.reason,
        timestamp: new Date().toISOString()
      }
    },
    {
      userId,
      ip: context.ip,
      userAgent: context.userAgent,
      sessionId: context.sessionId,
      requestId: uuidv4()
    }
  );
}

/**
 * Log data access events for sensitive operations
 */
export async function logDataAccessEvent(
  userId: string,
  operation: 'read' | 'create' | 'update' | 'delete',
  resource: string,
  resourceId?: string,
  context: {
    ip?: string;
    userAgent?: string;
    sessionId?: string;
    requestId?: string;
    details?: Record<string, any>;
  } = {}
): Promise<void> {
  await auditUserAction(
    userId,
    {
      action: `DATA_${operation.toUpperCase()}`,
      resource,
      resourceId,
      details: {
        operation,
        dataAccess: true,
        ...context.details
      }
    },
    {
      ip: context.ip,
      userAgent: context.userAgent,
      sessionId: context.sessionId,
      requestId: context.requestId || uuidv4()
    }
  );
}