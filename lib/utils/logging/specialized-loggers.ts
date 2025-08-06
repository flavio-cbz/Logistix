/**
 * Specialized Loggers
 * Pre-configured loggers for specific services and components
 */

import { getLogger, type ILogger } from './logger';

// Database logger
export const databaseLogger = getLogger('DATABASE');

// API logger
export const apiLogger = getLogger('API');

// Auth logger
export const authLogger = getLogger('AUTH');

// Market analysis logger
export const marketAnalysisLogger = getLogger('MARKET_ANALYSIS');

// Vinted integration logger
export const vintedLogger = getLogger('VINTED');

// Performance logger
export const performanceLogger = getLogger('PERFORMANCE');

// Security logger
export const securityLogger = getLogger('SECURITY');

// Cache logger
export const cacheLogger = getLogger('CACHE');

// File system logger
export const fsLogger = getLogger('FILESYSTEM');

// Scheduler logger
export const schedulerLogger = getLogger('SCHEDULER');

/**
 * Request Logger Middleware
 * Creates a logger with request context
 */
export function createRequestLogger(requestId: string, userId?: string): ILogger {
  const logger = getLogger('REQUEST');
  
  // Wrap all logger methods to include request context
  return {
    error: (message: string, error?: Error | unknown, meta?: Record<string, any>) => {
      logger.error(message, error, { ...meta, requestId, userId });
    },
    warn: (message: string, meta?: Record<string, any>) => {
      logger.warn(message, { ...meta, requestId, userId });
    },
    info: (message: string, meta?: Record<string, any>) => {
      logger.info(message, { ...meta, requestId, userId });
    },
    http: (message: string, meta?: Record<string, any>) => {
      logger.http(message, { ...meta, requestId, userId });
    },
    verbose: (message: string, meta?: Record<string, any>) => {
      logger.verbose(message, { ...meta, requestId, userId });
    },
    debug: (message: string, meta?: Record<string, any>) => {
      logger.debug(message, { ...meta, requestId, userId });
    },
    silly: (message: string, meta?: Record<string, any>) => {
      logger.silly(message, { ...meta, requestId, userId });
    },
    performance: (operation: string, duration: number, meta?: Record<string, any>) => {
      logger.performance(operation, duration, { ...meta, requestId, userId });
    },
    request: (method: string, url: string, statusCode: number, duration: number, meta?: Record<string, any>) => {
      logger.request(method, url, statusCode, duration, { ...meta, requestId, userId });
    },
    database: (query: string, duration: number, meta?: Record<string, any>) => {
      logger.database(query, duration, { ...meta, requestId, userId });
    },
    userAction: (action: string, userIdParam: string, meta?: Record<string, any>) => {
      logger.userAction(action, userIdParam, { ...meta, requestId, userId });
    }
  };
}

/**
 * Performance Timer Utility
 * Helps measure and log operation performance
 */
export class PerformanceTimer {
  private startTime: number;
  private logger: ILogger;
  private operation: string;
  private metadata: Record<string, any>;

  constructor(operation: string, logger: ILogger = performanceLogger, metadata: Record<string, any> = {}) {
    this.startTime = Date.now();
    this.logger = logger;
    this.operation = operation;
    this.metadata = metadata;
  }

  end(additionalMetadata?: Record<string, any>): number {
    const duration = Date.now() - this.startTime;
    this.logger.performance(this.operation, duration, {
      ...this.metadata,
      ...additionalMetadata
    });
    return duration;
  }

  endWithResult<T>(result: T, additionalMetadata?: Record<string, any>): T {
    this.end({
      success: true,
      resultType: typeof result,
      ...additionalMetadata
    });
    return result;
  }

  endWithError(error: Error, additionalMetadata?: Record<string, any>): never {
    const duration = Date.now() - this.startTime;
    this.logger.error(`${this.operation} failed`, error, {
      duration,
      success: false,
      ...this.metadata,
      ...additionalMetadata
    });
    throw error;
  }
}

/**
 * Database Query Logger
 * Specialized logger for database operations
 */
export class DatabaseQueryLogger {
  private logger: ILogger;

  constructor(logger: ILogger = databaseLogger) {
    this.logger = logger;
  }

  logQuery(query: string, params?: any[], duration?: number, metadata?: Record<string, any>) {
    this.logger.database(query, duration || 0, {
      params: params ? params.slice(0, 10) : undefined, // Limit params for security
      paramCount: params?.length,
      ...metadata
    });
  }

  logTransaction(operation: string, duration: number, metadata?: Record<string, any>) {
    this.logger.performance(`DB_TRANSACTION_${operation}`, duration, {
      type: 'database_transaction',
      ...metadata
    });
  }

  logConnection(event: 'connect' | 'disconnect' | 'error', metadata?: Record<string, any>) {
    if (event === 'error') {
      this.logger.error(`Database connection ${event}`, undefined, metadata);
    } else {
      this.logger.info(`Database connection ${event}`, metadata);
    }
  }
}

/**
 * API Request Logger
 * Specialized logger for API requests and responses
 */
export class ApiRequestLogger {
  private logger: ILogger;

  constructor(logger: ILogger = apiLogger) {
    this.logger = logger;
  }

  logRequest(method: string, url: string, headers?: Record<string, string>, body?: any) {
    this.logger.http(`${method} ${url}`, {
      method,
      url,
      headers: this.sanitizeHeaders(headers),
      bodySize: body ? JSON.stringify(body).length : 0,
      type: 'api_request'
    });
  }

  logResponse(method: string, url: string, statusCode: number, duration: number, responseSize?: number) {
    this.logger.request(method, url, statusCode, duration, {
      responseSize,
      type: 'api_response'
    });
  }

  logError(method: string, url: string, error: Error, duration: number) {
    this.logger.error(`${method} ${url} failed`, error, {
      method,
      url,
      duration,
      type: 'api_error'
    });
  }

  private sanitizeHeaders(headers?: Record<string, string>): Record<string, string> | undefined {
    if (!headers) return undefined;
    
    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
    
    for (const header of sensitiveHeaders) {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }
}

// Export singleton instances
export const dbQueryLogger = new DatabaseQueryLogger();
export const apiRequestLogger = new ApiRequestLogger();