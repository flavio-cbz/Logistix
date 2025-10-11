/**
 * @fileoverview Unified error system based on CleanupError for centralized error handling
 * @description Implements the centralized error management system as specified in the design document
 * @version 1.0.0
 * @since 2025-01-10
 */

import { logger } from "@/lib/utils/logging/logger";

/**
 * Error context interface for providing additional information about errors
 */
export interface ErrorContext {
  operation?: string;
  userId?: string;
  requestId?: string;
  component?: string;
  timestamp?: string;
  additionalData?: Record<string, unknown>;
}

/**
 * Base CleanupError class that serves as the foundation for all application errors
 */
export class CleanupError extends Error {
  public readonly code: string;
  public readonly context: ErrorContext;
  public readonly statusCode: number;
  public readonly timestamp: string;
  public readonly field?: string;
  public readonly isOperational: boolean;
  public readonly severity: 'low' | 'medium' | 'high' | 'critical';

  constructor(
    message: string,
    code: string = 'CLEANUP_ERROR',
    context: ErrorContext = {},
    field?: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.context = {
      timestamp: new Date().toISOString(),
      ...context,
    };
    this.field = field || "";
    this.statusCode = statusCode;
    this.timestamp = new Date().toISOString();
    this.isOperational = isOperational;
    this.severity = severity;

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Serializes the error for logging and API responses
   */
  public toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      context: this.context,
      timestamp: this.timestamp,
      field: this.field,
      isOperational: this.isOperational,
      severity: this.severity,
      stack: this.stack,
    };
  }

  /**
   * Returns a user-friendly message for display
   */
  public toUserMessage(): string {
    return this.message;
  }

  /**
   * Logs the error with appropriate context
   */
  public log(customMessage?: string): void {
    const logMessage = customMessage || `${this.name}: ${this.message}`;
    
    const logData = {
      error: this.toJSON(),
      context: this.context,
    };

    switch (this.severity) {
      case 'low':
        logger.warn(logMessage, logData);
        break;
      case 'medium':
        logger.error(logMessage, logData);
        break;
      case 'high':
      case 'critical':
        logger.error(logMessage, logData);
        break;
      default:
        logger.error(logMessage, logData);
    }
  }
}

/**
 * Validation error for input validation failures
 */
export class ValidationError extends CleanupError {
  constructor(
    message: string,
    field?: string,
    context: ErrorContext = {}
  ) {
    super(
      message,
      'VALIDATION_ERROR',
      context,
      field,
      400,
      true,
      'low'
    );
  }
}

/**
 * Not found error for missing resources
 */
export class NotFoundError extends CleanupError {
  constructor(
    resource: string,
    identifier?: string,
    context: ErrorContext = {}
  ) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    
    super(
      message,
      'NOT_FOUND',
      context,
      undefined,
      404,
      true,
      'low'
    );
  }
}

/**
 * Authentication error for auth failures
 */
export class AuthError extends CleanupError {
  constructor(
    message: string = 'Authentication failed',
    context: ErrorContext = {}
  ) {
    super(
      message,
      'AUTH_ERROR',
      context,
      undefined,
      401,
      true,
      'medium'
    );
  }
}

/**
 * Authorization error for permission failures
 */
export class AuthorizationError extends CleanupError {
  constructor(
    message: string = 'Access denied',
    context: ErrorContext = {}
  ) {
    super(
      message,
      'AUTHORIZATION_ERROR',
      context,
      undefined,
      403,
      true,
      'medium'
    );
  }
}

/**
 * Database error for database operation failures
 */
export class DatabaseError extends CleanupError {
  public readonly operation?: string;

  constructor(
    message: string,
    operation?: string,
    context: ErrorContext = {}
  ) {
    super(
      message,
      'DATABASE_ERROR',
      { operation: operation || 'unknown', ...context },
      undefined,
      500,
      true,
      'critical'
    );
    this.operation = operation || 'unknown';
  }
}

/**
 * Business logic error for domain rule violations
 */
export class BusinessLogicError extends CleanupError {
  constructor(
    message: string,
    context: ErrorContext = {}
  ) {
    super(
      message,
      'BUSINESS_LOGIC_ERROR',
      context,
      undefined,
      422,
      true,
      'medium'
    );
  }
}

/**
 * Conflict error for resource conflicts
 */
export class ConflictError extends CleanupError {
  constructor(
    message: string,
    context: ErrorContext = {}
  ) {
    super(
      message,
      'CONFLICT_ERROR',
      context,
      undefined,
      409,
      true,
      'medium'
    );
  }
}

