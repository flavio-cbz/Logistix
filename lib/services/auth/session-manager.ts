import { v4 as uuidv4 } from "uuid";
import { cookies } from "next/headers";
import { BaseService } from "../base-service";
import { AuthError } from "@/lib/errors/custom-error";
import { databaseService } from "@/lib/database";
import { getCurrentTimestamp } from "@/lib/utils/formatting/calculations";
import { z } from "zod";

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const sessionIdSchema = z
  .string()
  .min(1, "Session ID cannot be empty")
  .max(50, "Session ID cannot exceed 50 characters");

// =============================================================================
// INTERFACES
// =============================================================================

export interface SessionRecord {
  id: string;
  userId: string;
  deviceName?: string;
  deviceType?: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: string;
  createdAt: string;
  isCurrent?: boolean;
}

// =============================================================================
// SESSION MANAGER
// =============================================================================

/**
 * SessionManager
 *
 * Responsible for:
 * - Creating and destroying sessions
 * - Managing session cookies
 * - Listing and revoking user sessions
 * - Validating session expiration
 */
export class SessionManager extends BaseService {
  private readonly SESSION_COOKIE_NAME = "session_id";
  private readonly SESSION_EXPIRATION_DAYS = 30;

  constructor() {
    super("SessionManager");
  }

  /**
   * Create a new session for a user
   */
  async createSession(userId: string): Promise<string> {
    return this.executeOperation("createSession", async () => {
      const sessionId = this.generateSecureId();
      const expiresAt = this.getSessionExpiration();

      await databaseService.executeQuery(async (db) => {
        const { userSessions } = await import("@/lib/database/schema");
        await db.insert(userSessions).values({
          id: sessionId,
          userId,
          expiresAt,
          createdAt: getCurrentTimestamp(),
        });
      }, "createSession");

      // Set cookie
      await this.setSessionCookie(sessionId);

      this.logger.info("Session created", { userId, sessionId });
      return sessionId;
    }, { userId });
  }

  /**
   * Destroy a session (logout)
   */
  async destroySession(sessionId?: string): Promise<void> {
    return this.executeOperation("destroySession", async () => {
      // Try to get session ID from parameter or cookie
      let finalSessionId: string | undefined = sessionId;

      if (!finalSessionId) {
        const cookieSessionId = await this.getSessionIdFromCookie();
        finalSessionId = cookieSessionId ?? undefined;
      }

      if (!finalSessionId) {
        this.logger.warn("No session ID found for destruction");
        return;
      }

      // Validate session ID format
      const validation = sessionIdSchema.safeParse(finalSessionId);
      if (!validation.success) {
        throw new AuthError("Invalid session ID format", {
          errors: validation.error.errors,
        });
      }

      await databaseService.executeQuery(async (db) => {
        const { userSessions } = await import("@/lib/database/schema");
        const { eq } = await import("drizzle-orm");
        await db.delete(userSessions).where(eq(userSessions.id, finalSessionId as string));
      }, "destroySession");

      // Clear cookie
      await this.clearSessionCookie();

      this.logger.info("Session destroyed", { sessionId: finalSessionId });
    }, { sessionId });
  }

  /**
   * Get all sessions for a user
   */
  async getUserSessions(userId: string): Promise<SessionRecord[]> {
    return this.executeOperation("getUserSessions", async () => {
      const currentSessionId = await this.getSessionIdFromCookie();

      const sessions = await databaseService.executeQuery(async (db) => {
        const { userSessions } = await import("@/lib/database/schema");
        const { eq } = await import("drizzle-orm");

        const results = await db
          .select()
          .from(userSessions)
          .where(eq(userSessions.userId, userId))
          .all();

        return results.map((session) => ({
          id: session.id,
          userId: session.userId,
          deviceName: session.deviceName || undefined,
          deviceType: session.deviceType || undefined,
          ipAddress: session.ipAddress || undefined,
          userAgent: session.userAgent || undefined,
          expiresAt: session.expiresAt,
          createdAt: session.createdAt,
          isCurrent: session.id === currentSessionId,
        }));
      }, "getUserSessions");

      return sessions;
    }, { userId });
  }

  /**
   * Revoke all sessions except the current one
   */
  async revokeAllSessionsExcept(userId: string, currentSessionId: string): Promise<number> {
    return this.executeOperation("revokeAllSessionsExcept", async () => {
      const deletedCount = await databaseService.executeQuery(async (db) => {
        const { userSessions } = await import("@/lib/database/schema");
        const { eq, and, ne } = await import("drizzle-orm");

        const result = await db
          .delete(userSessions)
          .where(
            and(
              eq(userSessions.userId, userId),
              ne(userSessions.id, currentSessionId)
            )
          );

        return result.changes || 0;
      }, "revokeAllSessionsExcept");

      this.logger.info("Revoked all sessions except current", {
        userId,
        currentSessionId,
        deletedCount,
      });

      return deletedCount;
    }, { userId, currentSessionId });
  }

  /**
   * Revoke a specific user session
   */
  async revokeUserSession(userId: string, sessionId: string): Promise<void> {
    return this.executeOperation("revokeUserSession", async () => {
      const deleted = await databaseService.executeQuery(async (db) => {
        const { userSessions } = await import("@/lib/database/schema");
        const { eq, and } = await import("drizzle-orm");

        const result = await db
          .delete(userSessions)
          .where(
            and(
              eq(userSessions.userId, userId),
              eq(userSessions.id, sessionId)
            )
          );

        return result.changes || 0;
      }, "revokeUserSession");

      if (deleted === 0) {
        throw new AuthError("Session not found or not owned by user");
      }

      this.logger.info("User session revoked", { userId, sessionId });
    }, { userId, sessionId });
  }

  /**
   * Get session ID from cookie
   */
  async getSessionIdFromCookie(): Promise<string | null> {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(this.SESSION_COOKIE_NAME);
    return sessionCookie?.value || null;
  }

  /**
   * Check if a session is still valid (not expired)
   */
  isSessionValid(expiresAtString: string): boolean {
    try {
      const expiresAt = new Date(expiresAtString);
      const now = new Date();
      return expiresAt > now;
    } catch (_error) {
      this.logger.warn("Invalid expiration date format", { expiresAtString });
      return false;
    }
  }

  // =============================================================================
  // PRIVATE HELPERS
  // =============================================================================

  private generateSecureId(): string {
    return uuidv4();
  }

  private getSessionExpiration(): string {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.SESSION_EXPIRATION_DAYS);
    return expiresAt.toISOString();
  }

  private async setSessionCookie(sessionId: string): Promise<void> {
    const cookieStore = await cookies();
    const maxAgeSeconds = this.SESSION_EXPIRATION_DAYS * 24 * 60 * 60;

    cookieStore.set({
      name: this.SESSION_COOKIE_NAME,
      value: sessionId,
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      sameSite: "lax",
      maxAge: maxAgeSeconds,
      path: "/",
    });
  }

  private async clearSessionCookie(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.delete(this.SESSION_COOKIE_NAME);
  }
}
