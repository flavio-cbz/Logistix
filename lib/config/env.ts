/**
 * Environment Configuration with Zod Validation
 * 
 * Provides type-safe access to environment variables with fail-fast behavior at boot.
 * All environment variables are validated on application startup.
 */

import { z } from "zod";
import { logger } from "@/lib/utils/logging/logger";

// ============================================================================
// ENVIRONMENT SCHEMA
// ============================================================================

const envSchema = z.object({
    // Node environment
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

    // Database
    LOGISTIX_DB_PATH: z.string().default("./data/logistix.db"),
    DATABASE_PATH: z.string().optional(), // Docker compatibility

    // Authentication
    JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
    COOKIE_NAME: z.string().default("logistix_session"),
    SESSION_TIMEOUT_MS: z.coerce.number().default(86400000), // 24 hours

    // Logging
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

    // Admin bootstrap (dev only)
    ADMIN_DEFAULT_PASSWORD: z.string().optional(),
    ADMIN_FORCE_PASSWORD_CHANGE: z.coerce.boolean().default(true),

    // Security - Master encryption key (64 hex chars = 32 bytes)
    ENCRYPTION_MASTER_KEY: z.string().regex(/^[a-fA-F0-9]{64}$/, "Must be 64 hex characters").optional(),

    // AI / Machine Learning
    OPENAI_API_KEY: z.string().optional(),
    AI_MODEL_PRIMARY: z.string().default("gpt-4"),
    AI_MODEL_FALLBACK: z.string().default("gpt-3.5-turbo"),

    // Superbuy Integration
    SUPERBUY_API_KEY: z.string().optional(),
    SUPERBUY_API_SECRET: z.string().optional(),

    // Vinted Integration
    VINTED_API_KEY: z.string().optional(),
    VINTED_API_SECRET: z.string().optional(),

    // Monitoring
    SENTRY_DSN: z.string().url().optional(),
    MONITORING_ENABLED: z.coerce.boolean().default(false),

    // Feature Flags
    FEATURE_FLAGS_CONFIG: z.string().optional(), // JSON string

    // Cache (Redis)
    REDIS_URL: z.string().url().optional(),

    // Debug
    DEBUG: z.string().optional(),
    DEBUG_ROUTES_ENABLED: z.coerce.boolean().default(false),
    DEBUG_LOGGING: z.coerce.boolean().default(false),
    ENABLE_CACHE: z.coerce.boolean().default(true),

    // Bundle analysis
    ANALYZE: z.coerce.boolean().default(false),
});

// ============================================================================
// VALIDATION AND EXPORT
// ============================================================================

export type Env = z.infer<typeof envSchema>;

/**
 * Validates environment variables on first access.
 * Throws on validation failure (fail-fast behavior).
 */
function validateEnv(): Env {
    const result = envSchema.safeParse(process.env);

    if (!result.success) {
        const errors = result.error.flatten().fieldErrors;
        const errorMessages = Object.entries(errors)
            .map(([field, messages]) => `  - ${field}: ${messages?.join(", ")}`)
            .join("\n");

        logger.error("❌ Invalid environment configuration:\n" + errorMessages);

        // In production, fail-fast is critical
        if (process.env.NODE_ENV === "production") {
            throw new Error("Environment validation failed. Check logs for details.");
        }

        // In development, log warnings but continue with defaults
        logger.warn("⚠️ Continuing with defaults in development mode...");
        return envSchema.parse(process.env);
    }

    return result.data;
}

// Lazy-load and cache the validated environment
let cachedEnv: Env | null = null;

/**
 * Get validated environment configuration.
 * First call validates all variables; subsequent calls return cached result.
 */
export function getEnv(): Env {
    if (!cachedEnv) {
        cachedEnv = validateEnv();
    }
    return cachedEnv;
}

/**
 * Type-safe environment variable access.
 * Use this instead of `process.env.XXX` for type safety.
 */
export const env = new Proxy({} as Env, {
    get(_, key: string) {
        return getEnv()[key as keyof Env];
    },
});

// ============================================================================
// CONVENIENCE HELPERS
// ============================================================================

export const isDevelopment = () => getEnv().NODE_ENV === "development";
export const isProduction = () => getEnv().NODE_ENV === "production";
export const isTest = () => getEnv().NODE_ENV === "test";

/**
 * Get database path with Docker compatibility.
 * Prefers DATABASE_PATH (Docker) over LOGISTIX_DB_PATH.
 */
export function getDatabasePath(): string {
    const e = getEnv();
    return e.DATABASE_PATH || e.LOGISTIX_DB_PATH;
}

// ============================================================================
// INITIALIZATION (opt-in fail-fast at boot)
// ============================================================================

/**
 * Call this at application startup to validate environment early.
 * Optional but recommended for fail-fast behavior.
 */
export function initializeEnv(): void {
    getEnv();
    logger.info("✅ Environment configuration validated");
}
