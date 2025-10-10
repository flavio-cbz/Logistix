import { z } from "zod";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";
import {
  hash as bcryptHashPassword,
  compare as bcryptComparePassword,
} from "bcrypt";
// NextRequest removed - not used in this service
import { BaseService } from "./base-service";
import {
  ValidationError,
  AuthError,
} from "@/lib/errors/custom-error";
import { getErrorMessage } from "@/lib/utils/error-utils";
import { databaseService } from "@/lib/services/database/db";
import { getCurrentTimestamp } from "@/lib/utils/formatting/calculations";

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const userCredentialsSchema = z.object({
  username: z
    .string()
    .min(2, "Username must be at least 2 characters")
    .max(50, "Username cannot exceed 50 characters")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Username can only contain letters, numbers, hyphens and underscores",
    ),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password cannot exceed 100 characters"),
});

const sessionIdSchema = z
  .string()
  .min(1, "Session ID cannot be empty")
  .max(50, "Session ID cannot exceed 50 characters");

// userIdSchema intentionally removed (not used)

// =============================================================================
// INTERFACES
// =============================================================================

interface User {
  id: string;
  username: string;
  password_hash: string;
  encryption_secret?: string;
  email?: string;
  bio?: string;
  avatar?: string;
  language?: string;
  theme?: string;
  ai_config?: string;
  created_at: string;
  updated_at: string;
}

// Session interface removed (not used)

export interface UserSession {
  id: string;
  username: string;
  email?: string | undefined;
  avatar?: string | undefined;
  language?: string | undefined;
  theme?: string | undefined;
  aiConfig?: { endpoint: string; apiKey: string; model: string } | undefined;
  isAdmin: boolean;
  role?: string | undefined;
}

export interface CreateUserInput {
  username: string;
  password: string;
  email?: string;
}

export interface AuthResult {
  success: boolean;
  user?: UserSession;
  sessionId?: string;
  message?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const BCRYPT_SALT_ROUNDS = 12;
const DEFAULT_COOKIE_NAME = process.env.COOKIE_NAME || "logistix_session";

/**
 * Authentication service providing secure user authentication and session management
 */
export class AuthService extends BaseService {
  private readonly jwtSecret: string | undefined;
  private readonly cookieName: string;

  constructor() {
    super("AuthService");

    // Validate required environment variables
    this.jwtSecret = process.env.JWT_SECRET;
    if (!this.jwtSecret) {
      this.logger.warn(
        "JWT_SECRET environment variable is not set. Some JWT features may be disabled in development.",
      );
    } else if (this.jwtSecret === "change_this_secret_in_production") {
      this.logger.warn(
        "JWT_SECRET is using default value. Please configure a secure value in production.",
      );
    }

    this.cookieName = DEFAULT_COOKIE_NAME;
  }