/**
 * Rate limiting error
 */
export class TooManyRequestsError extends CleanupError {
  constructor(
    message: string = 'Too many requests',
    context: ErrorContext = {}
  ) {
    super(
      message,
      'TOO_MANY_REQUESTS',
      context,
      undefined,
      429,
      true,
      'low'
    );
  }
}

/**
 * Infrastructure error for external service failures
 */
export class InfrastructureError extends CleanupError {
  constructor(
    message: string,
    context: ErrorContext = {}
  ) {
    super(
      message,
      'INFRASTRUCTURE_ERROR',
      context,
      undefined,
      500,
      true,
      'high'
    );
  }
}

/**
 * Network error for network-related failures
 */
export class NetworkError extends CleanupError {
  constructor(
    message: string,
    context: ErrorContext = {}
  ) {
    super(
      message,
      'NETWORK_ERROR',
      context,
      undefined,
      503,
      true,
      'medium'
    );
  }
}

/**
 * Timeout error for operation timeouts
 */
export class TimeoutError extends CleanupError {
  constructor(
    message: string = 'Operation timed out',
    context: ErrorContext = {}
  ) {
    super(
      message,
      'TIMEOUT_ERROR',
      context,
      undefined,
      408,
      true,
      'medium'
    );
  }
}

/**
 * Type guard to check if an error is a CleanupError
 */
export function isCleanupError(error: unknown): error is CleanupError {
  return error instanceof CleanupError;
}

/**
 * Legacy compatibility aliases
 */
export const CustomError = CleanupError;
export const BaseError = CleanupError;
export const AuthenticationError = AuthError;
export const RequestValidationError = ValidationError;

/**
 * Error factory for creating appropriate error types
 */
export class ErrorFactory {
  /**
   * Creates an appropriate error based on the error type and message
   */
  static createError(
    error: unknown,
    operation: string,
    context: ErrorContext = {}
  ): CleanupError {
    const enhancedContext = { operation, ...context };

    // If already a CleanupError, enhance with context if missing
    if (isCleanupError(error)) {
      if (!error.context.requestId && context.requestId) {
        return new (error.constructor as any)(
          error.message,
          error.code,
          { ...error.context, ...enhancedContext },
          error.field
        );
      }
      return error;
    }

    // Convert based on error patterns
    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      // Database errors
      if (
        message.includes('unique constraint') ||
        message.includes('foreign key') ||
        message.includes('database') ||
        message.includes('sql')
      ) {
        return new DatabaseError(error.message, operation, enhancedContext);
      }

      // Validation errors
      if (
        message.includes('validation') ||
        message.includes('invalid') ||
        message.includes('required')
      ) {
        return new ValidationError(error.message, undefined, enhancedContext);
      }

      // Not found errors
      if (message.includes('not found') || message.includes('does not exist')) {
        return new NotFoundError('Resource', undefined, enhancedContext);
      }

      // Auth errors
      if (
        message.includes('unauthorized') ||
        message.includes('authentication') ||
        message.includes('invalid credentials')
      ) {
        return new AuthError(error.message, enhancedContext);
      }

      // Authorization errors
      if (
        message.includes('forbidden') ||
        message.includes('permission') ||
        message.includes('access denied')
      ) {
        return new AuthorizationError(error.message, enhancedContext);
      }

      // Network errors
      if (
        message.includes('network') ||
        message.includes('fetch') ||
        message.includes('connection')
      ) {
        return new NetworkError(error.message, enhancedContext);
      }

      // Timeout errors
      if (message.includes('timeout')) {
        return new TimeoutError(error.message, enhancedContext);
      }
    }

    // Default to generic CleanupError
    return new CleanupError(
      error instanceof Error ? error.message : String(error),
      'UNKNOWN_ERROR',
      enhancedContext
    );
  }

  /**
   * Creates a validation error with field information
   */
  static createValidationError(
    message: string,
    field?: string,
    context: ErrorContext = {}
  ): ValidationError {
    return new ValidationError(message, field, context);
  }

  /**
   * Creates a not found error for a specific resource
   */
  static createNotFoundError(
    resource: string,
    identifier?: string,
    context: ErrorContext = {}
  ): NotFoundError {
    return new NotFoundError(resource, identifier, context);
  }

  /**
   * Creates a database error with operation context
   */
  static createDatabaseError(
    message: string,
    operation: string,
    context: ErrorContext = {}
  ): DatabaseError {
    return new DatabaseError(message, operation, context);
  }
}

export default CleanupError;