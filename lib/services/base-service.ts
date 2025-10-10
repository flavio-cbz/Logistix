import { z } from "zod";
import {
  getLogger,
  ILogger,
  LogContext,
  createPerformanceLogger,
} from "@/lib/utils/logging/logger";
import {
  CustomError,
  ValidationError,
  NotFoundError,
  AuthError,
  AuthorizationError,
  BusinessLogicError,
  DatabaseError,
  isCustomError,
} from "@/lib/errors/custom-error";

/**
 * Base service class providing common functionality for all services
 *
 * This abstract class serves as the foundation for all business logic services in the application.
 * It provides standardized patterns for:
 * - Logging with correlation IDs and structured context
 * - Input validation using Zod schemas
 * - Error handling with custom error types
 * - Operation tracking and performance monitoring
 * - Request correlation across service boundaries
 *
 * @example
 * ```typescript
 * class MyService extends BaseService {
 *   constructor(private repository: MyRepository) {
 *     super('MyService');
 *   }
 *
 *   async doSomething(id: string): Promise<Result> {
 *     return this.executeOperation('doSomething', async () => {
 *       this.validateUUID(id, 'id');
 *       return await this.repository.findById(id);
 *     }, { id });
 *   }
 * }
 * ```
 *
 * @abstract
 * @since 1.0.0
 */
export abstract class BaseService {
  protected readonly logger: ILogger;
  private readonly operationCounter = new Map<string, number>();
  private requestId?: string;
  private userId?: string;

  constructor(
    protected readonly serviceName: string,
    context?: LogContext,
  ) {
    this.logger = getLogger(serviceName, context);
    if (context?.requestId !== undefined) {
      this.requestId = context.requestId;
    }
    if (context?.userId !== undefined) {
      this.userId = context.userId;
    }
  }

  /**
   * Sets the request ID for correlation across operations
   */
  public setRequestId(requestId: string): void {
    this.requestId = requestId;
  }

  /**
   * Sets the user ID for user-specific operations
   */
  public setUserId(userId: string): void {
    this.userId = userId;
  }

  /**
   * Gets the current log context
   */
  protected getLogContext(additionalContext?: Record<string, any>): LogContext {
    return {
      requestId: this.requestId,
      userId: this.userId,
      service: this.serviceName,
      ...additionalContext,
    };
  }

  /**
   * Generates a unique operation ID for tracking requests
   */
  protected generateOperationId(operation: string): string {
    const counter = this.operationCounter.get(operation) || 0;
    this.operationCounter.set(operation, counter + 1);

    return `${this.serviceName}_${operation}_${Date.now()}_${counter.toString().padStart(3, "0")}`;
  }

  /**
   * Logs the start of an operation and returns an operation ID for tracking
   */
  protected logOperationStart(
    operation: string,
    context: Record<string, any> = {},
  ): string {
    const operationId = this.generateOperationId(operation);

    this.logger.info(
      `Starting operation: ${operation}`,
      this.getLogContext({
        operationId,
        operation,
        ...context,
      }),
    );

    return operationId;
  }

  /**
   * Logs successful completion of an operation
   */
  protected logOperationSuccess(
    operationId: string,
    operation: string,
    startTime: number,
    context: Record<string, any> = {},
  ): void {
    const duration = Date.now() - startTime;

    this.logger.info(
      `Operation completed successfully: ${operation}`,
      this.getLogContext({
        operationId,
        operation,
        duration,
        status: "success",
        ...context,
      }),
    );
  }

  /**
   * Logs operation failure with error details
   */
  protected logOperationError(
    operationId: string,
    operation: string,
    startTime: number,
    error: unknown,
    context: Record<string, any> = {},
  ): void {
    const duration = Date.now() - startTime;
    const errorMessage = this.getErrorMessage(error);
    const errorCode = isCustomError(error) ? error.code : "UNKNOWN_ERROR";

    this.logger.error(
      `Operation failed: ${operation}`,
      this.getLogContext({
        operationId,
        operation,
        duration,
        status: "error",
        errorCode,
        errorMessage,
        ...context,
      }),
      error,
    );
  }

