import { NextResponse } from "next/server";
import { logger } from "@/lib/utils/logging/logger";
import {
  CustomError,
  ValidationError,
  AuthError,
} from "@/lib/errors/custom-error";
import {
  AuthenticationError,
  AuthorizationError,
  ValidationError as SharedValidationError,
} from "@/lib/shared/errors/base-errors";
import { SessionExpiredError } from "@/lib/middleware/auth-middleware";
import { RequestValidationError } from "@/lib/middleware/validation-middleware";

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

export interface ApiResponse<T = unknown> {
  ok: boolean;
  success: boolean;
  data?: T;
  error?: ApiError;
  // Metadata about the response
  meta: ApiMeta;
}

export interface ApiError {
  code: string;
  message: string;
  field?: string | undefined;
  details?: unknown;
  validationErrors?: ValidationErrorDetail[];
}

export interface ValidationErrorDetail {
  field: string;
  message: string;
  code: string;
  received?: unknown;
}

export interface ApiMeta {
  timestamp: string;
  requestId: string;
  version: string;
  path?: string | undefined;
  method?: string | undefined;
  duration?: number | undefined;
}

export interface ResponseOptions {
  requestId?: string | undefined;
  path?: string | undefined;
  method?: string | undefined;
  duration?: number | undefined;
  headers?: Record<string, string>;
  status?: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const API_VERSION = "1.0.0";

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Generates a unique request ID if not provided
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Creates API metadata object
 */
function createApiMeta(options: ResponseOptions = {}): ApiMeta {
  return {
    timestamp: new Date().toISOString(),
    requestId: options.requestId || generateRequestId(),
    version: API_VERSION,
    path: options.path,
    method: options.method,
    duration: options.duration,
  };
}

/**
 * Creates response headers with common security and caching headers
 */
function createResponseHeaders(
  customHeaders: Record<string, string> = {},
): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Cache-Control": "no-cache, no-store, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
    ...customHeaders,
  };
}

/**
 * Maps error types to HTTP status codes
 */
function getErrorStatusCode(error: unknown): number {
  if (
    error instanceof AuthenticationError ||
    error instanceof SessionExpiredError ||
    error instanceof AuthError
  ) {
    return 401;
  }

  if (error instanceof AuthorizationError) {
    return 403;
  }

  if (
    error instanceof ValidationError ||
    error instanceof SharedValidationError ||
    error instanceof RequestValidationError
  ) {
    return 400;
  }

  if (error instanceof CustomError) {
    // Map custom error codes to status codes
    switch (error.code) {
      case "NOT_FOUND_ERROR":
      case "NOT_FOUND":
        return 404;
      case "BUSINESS_ERROR":
        return 422;
      case "UNAUTHORIZED_ERROR":
        return 401;
      default:
        return 500;
    }
  }

  return 500;
}

/**
 * Extracts error information from various error types
 */
function extractErrorInfo(error: unknown): ApiError {
  if (error instanceof RequestValidationError) {
    const validationError = error as unknown as { field?: string; validationErrors?: ValidationErrorDetail[]; details?: unknown };
    return {
      code: "VALIDATION_ERROR",
      message: error.message,
      field: validationError.field,
      validationErrors: validationError.validationErrors,
      details: validationError.details,
    };
  }

  if (error instanceof SharedValidationError) {
    return {
      code: error.code,
      message: error.message,
      details: error.details,
    };
  }

  if (error instanceof AuthenticationError) {
    const authErr = error as unknown as { code?: string; details?: unknown };
    return {
      code: authErr.code || "AUTHENTICATION_ERROR",
      message: error.message,
      details: authErr.details,
    };
  }

  if (error instanceof AuthorizationError) {
    const authErr = error as unknown as { code?: string; details?: unknown };
    return {
      code: authErr.code || "AUTHORIZATION_ERROR",
      message: error.message,
      details: authErr.details,
    };
  }

  if (error instanceof CustomError) {
    return {
      code: error.code,
      message: error.message,
      details: error.context,
    };
  }

  if (error instanceof Error) {
    return {
      code: "INTERNAL_ERROR",
      message:
        process.env.NODE_ENV === "production"
          ? "An internal error occurred"
          : error.message,
      details:
        process.env.NODE_ENV === "production"
          ? undefined
          : {
            stack: error.stack,
            name: error.name,
          },
    };
  }

  return {
    code: "UNKNOWN_ERROR",
    message: "An unknown error occurred",
    details: process.env.NODE_ENV === "production" ? undefined : error,
  };
}

