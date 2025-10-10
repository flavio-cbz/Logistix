/**
 * Edge Runtime Configuration Utilities
 *
 * This module provides configuration utilities that work in Edge Runtime environments
 * where the full configuration service cannot be used due to Node.js API limitations.
 *
 * Use this for middleware and other Edge Runtime contexts.
 */

// ============================================================================
// EDGE RUNTIME CONFIGURATION HELPERS
// ============================================================================

/**
 * Get the authentication cookie name
 */
export function getCookieName(): string {
  return process.env.COOKIE_NAME || "logistix_session";
}

/**
 * Get the JWT secret (if available in Edge Runtime)
 */
export function getJwtSecret(): string | undefined {
  return process.env.JWT_SECRET;
}

/**
 * Check if running in production environment
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Check if running in development environment
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === "development";
}

/**
 * Check if running in test environment
 */
export function isTest(): boolean {
  return process.env.NODE_ENV === "test";
}

/**
 * Get the current environment
 */
export function getEnvironment(): "development" | "production" | "test" {
  const env = process.env.NODE_ENV;
  if (env === "production" || env === "test") {
    return env;
  }
  return "development";
}

/**
 * Get session timeout in milliseconds
 */
export function getSessionTimeout(): number {
  const timeout = process.env.SESSION_TIMEOUT;
  return timeout ? parseInt(timeout, 10) * 1000 : 3600000; // Default: 1 hour
}

/**
 * Get database path
 */
export function getDatabasePath(): string {
  return process.env.DATABASE_PATH || "./data/logistix.db";
}

/**
 * Get server port
 */
export function getPort(): number {
  const port = process.env.PORT;
  return port ? parseInt(port, 10) : 3000;
}

/**
 * Get CORS origins
 */
export function getCorsOrigins(): string[] {
  const origins = process.env.CORS_ORIGINS;
  return origins
    ? origins.split(",").map((origin) => origin.trim())
    : ["http://localhost:3000"];
}

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: string): boolean {
  const envVar = `ENABLE_${feature.toUpperCase()}`;
  const value = process.env[envVar];
  return value === "true" || value === "1";
}

/**
 * Get admin default password
 */
export function getAdminDefaultPassword(): string {
  return process.env.ADMIN_DEFAULT_PASSWORD || "admin123";
}

/**
 * Get log level
 */
export function getLogLevel(): "error" | "warn" | "info" | "debug" {
  const level = process.env.LOG_LEVEL;
  if (
    level === "error" ||
    level === "warn" ||
    level === "info" ||
    level === "debug"
  ) {
    return level;
  }
  return "info";
}

/**
 * Check if debug mode is enabled
 */
export function isDebugEnabled(): boolean {
  return process.env.ENABLE_DEBUG === "true" || isDevelopment();
}

/**
 * Check if metrics are enabled
 */
export function isMetricsEnabled(): boolean {
  return process.env.ENABLE_METRICS === "true";
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate that required environment variables are set
 */
export function validateRequiredEnvVars(): {
  valid: boolean;
  missing: string[];
} {
  const required = ["JWT_SECRET", "ADMIN_DEFAULT_PASSWORD"];
  const missing: string[] = [];

  for (const envVar of required) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Get configuration summary for logging
 */
export function getConfigSummary(): Record<string, any> {
  return {
    environment: getEnvironment(),
    cookieName: getCookieName(),
    databasePath: getDatabasePath(),
    port: getPort(),
    logLevel: getLogLevel(),
    debugEnabled: isDebugEnabled(),
    metricsEnabled: isMetricsEnabled(),
    corsOrigins: getCorsOrigins(),
  };
}
