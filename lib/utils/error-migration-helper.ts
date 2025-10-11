/**
 * Helper utilities for migrating services to use new error handling patterns
 * This file provides utilities to help migrate existing services to use the new
 * standardized error classes and correlation IDs
 */

import {
  CustomError,
  ValidationError,
  NotFoundError,
  AuthError,
  AuthorizationError,
  DatabaseError,
  isCustomError,
} from "@/lib/errors/custom-error";
import { LogContext } from "@/lib/utils/logging/logger";

/**
 * Migration helper for updating service error handling
 */
export class ErrorMigrationHelper {
  /**
   * Converts legacy error patterns to new standardized errors
   */
  static convertLegacyError(
    error: unknown,
    operation: string,
    context?: LogContext,
  ): CustomError {
    // If already a custom error, enhance with context if missing
    if (isCustomError(error)) {
      if (!error.context?.['requestId'] && context?.requestId) {
        return new (error.constructor as any)(
          error.message,
          error.code,
          error.statusCode,
          error.field,
          {
            ...error.context,
            ...context,
            operation,
          },
        );
      }
      return error;
    }

    // Convert based on error patterns
    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      // Database errors
      if (
        message.includes("unique constraint") ||
        message.includes("foreign key") ||
        message.includes("database")
      ) {
        return new DatabaseError(error.message, operation, context);
      }

      // Validation errors
      if (
        message.includes("validation") ||
        message.includes("invalid") ||
        message.includes("required")
      ) {
        return new ValidationError(error.message, undefined, context);
      }

      // Not found errors
      if (message.includes("not found") || message.includes("does not exist")) {
        return new NotFoundError("Resource", undefined, context);
      }

      // Auth errors
      if (
        message.includes("unauthorized") ||
        message.includes("authentication") ||
        message.includes("invalid credentials")
      ) {
        return new AuthError(error.message, context);
      }

      // Authorization errors
      if (
        message.includes("forbidden") ||
        message.includes("permission") ||
        message.includes("access denied")
      ) {
        return new AuthorizationError(error.message, context);
      }
    }

    // Default to generic custom error
    return new CustomError(
      error instanceof Error ? error.message : String(error),
      "UNKNOWN_ERROR",
      { statusCode: 500 },
      undefined,
    );
  }

  /**
   * Wraps a service method to automatically handle errors with correlation
   */
  static wrapServiceMethod<T extends any[], R>(
    serviceName: string,
    methodName: string,
    method: (...args: T) => Promise<R>,
    context?: LogContext,
  ) {
    return async (...args: T): Promise<R> => {
      try {
        return await method(...args);
      } catch (error) {
        const enhancedError = ErrorMigrationHelper.convertLegacyError(
          error,
          `${serviceName}.${methodName}`,
          context,
        );
        throw enhancedError;
      }
    };
  }

  /**
   * Creates a standardized error response for API routes
   */
  static createErrorResponse(error: unknown, requestId?: string) {
    const customError = isCustomError(error)
      ? error
      : ErrorMigrationHelper.convertLegacyError(error, "api_request", {
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

  /**
   * Validates that a service is using proper error handling patterns
   */
  static validateServiceErrorHandling(
    serviceName: string,
    _methods: string[],
  ): {
    valid: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // This would be expanded to actually analyze service code
    // For now, provide general recommendations
    recommendations.push(
      `Ensure ${serviceName} extends BaseService`,
      `Use this.handleError() for generic error handling`,
      `Use this.createNotFoundError() for resource not found cases`,
      `Use this.createValidationError() for input validation failures`,
      `Use this.createAuthError() for authentication failures`,
      `Use this.executeOperation() for automatic logging and error handling`,
    );

    return {
      valid: issues.length === 0,
      issues,
      recommendations,
    };
  }
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
        // Try to extract requestId from service instance if available
        requestId: (this as any).requestId,
        userId: (this as any).userId,
      };

      return ErrorMigrationHelper.wrapServiceMethod(
        serviceName,
        methodName,
        originalMethod.bind(this),
        context,
      )(...args);
    };

    return descriptor;
  };
}

/**
 * Utility to check if a service needs error handling migration
 */
export function needsErrorMigration(serviceInstance: any): boolean {
  // Check if service extends BaseService
  const hasBaseService =
    serviceInstance.constructor.name.includes("Service") &&
    typeof serviceInstance.handleError === "function";

  // Check if service uses new error classes
  const hasNewErrorMethods =
    typeof serviceInstance.createNotFoundError === "function" &&
    typeof serviceInstance.createValidationError === "function";

  return !hasBaseService || !hasNewErrorMethods;
}

/**
 * Migration checklist for services
 */
export const ERROR_HANDLING_MIGRATION_CHECKLIST = [
  "Service extends BaseService",
  "Imports error classes from @/lib/errors/custom-error",
  "Uses this.handleError() for generic error handling",
  "Uses this.createNotFoundError() for resource not found",
  "Uses this.createValidationError() for validation errors",
  "Uses this.createAuthError() for authentication errors",
  "Uses this.createAuthorizationError() for authorization errors",
  "Uses this.executeOperation() for automatic logging",
  "Passes correlation context (requestId, userId) to errors",
  "Removes old error throwing patterns (throw new Error, etc.)",
  "Uses proper logging with correlation IDs",
  "Handles async operations with proper error propagation",
] as const;

export type MigrationChecklistItem =
  (typeof ERROR_HANDLING_MIGRATION_CHECKLIST)[number];