// =============================================================================
// SUCCESS RESPONSE BUILDERS
// =============================================================================

/**
 * Creates a successful API response
 * @param data - The response data
 * @param options - Response options including metadata
 * @returns NextResponse with standardized success format
 */
export function createSuccessResponse<T>(
  data: T,
  options: ResponseOptions = {},
): NextResponse {
  const response: ApiResponse<T> = {
    ok: true,
    success: true,
    data,
    meta: createApiMeta(options),
  };

  const headers = createResponseHeaders(options.headers);

  logger.debug("Creating success response", {
    requestId: response.meta.requestId,
    path: response.meta.path,
    method: response.meta.method,
    ...(response.meta.duration !== undefined && { duration: response.meta.duration }),
    dataType: typeof data,
    hasData: data !== null && data !== undefined,
  });

  return NextResponse.json(response, {
    status: 200,
    headers,
  });
}





// =============================================================================
// ERROR RESPONSE BUILDERS
// =============================================================================

/**
 * Creates an error API response
 * @param error - The error object
 * @param options - Response options including metadata
 * @returns NextResponse with standardized error format
 */
export function createErrorResponse(
  error: unknown,
  options: ResponseOptions = {},
): NextResponse {
  const statusCode = getErrorStatusCode(error);
  const errorInfo = extractErrorInfo(error);

  const response: ApiResponse = {
    ok: false,
    success: false,
    error: errorInfo,
    meta: createApiMeta(options),
  };

  const headers = createResponseHeaders(options.headers);

  // Log error with appropriate level
  const logLevel = statusCode >= 500 ? "error" : "warn";
  logger[logLevel]("Creating error response", {
    requestId: response.meta.requestId,
    path: response.meta.path,
    method: response.meta.method,
    ...(response.meta.duration !== undefined && { duration: response.meta.duration }),
    statusCode,
    errorCode: errorInfo.code,
    errorMessage: errorInfo.message,
    errorField: errorInfo.field,
    hasValidationErrors: !!errorInfo.validationErrors?.length,
  });

  return NextResponse.json(response, {
    status: statusCode,
    headers,
  });
}





/**
 * Creates a not found error response
 * @param resource - The resource that was not found
 * @param options - Response options
 * @returns NextResponse with 404 status
 */
export function createNotFoundResponse(
  resource: string = "Resource",
  options: ResponseOptions = {},
): NextResponse {
  const message = `${resource} not found`;

  const response: ApiResponse = {
    ok: false,
    success: false,
    error: {
      code: "NOT_FOUND",
      message,
    },
    meta: createApiMeta(options),
  };

  const headers = createResponseHeaders(options.headers);

  logger.warn("Creating not found response", {
    requestId: response.meta.requestId,
    path: response.meta.path,
    method: response.meta.method,
    resource,
    message,
  });

  return NextResponse.json(response, {
    status: 404,
    headers,
  });
}

// =============================================================================
// UTILITY RESPONSE HELPERS
// =============================================================================


/**
 * Creates standardized response options from a request
 */
function createResponseOptions(
  req?: Request,
  startTime?: number,
  requestId?: string
): ResponseOptions {
  const options: ResponseOptions = {
    requestId,
    duration: startTime ? Date.now() - startTime : undefined,
  };

  if (req) {
    try {
      const url = new URL(req.url);
      options.path = url.pathname;
      options.method = req.method;
    } catch {
      // Ignore URL parsing errors
    }
  }

  return options;
}
/**
 * Wraps an async handler with standardized error handling
 * @param handler - The async handler function
 * @returns Wrapped handler that catches and formats errors
 */
export function withErrorHandling<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>,
) {
  return async (...args: T): Promise<NextResponse> => {
    const startTime = Date.now();
    const requestId = generateRequestId();

    try {
      return await handler(...args);
    } catch (error) {
      const reqArg = args && args.length > 0 ? (args[0] as Request) : undefined;
      const options = createResponseOptions(reqArg, startTime, requestId);
      return createErrorResponse(error, options);
    }
  };
}



/**
 * Creates an authentication error response (401)
 */
export function createAuthErrorResponse(
  message: string = "Authentication required",
  options: ResponseOptions = {}
): NextResponse {
  return createErrorResponse(
    new AuthenticationError(message),
    { ...options, status: 401 }
  );
}

/**
 * Creates an authorization error response (403)
 */
export function createForbiddenResponse(
  message: string = "Access denied",
  options: ResponseOptions = {}
): NextResponse {
  return createErrorResponse(
    new AuthorizationError(message),
    { ...options, status: 403 }
  );
}
