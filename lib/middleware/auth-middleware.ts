import { NextRequest } from "next/server";
import { serviceContainer } from "@/lib/services/container";
import type { UserSession } from "@/lib/services/auth-service";
import { logger } from "@/lib/utils/logging/logger";


// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

// AuthenticatedUser represents the full UserSession
export type AuthenticatedUser = UserSession;

export interface AuthContext {
  user: AuthenticatedUser;
  sessionId?: string;
  requestId: string;
}

export interface AuthMiddlewareOptions {
  requireAdmin?: boolean;
  allowedRoles?: string[];
  optional?: boolean;
}

// =============================================================================
// AUTHENTICATION ERRORS
// =============================================================================

import { AuthenticationError, AuthorizationError } from "@/lib/shared/errors/base-errors";

export class SessionExpiredError extends AuthenticationError {
  public override readonly code = 'SESSION_EXPIRED';

  constructor(message: string = "Session has expired") {
    super(message);
    this.name = 'SessionExpiredError';
  }
}

// =============================================================================
// CORE AUTHENTICATION FUNCTIONS
// =============================================================================

/**
 * Converts UserSession to AuthenticatedUser format
 */
function mapUserSessionToAuthenticatedUser(
  session: UserSession,
): AuthenticatedUser {
  // Return the complete session as authenticated user
  return session;
}

/**
 * Generates a unique request ID for tracking
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${crypto.randomUUID().split('-')[0]}`;
}

/**
 * Core authentication function that retrieves and validates user session
 */
async function authenticateRequest(
  requestId: string,
  optional: boolean = false,
): Promise<AuthenticatedUser | null> {
  const startTime = Date.now();

  try {
    logger.debug("Starting authentication check", { requestId, optional });

    const authService = serviceContainer.getAuthService();
    const session = await authService.getSessionUser();

    if (!session) {
      if (optional) {
        logger.debug("No session found (optional auth)", { requestId });
        return null;
      }

      logger.warn("Authentication required but no session found", {
        requestId,
      });
      throw new AuthenticationError("No active session found");
    }

    // Validate session data
    if (
      !session.id ||
      typeof session.id !== "string" ||
      session.id.trim().length === 0
    ) {
      logger.error("Invalid session data detected", {
        requestId,
        sessionId: session.id || "undefined",
      });
      throw new AuthenticationError("Invalid session data");
    }

    const user = mapUserSessionToAuthenticatedUser(session);
    const responseTime = Date.now() - startTime;

    logger.debug("Authentication successful", {
      requestId,
      userId: user.id,
      username: user.username,
      isAdmin: user.isAdmin,
      responseTime,
    });

    return user;
  } catch (error) {
    const responseTime = Date.now() - startTime;

    if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
      logger.warn("Authentication/Authorization failed", {
        requestId,
        error: error.message,
        code: (error as { code?: string }).code,
        responseTime,
      });
      throw error;
    }

    logger.error("Unexpected error during authentication", {
      requestId,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      responseTime,
    });

    throw new AuthenticationError("Authentication service unavailable");
  }
}

/**
 * Validates user authorization based on options
 */
function validateAuthorization(
  user: AuthenticatedUser,
  options: AuthMiddlewareOptions,
  requestId: string,
): void {
  // Check admin requirement
  if (options.requireAdmin && !user.isAdmin) {
    logger.warn("Admin access required but user is not admin", {
      requestId,
      userId: user.id,
      username: user.username,
      isAdmin: user.isAdmin,
    });
    throw new AuthorizationError("Admin privileges required");
  }

  // Check role requirements
  if (options.allowedRoles && options.allowedRoles.length > 0) {
    const userRole = user.role || (user.isAdmin ? "admin" : "user");

    if (!options.allowedRoles.includes(userRole)) {
      logger.warn("User role not authorized", {
        requestId,
        userId: user.id,
        username: user.username,
        userRole,
        allowedRoles: options.allowedRoles,
      });
      throw new AuthorizationError(
        `Role '${userRole}' is not authorized for this resource`,
      );
    }
  }

  logger.debug("Authorization check passed", {
    requestId,
    userId: user.id,
    userRole: user.role || (user.isAdmin ? "admin" : "user"),
    requireAdmin: options.requireAdmin,
    allowedRoles: options.allowedRoles,
  });
}

