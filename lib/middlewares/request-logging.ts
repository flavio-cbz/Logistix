/**
 * Request Logging Middleware
 * Logs all HTTP requests and responses with performance metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createRequestLogger, apiRequestLogger } from '@/lib/utils/logging';

interface RequestLogData {
  requestId: string;
  method: string;
  url: string;
  userAgent?: string;
  ip?: string;
  startTime: number;
  userId?: string;
}

/**
 * Middleware function to log HTTP requests
 */
export function withRequestLogging<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const requestId = uuidv4();
    const startTime = Date.now();
    
    // Extract request information
    const logData: RequestLogData = {
      requestId,
      method: request.method,
      url: request.url,
      userAgent: request.headers.get('user-agent') || undefined,
      ip: request.headers.get('x-forwarded-for') || 
          request.headers.get('x-real-ip') || 
          'unknown',
      startTime,
      userId: extractUserIdFromRequest(request)
    };

    // Create request-scoped logger
    const logger = createRequestLogger(requestId, logData.userId);

    // Log incoming request
    logger.http(`Incoming ${logData.method} request`, {
      url: logData.url,
      userAgent: logData.userAgent,
      ip: logData.ip,
      headers: sanitizeHeaders(request.headers)
    });

    try {
      // Add request ID to headers for downstream services
      const requestWithId = new NextRequest(request, {
        headers: {
          ...Object.fromEntries(request.headers.entries()),
          'x-request-id': requestId
        }
      });

      // Execute the handler
      const response = await handler(requestWithId, ...args);
      
      // Calculate duration
      const duration = Date.now() - startTime;
      
      // Log successful response
      apiRequestLogger.logResponse(
        logData.method,
        logData.url,
        response.status,
        duration,
        getResponseSize(response)
      );

      // Add request ID to response headers
      response.headers.set('x-request-id', requestId);
      
      return response;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Log error
      apiRequestLogger.logError(
        logData.method,
        logData.url,
        error as Error,
        duration
      );
      
      // Re-throw the error
      throw error;
    }
  };
}

/**
 * Extract user ID from request (from JWT token, session, etc.)
 */
function extractUserIdFromRequest(request: NextRequest): string | undefined {
  try {
    // Try to extract from Authorization header
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      // This would need to be implemented based on your auth system
      // For now, return undefined
      return undefined;
    }

    // Try to extract from session cookie
    const sessionCookie = request.cookies.get('session');
    if (sessionCookie) {
      // This would need to be implemented based on your session system
      return undefined;
    }

    return undefined;
  } catch (error) {
    return undefined;
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
    'x-session-token'
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
 * Get response size if available
 */
function getResponseSize(response: NextResponse): number | undefined {
  const contentLength = response.headers.get('content-length');
  return contentLength ? parseInt(contentLength, 10) : undefined;
}

/**
 * Database operation logging decorator
 */
export function withDatabaseLogging<T extends any[], R>(
  operation: string,
  fn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    const startTime = Date.now();
    const logger = createRequestLogger(uuidv4());

    try {
      logger.debug(`Starting database operation: ${operation}`, {
        operation,
        args: args.length
      });

      const result = await fn(...args);
      const duration = Date.now() - startTime;

      logger.performance(`DB_${operation}`, duration, {
        success: true,
        resultType: typeof result
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error(`Database operation failed: ${operation}`, error as Error, {
        operation,
        duration,
        success: false
      });

      throw error;
    }
  };
}

/**
 * Service operation logging decorator
 */
export function withServiceLogging<T extends any[], R>(
  serviceName: string,
  operationName: string,
  fn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    const startTime = Date.now();
    const logger = createRequestLogger(uuidv4());

    try {
      logger.debug(`Starting ${serviceName} operation: ${operationName}`, {
        service: serviceName,
        operation: operationName,
        args: args.length
      });

      const result = await fn(...args);
      const duration = Date.now() - startTime;

      logger.performance(`${serviceName}_${operationName}`, duration, {
        service: serviceName,
        operation: operationName,
        success: true,
        resultType: typeof result
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error(`${serviceName} operation failed: ${operationName}`, error as Error, {
        service: serviceName,
        operation: operationName,
        duration,
        success: false
      });

      throw error;
    }
  };
}

/**
 * Performance monitoring decorator for any function
 */
export function withPerformanceLogging<T extends any[], R>(
  operationName: string,
  fn: (...args: T) => R | Promise<R>,
  threshold: number = 1000 // Log if operation takes longer than 1 second
) {
  return async (...args: T): Promise<R> => {
    const startTime = Date.now();
    const logger = createRequestLogger(uuidv4());

    try {
      const result = await fn(...args);
      const duration = Date.now() - startTime;

      if (duration > threshold) {
        logger.warn(`Slow operation detected: ${operationName}`, {
          operation: operationName,
          duration,
          threshold,
          args: args.length
        });
      }

      logger.performance(operationName, duration, {
        success: true,
        slow: duration > threshold
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error(`Operation failed: ${operationName}`, error as Error, {
        operation: operationName,
        duration
      });

      throw error;
    }
  };
}