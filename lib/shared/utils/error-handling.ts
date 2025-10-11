/**
 * @fileoverview Unified error handling system
 * @description Consolidates ErrorHandler and ErrorMigrationHelper into a single, comprehensive error management system
 * @version 1.0.0
 * @since 2025-01-10
 */

import { logger, LogContext } from "./logging";
import {
  CustomError,
  ValidationError,
  NotFoundError,
  AuthError,
  AuthorizationError,
  DatabaseError,
  isCustomError,
} from "@/lib/errors/custom-error";

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
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
};

/**
 * Unified error handler that consolidates all error handling functionality
 */
export class UnifiedErrorHandler {
  private static instance: UnifiedErrorHandler;
  private retryConfig: RetryConfig;

  constructor(retryConfig?: Partial<RetryConfig>) {
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  }

  /**
   * Get singleton instance
   */
  public static getInstance(retryConfig?: Partial<RetryConfig>): UnifiedErrorHandler {
    if (!UnifiedErrorHandler.instance) {
      UnifiedErrorHandler.instance = new UnifiedErrorHandler(retryConfig);
    }
    return UnifiedErrorHandler.instance;
  }

  /**
   * Formats an error for user-friendly display
   */
  formatUserFriendlyError(error: Error): UserError {
    // Handle custom errors
    if (isCustomError(error)) {
      return this.handleCustomError(error);
    }

    // Handle specific error types by message patterns
    const message = error.message.toLowerCase();

    // Network errors
    if (message.includes("fetch") || message.includes("network") || message.includes("timeout")) {
      return {
        message: "Problème de connexion. Vérifiez votre connexion internet.",
        code: "NETWORK_ERROR",
        suggestions: [
          "Vérifiez votre connexion internet",
          "Réessayez dans quelques instants",
          "Contactez le support si le problème persiste",
        ],
        retryable: true,
      };
    }

    // Database errors
    if (message.includes("database") || message.includes("sql") || message.includes("constraint")) {
      return {
        message: "Erreur de base de données temporaire",
        code: "DATABASE_ERROR",
        suggestions: [
          "Réessayez l'opération",
          "Vérifiez que les données sont correctes",
          "Contactez le support si le problème persiste",
        ],
        retryable: true,
      };
    }

    // Validation errors
    if (message.includes("validation") || message.includes("invalid") || message.includes("required")) {
      return {
        message: "Données invalides ou manquantes",
        code: "VALIDATION_ERROR",
        suggestions: [
          "Vérifiez les données saisies",
          "Assurez-vous que tous les champs requis sont remplis",
          "Consultez la documentation pour le format attendu",
        ],
        retryable: false,
      };
    }

    // Authentication errors
    if (message.includes("unauthorized") || message.includes("authentication") || message.includes("token")) {
      return {
        message: "Problème d'authentification",
        code: "AUTH_ERROR",
        suggestions: [
          "Reconnectez-vous à votre compte",
          "Vérifiez vos identifiants",
          "Contactez le support si le problème persiste",
        ],
        retryable: false,
      };
    }

    // Generic error
    return {
      message: "Une erreur inattendue s'est produite",
      code: "UNKNOWN_ERROR",
      suggestions: [
        "Réessayez l'opération",
        "Actualisez la page",
        "Contactez le support si le problème persiste",
      ],
      retryable: true,
    };
  }

  /**
   * Handles custom error types
   */
  private handleCustomError(error: CustomError): UserError {
    switch (error.constructor.name) {
      case "ValidationError":
        return {
          message: error.message,
          code: error.code,
          suggestions: [
            "Vérifiez les données saisies",
            "Consultez la documentation",
            "Assurez-vous que le format est correct",
          ],
          retryable: false,
        };

      case "NotFoundError":
        return {
          message: error.message,
          code: error.code,
          suggestions: [
            "Vérifiez que la ressource existe",
            "Vérifiez l'identifiant utilisé",
            "Contactez le support si nécessaire",
          ],
          retryable: false,
        };

      case "AuthError":
        return {
          message: error.message,
          code: error.code,
          suggestions: [
            "Reconnectez-vous à votre compte",
            "Vérifiez vos identifiants",
            "Réinitialisez votre mot de passe si nécessaire",
          ],
          retryable: false,
        };

      case "AuthorizationError":
        return {
          message: error.message,
          code: error.code,
          suggestions: [
            "Contactez un administrateur pour obtenir les permissions",
            "Vérifiez que vous avez accès à cette ressource",
            "Utilisez un compte avec les bonnes permissions",
          ],
          retryable: false,
        };

      case "DatabaseError":
        return {
          message: "Erreur de base de données temporaire",
          code: error.code,
          suggestions: [
            "Réessayez dans quelques instants",
            "Vérifiez que les données sont correctes",
            "Contactez le support si le problème persiste",
          ],
          retryable: true,
        };

      default:
        return {
          message: error.message,
          code: error.code,
          suggestions: [
            "Réessayez l'opération",
            "Contactez le support avec le code d'erreur",
          ],
          retryable: true,
        };
    }
  }