// =============================================================================
// PUBLIC MIDDLEWARE FUNCTIONS
// =============================================================================

/**
 * Requires authentication and throws error if not authenticated
 * @param request - The Next.js request object (optional, used for logging context)
 * @param options - Authentication options
 * @returns Promise<AuthContext> - The authenticated user context
 * @throws AuthenticationError if not authenticated
 * @throws AuthorizationError if not authorized
 */
export async function requireAuth(
  request?: NextRequest,
  options: AuthMiddlewareOptions = {},
): Promise<AuthContext> {
  const requestId = generateRequestId();

  try {
    logger.debug("Requiring authentication", {
      requestId,
      url: request?.url,
      method: request?.method,
      options,
    });

    const user = await authenticateRequest(requestId, false);

    if (!user) {
      // This should not happen since authenticateRequest throws for required auth
      throw new AuthenticationError("Authentication failed");
    }

    // Validate authorization
    validateAuthorization(user, options, requestId);

    return {
      user,
      requestId,
    };
  } catch (error) {
    logger.error("Authentication requirement failed", {
      requestId,
      url: request?.url,
      method: request?.method,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

/**
 * Optional authentication - returns user if authenticated, null otherwise
 * @param request - The Next.js request object (optional, used for logging context)
 * @returns Promise<AuthContext | null> - The authenticated user context or null
 */
export async function optionalAuth(
  request?: NextRequest,
): Promise<AuthContext | null> {
  const requestId = generateRequestId();

  try {
    logger.debug("Checking optional authentication", {
      requestId,
      url: request?.url,
      method: request?.method,
    });

    const user = await authenticateRequest(requestId, true);

    if (!user) {
      return null;
    }

    return {
      user,
      requestId,
    };
  } catch (error) {
    logger.warn("Optional authentication failed", {
      requestId,
      url: request?.url,
      method: request?.method,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    // For optional auth, we return null instead of throwing
    return null;
  }
}

/**
 * Requires admin authentication
 * @param request - The Next.js request object (optional, used for logging context)
 * @returns Promise<AuthContext> - The authenticated admin user context
 * @throws AuthenticationError if not authenticated
 * @throws AuthorizationError if not admin
 */
export async function requireAdmin(
  request?: NextRequest,
): Promise<AuthContext> {
  return requireAuth(request, { requireAdmin: true });
}

/**
 * Requires specific role authentication
 * @param roles - Array of allowed roles
 * @param request - The Next.js request object (optional, used for logging context)
 * @returns Promise<AuthContext> - The authenticated user context
 * @throws AuthenticationError if not authenticated
 * @throws AuthorizationError if role not allowed
 */
export async function requireRole(
  roles: string[],
  request?: NextRequest,
): Promise<AuthContext> {
  return requireAuth(request, { allowedRoles: roles });
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Extracts user ID from auth context for backward compatibility
 */
export function getUserId(authContext: AuthContext): string {
  return authContext.user.id;
}

/**
 * Checks if user is admin from auth context
 */
export function isAdmin(authContext: AuthContext): boolean {
  return authContext.user.isAdmin;
}

/**
 * Gets user role from auth context
 */
export function getUserRole(authContext: AuthContext): string {
  return authContext.user.role || (authContext.user.isAdmin ? "admin" : "user");
}

/**
 * Checks if the current user can access a specific resource
 * A user can access their own resources, an admin can access all resources
 * 
 * @param authContext - The authenticated user context
 * @param resourceOwnerId - The ID of the resource owner
 * @returns true if user can access the resource
 */
export function canAccessResource(
  authContext: AuthContext,
  resourceOwnerId: string
): boolean {
  return authContext.user.isAdmin || authContext.user.id === resourceOwnerId;
}
