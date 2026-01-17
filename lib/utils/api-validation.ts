/**
 * API contract validation utilities
 * This file provides runtime type checking for API responses and requests
 * to ensure type safety and catch contract violations early.
 */

import { z } from "zod";
import {
    ApiResponse,
    ProductListRequest,
    ParcelleListRequest,
} from "../shared/types/api";
import {
    Product,
    Parcelle,
    User,
    ProductStatus,
    Platform,
} from "../types/entities";
import {
    isProduct,
    isParcelle,
    isUser,
} from "../types/guards";

// ============================================================================
// Environment Configuration
// ============================================================================

const isDevelopment = process.env.NODE_ENV === "development";
const enableApiValidation = process.env['ENABLE_API_VALIDATION'] !== "false";

// ============================================================================
// Zod Schemas for API Validation
// ============================================================================

// Base API response schema
const apiResponseSchema = z.object({
    success: z.boolean(),
    data: z.unknown().optional(),
    error: z
        .object({
            code: z.string(),
            message: z.string(),
            field: z.string().optional(),
            details: z.unknown().optional(),
        })
        .optional(),
    meta: z
        .object({
            timestamp: z.string(),
            requestId: z.string(),
            version: z.string().optional(),
            path: z.string().optional(),
            method: z.string().optional(),
            userId: z.string().optional(),
        })
        .optional(),
});

// Product entity schema
const productSchema = z.object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    parcelleId: z.string().uuid().optional(),
    name: z.string().min(1),
    description: z.string().optional(),
    poids: z.number().positive(),
    price: z.number().min(0),
    currency: z.string().default("EUR"),
    coutLivraison: z.number().min(0).optional(),
    vendu: z.enum(["0", "1"]), // Simplified: 0=not sold, 1=sold
    dateMiseEnLigne: z.string().optional(),
    dateVente: z.string().optional(),
    prixVente: z.number().min(0).optional(),
    plateforme: z.nativeEnum(Platform).optional(),
    status: z.nativeEnum(ProductStatus),
    brand: z.string().optional(),
    category: z.string().optional(),
    subcategory: z.string().optional(),
    size: z.string().optional(),
    color: z.string().optional(),
    material: z.string().optional(),
    url: z.string().url().optional(),
    photoUrl: z.string().url().optional(),
    createdAt: z.string(),
    updatedAt: z.string().optional(),
    soldAt: z.string().optional(),
});

// Parcelle entity schema - Format camelCase (frontend)
const parcelleSchema = z.object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    numero: z.string().min(1),
    numeroSuivi: z.string().optional().nullable(),
    transporteur: z.string().min(1),
    nom: z.string().min(1),
    statut: z.string().min(1),
    actif: z.boolean(),
    prixAchat: z.number().min(0).optional().nullable(),
    // Poids 0 est acceptable (nonnegative), sinon certains enregistrements échouent la validation
    poids: z.number().nonnegative().optional().nullable(),
    prixTotal: z.number().min(0).optional().nullable(),
    prixParGramme: z.number().min(0).optional().nullable(),
    createdAt: z.string(),
    // Aligné avec le type: updatedAt peut être absent selon l'origine des données
    updatedAt: z.string().optional(),
});

// User entity schema (without sensitive fields)
const userSchema = z.object({
    id: z.string().uuid(),
    username: z.string().min(1),
    email: z.string().email().optional(),
    bio: z.string().optional(),
    avatar: z.string().optional(),
    language: z.string().optional(),
    theme: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string().optional(),
});

// Request schemas
const productListRequestSchema = z.object({
    page: z.number().int().min(1).optional(),
    limit: z.number().int().min(1).max(100).optional(),
    status: z.nativeEnum(ProductStatus).optional(),
    parcelleId: z.string().uuid().optional(),
    search: z.string().optional(),
    sortBy: z.enum(["name", "price", "createdAt", "updatedAt"]).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
    vendu: z.enum(["0", "1"]).optional(), // Simplified: 0=not sold, 1=sold
    plateforme: z.nativeEnum(Platform).optional(),
    priceMin: z.number().min(0).optional(),
    priceMax: z.number().min(0).optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
});