  /**
   * Validates that a value is a valid UUID
   */
  protected validateUUID(
    value: string,
    fieldName: string,
    operation?: string,
  ): void {
    if (!value) {
      throw new ValidationError(`${fieldName} is required`, fieldName);
    }

    const uuidSchema = z.string().uuid();

    try {
      uuidSchema.parse(value);
    } catch (error) {
      if (error instanceof z.ZodError) {
        this.logger.warn(`UUID validation failed for ${fieldName}`, {
          service: this.serviceName,
          operation,
          fieldName,
          providedValue: value,
          validationErrors: error.errors,
        });

        throw new ValidationError(
          `${fieldName} must be a valid UUID`,
          fieldName,
          { value: value },
        );
      }
      throw error;
    }
  }

  /**
   * Validates that a value is a valid identifier (UUID or custom format)
   */
  protected validateId(
    value: string,
    fieldName: string,
    operation?: string,
  ): void {
    if (!value) {
      throw new ValidationError(`${fieldName} is required`, fieldName);
    }

    // Try UUID first
    const uuidSchema = z.string().uuid();

    try {
      uuidSchema.parse(value);
      return;
    } catch (uuidError) {
      // If not UUID, try custom ID format
      const customIdSchema = z
        .string()
        .min(1)
        .max(50)
        .regex(/^[a-zA-Z0-9_-]+$/);

      try {
        customIdSchema.parse(value);
        return;
      } catch (customError) {
        if (customError instanceof z.ZodError) {
          this.logger.warn(`ID validation failed for ${fieldName}`, {
            service: this.serviceName,
            operation,
            fieldName,
            providedValue: value,
            validationErrors: customError.errors,
          });

          throw new ValidationError(
            `${fieldName} must be a valid identifier`,
            fieldName,
            { value: value },
          );
        }
        throw customError;
      }
    }
  }

  /**
   * Validates that a value is a positive number
   */
  protected validatePositiveNumber(
    value: number,
    fieldName: string,
    _operation?: string,
  ): void {
    if (typeof value !== "number" || isNaN(value) || !isFinite(value)) {
      throw new ValidationError(
        `${fieldName} must be a valid number`,
        fieldName,
        { value: value },
      );
    }

    if (value <= 0) {
      throw new ValidationError(
        `${fieldName} must be a positive number`,
        fieldName,
        { value: value },
      );
    }
  }

  /**
   * Validates that a value is a non-negative number
   */
  protected validateNonNegativeNumber(
    value: number,
    fieldName: string,
    _operation?: string,
  ): void {
    if (typeof value !== "number" || isNaN(value) || !isFinite(value)) {
      throw new ValidationError(
        `${fieldName} must be a valid number`,
        fieldName,
        { value: value },
      );
    }

    if (value < 0) {
      throw new ValidationError(
        `${fieldName} must be non-negative`,
        fieldName,
        { value: value },
      );
    }
  }

  /**
   * Validates that a string is not empty and within length limits
   */
  protected validateString(
    value: string,
    fieldName: string,
    minLength: number = 1,
    maxLength: number = 255,
    _operation?: string,
  ): void {
    if (typeof value !== "string") {
      throw new ValidationError(`${fieldName} must be a string`, fieldName, {
        value: value,
      });
    }

    const trimmedValue = value.trim();

    if (trimmedValue.length < minLength) {
      throw new ValidationError(
        `${fieldName} must be at least ${minLength} characters long`,
        fieldName,
        { value: value, minLength },
      );
    }

    if (trimmedValue.length > maxLength) {
      throw new ValidationError(
        `${fieldName} cannot exceed ${maxLength} characters`,
        fieldName,
        { value: value, maxLength },
      );
    }
  }

