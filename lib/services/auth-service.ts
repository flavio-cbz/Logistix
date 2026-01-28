import { z } from "zod";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";
import { BaseService } from "./base-service";
import {
  ValidationError,
  AuthError,
} from "@/lib/errors/custom-error";
import { getErrorMessage } from "@/lib/utils/error-utils";
import { databaseService } from "@/lib/database";
import { getCurrentTimestamp } from "@/lib/utils/formatting/calculations";
import { encryptUserSecret } from "@/lib/utils/crypto-secrets";
import { authInstrumentationCollector } from "@/lib/services/auth/auth-instrumentation";
<<<<<<< HEAD
import { SessionManager, type SessionRecord } from "./auth/session-manager";
import { PasswordManager } from "./auth/password-manager";

// Re-export SessionRecord for backward compatibility
export type { SessionRecord };
=======
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a

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

export interface SessionRecord {
  id: string;
  userId: string;
  deviceName: string;
  deviceType: string;
  ipAddress: string;
  userAgent: string;
  lastActivityAt: string;
  createdAt: string;
  expiresAt: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const DEFAULT_COOKIE_NAME = process.env['COOKIE_NAME'] || "logistix_session";

/**
 * Authentication service providing secure user authentication and session management
 */
export class AuthService extends BaseService {
  private readonly jwtSecret: string | undefined;
  private readonly cookieName: string;
  private readonly sessionManager: SessionManager;
  private readonly passwordManager: PasswordManager;

  constructor() {
    super("AuthService");

    // Initialize managers
    this.sessionManager = new SessionManager();
    this.passwordManager = new PasswordManager();

    // Validate required environment variables
    this.jwtSecret = process.env['JWT_SECRET'];
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
        const passwordHash = await this.passwordManager.hashPassword(validatedData.password);
        const encryptionSecret = this.generateSecureId();
        // Chiffrer le secret avant stockage (Security Phase 2)
        const encryptedSecret = encryptUserSecret(encryptionSecret);
        const timestamp = getCurrentTimestamp();

        // Create user in database
        await databaseService.execute(
          `INSERT INTO users (id, username, password_hash, encryption_secret, email, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            validatedData.username,
            passwordHash,
            encryptedSecret,
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
   * Complete signup flow with validation, rate limiting, and session creation
   */
  async signupUser(params: {
    username: string;
    email: string;
    password: string;
    clientIp: string;
    invitationCode?: string;
    signupConfig?: {
      enabled: boolean;
      requireInvitationCode: boolean;
      validInvitationCodes: string[];
      maxSignupsPerHour: number;
    };
  }): Promise<{ user: { id: string; username: string; email: string }; sessionToken: string }> {
    const { username, email, password, clientIp, invitationCode, signupConfig } = params;

    return this.executeOperation(
      "signupUser",
      async () => {
        // Check if signups are enabled
        if (signupConfig && !signupConfig.enabled) {
          this.logger.warn("Signup attempt blocked - signups disabled");
          throw new ValidationError("Les inscriptions sont actuellement désactivées. Veuillez contacter l'administrateur.");
        }

        // Check rate limit
        if (signupConfig) {
          const oneHourAgo = new Date();
          oneHourAgo.setHours(oneHourAgo.getHours() - 1);

          const recentSignups = await databaseService.query<{ count: number }>(
            `SELECT COUNT(*) as count FROM users WHERE client_ip = ? AND created_at >= ?`,
            [clientIp, oneHourAgo.toISOString()],
            "signupUser-checkRateLimit"
          );

          const count = recentSignups[0]?.count || 0;
          if (count >= signupConfig.maxSignupsPerHour) {
            this.logger.warn(`Signup rate limit exceeded for IP: ${clientIp}`);
            throw new ValidationError("Trop de tentatives d'inscription récentes. Veuillez réessayer plus tard.");
          }
        }

        // Check invitation code if required
        if (signupConfig?.requireInvitationCode) {
          if (!invitationCode) {
            throw new ValidationError("Un code d'invitation est requis");
          }

          if (!signupConfig.validInvitationCodes.includes(invitationCode)) {
            this.logger.warn(`Invalid invitation code used: ${invitationCode}`);
            throw new ValidationError("Code d'invitation invalide");
          }
        }

        // Check if username already exists
        const existingUsername = await databaseService.queryOne<{ id: string }>(
          'SELECT id FROM users WHERE username = ?',
          [username],
          'signupUser-checkUsername'
        );

        if (existingUsername) {
          throw new ValidationError("Ce nom d'utilisateur est déjà utilisé", "username");
        }

        // Check if email already exists
        const existingEmail = await databaseService.queryOne<{ id: string }>(
          'SELECT id FROM users WHERE email = ?',
          [email],
          'signupUser-checkEmail'
        );

        if (existingEmail) {
          throw new ValidationError("Cette adresse email est déjà utilisée", "email");
        }

        // Hash password
        const hashedPassword = await this.passwordManager.hashPassword(password);

        // Create user
        const userId = uuidv4();
        const now = new Date().toISOString();
        const encryptionSecret = this.generateSecureId();
        const encryptedSecret = encryptUserSecret(encryptionSecret);

        await databaseService.execute(
          `INSERT INTO users (
            id, username, email, password_hash, encryption_secret, role, client_ip,
            email_verified, active, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            username,
            email,
            hashedPassword,
            encryptedSecret,
            'user', // Default role
            clientIp,
            false, // Email not verified by default
            true, // Account active by default
            now,
            now,
          ],
          'signupUser-createUser'
        );

        this.logger.info(`New user created: ${userId} (${username})`);

        // Create session
        const sessionToken = await this.createSession(userId);

        return {
          user: {
            id: userId,
            username,
            email
          },
          sessionToken
        };
      },
      { username, email, clientIp }
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