  /**
   * Creates a new user with secure password hashing
   */
  async createUser(
    input: CreateUserInput,
  ): Promise<{ id: string; username: string }> {
    return this.executeOperation(
      "createUser",
      async () => {
        // Validate input data
        const validatedData = this.validateWithSchema(
          userCredentialsSchema,
          input,
          "createUser",
        );

        this.logger.debug("Creating new user", {
          username: validatedData.username,
        });

        // Check if user already exists
            const existingUser = await databaseService.queryOne<{ id: string }>(
          `SELECT id FROM users WHERE username = ?`,
          [validatedData.username],
          "createUser-checkExisting",
        );

        if (existingUser) {
          this.logger.warn("Attempt to create existing user", {
            username: validatedData.username,
          });
          throw new ValidationError(
            "A user with this username already exists",
            "username",
          );
        }

        // Generate secure values
        const id = this.generateSecureId();
        const passwordHash = await this.hashPassword(validatedData.password);
        const encryptionSecret = this.generateSecureId();
        const timestamp = getCurrentTimestamp();

        // Create user in database
            await databaseService.execute(
          `INSERT INTO users (id, username, password_hash, encryption_secret, email, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            validatedData.username,
            passwordHash,
            encryptionSecret,
            input.email || null,
            timestamp,
            timestamp,
          ],
          "createUser",
        );

        this.logger.info("User created successfully", {
          userId: id,
          username: validatedData.username,
        });

        return { id, username: validatedData.username };
      },
      { username: input.username },
    );
  }

  /**
   * Verifies user credentials and returns user information
   */
  async verifyCredentials(
    username: string,
    password: string,
  ): Promise<{ id: string; username: string }> {
    return this.executeOperation(
      "verifyCredentials",
      async () => {
        // Validate input data
        const validatedData = this.validateWithSchema(
          userCredentialsSchema,
          { username, password },
          "verifyCredentials",
        );

        this.logger.debug("Verifying user credentials", {
          username: validatedData.username,
        });

        // Get user from database
            const user = await databaseService.queryOne<User>(
          `SELECT id, username, password_hash FROM users WHERE username = ?`,
          [validatedData.username],
          "verifyCredentials",
        );

        if (!user) {
          this.logger.warn("Login attempt with non-existent user", {
            username: validatedData.username,
          });
          throw this.createAuthError("Invalid username or password");
        }

        // Verify password using bcrypt
        const passwordMatches = await this.verifyPassword(
          validatedData.password,
          user.password_hash,
        );

        if (!passwordMatches) {
          this.logger.warn("Login attempt with incorrect password", {
            username: validatedData.username,
            userId: user.id,
          });
          throw this.createAuthError("Invalid username or password");
        }

        this.logger.info("Credentials verified successfully", {
          username: validatedData.username,
          userId: user.id,
        });

        return {
          id: user.id,
          username: user.username,
        };
      },
      { username },
    );
  }

  /**
   * Creates a new session for the user
   */
  async createSession(userId: string): Promise<string> {
    return this.executeOperation(
      "createSession",
      async () => {
        this.validateUUID(userId, "userId", "createSession");

        this.logger.debug("Creating new session", { userId });

        // Verify user exists
            const user = await databaseService.queryOne<{ id: string }>(
          `SELECT id FROM users WHERE id = ?`,
          [userId],
          "createSession-checkUser",
        );

        if (!user) {
          this.logger.error("Attempt to create session for non-existent user", {
            userId,
          });
          throw this.createNotFoundError("User", userId);
        }

        // Generate session
        const sessionId = this.generateSecureId();
        const expiresAt = new Date(
          Date.now() + SESSION_DURATION_MS,
        ).toISOString();
        const timestamp = getCurrentTimestamp();

  await databaseService.execute(
          `INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)`,
          [sessionId, userId, expiresAt, timestamp],
          "createSession",
        );

        this.logger.info("Session created successfully", {
          userId,
          sessionId,
          expiresAt,
        });

        return sessionId;
      },
      { userId },
    );
  }

  /**
   * Destroys the current session (logout)
   */
  async destroySession(sessionId?: string): Promise<void> {
    return this.executeOperation(
      "destroySession",
      async () => {
        const cookieStore = cookies();
        const currentSessionId =
          sessionId || cookieStore.get(this.cookieName)?.value;

        if (!currentSessionId) {
          this.logger.debug("Logout called without active session");
          return;
        }

        // Validate session ID
        const validatedSessionId = this.validateWithSchema(
          sessionIdSchema,
          currentSessionId,
          "destroySession",
        );

        this.logger.debug("Destroying session", {
          sessionId: validatedSessionId,
        });

        // Get session info before deletion
            const sessionToDelete = await databaseService.queryOne<{ user_id: string }>(
          `SELECT user_id FROM sessions WHERE id = ?`,
          [validatedSessionId],
          "destroySession-getUserId",
        );

        // Delete session from database
            await databaseService.execute(
          `DELETE FROM sessions WHERE id = ?`,
          [validatedSessionId],
          "destroySession",
        );

        // Clear cookie
        cookieStore.delete(this.cookieName);

        this.logger.info("Session destroyed successfully", {
          sessionId: validatedSessionId,
          userId: sessionToDelete?.user_id,
        });
      },
      { sessionId },
    );
  }

  /**
   * Requires authentication and returns user session or throws error
   */
  async requireAuth(): Promise<UserSession> {
    return this.executeOperation("requireAuth", async () => {
      const cookieStore = cookies();
      const sessionId = cookieStore.get(this.cookieName)?.value;

      if (
        !sessionId ||
        typeof sessionId !== "string" ||
        sessionId.trim().length === 0
      ) {
        this.logger.debug("No session found during requireAuth");
        throw this.createAuthError("Authentication required");
      }

      // Validate session ID
      const validatedSessionId = this.validateWithSchema(
        sessionIdSchema,
        sessionId,
        "requireAuth",
      );

      // Get session with user data
  const sessionData = await databaseService.queryOne<{
        session_id: string;
        user_id: string;
        expires_at: string;
        username: string;
        email?: string;
        avatar?: string;
        language?: string;
        theme?: string;
        ai_config?: string;
      }>(
        `SELECT s.id as session_id, s.user_id, s.expires_at, u.username, u.email, u.avatar, u.language, u.theme, u.ai_config
         FROM sessions s
         JOIN users u ON s.user_id = u.id
         WHERE s.id = ?`,
        [validatedSessionId],
        "requireAuth",
      );

      if (!sessionData) {
        this.logger.warn("Session not found in database during requireAuth", {
          sessionId: validatedSessionId,
        });
        throw this.createAuthError("Invalid session");
      }

      // Check session expiration
      if (!this.isSessionValid(sessionData.expires_at)) {
        this.logger.warn("Expired session during requireAuth", {
          sessionId: validatedSessionId,
          userId: sessionData.user_id,
        });

        // Clean up expired session
          await databaseService.execute(
          "DELETE FROM sessions WHERE id = ?",
          [validatedSessionId],
          "requireAuth-cleanup",
        );
        throw this.createAuthError("Session expired");
      }

      const userSession: UserSession = {
        id: sessionData.user_id,
        username: sessionData.username,
        email: sessionData.email,
        avatar: sessionData.avatar,
        language: sessionData.language,
        theme: sessionData.theme,
        isAdmin: sessionData.username === "admin",
        aiConfig: this.parseAiConfig(sessionData.ai_config),
      };

      this.logger.debug("Authentication successful", {
        userId: userSession.id,
        username: userSession.username,
      });

      return userSession;
    });
  }

  /**
   * Requires admin authentication
   */
  async requireAdmin(): Promise<UserSession> {
    return this.executeOperation("requireAdmin", async () => {
      const user = await this.requireAuth();

      if (user.username !== "admin") {
        this.logger.warn("Admin access denied", {
          userId: user.id,
          username: user.username,
        });
        throw this.createAuthorizationError("Admin access required");
      }

      this.logger.debug("Admin access granted", {
        userId: user.id,
        username: user.username,
      });

      return user;
    });
  }

  /**
   * Gets the current session user or returns null
   */
  async getSessionUser(): Promise<UserSession | null> {
    try {
      return await this.requireAuth();
    } catch (error) {
      if (error instanceof AuthError) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Validates a session from a NextRequest
   */
  async validateSession(): Promise<AuthResult> {
    return this.executeOperation("validateSession", async () => {
      try {
        const user = await this.getSessionUser();

        if (!user) {
          return {
            success: false,
            message: "Not authenticated",
          };
        }

        return {
          success: true,
          user,
        };
      } catch (error) {
        this.logger.error("Session validation error", {
          error: getErrorMessage(error),
        });

        return {
          success: false,
          message: "Session validation error",
        };
      }
    });
  }

  /**
   * Authenticates user and creates session
   */
  async authenticate(username: string, password: string): Promise<AuthResult> {
    return this.executeOperation(
      "authenticate",
      async () => {
        try {
          // Verify credentials
          const user = await this.verifyCredentials(username, password);

          // Create session
          const sessionId = await this.createSession(user.id);

          // Set cookie
          const cookieStore = cookies();
          cookieStore.set(this.cookieName, sessionId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: SESSION_DURATION_MS / 1000,
            path: "/",
          });

          // Get full user session
          const userSession = await this.requireAuth();

          return {
            success: true,
            user: userSession,
            sessionId,
          };
        } catch (error) {
          if (error instanceof AuthError) {
            return {
              success: false,
              message: error.message,
            };
          }
          throw error;
        }
      },
      { username },
    );
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  /**
   * Generates a secure UUID
   */
  private generateSecureId(): string {
    return uuidv4();
  }

  /**
   * Hashes a password using bcrypt
   */
  private async hashPassword(password: string): Promise<string> {
    return bcryptHashPassword(password, BCRYPT_SALT_ROUNDS);
  }

  /**
   * Verifies a password against its hash
   */
  private async verifyPassword(
    password: string,
    hash: string,
  ): Promise<boolean> {
    return bcryptComparePassword(password, hash);
  }

  /**
   * Checks if a session is still valid (not expired)
   */
  private isSessionValid(expiresAtString: string): boolean {
    try {
      const expiresAt = new Date(expiresAtString);

      if (isNaN(expiresAt.getTime())) {
        return false;
      }

      return expiresAt > new Date();
    } catch {
      return false;
    }
  }

  /**
   * Parses AI configuration from JSON string
   */
  private parseAiConfig(
    aiConfigString: string | null | undefined,
  ): { endpoint: string; apiKey: string; model: string } | undefined {
    if (!aiConfigString) return undefined;

    try {
      return JSON.parse(aiConfigString);
    } catch (error) {
      this.logger.warn("Error parsing AI configuration", {
        aiConfig: aiConfigString,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return undefined;
    }
  }
}
