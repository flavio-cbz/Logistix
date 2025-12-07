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

export interface ApiResponse<T = any> {
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
  details?: any;
  validationErrors?: ValidationErrorDetail[];
}

export interface ValidationErrorDetail {
  field: string;
  message: string;
  code: string;
  received?: any;
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
    return {
      code: "VALIDATION_ERROR",
      message: error.message,
      field: (error as any).field,
      validationErrors: (error as any).validationErrors,
      details: (error as any).details,
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
    return {
      code: (error as any).code || "AUTHENTICATION_ERROR",
      message: error.message,
      details: (error as any).details,
    };
  }

  if (error instanceof AuthorizationError) {
    return {
      code: (error as any).code || "AUTHORIZATION_ERROR",
      message: error.message,
      details: (error as any).details,
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

/**
 * Creates a successful response for resource creation
 * @param data - The created resource data
 * @param options - Response options
 * @returns NextResponse with 201 status
 */
export function createCreatedResponse<T>(
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

  logger.debug("Creating created response", {
    requestId: response.meta.requestId,
    path: response.meta.path,
    method: response.meta.method,
    ...(response.meta.duration !== undefined && { duration: response.meta.duration }),
  });

  return NextResponse.json(response, {
    status: 201,
    headers,
  });
}

/**
 * Creates a successful response with no content
 * @param options - Response options
 * @returns NextResponse with 204 status
 */
export function createNoContentResponse(
  options: ResponseOptions = {},
): NextResponse {
  const meta = createApiMeta(options);
  const headers = createResponseHeaders(options.headers);

  logger.debug("Creating no content response", {
    requestId: meta.requestId,
    path: meta.path,
    method: meta.method,
    ...(meta.duration !== undefined && { duration: meta.duration }),
  });

  return new NextResponse(null, {
    status: 204,
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
 * Creates a validation error response
 * @param message - Error message
 * @param validationErrors - Array of validation errors
 * @param options - Response options
 * @returns NextResponse with 400 status
 */
export function createValidationErrorResponse(
  message: string,
  validationErrors: ValidationErrorDetail[] = [],
  options: ResponseOptions = {},
): NextResponse {
  const response: ApiResponse = {
    ok: false,
    success: false,
    error: {
      code: "VALIDATION_ERROR",
      message,
      validationErrors,
    },
    meta: createApiMeta(options),
  };

  const headers = createResponseHeaders(options.headers);

  logger.warn("Creating validation error response", {
    requestId: response.meta.requestId,
    path: response.meta.path,
    method: response.meta.method,
    message,
    validationErrorCount: validationErrors.length,
    validationErrors,
  });

  return NextResponse.json(response, {
    status: 400,
    headers,
  });
}

/**
 * Creates an authentication error response
 * @param message - Error message
 * @param options - Response options
 * @returns NextResponse with 401 status
 */
export function createAuthErrorResponse(
  message: string = "Authentication required",
  options: ResponseOptions = {},
): NextResponse {
  const response: ApiResponse = {
    ok: false,
    success: false,
    error: {
      code: "AUTHENTICATION_ERROR",
      message,
    },
    meta: createApiMeta(options),
  };

  const headers = createResponseHeaders(options.headers);

  logger.warn("Creating authentication error response", {
    requestId: response.meta.requestId,
    path: response.meta.path,
    method: response.meta.method,
    message,
  });

  return NextResponse.json(response, {
    status: 401,
    headers,
  });
}

/**
 * Creates an authorization error response
 * @param message - Error message
 * @param options - Response options
 * @returns NextResponse with 403 status
 */
export function createAuthorizationErrorResponse(
  message: string = "Insufficient permissions",
  options: ResponseOptions = {},
): NextResponse {
  const response: ApiResponse = {
    ok: false,
    success: false,
    error: {
      code: "AUTHORIZATION_ERROR",
      message,
    },
    meta: createApiMeta(options),
  };

  const headers = createResponseHeaders(options.headers);

  logger.warn("Creating authorization error response", {
    requestId: response.meta.requestId,
    path: response.meta.path,
    method: response.meta.method,
    message,
  });

  return NextResponse.json(response, {
    status: 403,
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
 * Creates response options from request context
 * @param request - Next.js request object
 * @param startTime - Request start time for duration calculation
 * @param requestId - Optional request ID
 * @returns ResponseOptions object
 */
export function createResponseOptions(
  request?: Request,
  startTime?: number,
  requestId?: string,
): ResponseOptions {
  const duration = startTime ? Date.now() - startTime : undefined;

  return {
    requestId,
    path: request ? new URL(request.url).pathname : undefined,
    method: request?.method,
    duration,
  };
}

/**
 * Wraps an async handler with standardized error handling
 * @param handler - The async handler function
 * @returns Wrapped handler that catches and formats errors
 */
export function withErrorHandling(
  handler: (...args: any[]) => Promise<NextResponse>,
) {
  return async (...args: any[]): Promise<NextResponse> => {
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
 * Type guard to check if response is successful
 */
export function isSuccessResponse<T>(
  response: ApiResponse<T>,
): response is ApiResponse<T> & { success: true; data: T } {
  return response.success === true && response.data !== undefined;
}

/**
 * Type guard to check if response is an error
 */
export function isErrorResponse(
  response: ApiResponse,
): response is ApiResponse & { success: false; error: ApiError } {
  return response.success === false && response.error !== undefined;
}
