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
  return process.env['COOKIE_NAME'] || "logistix_session";
}

/**
 * Get the JWT secret (if available in Edge Runtime)
 */
export function getJwtSecret(): string | undefined {
  return process.env['JWT_SECRET'];
}

/**
 * Check if running in production environment
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}