        this.logger.debug("User found, verifying password", {
          id: user.id,
          hasHash: !!user.password_hash,
          hashLength: user.password_hash ? user.password_hash.length : 0
        });

        // Verify password using bcrypt
        const passwordMatches = await this.passwordManager.verifyPassword(
          validatedData.password,
          user.password_hash,
        );

        this.logger.debug("Password verification result", { matches: passwordMatches });

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

        // Delegate to SessionManager
        const sessionId = await this.sessionManager.createSession(userId);

        // Enregistrement pour instrumentation
        authInstrumentationCollector.recordEvent({
          id: sessionId,
          type: "session_create",
          timestamp: Date.now(),
          userId: userId,
          success: true,
        });

        // Enregistrement pour instrumentation
        authInstrumentationCollector.recordEvent({
          id: sessionId,
          type: "session_create",
          timestamp: Date.now(),
          userId: userId,
          success: true,
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
        // Get session info before deletion for instrumentation
        const finalSessionId = sessionId || await this.sessionManager.getSessionIdFromCookie();

        if (finalSessionId) {
          const sessionToDelete = await databaseService.queryOne<{ user_id: string }>(
            `SELECT user_id FROM user_sessions WHERE id = ?`,
            [finalSessionId],
            "destroySession-getUserId",
          );

          // Delegate to SessionManager
          await this.sessionManager.destroySession(sessionId);

          // Enregistrement pour instrumentation
          authInstrumentationCollector.recordEvent({
            id: finalSessionId,
            type: "session_destroy",
            timestamp: Date.now(),
            userId: sessionToDelete?.user_id,
            success: true,
          });
        }
<<<<<<< HEAD
=======

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
          `SELECT user_id FROM user_sessions WHERE id = ?`,
          [validatedSessionId],
          "destroySession-getUserId",
        );

        // Delete session from database
        await databaseService.execute(
          `DELETE FROM user_sessions WHERE id = ?`,
          [validatedSessionId],
          "destroySession",
        );

        // Clear cookie
        cookieStore.delete(this.cookieName);

        this.logger.info("Session destroyed successfully", {
          sessionId: validatedSessionId,
          userId: sessionToDelete?.user_id,
        });

        // Enregistrement pour instrumentation
        authInstrumentationCollector.recordEvent({
          id: validatedSessionId,
          type: "session_destroy",
          timestamp: Date.now(),
          userId: sessionToDelete?.user_id,
          success: true,
        });
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
      },
      { sessionId },
    );
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<SessionRecord[]> {
    return this.executeOperation(
      "getUserSessions",
      async () => {
        this.validateUUID(userId, "userId", "getUserSessions");

<<<<<<< HEAD
        // Delegate to SessionManager
        return await this.sessionManager.getUserSessions(userId);
=======
        const now = new Date().toISOString();
        const sessions = await databaseService.query<{
          id: string;
          user_id: string;
          device_name?: string;
          device_type?: string;
          ip_address?: string;
          user_agent?: string;
          last_activity_at?: string;
          created_at: string;
          expires_at: string;
        }>(
          `SELECT * FROM user_sessions WHERE user_id = ? AND expires_at > ?`,
          [userId, now],
          "getUserSessions"
        );

        return sessions.map(session => ({
          id: session.id,
          userId: session.user_id,
          deviceName: session.device_name || "Unknown", // Assuming these fields exist or defaulting
          deviceType: session.device_type || "Unknown",
          ipAddress: session.ip_address || "Unknown",
          userAgent: session.user_agent || "Unknown",
          lastActivityAt: session.last_activity_at || session.created_at,
          createdAt: session.created_at,
          expiresAt: session.expires_at,
        }));
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
      },
      { userId }
    );
  }

