import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  CustomError,
  isCustomError,
  ValidationError,
  DatabaseError,
} from "../errors/custom-error";

/**
 * Standard API response interface
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    field?: string;
    details?: any;
  };
  meta: {
    timestamp: string;
    requestId: string;
    path?: string;
    version?: string;
  };
}

/**
 * Error context for logging and debugging
 */
export interface ErrorContext {
  requestId: string;
  userId?: string;
  path: string;
  method: string;
  userAgent?: string;
  ip?: string;
  timestamp: string;
  operation?: string;
  duration?: number;
}

/**
 * Sanitized error for safe client responses
 */
export interface SafeError {
  code: string;
  message: string;
  field?: string;
}

/**
 * Global error handler class for consistent error processing
 */
export class ErrorHandler {
  private static instance: ErrorHandler;

  private constructor() {}

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Handles API errors and returns standardized response
   */
  public handleApiError(
    error: unknown,
    req: NextRequest,
    context?: Partial<ErrorContext>,
  ): NextResponse<ApiResponse> {
    const requestId = this.getRequestId(req);
    const userAgent = req.headers.get("user-agent");
    const clientIP = this.getClientIP(req);
    const errorContext: ErrorContext = {
      requestId,
      path: req.nextUrl.pathname,
      method: req.method,
      ...(userAgent && { userAgent }),
      ...(clientIP && { ip: clientIP }),
      timestamp: new Date().toISOString(),
      ...context,
    };

    // Process the error and get standardized error info
    const processedError = this.processError(error, errorContext);

    // Log the error with full context
    this.logError(processedError.originalError, errorContext);

    // Create safe error response
    const safeError = this.sanitizeError(processedError.originalError);

    const response: ApiResponse = {
      success: false,
      error: safeError,
      meta: {
        timestamp: errorContext.timestamp,
        requestId: errorContext.requestId,
        path: errorContext.path,
        version: process.env.APP_VERSION || "1.0.0",
      },
    };

    return NextResponse.json(response, {
      status: processedError.statusCode,
      headers: {
        "X-Request-ID": requestId,
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Processes different types of errors into a standardized format
   */
  private processError(
    error: unknown,
    context: ErrorContext,
  ): {
    originalError: CustomError;
    statusCode: number;
  } {
    // Handle CustomError instances
    if (isCustomError(error)) {
      return {
        originalError: error,
        statusCode: error.statusCode,
      };
    }

    // Handle Zod validation errors
    if (error instanceof ZodError) {
      const field = error.errors[0]?.path?.join(".") || undefined;
      const message = error.errors[0]?.message || "Validation failed";
      const validationError = new ValidationError(message, field, {
        zodErrors: error.errors,
        operation: context.operation,
      });

      return {
        originalError: validationError,
        statusCode: 400,
      };
    }

    // Handle database errors (Drizzle, SQLite, etc.)
    if (this.isDatabaseError(error)) {
      const dbError = new DatabaseError(
        "Database operation failed",
        context.operation,
        {
          originalError: error instanceof Error ? error.message : String(error),
        },
      );

      return {
        originalError: dbError,
        statusCode: 500,
      };
    }

    // Handle standard JavaScript errors
    if (error instanceof Error) {
      const customError = new CustomError(
        error.message,
        "INTERNAL_ERROR",
        undefined,
      );

      return {
        originalError: customError,
        statusCode: 500,
      };
    }

    // Handle unknown error types
    const unknownError = new CustomError(
      "An unexpected error occurred",
      "UNKNOWN_ERROR",
      undefined,
    );

    return {
      originalError: unknownError,
      statusCode: 500,
    };
  }

  /**
   * Sanitizes error for safe client response
   * Removes sensitive information that shouldn't be exposed
   */
  public sanitizeError(error: unknown): SafeError {
    if (isCustomError(error)) {
      return {
        code: error.code,
        message: this.getSafeMessage(error),
        ...(error.field !== undefined && { field: error.field }),
      };
    }

    if (error instanceof ZodError) {
      const fieldPath = error.errors[0]?.path?.join(".");
      return {
        code: "VALIDATION_ERROR",
        message: "Invalid input data",
        ...(fieldPath && { field: fieldPath }),
      };
    }

    // For non-custom errors, return generic message in production
    const isProduction = process.env.NODE_ENV === "production";

    return {
      code: "INTERNAL_ERROR",
      message: isProduction
        ? "An internal error occurred"
        : error instanceof Error
          ? error.message
          : "Unknown error",
    };
  }

  /**
   * Logs error with proper context and correlation IDs
   */
  public logError(error: unknown, context: ErrorContext): void {
    const logEntry = {
      level: "error" as const,
      message: this.getErrorMessage(error),
      timestamp: context.timestamp,
      requestId: context.requestId,
      userId: context.userId,
      operation: context.operation,
      duration: context.duration,
      error: this.serializeErrorForLogging(error),
      context: {
        path: context.path,
        method: context.method,
        userAgent: context.userAgent,
        ip: context.ip,
      },
    };

    // In a real application, this would use a proper logging service
    // For now, we'll use console.error with structured logging
    console.error(JSON.stringify(logEntry, null, 2));
  }

  /**
   * Gets or generates request ID for correlation
   */
  private getRequestId(req: NextRequest): string {
    // Check for existing request ID in headers
    const existingId =
      req.headers.get("x-request-id") ||
      req.headers.get("x-correlation-id") ||
      req.headers.get("request-id");

    if (existingId) {
      return existingId;
    }

    // Generate new request ID
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Extracts client IP address from request
   */
  private getClientIP(req: NextRequest): string | undefined {
    // Check various headers for client IP
    const forwarded = req.headers.get("x-forwarded-for");
    if (forwarded) {
      return forwarded.split(",")[0].trim();
    }

    return (
      req.headers.get("x-real-ip") ||
      req.headers.get("x-client-ip") ||
      req.ip ||
      undefined
    );
  }

  /**
   * Determines if an error is database-related
   */
  private isDatabaseError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;

    const dbErrorIndicators = [
      "SQLITE_",
      "database",
      "connection",
      "constraint",
      "foreign key",
      "unique constraint",
      "not null constraint",
    ];

    const errorMessage = error.message.toLowerCase();
    const errorName = error.name.toLowerCase();

    return dbErrorIndicators.some(
      (indicator) =>
        errorMessage.includes(indicator) || errorName.includes(indicator),
    );
  }

  /**
   * Gets safe error message for client response
   */
  private getSafeMessage(error: CustomError): string {
    // In production, sanitize certain error messages
    if (process.env.NODE_ENV === "production") {
      // Don't expose internal error details in production
      if (error.code === "DATABASE_ERROR" || error.code === "INTERNAL_ERROR") {
        return "An internal error occurred";
      }
    }

    return error.message;
  }

  /**
   * Gets error message for logging
   */
  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  /**
   * Serializes error for logging purposes
   */
  private serializeErrorForLogging(error: unknown): any {
    if (isCustomError(error)) {
      return error.toJSON();
    }

    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    return { value: String(error) };
  }
}

/**
 * Convenience function to create error responses
 */
export function createErrorResponse(
  error: unknown,
  req: NextRequest,
  context?: Partial<ErrorContext>,
): NextResponse<ApiResponse> {
  const errorHandler = ErrorHandler.getInstance();
  return errorHandler.handleApiError(error, req, context);
}

/**
 * Middleware wrapper for API routes
 */
export function withErrorHandler<T extends any[], R>(
  handler: (...args: T) => Promise<R>,
  operation?: string,
) {
  return async (...args: T): Promise<R | NextResponse<ApiResponse>> => {
    try {
      return await handler(...args);
    } catch (error) {
      // Extract request from arguments (assuming it's the first parameter)
      const req = args[0] as NextRequest;

      return createErrorResponse(error, req, operation ? { operation } : {});
    }
  };
}

/**
 * Async error handler for service operations
 */
export async function handleServiceError<T>(
  operation: () => Promise<T>,
  context: {
    operation: string;
    requestId?: string;
    userId?: string;
  },
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    // Log the error with context
    const errorHandler = ErrorHandler.getInstance();
    const errorContext: ErrorContext = {
      requestId: context.requestId || `svc_${Date.now()}`,
      ...(context.userId && { userId: context.userId }),
      path: "service",
      method: "SERVICE",
      timestamp: new Date().toISOString(),
      operation: context.operation,
    };

    errorHandler.logError(error, errorContext);

    // Re-throw the error to be handled by the caller
    throw error;
  }
}