  /**
   * Converts legacy errors to standardized custom errors
   */
  convertLegacyError(error: unknown, operation: string, context?: LogContext): CustomError {
    // If already a custom error, enhance with context if missing
    if (isCustomError(error)) {
      if (!error.context?.['requestId'] && context?.requestId) {
        return new (error.constructor as any)(
          error.message,
          error.code,
          {
            ...error.context,
            ...context,
            operation,
          },
          error.field,
        );
      }
      return error;
    }

    const enhancedContext = { ...context, operation };

    // Convert based on error patterns
    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      // Database errors
      if (
        message.includes("unique constraint") ||
        message.includes("foreign key") ||
        message.includes("database") ||
        message.includes("sql")
      ) {
        return new DatabaseError(error.message, operation, enhancedContext);
      }

      // Validation errors
      if (
        message.includes("validation") ||
        message.includes("invalid") ||
        message.includes("required")
      ) {
        return new ValidationError(error.message, undefined, enhancedContext);
      }

      // Not found errors
      if (message.includes("not found") || message.includes("does not exist")) {
        return new NotFoundError("Resource", undefined, enhancedContext);
      }

      // Auth errors
      if (
        message.includes("unauthorized") ||
        message.includes("authentication") ||
        message.includes("invalid credentials")
      ) {
        return new AuthError(error.message, enhancedContext);
      }

      // Authorization errors
      if (
        message.includes("forbidden") ||
        message.includes("permission") ||
        message.includes("access denied")
      ) {
        return new AuthorizationError(error.message, enhancedContext);
      }
    }

    // Default to generic custom error
    return new CustomError(
      error instanceof Error ? error.message : String(error),
      "UNKNOWN_ERROR",
      enhancedContext,
      undefined,
    );
  }

  /**
   * Retry operation with exponential backoff
   */
  async retryWithBackoff<T>(
    operation: () => Promise<T>,
    options?: Partial<RetryConfig>,
    onRetry?: (attempt: number, error: Error) => void,
  ): Promise<T> {
    const config = { ...this.retryConfig, ...options };
    let lastError: Error;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

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
          `Retry attempt ${attempt + 1} failed, retrying in ${delay}ms`,
          {
            error: lastError.message,
            attempt: attempt + 1,
            delay,
            operation: "retryWithBackoff",
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
  isRetryableError(error: Error): boolean {
    if (isCustomError(error)) {
      // Don't retry validation, auth, or not found errors
      return !(
        error instanceof ValidationError ||
        error instanceof AuthError ||
        error instanceof AuthorizationError ||
        error instanceof NotFoundError
      );
    }

    const message = error.message.toLowerCase();

    // Don't retry validation or auth errors
    if (
      message.includes("validation") ||
      message.includes("invalid") ||
      message.includes("unauthorized") ||
      message.includes("forbidden") ||
      message.includes("not found")
    ) {
      return false;
    }

    // Retry network, timeout, and server errors
    return (
      message.includes("timeout") ||
      message.includes("network") ||
      message.includes("fetch") ||
      message.includes("500") ||
      message.includes("502") ||
      message.includes("503") ||
      message.includes("504")
    );
  }

  /**
   * Logs an error with context
   */
  logError(error: Error, context: string, additionalData?: any): string {
    const errorId = this.generateErrorId();
    
    logger.error(`${context}:`, {
      errorId,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      context,
      additionalData,
    }, error);

    return errorId;
  }

  /**
   * Generates a unique error ID for tracking
   */
  generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Wraps a service method to automatically handle errors
   */
  wrapServiceMethod<T extends any[], R>(
    serviceName: string,
    methodName: string,
    method: (...args: T) => Promise<R>,
    context?: LogContext,
  ) {
    return async (...args: T): Promise<R> => {
      try {
        return await method(...args);
      } catch (error) {
        const enhancedError = this.convertLegacyError(
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
  createErrorResponse(error: unknown, requestId?: string) {
    const customError = isCustomError(error)
      ? error
      : this.convertLegacyError(error, "api_request", {
          ...(requestId && { requestId }),
        });

    return {
      success: false,
      error: {
        code: customError.code,
        message: customError.message,
        field: customError.field,
        timestamp: customError.timestamp,
      },
      meta: {
        requestId: requestId || customError.context?.['requestId'],
        timestamp: new Date().toISOString(),
      },
    };
  }
}

/**
 * Default error handler instance
 */
export const errorHandler = UnifiedErrorHandler.getInstance();

/**
 * React hook for error handling
 */
export const useErrorHandler = () => {
  const handleError = (error: Error, context: string = "Unknown") => {
    const errorId = errorHandler.generateErrorId();
    errorHandler.logError(error, context, { errorId });

    const userError = errorHandler.formatUserFriendlyError(error);

    return {
      ...userError,
      errorId,
      timestamp: new Date().toISOString(),
    };
  };

  const retryOperation = async <T>(
    operation: () => Promise<T>,
    options?: Partial<RetryConfig>,
  ): Promise<T> => {
    return errorHandler.retryWithBackoff(operation, options);
  };

  return {
    handleError,
    retryOperation,
    isRetryable: errorHandler.isRetryableError.bind(errorHandler),
  };
};

/**
 * Formats an error for API responses
 */
export function formatApiError(
  error: unknown,
  details?: any,
): { error: string; code?: string; details?: any } {
  if (error instanceof Error) {
    const code = (error as any).code || error.name;
    return {
      error: error.message,
      code,
      ...(details ? { details } : {}),
    };
  }
  if (typeof error === "string") {
    return { error, ...(details ? { details } : {}) };
  }
  return {
    error: "Erreur inconnue",
    details: error,
  };
}

/**
 * Decorator for automatic error handling migration
 */
export function migrateErrorHandling(serviceName: string, methodName: string) {
  return function (
    _target: any,
    _propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const context: LogContext = {
        service: serviceName,
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

// Legacy compatibility exports
export class ErrorHandler extends UnifiedErrorHandler {}
export class ErrorMigrationHelper extends UnifiedErrorHandler {}

// Legacy function exports
export const createErrorHandler = () => errorHandler.createErrorResponse.bind(errorHandler);

export default errorHandler;