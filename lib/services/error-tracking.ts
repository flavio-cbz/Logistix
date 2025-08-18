/**
 * Enhanced Error Tracking Service
 * Comprehensive error logging with detailed stack traces and context
 */

import { getLogger } from '@/lib/utils/logging';
import { auditLogger } from '@/lib/services/audit-logger';
import { performanceMetrics } from '@/lib/services/performance-metrics';
import { v4 as uuidv4 } from 'uuid';

// Garde pour s'assurer que les gestionnaires globaux ne sont attachés qu'une seule fois
let globalErrorHandlersAttached = false;

interface ErrorContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  ip?: string;
  userAgent?: string;
  url?: string;
  method?: string;
  timestamp: Date;
  environment: string;
  version?: string;
}

interface ErrorDetails {
  name: string;
  message: string;
  stack?: string;
  code?: string | number;
  statusCode?: number;
  cause?: Error;
  metadata?: Record<string, any>;
}

interface ErrorSummary {
  errorId: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  frequency: number;
  firstOccurrence: Date;
  lastOccurrence: Date;
  affectedUsers: Set<string>;
  contexts: ErrorContext[];
}

class ErrorTrackingService {
  private logger = getLogger('ERROR_TRACKING');
  private errorSummaries = new Map<string, ErrorSummary>();
  private recentErrors: Array<{ error: ErrorDetails; context: ErrorContext }> = [];
  private maxRecentErrors = 1000;

  /**
   * Track an error with comprehensive context and stack trace
   */
  async trackError(
    error: Error | unknown,
    context: Partial<ErrorContext> = {},
    metadata?: Record<string, any>
  ): Promise<string> {
    const errorId = uuidv4();
    const timestamp = new Date();
    
    // Extract error details
    const errorDetails = this.extractErrorDetails(error, metadata);
    
    // Build complete context
    const fullContext: ErrorContext = {
      ...context,
      timestamp,
      environment: process.env.NODE_ENV || 'development',
      version: process.env.APP_VERSION || 'unknown',
      requestId: context.requestId || uuidv4()
    };

    // Log the error with full details
    this.logger.error(`Error tracked: ${errorDetails.name}`, error as Error, {
      errorId,
      errorDetails,
      context: fullContext,
      stackTrace: errorDetails.stack,
      metadata
    });

    // Store in recent errors
    this.recentErrors.push({ error: errorDetails, context: fullContext });
    if (this.recentErrors.length > this.maxRecentErrors) {
      this.recentErrors = this.recentErrors.slice(-this.maxRecentErrors);
    }

    // Update error summary
    this.updateErrorSummary(errorDetails, fullContext);

    // Record performance metric
    performanceMetrics.recordMetric(
      'error_occurrence',
      1,
      'count',
      {
        errorType: errorDetails.name,
        severity: this.determineSeverity(errorDetails).toString(),
        environment: fullContext.environment
      },
      {
        errorId,
        userId: fullContext.userId,
        requestId: fullContext.requestId
      }
    );

    // Log to audit trail if user is involved
    if (fullContext.userId) {
      await auditLogger.logSystemEvent(
        'ERROR_OCCURRED',
        {
          errorId,
          errorType: errorDetails.name,
          message: errorDetails.message,
          severity: this.determineSeverity(errorDetails),
          context: fullContext
        },
        false,
        error as Error
      );
    }

    // Check if this is a security-related error
    if (this.isSecurityError(errorDetails)) {
      await this.handleSecurityError(errorDetails, fullContext, errorId);
    }

    // Check if this is a critical error that needs immediate attention
    if (this.determineSeverity(errorDetails) === 'critical') {
      await this.handleCriticalError(errorDetails, fullContext, errorId);
    }

    return errorId;
  }

  /**
   * Track API error with request context
   */
  async trackApiError(
    error: Error | unknown,
    request: {
      method: string;
      url: string;
      headers?: Record<string, string>;
      body?: any;
      userId?: string;
      sessionId?: string;
      ip?: string;
      userAgent?: string;
    },
    response?: {
      statusCode: number;
      headers?: Record<string, string>;
    }
  ): Promise<string> {
    return this.trackError(error, {
      userId: request.userId,
      sessionId: request.sessionId,
      ip: request.ip,
      userAgent: request.userAgent,
      url: request.url,
      method: request.method
    }, {
      requestHeaders: this.sanitizeHeaders(request.headers),
      requestBody: this.sanitizeRequestBody(request.body),
      responseStatusCode: response?.statusCode,
      responseHeaders: this.sanitizeHeaders(response?.headers)
    });
  }

  /**
   * Track database error with query context
   */
  async trackDatabaseError(
    error: Error | unknown,
    context: {
      query?: string;
      params?: any[];
      operation: string;
      table?: string;
      userId?: string;
      requestId?: string;
    }
  ): Promise<string> {
    return this.trackError(error, {
      userId: context.userId,
      requestId: context.requestId
    }, {
      databaseOperation: context.operation,
      table: context.table,
      query: context.query ? this.sanitizeQuery(context.query) : undefined,
      paramCount: context.params?.length,
      queryLength: context.query?.length
    });
  }

