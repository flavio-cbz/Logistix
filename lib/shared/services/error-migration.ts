/**
 * @fileoverview Error handling migration service
 * @description Helps migrate existing services to use the new centralized error handling system
 * @version 1.0.0
 * @since 2025-01-10
 */

import { logger } from "@/lib/utils/logging/logger";
import { errorHandler, CentralizedErrorHandler } from "./error-handler";
import {
  CleanupError,
  ErrorContext,
  ErrorFactory,
  // isCleanupError, // Not used in this file
} from "@/lib/shared/errors/cleanup-error";

/**
 * Migration status for a service
 */
export interface MigrationStatus {
  serviceName: string;
  isMigrated: boolean;
  hasNewErrorMethods: boolean;
  hasLegacyErrorPatterns: boolean;
  migrationScore: number; // 0-100
  recommendations: string[];
}

/**
 * Migration checklist item
 */
export interface MigrationChecklistItem {
  id: string;
  description: string;
  completed: boolean;
  required: boolean;
}

/**
 * Service migration helper
 */
export class ErrorMigrationService {
  private static instance: ErrorMigrationService;
  private migrationHistory: Map<string, MigrationStatus> = new Map();

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): ErrorMigrationService {
    if (!ErrorMigrationService.instance) {
      ErrorMigrationService.instance = new ErrorMigrationService();
    }
    return ErrorMigrationService.instance;
  }

  /**
   * Converts legacy error patterns to new standardized errors
   */
  public convertLegacyError(
    error: unknown,
    operation: string,
    context: ErrorContext = {}
  ): CleanupError {
    return ErrorFactory.createError(error, operation, context);
  }

  /**
   * Wraps a legacy service method to use new error handling
   */
  public wrapLegacyMethod<T extends any[], R>(
    serviceName: string,
    methodName: string,
    method: (...args: T) => Promise<R>,
    context?: ErrorContext,
  ) {
    return errorHandler.wrapServiceMethod(serviceName, methodName, method, context);
  }

  /**
   * Analyzes a service to determine migration status
   */
  public analyzeService(serviceInstance: any, serviceName: string): MigrationStatus {
    const status: MigrationStatus = {
      serviceName,
      isMigrated: false,
      hasNewErrorMethods: false,
      hasLegacyErrorPatterns: false,
      migrationScore: 0,
      recommendations: [],
    };

    // Check for new error handling methods
    const hasErrorHandler = typeof serviceInstance.handleError === "function";
    const hasCreateNotFoundError = typeof serviceInstance.createNotFoundError === "function";
    const hasCreateValidationError = typeof serviceInstance.createValidationError === "function";
    const hasExecuteOperation = typeof serviceInstance.executeOperation === "function";

    status.hasNewErrorMethods = hasErrorHandler && hasCreateNotFoundError && hasCreateValidationError;

    // Check for legacy error patterns (this would need to be enhanced with actual code analysis)
    const hasLegacyThrows = this.hasLegacyErrorPatterns(serviceInstance);
    status.hasLegacyErrorPatterns = hasLegacyThrows;

    // Calculate migration score
    let score = 0;
    if (hasErrorHandler) score += 25;
    if (hasCreateNotFoundError) score += 20;
    if (hasCreateValidationError) score += 20;
    if (hasExecuteOperation) score += 15;
    if (!hasLegacyThrows) score += 20;

    status.migrationScore = score;
    status.isMigrated = score >= 80;

    // Generate recommendations
    if (!hasErrorHandler) {
      status.recommendations.push("Implement handleError() method using CentralizedErrorHandler");
    }
    if (!hasCreateNotFoundError) {
      status.recommendations.push("Add createNotFoundError() method using ErrorFactory");
    }
    if (!hasCreateValidationError) {
      status.recommendations.push("Add createValidationError() method using ErrorFactory");
    }
    if (hasLegacyThrows) {
      status.recommendations.push("Replace legacy 'throw new Error()' patterns with CleanupError classes");
    }
    if (!hasExecuteOperation) {
      status.recommendations.push("Implement executeOperation() method for automatic error handling");
    }

    // Store in history
    this.migrationHistory.set(serviceName, status);

    return status;
  }

  /**
   * Generates migration checklist for a service
   */
  public generateMigrationChecklist(serviceName: string): MigrationChecklistItem[] {
    return [
      {
        id: "import-cleanup-error",
        description: `Import CleanupError classes in ${serviceName}`,
        completed: false,
        required: true,
      },
      {
        id: "extend-base-service",
        description: `Make ${serviceName} extend BaseService or implement error handling interface`,
        completed: false,
        required: true,
      },
      {
        id: "implement-handle-error",
        description: "Implement handleError() method using CentralizedErrorHandler",
        completed: false,
        required: true,
      },
      {
        id: "implement-create-not-found",
        description: "Implement createNotFoundError() method",
        completed: false,
        required: true,
      },
      {
        id: "implement-create-validation",
        description: "Implement createValidationError() method",
        completed: false,
        required: true,
      },
      {
        id: "implement-execute-operation",
        description: "Implement executeOperation() method for automatic logging",
        completed: false,
        required: false,
      },
      {
        id: "replace-legacy-throws",
        description: "Replace legacy 'throw new Error()' patterns with CleanupError classes",
        completed: false,
        required: true,
      },
      {
        id: "add-correlation-context",
        description: "Pass correlation context (requestId, userId) to errors",
        completed: false,
        required: false,
      },
      {
        id: "update-error-handling",
        description: "Update catch blocks to use new error handling patterns",
        completed: false,
        required: true,
      },
      {
        id: "add-proper-logging",
        description: "Use proper logging with correlation IDs",
        completed: false,
        required: false,
      },
    ];
  }

  /**
   * Creates a base service class that services can extend
   */
  public createBaseService() {
    return class BaseService {
      protected errorHandler: CentralizedErrorHandler;
      protected requestId: string;
      protected userId: string;

      constructor(requestId?: string, userId?: string) {
        this.errorHandler = errorHandler;
        this.requestId = requestId || "";
        this.userId = userId || "";
      }

      /**
       * Handles any error and converts it to CleanupError
       */
      protected handleError(
        error: unknown,
        operation: string,
        additionalContext: ErrorContext = {}
      ): CleanupError {
        const context: ErrorContext = {
          requestId: this.requestId,
          userId: this.userId,
          ...additionalContext,
        };
        return this.errorHandler.handleError(error, operation, context);
      }

      /**
       * Creates a not found error
       */
      protected createNotFoundError(
        resource: string,
        identifier?: string,
        context: ErrorContext = {}
      ): CleanupError {
        return ErrorFactory.createNotFoundError(resource, identifier, {
          requestId: this.requestId,
          userId: this.userId,
          ...context,
        });
      }

      /**
       * Creates a validation error
       */
      protected createValidationError(
        message: string,
        field?: string,
        context: ErrorContext = {}
      ): CleanupError {
        return ErrorFactory.createValidationError(message, field, {
          requestId: this.requestId,
          userId: this.userId,
          ...context,
        });
      }

      /**
       * Creates a database error
       */
      protected createDatabaseError(
        message: string,
        operation: string,
        context: ErrorContext = {}
      ): CleanupError {
        return ErrorFactory.createDatabaseError(message, operation, {
          requestId: this.requestId,
          userId: this.userId,
          ...context,
        });
      }

      /**
       * Executes an operation with automatic error handling and logging
       */
      protected async executeOperation<T>(
        operation: () => Promise<T>,
        operationName: string,
        context: ErrorContext = {}
      ): Promise<T> {
        try {
          logger.info(`Starting operation: ${operationName}`, {
            requestId: this.requestId,
            userId: this.userId,
            operation: operationName,
            ...context,
          });

          const result = await operation();

          logger.info(`Operation completed successfully: ${operationName}`, {
            requestId: this.requestId,
            userId: this.userId,
            operation: operationName,
            ...context,
          });

          return result;
        } catch (error) {
          const cleanupError = this.handleError(error, operationName, context);
          
          logger.error(`Operation failed: ${operationName}`, {
            requestId: this.requestId,
            userId: this.userId,
            operation: operationName,
            error: cleanupError.toJSON(),
            ...context,
          });

          throw cleanupError;
        }
      }

      /**
       * Executes an operation with retry logic
       */
      protected async executeWithRetry<T>(
        operation: () => Promise<T>,
        operationName: string,
        retryOptions?: Partial<{ maxRetries: number; baseDelay: number }>,
        context: ErrorContext = {}
      ): Promise<T> {
        return this.errorHandler.retryWithBackoff(
          operation,
          operationName,
          retryOptions,
          (attempt, error) => {
            logger.warn(`Retry attempt ${attempt} for ${operationName}`, {
              requestId: this.requestId,
              userId: this.userId,
              operation: operationName,
              attempt,
              error: error.toJSON(),
              ...context,
            });
          }
        );
      }
    };
  }

  /**
   * Checks if a service has legacy error patterns
   */
  private hasLegacyErrorPatterns(serviceInstance: any): boolean {
    // This is a simplified check - in a real implementation, you might use
    // static analysis tools to scan the actual source code
    const serviceString = serviceInstance.toString();
    
    return (
      serviceString.includes('throw new Error') ||
      serviceString.includes('new Error(') ||
      serviceString.includes('Error(')
    );
  }

  /**
   * Gets migration history for all services
   */
  public getMigrationHistory(): Map<string, MigrationStatus> {
    return new Map(this.migrationHistory);
  }

  /**
   * Gets migration status for a specific service
   */
  public getMigrationStatus(serviceName: string): MigrationStatus | undefined {
    return this.migrationHistory.get(serviceName);
  }

  /**
   * Generates a migration report
   */
  public generateMigrationReport(): {
    totalServices: number;
    migratedServices: number;
    migrationProgress: number;
    serviceStatuses: MigrationStatus[];
    overallRecommendations: string[];
  } {
    const statuses = Array.from(this.migrationHistory.values());
    const migratedCount = statuses.filter(s => s.isMigrated).length;
    const totalCount = statuses.length;
    
    const overallRecommendations: string[] = [];
    
    if (migratedCount < totalCount) {
      overallRecommendations.push(
        `${totalCount - migratedCount} services still need migration to new error handling`
      );
    }
    
    const lowScoreServices = statuses.filter(s => s.migrationScore < 50);
    if (lowScoreServices.length > 0) {
      overallRecommendations.push(
        `${lowScoreServices.length} services have low migration scores and need immediate attention`
      );
    }

    return {
      totalServices: totalCount,
      migratedServices: migratedCount,
      migrationProgress: totalCount > 0 ? (migratedCount / totalCount) * 100 : 0,
      serviceStatuses: statuses,
      overallRecommendations,
    };
  }
}

/**
 * Default migration service instance
 */
export const migrationService = ErrorMigrationService.getInstance();

/**
 * Migration checklist for manual verification
 */
export const ERROR_HANDLING_MIGRATION_CHECKLIST = [
  "Service extends BaseService or implements error handling interface",
  "Imports CleanupError classes from @/lib/shared/errors/cleanup-error",
  "Uses this.handleError() for generic error handling",
  "Uses this.createNotFoundError() for resource not found",
  "Uses this.createValidationError() for validation errors",
  "Uses this.createDatabaseError() for database errors",
  "Uses this.executeOperation() for automatic logging",
  "Passes correlation context (requestId, userId) to errors",
  "Removes old error throwing patterns (throw new Error, etc.)",
  "Uses proper logging with correlation IDs",
  "Handles async operations with proper error propagation",
] as const;

export type MigrationChecklistItemType = typeof ERROR_HANDLING_MIGRATION_CHECKLIST[number];

export default migrationService;