/**
 * Enhanced Request Logging Middleware
 * Comprehensive logging for all API requests and responses with performance metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { 
  apiRequestLogger, 
  createRequestLogger, 
  PerformanceTimer,
  apiLogger 
} from '@/lib/utils/logging';
import { auditLogger } from '@/lib/services/audit-logger';

interface RequestContext {
  requestId: string;
  method: string;
  url: string;
  pathname: string;
  userAgent?: string;
  ip?: string;
  startTime: number;
  userId?: string;
  sessionId?: string;
  contentLength?: number;
}

interface ResponseMetrics {
  statusCode: number;
  duration: number;
  responseSize?: number;
  success: boolean;
  error?: Error;
}

/**
 * Enhanced middleware function to log HTTP requests with comprehensive metrics
 */
export function withEnhancedRequestLogging<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const requestId = uuidv4();
    const startTime = Date.now();
    
    // Extract comprehensive request information
    const context: RequestContext = {
      requestId,
      method: request.method,
      url: request.url,
      pathname: new URL(request.url).pathname,
      userAgent: request.headers.get('user-agent') || undefined,
      ip: extractClientIP(request),
      startTime,
      userId: await extractUserIdFromRequest(request),
      sessionId: extractSessionId(request),
      contentLength: getContentLength(request)
    };

    // Create request-scoped logger
    const logger = createRequestLogger(requestId, context.userId);
    const timer = new PerformanceTimer(`API_${context.method}_${context.pathname}`, logger);

    // Log incoming request with detailed information
    logger.http(`${context.method} ${context.pathname}`, {
      url: context.url,
      userAgent: context.userAgent,
      ip: context.ip,
      contentLength: context.contentLength,
      headers: sanitizeHeaders(request.headers),
      query: extractQueryParams(request.url),
      isApiRoute: context.pathname.startsWith('/api/'),
      timestamp: new Date().toISOString()
    });

    // Log request body for non-GET requests (with size limits)
    if (context.method !== 'GET' && context.contentLength && context.contentLength > 0) {
      try {
        const body = await logRequestBody(request, logger);
        // Clone request with logged body for handler
        request = new NextRequest(request, {
          body: body
        });
      } catch (error) {
        logger.warn('Failed to log request body', { error: (error as Error).message });
      }
    }

    try {
      // Add request context to headers for downstream services
      const requestWithContext = addContextHeaders(request, context);

      // Execute the handler
      const response = await handler(requestWithContext, ...args);
      
      // Calculate response metrics
      const metrics: ResponseMetrics = {
        statusCode: response.status,
        duration: Date.now() - startTime,
        responseSize: getResponseSize(response),
        success: response.status < 400
      };
      
      // Log successful response with metrics
      logResponse(context, metrics, logger, timer);

      // Log user action for audit trail
      if (context.userId && context.pathname.startsWith('/api/')) {
        await auditLogger.logUserAction(
          context.userId,
          {
            action: `API_${context.method}`,
            resource: context.pathname,
            details: {
              statusCode: metrics.statusCode,
              duration: metrics.duration,
              success: metrics.success
            }
          },
          {
            sessionId: context.sessionId,
            ip: context.ip,
            userAgent: context.userAgent,
            requestId: context.requestId
          }
        );
      }

      // Add response context headers
      return addResponseHeaders(response, context, metrics);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const metrics: ResponseMetrics = {
        statusCode: 500,
        duration,
        success: false,
        error: error as Error
      };
      
      // Log error with comprehensive context
      logError(context, metrics, logger, timer);
      
      // Log failed user action for audit trail
      if (context.userId && context.pathname.startsWith('/api/')) {
        await auditLogger.logFailedUserAction(
          context.userId,
          {
            action: `API_${context.method}`,
            resource: context.pathname,
            details: {
              duration,
              error: (error as Error).message
            }
          },
          error as Error,
          {
            sessionId: context.sessionId,
            ip: context.ip,
            userAgent: context.userAgent,
            requestId: context.requestId
          }
        );
      }
      
      // Re-throw the error
      throw error;
    }
  };
}

/**
 * Extract client IP address from request headers
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
 * Extract user ID from request (JWT token, session cookie, etc.)
 */
async function extractUserIdFromRequest(request: NextRequest): Promise<string | undefined> {
  try {
    // Try to extract from Authorization header (JWT)
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      // This would need JWT decoding - placeholder for now
      return undefined;
    }

    // Try to extract from session cookie
    const sessionCookie = request.cookies.get('session_id');
    if (sessionCookie?.value) {
      // This would need session lookup - placeholder for now
      return undefined;
    }

    return undefined;
  } catch (error) {
    return undefined;
  }
}

/**
 * Extract session ID from request cookies
 */
function extractSessionId(request: NextRequest): string | undefined {
  return request.cookies.get('session_id')?.value;
}

/**
 * Get content length from request headers
 */
