/**
 * @fileoverview Centralized error handling service
 * @description Provides unified error handling, logging, and user-friendly error formatting
 * @version 1.0.0
 * @since 2025-01-10
 */

import { logger } from "@/lib/utils/logging/logger";
import {
  CleanupError,
  ErrorContext,
  ErrorFactory,
  isCleanupError,
  ValidationError,
  AuthError,
  AuthorizationError,
  NotFoundError,
  DatabaseError,
  NetworkError,
  TimeoutError,
} from "@/lib/shared/errors/cleanup-error";

/**
 * User-friendly error information for display
 */
export interface UserError {
  message: string;
  code: string;
  suggestions: string[];
  retryable: boolean;
  errorId?: string;
  timestamp?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Retry configuration options
 */
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

/**
 * Error handling statistics
 */
export interface ErrorStats {
  totalErrors: number;
  errorsByType: Record<string, number>;
  errorsBySeverity: Record<string, number>;
  recentErrors: CleanupError[];
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
};

/**
 * Centralized error handling service
 */
export class CentralizedErrorHandler {
  private static instance: CentralizedErrorHandler;
  private retryConfig: RetryConfig;
  private errorStats: ErrorStats;

  constructor(retryConfig?: Partial<RetryConfig>) {
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
    this.errorStats = {
      totalErrors: 0,
      errorsByType: {},
      errorsBySeverity: {},
      recentErrors: [],
    };
  }

  /**
   * Get singleton instance
   */
  public static getInstance(retryConfig?: Partial<RetryConfig>): CentralizedErrorHandler {
    if (!CentralizedErrorHandler.instance) {
      CentralizedErrorHandler.instance = new CentralizedErrorHandler(retryConfig);
    }
    return CentralizedErrorHandler.instance;
  }

  /**
   * Handles any error and converts it to a standardized CleanupError
   */
  public handleError(
    error: unknown,
    operation: string,
    context: ErrorContext = {}
  ): CleanupError {
    const cleanupError = ErrorFactory.createError(error, operation, context);
    
    // Update statistics
    this.updateErrorStats(cleanupError);
    
    // Log the error
    cleanupError.log(`Error in ${operation}`);
    
    return cleanupError;
  }

  /**
   * Formats an error for user-friendly display
   */
  public formatUserFriendlyError(error: unknown): UserError {
    const cleanupError = isCleanupError(error) 
      ? error 
      : ErrorFactory.createError(error, 'unknown_operation');

    const baseUserError: UserError = {
      message: cleanupError.toUserMessage(),
      code: cleanupError.code,
      suggestions: [],
      retryable: cleanupError.isOperational,
      severity: cleanupError.severity,
    };

    // Customize based on error type
    if (cleanupError instanceof ValidationError) {
      return {
        ...baseUserError,
        message: cleanupError.field 
          ? `Erreur de validation pour le champ "${cleanupError.field}": ${cleanupError.message}`
          : cleanupError.message,
        suggestions: [
          "Vérifiez les données saisies",
          "Assurez-vous que tous les champs requis sont remplis",
          "Consultez la documentation pour le format attendu",
        ],
        retryable: false,
      };
    }

    if (cleanupError instanceof NotFoundError) {
      return {
        ...baseUserError,
        suggestions: [
          "Vérifiez que la ressource existe",
          "Vérifiez l'identifiant utilisé",
          "Contactez le support si nécessaire",
        ],
        retryable: false,
      };
    }

    if (cleanupError instanceof AuthError) {
      return {
        ...baseUserError,
        suggestions: [
          "Reconnectez-vous à votre compte",
          "Vérifiez vos identifiants",
          "Réinitialisez votre mot de passe si nécessaire",
        ],
        retryable: false,
      };
    }

    if (cleanupError instanceof AuthorizationError) {
      return {
        ...baseUserError,
        suggestions: [
          "Contactez un administrateur pour obtenir les permissions",
          "Vérifiez que vous avez accès à cette ressource",
          "Utilisez un compte avec les bonnes permissions",
        ],
        retryable: false,
      };
    }

    if (cleanupError instanceof DatabaseError) {
      return {
        ...baseUserError,
        message: "Erreur de base de données temporaire",
        suggestions: [
          "Réessayez dans quelques instants",
          "Vérifiez que les données sont correctes",
          "Contactez le support si le problème persiste",
        ],
        retryable: true,
      };
    }

    if (cleanupError instanceof NetworkError) {
      return {
        ...baseUserError,
        message: "Problème de connexion réseau",
        suggestions: [
          "Vérifiez votre connexion internet",
          "Réessayez dans quelques instants",
          "Contactez le support si le problème persiste",
        ],
        retryable: true,
      };
    }

    if (cleanupError instanceof TimeoutError) {
      return {
        ...baseUserError,
        message: "L'opération a pris trop de temps",
        suggestions: [
          "Réessayez l'opération",
          "Vérifiez votre connexion internet",
          "Contactez le support si le problème persiste",
        ],
        retryable: true,
      };
    }

    // Default suggestions for unknown errors
    return {
      ...baseUserError,
      suggestions: [
        "Réessayez l'opération",
        "Actualisez la page",
        "Contactez le support si le problème persiste",
      ],
    };
  }

  /**
   * Retry operation with exponential backoff
   */
  public async retryWithBackoff<T>(
    operation: () => Promise<T>,
    operationName: string,
    options?: Partial<RetryConfig>,
    onRetry?: (attempt: number, error: CleanupError) => void,
  ): Promise<T> {
    const config = { ...this.retryConfig, ...options };
    let lastError: CleanupError;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = this.handleError(error, operationName, { additionalData: { attempt } });

        if (attempt === config.maxRetries) {
          break;
        }

        // Don't retry for certain error types
        if (!this.isRetryableError(lastError)) {
          break;
        }

        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffMultiplier, attempt),
          config.maxDelay
        );

