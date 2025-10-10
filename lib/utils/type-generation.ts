/**
 * Automatic type generation utilities
 * This file provides utilities for generating TypeScript types from Zod schemas
 * and maintaining type consistency between runtime validation and compile-time types.
 */

import { z } from "zod";
import { schemas } from "./api-validation";

// ============================================================================
// Type Generation Configuration
// ============================================================================

const isDevelopment = process.env.NODE_ENV === "development";
const enableTypeGeneration = process.env.ENABLE_TYPE_GENERATION === "true";

// ============================================================================
// Schema to TypeScript Interface Generation
// ============================================================================

/**
 * Generates TypeScript interface string from Zod schema
 * This is a simplified implementation for development purposes
 */
export function generateInterfaceFromSchema(
  _schema: z.ZodSchema,
  interfaceName: string,
  options: {
    export?: boolean;
    readonly?: boolean;
    optional?: boolean;
  } = {},
): string {
  if (!enableTypeGeneration || !isDevelopment) {
    return "";
  }

  const {
    export: shouldExport = true,
    readonly: _readonly = false,
    optional: _optional = false,
  } = options;

  // This is a basic implementation - in production you'd use a library like zod-to-ts
  const exportKeyword = shouldExport ? "export " : "";
  // const _readonlyKeyword = readonly ? "readonly " : "";

  return `${exportKeyword}interface ${interfaceName} {
  // Generated from Zod schema
  // TODO: Implement full schema-to-interface conversion
  [key: string]: any;
}`;
}

/**
 * Generates TypeScript type alias from Zod schema
 */
export function generateTypeFromSchema(
  schema: z.ZodSchema,
  typeName: string,
  options: {
    export?: boolean;
  } = {},
): string {
  if (!enableTypeGeneration || !isDevelopment) {
    return "";
  }

  const { export: shouldExport = true } = options;
  const exportKeyword = shouldExport ? "export " : "";

  return `${exportKeyword}type ${typeName} = z.infer<typeof ${schema.constructor.name}>;`;
}

// ============================================================================
// Schema Validation and Type Inference
// ============================================================================

/**
 * Infers TypeScript type from Zod schema at runtime
 */
export type InferSchemaType<T extends z.ZodSchema> = z.infer<T>;

/**
 * Creates a typed validator function from a Zod schema
 */