function getContentLength(request: NextRequest): number | undefined {
  const contentLength = request.headers.get('content-length');
  return contentLength ? parseInt(contentLength, 10) : undefined;
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
 * Log request body with size limits and sanitization
 */
async function logRequestBody(request: NextRequest, logger: any): Promise<string | undefined> {
  try {
    const contentType = request.headers.get('content-type') || '';
    const contentLength = getContentLength(request);
    
    // Skip logging for large payloads
    if (contentLength && contentLength > 10 * 1024) { // 10KB limit
      return undefined;
    }
    
    // Only log JSON and form data
    if (contentType.includes('application/json') || contentType.includes('application/x-www-form-urlencoded')) {
      const body = await request.text();
      
      // Sanitize sensitive data in JSON
      if (contentType.includes('application/json')) {
        try {
          const parsed = JSON.parse(body);
          const sanitized = sanitizeRequestBody(parsed);
        } catch {
        }
      } else {
      }
      
      return body;
    }
    
    return undefined;
  } catch (error) {
    logger.warn('Failed to read request body', { error: (error as Error).message });
    return undefined;
  }
}

/**
 * Sanitize request body to remove sensitive information
 */
function sanitizeRequestBody(body: any): any {
  if (typeof body !== 'object' || body === null) {
    return body;
  }
  
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth', 'credential'];
  const sanitized = { ...body };
  
  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

/**
 * Get response size if available
 */
function getResponseSize(response: NextResponse): number | undefined {
  const contentLength = response.headers.get('content-length');
  return contentLength ? parseInt(contentLength, 10) : undefined;
}

/**
 * Add context headers to request
 */
function addContextHeaders(request: NextRequest, context: RequestContext): NextRequest {
  const headers = new Headers(request.headers);
  headers.set('x-request-id', context.requestId);
  headers.set('x-request-start-time', context.startTime.toString());
  
  return new NextRequest(request, { headers });
}

/**
 * Add response headers with context information
 */
function addResponseHeaders(response: NextResponse, context: RequestContext, metrics: ResponseMetrics): NextResponse {
  response.headers.set('x-request-id', context.requestId);
  response.headers.set('x-response-time', metrics.duration.toString());
  response.headers.set('x-request-timestamp', new Date(context.startTime).toISOString());
  
  return response;
}

/**
 * Log successful response
 */
function logResponse(context: RequestContext, metrics: ResponseMetrics, logger: any, timer: PerformanceTimer): void {
  // Log to API request logger
  apiRequestLogger.logResponse(
    context.method,
    context.pathname,
    metrics.statusCode,
    metrics.duration,
    metrics.responseSize
  );
  
  // End performance timer
  timer.end({
    statusCode: metrics.statusCode,
    success: metrics.success,
    responseSize: metrics.responseSize,
    ip: context.ip,
    userAgent: context.userAgent
  });
  
  // Log response details
  logger.http(`${context.method} ${context.pathname} - ${metrics.statusCode}`, {
    statusCode: metrics.statusCode,
    duration: metrics.duration,
    responseSize: metrics.responseSize,
    success: metrics.success,
    requestId: context.requestId
  });
  
  // Log slow requests
  if (metrics.duration > 1000) {
    logger.warn(`Slow API request detected`, {
      method: context.method,
      pathname: context.pathname,
      duration: metrics.duration,
      statusCode: metrics.statusCode,
      threshold: 1000
    });
  }
}

/**
 * Log error response
 */
function logError(context: RequestContext, metrics: ResponseMetrics, logger: any, timer: PerformanceTimer): void {
  // Ensure we have an Error object to avoid runtime issues
  const err: Error = metrics.error ?? new Error('Unknown error');

  // Log to API request logger (guarded)
  try {
    apiRequestLogger.logError(
      context.method,
      context.pathname,
      err,
      metrics.duration
    );
  } catch {
    // swallow logger errors to avoid masking the original error
  }

  // End performance timer with error (guarded)
  try {
    timer.endWithError(err, {
      statusCode: metrics.statusCode,
      ip: context.ip,
      userAgent: context.userAgent
    });
  } catch {
    // ignore timer failures
  }

  // Log error details
  try {
    logger.error(`${context.method} ${context.pathname} - ERROR`, err, {
      statusCode: metrics.statusCode,
      duration: metrics.duration,
      requestId: context.requestId,
      url: context.url,
      ip: context.ip,
      userAgent: context.userAgent
    });
  } catch {
    // final fallback: do nothing if logging fails
  }
}

/**
 * Database operation logging wrapper for services
 */
export function withDatabaseOperationLogging<T extends any[], R>(
  operation: string,
  serviceName: string,
  fn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    const timer = new PerformanceTimer(`DB_${serviceName}_${operation}`, apiLogger);
    const logger = createRequestLogger(uuidv4());

    try {

      const result = await fn(...args);

      timer.end({
        service: serviceName,
        operation,
        success: true,
        resultType: typeof result
      });


      return result;
    } catch (error) {
      logger.error(`Database operation failed: ${serviceName}.${operation}`, error as Error, {
        service: serviceName,
        operation,
        success: false
      });

      timer.endWithError(error as Error, {
        service: serviceName,
        operation
      });
    }
  };
}

/**
 * Service method logging decorator
 */
export function logServiceMethod<T extends any[], R>(
  serviceName: string,
  methodName: string
) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: T): Promise<R> {
      const timer = new PerformanceTimer(`SERVICE_${serviceName}_${methodName}`, apiLogger);
      const logger = createRequestLogger(uuidv4());

      try {

        const result = await originalMethod.apply(this, args);

        timer.end({
          service: serviceName,
          method: methodName,
          success: true,
          resultType: typeof result
        });


        return result;
      } catch (error) {
        logger.error(`Service method failed: ${serviceName}.${methodName}`, error as Error, {
          service: serviceName,
          method: methodName,
          success: false
        });

        timer.endWithError(error as Error, {
          service: serviceName,
          method: methodName
        });
      }
    };

    return descriptor;
  };
}