  /**
   * Revoke all sessions for a user except the current one
   */
  async revokeAllSessionsExcept(userId: string, currentSessionId: string): Promise<number> {
    return this.executeOperation(
      "revokeAllSessionsExcept",
      async () => {
        this.validateUUID(userId, "userId", "revokeAllSessionsExcept");
        this.validateWithSchema(sessionIdSchema, currentSessionId, "revokeAllSessionsExcept");

        // Verify user exists
        const user = await databaseService.queryOne<{ id: string }>(
          `SELECT id FROM users WHERE id = ?`,
          [userId],
          "revokeAllSessionsExcept-checkUser"
        );

        if (!user) {
          throw this.createNotFoundError("User", userId);
        }

        // Delegate to SessionManager
        return await this.sessionManager.revokeAllSessionsExcept(userId, currentSessionId);
      },
      { userId, currentSessionId }
    );
  }

  /**
   * Revoke a specific session for a user
   */
  async revokeUserSession(userId: string, sessionId: string): Promise<void> {
    return this.executeOperation(
      "revokeUserSession",
      async () => {
        this.validateUUID(userId, "userId", "revokeUserSession");
        this.validateWithSchema(sessionIdSchema, sessionId, "revokeUserSession");

        // Delegate to SessionManager
        await this.sessionManager.revokeUserSession(userId, sessionId);
      },
      { userId, sessionId }
    );
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    return this.executeOperation(
      "changePassword",
      async () => {
        this.validateUUID(userId, "userId", "changePassword");
<<<<<<< HEAD
=======

        // Validate new password rules
        this.validateWithSchema(
          z.string()
            .min(6, "Password must be at least 6 characters")
            .max(100, "Password cannot exceed 100 characters"),
          newPassword,
          "changePassword"
        );

        if (!currentPassword) {
          throw new ValidationError("Current password is required", "password");
        }
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a

        // Validate new password rules
        this.validateWithSchema(
          z.string()
            .min(6, "Password must be at least 6 characters")
            .max(100, "Password cannot exceed 100 characters"),
          newPassword,
          "changePassword"
        );

        if (!currentPassword) {
          throw new ValidationError("Current password is required", "password");
        }

        // Delegate to PasswordManager
        await this.passwordManager.changePassword(userId, currentPassword, newPassword);
      },
      { userId }
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
         FROM user_sessions s
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
      if (!this.sessionManager.isSessionValid(sessionData.expires_at)) {
        this.logger.warn("Expired session during requireAuth", {
          sessionId: validatedSessionId,
          userId: sessionData.user_id,
        });

        // Clean up expired session
        await databaseService.execute(
          "DELETE FROM user_sessions WHERE id = ?",
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
<<<<<<< HEAD
    // No bypass - always validate through database
    // For tests, use proper mocking or test fixtures

    try {
      return await this.requireAuth();
    } catch (error) {
      if (error instanceof AuthError) {
        return null;
      }
      throw error;
    }
  }

=======
    const cookieStore = cookies();
    const sessionId = cookieStore.get(this.cookieName)?.value;

    // DEV/TEST ONLY: Bypass database check pour les sessions de test
    // Ce bypass est DÉSACTIVÉ en production pour des raisons de sécurité
    if (process.env.NODE_ENV !== 'production' && sessionId && sessionId.startsWith('temp_session_')) {
      this.logger.debug("DEV ONLY BYPASS: getSessionUser for temp session", {
        sessionId,
        environment: process.env.NODE_ENV,
      });

      const legacyAdminId = process.env['ADMIN_ID'] || 'baa65519-e92f-4010-a3c2-e9b5c67fb0d7';
      const userSession: UserSession = {
        id: legacyAdminId,
        username: 'admin',
        isAdmin: true,
        aiConfig: undefined,
      };

      return userSession;
    }

    try {
      return await this.requireAuth();
    } catch (error) {
      if (error instanceof AuthError) {
        return null;
      }
      throw error;
    }
  }

>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
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
<<<<<<< HEAD
=======
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
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
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