  /**
   * Handles and standardizes error processing with proper correlation
   */
  protected handleError(
    error: unknown,
    operation: string,
    context: any = {},
  ): never {
    const operationId = this.generateOperationId(`error_${operation}`);

    // Log the error with full context and correlation
    this.logger.error(
      `Error in ${operation}`,
      this.getLogContext({
        operationId,
        operation,
        ...context,
      }),
      error,
    );

    // Re-throw known custom errors (they already have proper structure)
    if (isCustomError(error)) {
      throw error;
    }

    // Convert Zod validation errors
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      throw new ValidationError(
        firstError?.message || "Validation failed",
        firstError?.path?.[0]?.toString(),
        {
          validationErrors: error.errors,
          operation,
          requestId: this.requestId,
        },
      );
    }

    // Handle database constraint errors
    if (error instanceof Error) {
      if (error.message.includes("UNIQUE constraint")) {
        throw new ValidationError(
          "A record with this value already exists",
          undefined,
          { operation, requestId: this.requestId },
        );
      }

      if (error.message.includes("FOREIGN KEY constraint")) {
        throw new ValidationError(
          "Referenced record does not exist",
          undefined,
          { operation, requestId: this.requestId },
        );
      }

      // Handle database-related errors
      if (this.isDatabaseError(error)) {
        throw new DatabaseError("Database operation failed", operation, {
          originalError: error.message,
          requestId: this.requestId,
        });
      }
    }