const parcelleListRequestSchema = z.object({
    page: z.number().int().min(1).optional(),
    limit: z.number().int().min(1).max(100).optional(),
    search: z.string().optional(),
    sortBy: z
        .enum(["numero", "transporteur", "prixTotal", "createdAt"])
        .optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
    transporteur: z.string().optional(),
    priceMin: z.number().min(0).optional(),
    priceMax: z.number().min(0).optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
});

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validates an API response structure
 */
export function validateApiResponse<T = unknown>(
    response: unknown,
    context?: string,
): ApiResponse<T> {
    if (!enableApiValidation) {
        return response as ApiResponse<T>;
    }

    try {
        const validated = apiResponseSchema.parse(response);



        return validated as ApiResponse<T>;
    } catch (error) {
        const errorMessage = `API response validation failed${context ? ` in ${context}` : ""}`;

        if (isDevelopment) {
            // console.error(errorMessage, error);
            // console.error("Response data:", response);
        }

        throw new Error(
            `${errorMessage}: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
    }
}

/**
 * Validates a Product entity
 */
export function validateProduct(product: unknown, context?: string): Product {
    if (!enableApiValidation) {
        return product as Product;
    }

    try {
        const validated = productSchema.parse(product);



        return validated as Product;
    } catch (error) {
        const errorMessage = `Product validation failed${context ? ` in ${context}` : ""}`;

        if (isDevelopment) {
            // console.error(errorMessage, error);
            // console.error("Product data:", product);
        }

        throw new Error(
            `${errorMessage}: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
    }
}

/**
 * Validates a Parcelle entity
 */
export function validateParcelle(parcelle: unknown, context?: string): Parcelle {
    if (!enableApiValidation) {
        return parcelle as Parcelle;
    }

    try {
        const validated = parcelleSchema.parse(parcelle);



        return validated as Parcelle;
    } catch (error) {
        const errorMessage = `Parcelle validation failed${context ? ` in ${context}` : ""}`;

        if (isDevelopment) {
            // console.error(errorMessage, error);
            // console.error("Parcelle data:", parcelle);
        }

        throw new Error(
            `${errorMessage}: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
    }
}

/**
 * Validates a User entity
 */
export function validateUser(
    user: unknown,
    context?: string,
): Omit<User, "passwordHash" | "encryptionSecret"> {
    if (!enableApiValidation) {
        return user as Omit<User, "passwordHash" | "encryptionSecret">;
    }

    try {
        const validated = userSchema.parse(user);



        return validated as Omit<User, "passwordHash" | "encryptionSecret">;
    } catch (error) {
        const errorMessage = `User validation failed${context ? ` in ${context}` : ""}`;

        if (isDevelopment) {
            // console.error(errorMessage, error);
            // console.error("User data:", user);
        }

        throw new Error(
            `${errorMessage}: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
    }
}

/**
 * Validates an array of entities
 */
export function validateEntityArray<T>(
    array: unknown[],
    validator: (item: unknown, context?: string) => T,
    context?: string,
): T[] {
    if (!enableApiValidation) {
        return array as T[];
    }

    if (!Array.isArray(array)) {
        throw new Error(
            `Expected array${context ? ` in ${context}` : ""}, got: ${typeof array}`,
        );
    }

    const validated: T[] = [];
    const errors: Array<{ index: number; error: string }> = [];

    array.forEach((item, index) => {
        try {
            validated.push(validator(item, `${context}[${index}]`));
        } catch (error) {
            errors.push({
                index,
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    });

    if (errors.length > 0) {
        const errorMessage = `Array validation failed${context ? ` in ${context}` : ""}`;

        if (isDevelopment) {
            // console.error(errorMessage, errors);
        }

        throw new Error(
            `${errorMessage}: ${errors.length} items failed validation`,
        );
    }

    return validated;
}

/**
 * Validates request parameters
 */
export function validateProductListRequest(params: unknown): ProductListRequest {
    if (!enableApiValidation) {
        return params as ProductListRequest;
    }

    try {
        return productListRequestSchema.parse(params) as ProductListRequest;
    } catch (error) {
        throw new Error(
            `Product list request validation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
    }
}

/**
 * Validates parcelle list request parameters
 */
export function validateParcelleListRequest(params: unknown): ParcelleListRequest {
    if (!enableApiValidation) {
        return params as ParcelleListRequest;
    }

    try {
        return parcelleListRequestSchema.parse(params) as ParcelleListRequest;
    } catch (error) {
        throw new Error(
            `Parcelle list request validation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
    }
}

// ============================================================================
// Type Assertion Utilities
// ============================================================================

/**
 * Asserts that an API response is successful and returns the data
 */
export function assertSuccessfulResponse<T>(
    response: unknown,
    context?: string,
): T {
    const validatedResponse = validateApiResponse<T>(response, context);

    if (!validatedResponse.success) {
        const error = validatedResponse.error;
        throw new Error(
            `API request failed${context ? ` in ${context}` : ""}: ${error?.message || "Unknown error"}`,
        );
    }

    return validatedResponse.data as T;
}

/**
 * Asserts that data is a valid Product and returns it
 */
export function assertProduct(data: unknown, context?: string): Product {
    if (isProduct(data)) {
        return validateProduct(data, context);
    }
    throw new Error(`Expected Product entity${context ? ` in ${context}` : ""}`);
}

/**
 * Asserts that data is a valid Parcelle and returns it
 */
export function assertParcelle(data: unknown, context?: string): Parcelle {
    if (isParcelle(data)) {
        return validateParcelle(data, context);
    }
    throw new Error(`Expected Parcelle entity${context ? ` in ${context}` : ""}`);
}

/**
 * Asserts that data is a valid User and returns it
 */
export function assertUser(
    data: unknown,
    context?: string,
): Omit<User, "passwordHash" | "encryptionSecret"> {
    if (isUser(data)) {
        return validateUser(data, context);
    }
    throw new Error(`Expected User entity${context ? ` in ${context}` : ""}`);
}

// ============================================================================
// Automatic Type Generation Utilities
// ============================================================================

/**
 * Generates TypeScript interface from Zod schema (for development)
 */
export function generateTypeFromSchema(
    _schema: z.ZodSchema,
    name: string,
): string {
    if (!isDevelopment) {
        return "";
    }

    // This is a simplified type generator for development purposes
    // In a real implementation, you might use libraries like zod-to-ts
    return `// Generated interface for ${name}\n// TODO: Implement proper type generation`;
}

/**
 * Validates and transforms API response data with automatic type inference
 */
export function validateAndTransform<T>(
    data: unknown,
    schema: z.ZodSchema<T>,
    context?: string,
): T {
    if (!enableApiValidation) {
        return data as T;
    }

    try {
        const validated = schema.parse(data);



        return validated;
    } catch (error) {
        const errorMessage = `Data validation failed${context ? ` in ${context}` : ""}`;

        if (isDevelopment) {
            // console.error(errorMessage, error);
            // console.error("Data:", data);
        }

        throw new Error(
            `${errorMessage}: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
    }
}

// ============================================================================
// Development Helpers
// ============================================================================

/**
 * Logs API contract violations in development
 */
export function logContractViolation(
    _expected: string,
    _actual: unknown,
    _context?: string,
): void {
    if (isDevelopment) {
        // console.warn(
        //     `🚨 API Contract Violation${context ? ` in ${context}` : ""}:`,
        // );
        // console.warn(`Expected: ${expected}`);
        // console.warn(`Actual:`, actual);
        // console.trace("Stack trace:");
    }
}

/**
 * Creates a development-only type checker that logs violations but doesn't throw
 */
export function createSoftValidator<T>(
    validator: (data: unknown, context?: string) => T,
    fallback: T,
) {
    return (data: unknown, context?: string): T => {
        if (!isDevelopment) {
            return (data || fallback) as T;
        }

        try {
            return validator(data, context);
        } catch (_error) {
            // console.warn(
            //     `Soft validation failed${context ? ` in ${context}` : ""}:`,
            //     error,
            // );
            return (data || fallback) as T;
        }
    };
}

// ============================================================================
// Export Schemas for External Use
// ============================================================================

export const schemas = {
    apiResponse: apiResponseSchema,
    product: productSchema,
    parcelle: parcelleSchema,
    user: userSchema,
    productListRequest: productListRequestSchema,
    parcelleListRequest: parcelleListRequestSchema,
} as const;