export function createTypedValidator<T extends z.ZodSchema>(
  schema: T,
  name?: string,
): (data: unknown) => InferSchemaType<T> {
  return (data: unknown): InferSchemaType<T> => {
    try {
      return schema.parse(data);
    } catch (error) {
      const schemaName = name || "Unknown";
      throw new Error(
        `Validation failed for ${schemaName}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  };
}

/**
 * Creates a safe typed validator that returns null on failure
 */
export function createSafeTypedValidator<T extends z.ZodSchema>(
  schema: T,
  name?: string,
): (data: unknown) => InferSchemaType<T> | null {
  return (data: unknown): InferSchemaType<T> | null => {
    try {
      return schema.parse(data);
    } catch (error) {
      if (isDevelopment) {
        const schemaName = name || "Unknown";
        console.warn(`Safe validation failed for ${schemaName}:`, error);
      }
      return null;
    }
  };
}

// ============================================================================
// Pre-built Typed Validators
// ============================================================================

// API Response validators
export const validateApiResponseTyped = createTypedValidator(
  schemas.apiResponse,
  "ApiResponse",
);

export const validateApiResponseSafe = createSafeTypedValidator(
  schemas.apiResponse,
  "ApiResponse",
);

// Product validators
export const validateProductTyped = createTypedValidator(
  schemas.product,
  "Product",
);

export const validateProductSafe = createSafeTypedValidator(
  schemas.product,
  "Product",
);

// Parcelle validators
export const validateParcelleTyped = createTypedValidator(
  schemas.parcelle,
  "Parcelle",
);

export const validateParcelleSafe = createSafeTypedValidator(
  schemas.parcelle,
  "Parcelle",
);

// User validators
export const validateUserTyped = createTypedValidator(schemas.user, "User");

export const validateUserSafe = createSafeTypedValidator(schemas.user, "User");

// Request validators
export const validateProductListRequestTyped = createTypedValidator(
  schemas.productListRequest,
  "ProductListRequest",
);

export const validateParcelleListRequestTyped = createTypedValidator(
  schemas.parcelleListRequest,
  "ParcelleListRequest",
);

// ============================================================================
// Type-Safe API Response Handlers
// ============================================================================

/**
 * Type-safe API response handler with automatic validation
 */
export function handleApiResponse<T>(
  response: unknown,
  dataValidator?: (data: unknown) => T,
  context?: string,
): T {
  // First validate the response structure
  const validatedResponse = validateApiResponseTyped(response);

  if (!validatedResponse.success) {
    const error = validatedResponse.error;
    throw new Error(
      `API request failed${context ? ` in ${context}` : ""}: ${
        error?.message || "Unknown error"
      }`,
    );
  }

  // If no data validator provided, return raw data
  if (!dataValidator) {
    return validatedResponse.data as T;
  }

  // Validate the data with the provided validator
  return dataValidator(validatedResponse.data);
}

/**
 * Creates a type-safe API client method
 */
export function createApiMethod<TRequest, TResponse>(
  requestValidator?: (data: unknown) => TRequest,
  responseValidator?: (data: unknown) => TResponse,
) {
  return async (
    apiCall: (request: TRequest) => Promise<unknown>,
    request: TRequest,
    context?: string,
  ): Promise<TResponse> => {
    // Validate request if validator provided
    const validatedRequest = requestValidator
      ? requestValidator(request)
      : request;

    // Make API call
    const response = await apiCall(validatedRequest);

    // Validate and return response
    return handleApiResponse(response, responseValidator, context);
  };
}

// ============================================================================
// Schema Registry for Dynamic Validation
// ============================================================================

/**
 * Registry for storing and retrieving schemas by name
 */
class SchemaRegistry {
  private schemas = new Map<string, z.ZodSchema>();

  register<T extends z.ZodSchema>(name: string, schema: T): void {
    this.schemas.set(name, schema);
  }

  get<T extends z.ZodSchema>(name: string): T | undefined {
    return this.schemas.get(name) as T | undefined;
  }

  validate<T>(name: string, data: unknown): T {
    const schema = this.schemas.get(name);
    if (!schema) {
      throw new Error(`Schema not found: ${name}`);
    }
    return schema.parse(data) as T;
  }

  safeValidate<T>(name: string, data: unknown): T | null {
    const schema = this.schemas.get(name);
    if (!schema) {
      if (isDevelopment) {
        console.warn(`Schema not found: ${name}`);
      }
      return null;
    }

    try {
      return schema.parse(data) as T;
    } catch (error) {
      if (isDevelopment) {
        console.warn(`Validation failed for schema ${name}:`, error);
      }
      return null;
    }
  }

  listSchemas(): string[] {
    return Array.from(this.schemas.keys());
  }
}

// Global schema registry instance
export const schemaRegistry = new SchemaRegistry();

// Register built-in schemas
schemaRegistry.register("apiResponse", schemas.apiResponse);
schemaRegistry.register("product", schemas.product);
schemaRegistry.register("parcelle", schemas.parcelle);
schemaRegistry.register("user", schemas.user);
schemaRegistry.register("productListRequest", schemas.productListRequest);
schemaRegistry.register("parcelleListRequest", schemas.parcelleListRequest);

// ============================================================================
// Development Utilities
// ============================================================================

/**
 * Generates TypeScript definition file from registered schemas
 */
export function generateTypeDefinitions(): string {
  if (!enableTypeGeneration || !isDevelopment) {
    return "";
  }

  const schemaNames = schemaRegistry.listSchemas();
  const interfaces = schemaNames.map((name) => {
    const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);
    return generateInterfaceFromSchema(
      schemaRegistry.get(name)!,
      `Generated${capitalizedName}`,
      { export: true },
    );
  });

  return `// Auto-generated type definitions
// Generated at: ${new Date().toISOString()}

${interfaces.join("\n\n")}

// Schema registry types
export type RegisteredSchemaNames = ${schemaNames.map((name) => `'${name}'`).join(" | ")};
`;
}

/**
 * Validates that compile-time types match runtime schemas
 */
export function validateTypeConsistency(): boolean {
  if (!isDevelopment) {
    return true;
  }

  // This would contain logic to compare TypeScript interfaces with Zod schemas
  // For now, it's a placeholder that always returns true
  console.log("🔍 Type consistency validation not yet implemented");
  return true;
}

/**
 * Development helper to log schema information
 */
export function logSchemaInfo(schemaName: string): void {
  if (!isDevelopment) {
    return;
  }

  const schema = schemaRegistry.get(schemaName);
  if (!schema) {
    console.warn(`Schema not found: ${schemaName}`);
    return;
  }

  console.log(`📋 Schema Info: ${schemaName}`);
  console.log("Schema:", schema);

  // Log example usage
  console.log(`
Example usage:
  const validator = createTypedValidator(schemas.${schemaName}, '${schemaName}');
  const result = validator(data);
  `);
}

// ============================================================================
// Type Utilities for Better DX
// ============================================================================

/**
 * Utility type to extract the input type from a validator function
 */
export type ValidatorInput<T> = T extends (data: infer U) => any ? U : never;

/**
 * Utility type to extract the output type from a validator function
 */
export type ValidatorOutput<T> = T extends (data: any) => infer U ? U : never;

/**
 * Creates a type-safe wrapper around any validation function
 */
export function createValidatorWrapper<TInput, TOutput>(
  validator: (data: TInput) => TOutput,
  name?: string,
) {
  return {
    validate: validator,
    name: name || "Anonymous",
    safeValidate: (data: TInput): TOutput | null => {
      try {
        return validator(data);
      } catch (error) {
        if (isDevelopment) {
          console.warn(
            `Safe validation failed for ${name || "Anonymous"}:`,
            error,
          );
        }
        return null;
      }
    },
  };
}