    // Default to generic service error
    throw new CustomError(
      `An error occurred in ${operation}`,
      "SERVICE_ERROR",
      {
        originalError: this.getErrorMessage(error),
        operation,
        requestId: this.requestId,
      },
    );
  }

  /**
   * Determines if an error is database-related
   */
  private isDatabaseError(error: Error): boolean {
    const dbErrorIndicators = [
      "SQLITE_",
      "database",
      "connection",
      "constraint",
      "foreign key",
      "unique constraint",
      "not null constraint",
      "database is locked",
    ];

    const errorMessage = error.message.toLowerCase();
    const errorName = error.name.toLowerCase();

    return dbErrorIndicators.some(
      (indicator) =>
        errorMessage.includes(indicator) || errorName.includes(indicator),
    );
  }

  /**
   * Safely extracts error message from unknown error types
   */
  protected getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === "string") {
      return error;
    }

    return "Unknown error occurred";
  }

  /**
   * Creates a standardized not found error with correlation context
   */
  protected createNotFoundError(
    resource: string,
    identifier?: string,
  ): NotFoundError {
    return new NotFoundError(resource, identifier, {
      requestId: this.requestId,
      userId: this.userId,
      service: this.serviceName,
    });
  }

  /**
   * Creates a standardized authentication error with correlation context
   */
  protected createAuthError(
    message: string = "Authentication failed",
  ): AuthError {
    return new AuthError(message, {
      requestId: this.requestId,
      userId: this.userId,
      service: this.serviceName,
    });
  }

  /**
   * Creates a standardized authorization error with correlation context
   */
  protected createAuthorizationError(
    message: string = "Insufficient permissions",
  ): AuthorizationError {
    return new AuthorizationError(message, {
      requestId: this.requestId,
      userId: this.userId,
      service: this.serviceName,
    });
  }

  /**
   * Creates a standardized business logic error with correlation context
   */
  protected createBusinessError(
    message: string,
    details?: any,
  ): BusinessLogicError {
    return new BusinessLogicError(message, {
      ...details,
      requestId: this.requestId,
      userId: this.userId,
      service: this.serviceName,
    });
  }

  /**
   * Creates a standardized validation error with correlation context
   */
  protected createValidationError(
    message: string,
    field?: string,
    details?: any,
  ): ValidationError {
    return new ValidationError(message, field, {
      ...details,
      requestId: this.requestId,
      userId: this.userId,
      service: this.serviceName,
    });
  }

  /**
   * Validates data using a Zod schema and returns validated data
   */
  protected validateWithSchema<T>(
    schema: z.ZodSchema<T>,
    data: unknown,
    operation?: string,
  ): T {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];

        this.logger.warn(`Schema validation failed`, {
          service: this.serviceName,
          operation,
          validationErrors: error.errors,
        });

        throw new ValidationError(
          firstError?.message || "Validation failed",
          firstError?.path?.[0]?.toString(),
          { validationErrors: error.errors },
        );
      }
      throw error;
    }
  }

  /**
   * Executes an operation with automatic logging, error handling, and performance tracking
   *
   * This method wraps service operations to provide:
   * - Automatic operation logging with start/end timestamps
   * - Performance monitoring and timing
   * - Error handling with proper correlation context
   * - Request ID propagation for distributed tracing
   *
   * @template T The return type of the operation
   * @param operationName - A descriptive name for the operation (e.g., 'createProduct')
   * @param operation - The async function to execute
   * @param context - Additional context to include in logs
   * @returns Promise resolving to the operation result
   * @throws {CustomError} Enhanced with correlation context if the operation fails
   *
   * @example
   * ```typescript
   * async createUser(userData: CreateUserInput): Promise<User> {
   *   return this.executeOperation('createUser', async () => {
   *     this.validateWithSchema(createUserSchema, userData);
   *     return await this.userRepository.create(userData);
   *   }, { username: userData.username });
   * }
   * ```
   */
  protected async executeOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    context: Record<string, any> = {},
  ): Promise<T> {
    const startTime = Date.now();
    const operationId = this.logOperationStart(operationName, context);
    const perfLogger = createPerformanceLogger(
      operationName,
      this.logger,
      this.getLogContext(context),
    );

    try {
      const result = await operation();
      this.logOperationSuccess(operationId, operationName, startTime, context);
      perfLogger.end("Operation completed successfully");
      return result;
    } catch (error) {
      this.logOperationError(
        operationId,
        operationName,
        startTime,
        error,
        context,
      );
      perfLogger.end("Operation failed", {
        error: isCustomError(error) ? error.code : "UNKNOWN_ERROR",
      });

      // Ensure error has proper correlation context
      if (isCustomError(error) && !error.context?.requestId) {
        // Add correlation context to custom errors that don't have it
        // Different error types have different constructor signatures
        const enhancedContext = {
          ...error.context,
          requestId: this.requestId,
          userId: this.userId,
          service: this.serviceName,
          operation: operationName,
        };
        
        let enhancedError: CustomError;
        
        if (error.constructor.name === 'ValidationError') {
          // ValidationError(message: string, field?: string, context?: Record<string, any>)
          enhancedError = new (error.constructor as any)(
            error.message,
            error.field,
            enhancedContext,
          );
        } else if (error.constructor.name === 'NotFoundError') {
          // NotFoundError has a special constructor, let's create a new CustomError instead
          enhancedError = new CustomError(
            error.message,
            error.code,
            enhancedContext,
            error.field,
          );
        } else {
          // Default CustomError(message: string, code?: string, context?: Record<string, any>, field?: string)
          enhancedError = new (error.constructor as any)(
            error.message,
            error.code,
            enhancedContext,
            error.field,
          );
        }
        
        throw enhancedError;
      }

      throw error;
    }
  }

  /**
   * Executes a synchronous operation with automatic logging and error handling
   */
  protected executeOperationSync<T>(
    operationName: string,
    operation: () => T,
    context: Record<string, any> = {},
  ): T {
    const startTime = Date.now();
    const operationId = this.logOperationStart(operationName, context);

    try {
      const result = operation();
      this.logOperationSuccess(operationId, operationName, startTime, context);
      return result;
    } catch (error) {
      this.logOperationError(
        operationId,
        operationName,
        startTime,
        error,
        context,
      );
      throw error;
    }
  }
}
