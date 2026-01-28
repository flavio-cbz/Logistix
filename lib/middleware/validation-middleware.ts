import { NextRequest } from "next/server";
import { z, ZodError, ZodSchema } from "zod";
import { logger } from "@/lib/utils/logging/logger";
import type { ValidationErrorDetail as ApiValidationErrorDetail } from "@/lib/utils/api-response";

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

export interface ValidationContext {
  requestId: string;
  path: string;
  method: string;
  [key: string]: unknown;
}

export interface ValidationResult<T> {
  data: T;
  context: ValidationContext;
}

// Use shared ValidationErrorDetail from API response typings
export type ValidationErrorDetail = ApiValidationErrorDetail;

// =============================================================================
// VALIDATION ERROR CLASSES
// =============================================================================

export class RequestValidationError extends Error {
  public readonly code: string = "VALIDATION_ERROR";
  public readonly statusCode: number = 400;
  public readonly field: string | undefined;
  public readonly validationErrors: ValidationErrorDetail[];

  constructor(
    message: string,
    validationErrors: ValidationErrorDetail[] = [],
    field?: string,
  ) {
    super(message);
    this.field = field;
    this.validationErrors = validationErrors;
    this.name = "RequestValidationError";
    Object.setPrototypeOf(this, RequestValidationError.prototype);
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Generates a unique request ID for tracking
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Creates validation context from request
 */
function createValidationContext(request?: NextRequest): ValidationContext {
  return {
    requestId: generateRequestId(),
    path: request?.nextUrl?.pathname || "unknown",
    method: request?.method || "unknown",
  };
}

/**
 * Converts Zod errors to validation error details
 */
function formatZodErrors(zodError: ZodError): ValidationErrorDetail[] {
  return zodError.issues.map((error) => ({
    field: error.path.join("."),
    message: error.message,
    code: error.code,
  }));
}

/**
 * Safely parses JSON with error handling
 */
async function safeParseJson(
  request: NextRequest,
  context: ValidationContext,
): Promise<unknown> {
  try {
    const text = await request.text();

    if (!text || text.trim() === "") {
      logger.debug("Empty request body received", context as Record<string, unknown>);
      return {};
    }

    return JSON.parse(text);
  } catch (error) {
    logger.warn("Failed to parse JSON body", {
      ...context,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    throw new RequestValidationError("Invalid JSON in request body", [
      {
        field: "body",
        message: "Request body must be valid JSON",
        code: "invalid_json",
      },
    ]);
  }
}

/**
 * Safely extracts URL search params
 */
function extractSearchParams(request: NextRequest): Record<string, unknown> {
  const params: Record<string, unknown> = {};

  request.nextUrl.searchParams.forEach((value, key) => {
    // Handle multiple values for the same key
    if (params[key]) {
      if (Array.isArray(params[key])) {
        params[key].push(value);
      } else {
        params[key] = [params[key], value];
      }
    } else {
      params[key] = value;
    }
  });

  return params;
}

// =============================================================================
// CORE VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validates data against a Zod schema with detailed error handling
 */
function validateWithSchema<T>(
  schema: ZodSchema<T>,
  data: unknown,
  context: ValidationContext,
  fieldType: "body" | "query" | "params",
): T {
  try {
    logger.debug(`Validating ${fieldType}`, {
      ...(context as Record<string, unknown>),
      dataKeys:
        typeof data === "object" && data !== null
          ? Object.keys(data)
          : "non-object",
    });

    const result = schema.parse(data);

    logger.debug(`${fieldType} validation successful`, {
      ...(context as Record<string, unknown>),
      validatedKeys:
        typeof result === "object" && result !== null
          ? Object.keys(result)
          : "non-object",
    });

    return result;
  } catch (error) {
    if (error instanceof ZodError) {
      const validationErrors = formatZodErrors(error);

      logger.warn(`${fieldType} validation failed`, {
        ...(context as Record<string, unknown>),
        validationErrors,
        receivedData: data,
      });

      throw new RequestValidationError(
        `Invalid ${fieldType} data`,
        validationErrors,
        fieldType,
      );
    }

    logger.error(`Unexpected error during ${fieldType} validation`, {
      ...context,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    throw new RequestValidationError(
      `Validation service error for ${fieldType}`,
      [
        {
          field: fieldType,
          message: "Internal validation error",
          code: "validation_service_error",
        },
      ],
    );
  }
}

// =============================================================================
// PUBLIC VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validates request body against a Zod schema
 * @param schema - Zod schema to validate against
 * @param request - Next.js request object
 * @returns Promise<ValidationResult<T>> - Validated data with context
 * @throws RequestValidationError if validation fails
 */
export async function validateBody<T>(
  schema: ZodSchema<T>,
  request: NextRequest,
): Promise<ValidationResult<T>> {
  const context = createValidationContext(request);

  try {
    logger.debug("Starting body validation", context);

    const body = await safeParseJson(request, context);
    const validatedData = validateWithSchema(schema, body, context, "body");

    return {
      data: validatedData,
      context,
    };
  } catch (error) {
    logger.error("Body validation failed", {
      ...context,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

/**
 * Validates query parameters against a Zod schema
 * @param schema - Zod schema to validate against
 * @param request - Next.js request object
 * @returns ValidationResult<T> - Validated data with context
 * @throws RequestValidationError if validation fails
 */
export function validateQuery<T>(
  schema: ZodSchema<T>,
  request: NextRequest,
): ValidationResult<T> {
  const context = createValidationContext(request);

  try {
    logger.debug("Starting query validation", context);

    const queryParams = extractSearchParams(request);
    const validatedData = validateWithSchema(
      schema,
      queryParams,
      context,
      "query",
    );

    return {
      data: validatedData,
      context,
    };
  } catch (error) {
    logger.error("Query validation failed", {
      ...context,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}



// =============================================================================
// COMBINED VALIDATION FUNCTIONS
// =============================================================================



// =============================================================================
// COMMON VALIDATION SCHEMAS
// =============================================================================



/**
 * Common search query schema
 */
export const searchQuerySchema = z.object({
  q: z.string().min(1, "Search query cannot be empty").optional(),
  sort: z.enum(["asc", "desc"]).optional(),
  sortBy: z.string().optional(),
});