        logger.warn(
          `Retry attempt ${attempt + 1} failed for ${operationName}, retrying in ${delay}ms`,
          {
            error: lastError.toJSON(),
            attempt: attempt + 1,
            delay,
            operation: operationName,
          }
        );

        if (onRetry) {
          onRetry(attempt + 1, lastError);
        }

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  /**
   * Determines if an error is retryable
   */
  public isRetryableError(error: CleanupError): boolean {
    // Don't retry validation, auth, or not found errors
    if (
      error instanceof ValidationError ||
      error instanceof AuthError ||
      error instanceof AuthorizationError ||
      error instanceof NotFoundError
    ) {
      return false;
    }

    // Retry operational errors
    return error.isOperational;
  }

  /**
   * Logs an error with context and returns error ID
   */
  public logError(
    error: unknown,
    operation: string,
    context: ErrorContext = {},
    customMessage?: string
  ): string {
    const cleanupError = this.handleError(error, operation, context);
    const errorId = this.generateErrorId();
    
    const logMessage = customMessage || `Error in ${operation}: ${cleanupError.message}`;
    
    logger.error(logMessage, {
      errorId,
      error: cleanupError.toJSON(),
      operation,
      context,
    });

    return errorId;
  }

  /**
   * Generates a unique error ID for tracking
   */
  public generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Wraps a service method to automatically handle errors
   */
  public wrapServiceMethod<T extends any[], R>(
    serviceName: string,
    methodName: string,
    method: (...args: T) => Promise<R>,
    context?: ErrorContext,
  ) {
    return async (...args: T): Promise<R> => {
      try {
        return await method(...args);
      } catch (error) {
        const enhancedError = this.handleError(
          error,
          `${serviceName}.${methodName}`,
          context,
        );
        throw enhancedError;
      }
    };
  }

  /**
   * Creates a standardized error response for APIs
   */
  public createErrorResponse(error: unknown, requestId?: string) {
    const cleanupError = isCleanupError(error)
      ? error
      : this.handleError(error, 'api_request', {
          ...(requestId && { requestId }),
        });

    return {
      success: false,
      error: {
        code: cleanupError.code,
        message: cleanupError.message,
        field: cleanupError.field,
        timestamp: cleanupError.timestamp,
        severity: cleanupError.severity,
      },
      meta: {
        requestId: requestId || cleanupError.context?.['requestId'],
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Updates error statistics
   */
  private updateErrorStats(error: CleanupError): void {
    this.errorStats.totalErrors++;
    
    // Update by type
    const errorType = error.constructor.name;
    this.errorStats.errorsByType[errorType] = 
      (this.errorStats.errorsByType[errorType] || 0) + 1;
    
    // Update by severity
    this.errorStats.errorsBySeverity[error.severity] = 
      (this.errorStats.errorsBySeverity[error.severity] || 0) + 1;
    
    // Keep recent errors (last 100)
    this.errorStats.recentErrors.push(error);
    if (this.errorStats.recentErrors.length > 100) {
      this.errorStats.recentErrors.shift();
    }
  }

  /**
   * Gets error statistics
   */
  public getErrorStats(): ErrorStats {
    return { ...this.errorStats };
  }

  /**
   * Resets error statistics
   */
  public resetErrorStats(): void {
    this.errorStats = {
      totalErrors: 0,
      errorsByType: {},
      errorsBySeverity: {},
      recentErrors: [],
    };
  }

  /**
   * Checks if the error rate is above threshold
   */
  public isErrorRateHigh(timeWindowMs: number = 60000, threshold: number = 10): boolean {
    const now = Date.now();
    const recentErrors = this.errorStats.recentErrors.filter(
      error => new Date(error.timestamp).getTime() > now - timeWindowMs
    );
    
    return recentErrors.length > threshold;
  }
}

/**
 * Default error handler instance
 */
export const errorHandler = CentralizedErrorHandler.getInstance();

/**
 * React hook for error handling
 */
export const useErrorHandler = () => {
  const handleError = (error: unknown, operation: string = "Unknown") => {
    const errorId = errorHandler.generateErrorId();
    const cleanupError = errorHandler.handleError(error, operation, { additionalData: { errorId } });
    const userError = errorHandler.formatUserFriendlyError(cleanupError);

    return {
      ...userError,
      errorId,
      timestamp: new Date().toISOString(),
    };
  };

  const retryOperation = async <T>(
    operation: () => Promise<T>,
    operationName: string,
    options?: Partial<RetryConfig>,
  ): Promise<T> => {
    return errorHandler.retryWithBackoff(operation, operationName, options);
  };

  return {
    handleError,
    retryOperation,
    isRetryable: errorHandler.isRetryableError.bind(errorHandler),
    getStats: errorHandler.getErrorStats.bind(errorHandler),
  };
};

/**
 * Decorator for automatic error handling migration
 */
export function withErrorHandling(serviceName: string, methodName: string) {
  return function (
    _target: any,
    _propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const context: ErrorContext = {
        additionalData: { service: serviceName },
        operation: methodName,
        requestId: (this as any).requestId,
        userId: (this as any).userId,
      };

      return errorHandler.wrapServiceMethod(
        serviceName,
        methodName,
        originalMethod.bind(this),
        context,
      )(...args);
    };

    return descriptor;
  };
}

export default errorHandler;