/**
 * Vinted Validation - Custom Error Types
 * Defines specialized error classes for categorized error handling.
 */

/**
 * Base class for all custom application errors.
 */
export class AppError extends Error {
  public readonly context?: any;
  public readonly originalError?: Error;

  constructor(message: string, context?: any, originalError?: Error) {
    super(message);
    this.name = this.constructor.name;
    this.context = context;
    this.originalError = originalError;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Represents errors originating from the Vinted API.
 * - HTTP status codes (4xx, 5xx)
 * - Network errors (failed to fetch)
 * - Invalid API response (JSON parsing failed)
 */
export class ApiError extends AppError {
  public readonly statusCode?: number;

  constructor(message: string, statusCode?: number, context?: any, originalError?: Error) {
    super(message, context, originalError);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

/**
 * Represents errors during the validation logic.
 * - Price range mismatch
 * - Product not found during analysis
 * - Data integrity issues post-deletion
 */
export class ValidationError extends AppError {
  constructor(message: string, context?: any, originalError?: Error) {
    super(message, context, originalError);
    this.name = 'ValidationError';
  }
}

/**
 * Represents configuration or system-level errors.
 * - Missing API token
 * - Invalid configuration
 * - Database connection failure
 */
export class SystemError extends AppError {
  constructor(message: string, context?: any, originalError?: Error) {
    super(message, context, originalError);
    this.name = 'SystemError';
  }
}

/**
 * Represents a timeout error for an operation.
 */
export class TimeoutError extends AppError {
    constructor(operationName: string, timeout: number) {
        super(`Operation "${operationName}" timed out after ${timeout}ms.`, { operationName, timeout });
        this.name = 'TimeoutError';
    }
}

/**
 * Enum for detailed error categories.
 */
export enum ErrorCategory {
  // API Related
  ApiConnection = 'API_CONNECTION',      // Network level errors
  ApiAuthentication = 'API_AUTHENTICATION',// 401, 403 errors
  ApiRateLimit = 'API_RATE_LIMIT',       // 429 errors
  ApiNotFound = 'API_NOT_FOUND',         // 404 errors
  ApiServerError = 'API_SERVER_ERROR',     // 5xx errors
  ApiInvalidResponse = 'API_INVALID_RESPONSE',// JSON parsing or unexpected format

  // Validation Logic
  ValidationPrice = 'VALIDATION_PRICE',      // Price range mismatch
  ValidationIntegrity = 'VALIDATION_INTEGRITY',// Database integrity issues
  ValidationTimeout = 'VALIDATION_TIMEOUT',    // A specific validation step timed out

  // System & Configuration
  SystemConfiguration = 'SYSTEM_CONFIGURATION',// Missing or invalid config
  SystemDatabase = 'SYSTEM_DATABASE',        // DB connection or query errors
  SystemInternal = 'SYSTEM_INTERNAL',        // Unexpected internal errors
}

export type CategorizedError = {
  category: ErrorCategory;
  message: string;
  isCritical: boolean;
  originalError: Error;
  context?: any;
};

/**
 * Categorizes an error into a structured format.
 * @param error The error to categorize.
 * @returns A CategorizedError object.
 */
export function categorizeError(error: unknown): CategorizedError {
  const originalError = error instanceof Error ? error : new Error(String(error));

  if (originalError instanceof ApiError) {
    const statusCode = originalError.statusCode;
    let category = ErrorCategory.ApiConnection;
    if (statusCode) {
        if (statusCode === 401 || statusCode === 403) category = ErrorCategory.ApiAuthentication;
        else if (statusCode === 429) category = ErrorCategory.ApiRateLimit;
        else if (statusCode === 404) category = ErrorCategory.ApiNotFound;
        else if (statusCode >= 500) category = ErrorCategory.ApiServerError;
    } else if (originalError.message.toLowerCase().includes('json')) {
        category = ErrorCategory.ApiInvalidResponse;
    }
    return { category, message: originalError.message, isCritical: true, originalError, context: originalError.context };
  }

  if (originalError instanceof ValidationError) {
    let category = ErrorCategory.ValidationIntegrity;
    if (originalError.message.toLowerCase().includes('price')) {
        category = ErrorCategory.ValidationPrice;
    }
    return { category, message: originalError.message, isCritical: false, originalError, context: originalError.context };
  }
  
  if (originalError instanceof TimeoutError) {
    return { category: ErrorCategory.ValidationTimeout, message: originalError.message, isCritical: false, originalError, context: originalError.context };
  }

  if (originalError instanceof SystemError) {
    const category = originalError.message.toLowerCase().includes('database') ? ErrorCategory.SystemDatabase : ErrorCategory.SystemConfiguration;
    return { category, message: originalError.message, isCritical: true, originalError, context: originalError.context };
  }

  // Default fallback
  return {
    category: ErrorCategory.SystemInternal,
    message: 'An unexpected internal error occurred.',
    isCritical: true,
    originalError,
  };
}