  /**
   * Track external service error
   */
  async trackExternalServiceError(
    error: Error | unknown,
    service: string,
    operation: string,
    context: {
      url?: string;
      method?: string;
      statusCode?: number;
      responseTime?: number;
      userId?: string;
      requestId?: string;
    }
  ): Promise<string> {
    return this.trackError(error, {
      userId: context.userId,
      requestId: context.requestId
    }, {
      externalService: service,
      serviceOperation: operation,
      serviceUrl: context.url,
      serviceMethod: context.method,
      serviceStatusCode: context.statusCode,
      serviceResponseTime: context.responseTime
    });
  }

  /**
   * Get error statistics for monitoring
   */
  getErrorStatistics(timeRange: { start: Date; end: Date }): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    errorsBySeverity: Record<string, number>;
    topErrors: Array<{ type: string; count: number; lastOccurrence: Date }>;
    affectedUsers: number;
    criticalErrors: number;
  } {
    const filteredErrors = this.recentErrors.filter(
      ({ context }) => context.timestamp >= timeRange.start && context.timestamp <= timeRange.end
    );

    const errorsByType: Record<string, number> = {};
    const errorsBySeverity: Record<string, number> = {};
    const affectedUsers = new Set<string>();
    let criticalErrors = 0;

    filteredErrors.forEach(({ error, context }) => {
      // Count by type
      errorsByType[error.name] = (errorsByType[error.name] || 0) + 1;

      // Count by severity
      const severity = this.determineSeverity(error);
      errorsBySeverity[severity] = (errorsBySeverity[severity] || 0) + 1;

      // Track affected users
      if (context.userId) {
        affectedUsers.add(context.userId);
      }

      // Count critical errors
      if (severity === 'critical') {
        criticalErrors++;
      }
    });

    // Get top errors
    const topErrors = Object.entries(errorsByType)
      .map(([type, count]) => ({
        type,
        count,
        lastOccurrence: filteredErrors
          .filter(({ error }) => error.name === type)
          .sort((a, b) => b.context.timestamp.getTime() - a.context.timestamp.getTime())[0]
          ?.context.timestamp || new Date()
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalErrors: filteredErrors.length,
      errorsByType,
      errorsBySeverity,
      topErrors,
      affectedUsers: affectedUsers.size,
      criticalErrors
    };
  }

  /**
   * Get recent errors for debugging
   */
  getRecentErrors(limit: number = 50): Array<{ error: ErrorDetails; context: ErrorContext }> {
    return this.recentErrors
      .sort((a, b) => b.context.timestamp.getTime() - a.context.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Extract detailed error information
   */
  private extractErrorDetails(error: Error | unknown, metadata?: Record<string, any>): ErrorDetails {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
        statusCode: (error as any).statusCode,
        cause: (error as any).cause,
        metadata
      };
    }

    // Handle non-Error objects
    return {
      name: 'UnknownError',
      message: String(error),
      stack: new Error().stack,
      metadata
    };
  }

  /**
   * Determine error severity based on error details
   */
  private determineSeverity(error: ErrorDetails): 'low' | 'medium' | 'high' | 'critical' {
    // Critical errors
    if (
      error.name === 'SecurityError' ||
      error.name === 'AuthenticationError' ||
      error.name === 'AuthorizationError' ||
      error.statusCode === 500 ||
      error.message.toLowerCase().includes('database') ||
      error.message.toLowerCase().includes('connection')
    ) {
      return 'critical';
    }

    // High severity errors
    if (
      error.statusCode === 401 ||
      error.statusCode === 403 ||
      error.statusCode === 404 ||
      error.name === 'ValidationError' ||
      error.name === 'TypeError'
    ) {
      return 'high';
    }

    // Medium severity errors
    if (
      error.statusCode === 400 ||
      error.statusCode === 422 ||
      error.name === 'ReferenceError'
    ) {
      return 'medium';
    }

    // Default to low severity
    return 'low';
  }

  /**
   * Check if error is security-related
   */
  private isSecurityError(error: ErrorDetails): boolean {
    const securityKeywords = [
      'authentication',
      'authorization',
      'permission',
      'access denied',
      'unauthorized',
      'forbidden',
      'security',
      'csrf',
      'xss',
      'injection',
      'malicious'
    ];

    const errorText = `${error.name} ${error.message}`.toLowerCase();
    return securityKeywords.some(keyword => errorText.includes(keyword));
  }

  /**
   * Handle security-related errors
   */
  private async handleSecurityError(
    error: ErrorDetails,
    context: ErrorContext,
    errorId: string
  ): Promise<void> {
    this.logger.warn(`Security error detected: ${error.name}`, {
      errorId,
      errorDetails: error,
      context,
      severity: 'high',
      requiresInvestigation: true
    });

    // Log to audit trail as security event
    await auditLogger.logSecurityEvent(
      {
        type: 'suspicious_activity',
        severity: 'high',
        details: {
          errorId,
          errorType: error.name,
          message: error.message,
          context
        }
      },
      {
        userId: context.userId,
        sessionId: context.sessionId,
        ip: context.ip,
        userAgent: context.userAgent,
        requestId: context.requestId
      }
    );
  }

  /**
   * Handle critical errors that need immediate attention
   */
  private async handleCriticalError(
    error: ErrorDetails,
    context: ErrorContext,
    errorId: string
  ): Promise<void> {
    this.logger.error(`CRITICAL ERROR DETECTED: ${error.name}`, undefined, {
      errorId,
      errorDetails: error,
      context,
      severity: 'critical',
      requiresImmediateAttention: true,
      alertLevel: 'high'
    });

    // This could trigger alerts to monitoring systems
    // For now, we'll just log with high priority
  }

  /**
   * Update error summary for tracking patterns
   */
  private updateErrorSummary(error: ErrorDetails, context: ErrorContext): void {
    const errorKey = `${error.name}:${error.message}`;
    
    if (!this.errorSummaries.has(errorKey)) {
      this.errorSummaries.set(errorKey, {
        errorId: uuidv4(),
        type: error.name,
        severity: this.determineSeverity(error),
        frequency: 0,
        firstOccurrence: context.timestamp,
        lastOccurrence: context.timestamp,
        affectedUsers: new Set(),
        contexts: []
      });
    }

    const summary = this.errorSummaries.get(errorKey)!;
    summary.frequency++;
    summary.lastOccurrence = context.timestamp;
    
    if (context.userId) {
      summary.affectedUsers.add(context.userId);
    }
    
    summary.contexts.push(context);
    
    // Keep only recent contexts (last 10)
    if (summary.contexts.length > 10) {
      summary.contexts = summary.contexts.slice(-10);
    }
  }

  /**
   * Sanitize headers to remove sensitive information
   */
  private sanitizeHeaders(headers?: Record<string, string>): Record<string, string> | undefined {
    if (!headers) return undefined;

    const sanitized = { ...headers };
    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'x-api-key',
      'x-auth-token',
      'x-session-token',
      'x-csrf-token'
    ];

    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * Sanitize request body to remove sensitive information
   */
  private sanitizeRequestBody(body: any): any {
    if (!body) return undefined;

    try {
      const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
      const parsed = JSON.parse(bodyStr);
      
      if (typeof parsed === 'object' && parsed !== null) {
        const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth', 'credential'];
        const sanitized = { ...parsed };
        
        sensitiveFields.forEach(field => {
          if (sanitized[field]) {
            sanitized[field] = '[REDACTED]';
          }
        });
        
        return sanitized;
      }
      
      return parsed;
    } catch {
      // If not JSON, return truncated string
      const bodyStr = String(body);
      return bodyStr.length > 200 ? bodyStr.substring(0, 200) + '...' : bodyStr;
    }
  }

  /**
   * Sanitize database query to remove sensitive data
   */
  private sanitizeQuery(query: string): string {
    // Remove potential sensitive data from queries
    return query
      .replace(/password\s*=\s*'[^']*'/gi, "password = '[REDACTED]'")
      .replace(/token\s*=\s*'[^']*'/gi, "token = '[REDACTED]'")
      .replace(/secret\s*=\s*'[^']*'/gi, "secret = '[REDACTED]'");
  }
}

// Singleton instance
export const errorTracking = new ErrorTrackingService();

// Convenience functions
export const trackError = errorTracking.trackError.bind(errorTracking);
export const trackApiError = errorTracking.trackApiError.bind(errorTracking);
export const trackDatabaseError = errorTracking.trackDatabaseError.bind(errorTracking);
export const trackExternalServiceError = errorTracking.trackExternalServiceError.bind(errorTracking);

// Error tracking decorator
export function withErrorTracking(
  operation: string,
  context?: Partial<ErrorContext>
) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]): Promise<any> {
      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        await trackError(error, {
          ...context,
          requestId: uuidv4()
        }, {
          operation,
          method: propertyName,
          service: target.constructor.name,
          arguments: args.length
        });

        throw error;
      }
    };

    return descriptor;
  };
}

// Global error handler setup
export function setupGlobalErrorHandling(): void {
  if (globalErrorHandlersAttached) {
    return;
  }
  
  // Handle unhandled promise rejections
  process.on('unhandledRejection', async (reason, promise) => {
    await trackError(reason, {
      environment: process.env.NODE_ENV || 'development'
    }, {
      type: 'unhandledRejection',
      promise: promise.toString()
    });
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', async (error) => {
    await trackError(error, {
      environment: process.env.NODE_ENV || 'development'
    }, {
      type: 'uncaughtException',
      fatal: true
    });
    
    // Exit process after logging
    process.exit(1);
  });

  // Handle warnings
  process.on('warning', async (warning) => {
    await trackError(warning, {
      environment: process.env.NODE_ENV || 'development'
    }, {
      type: 'warning',
      warningName: warning.name
    });
  });

  globalErrorHandlersAttached = true;
}