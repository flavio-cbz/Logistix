/**
 * Vinted Session Manager
 * Manages Vinted session cookies with encryption and token validation
 */

<<<<<<< HEAD
import { getCurrentTimestamp } from '@/lib/database';
=======
import { databaseService, getCurrentTimestamp } from '@/lib/database';
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
import { encryptSecret, decryptSecret } from '@/lib/utils/crypto';
import { getLogger } from '@/lib/utils/logging/logger';
import { VintedAuthService } from '@/lib/services/auth/vinted-auth-service';
import { vintedRepository } from '@/lib/repositories/vinted-repository';

const logger = getLogger('VintedSessionManager');

export const VINTED_SESSION_STATUS = {
  ACTIVE: 'active',
  REQUIRES_REFRESH: 'requires_refresh',
  REQUIRES_CONFIGURATION: 'requires_configuration',
  DISCONNECTED: 'disconnected',
} as const;

type SessionStatus = typeof VINTED_SESSION_STATUS[keyof typeof VINTED_SESSION_STATUS];

interface RefreshResponse {
  success: boolean;
  tokens?: {
    accessToken: string;
    refreshToken: string;
  };
}

class VintedSessionManager {
  /**
   * Get session cookie for a user
   * @param userId - The user ID
   * @returns The decrypted cookie or null if not found/failed
   */
  async getSessionCookie(userId: string): Promise<string | null> {
    try {
<<<<<<< HEAD
      const session = await vintedRepository.findByUserId(userId);
=======
      const session = await databaseService.queryOne<{
        id: string;
        user_id: string;
        session_cookie: string;
        status: string;
      }>(
        `SELECT id, user_id, session_cookie, status FROM vinted_sessions WHERE user_id = ?`,
        [userId],
      );
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a

      if (!session) {
        return null;
      }

      try {
        return await decryptSecret(session.sessionCookie, userId);
      } catch (error) {
        logger.error('Failed to decrypt session cookie', {
          userId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        await this.updateSessionStatus(
          userId,
          VINTED_SESSION_STATUS.REQUIRES_CONFIGURATION,
          'Impossible de déchiffrer la session'
        );

        return null;
      }
    } catch (error) {
      logger.error('Error getting session cookie', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Get detailed session status for a user
   */
  async getSessionStatus(userId: string): Promise<{
    connected: boolean;
    status: SessionStatus;
    lastValidatedAt: string | null;
    lastRefreshedAt: string | null;
    errorMessage: string | null;
  } | null> {
    try {
<<<<<<< HEAD
      const session = await vintedRepository.findByUserId(userId);
=======
      // Extract access token from cookie
      const match = cookie.match(/access_token_web=([^;]+)/);
      if (!match || !match[1]) {
        return false;
      }

      // For now, assume token is valid if it exists and is not empty
      // In production, this would call Vinted API to validate
      return match[1].length > 0;
    } catch (error) {
      logger.error('Error checking token validity', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Refresh session
   * @param userId - The user ID
   * @returns Refresh response with success status
   */
  async refreshSession(userId: string): Promise<RefreshResponse> {
    try {
      const session = await databaseService.queryOne<{
        id: string;
        user_id: string;
        session_cookie: string;
        status: string;
      }>(
        `SELECT id, user_id, session_cookie, status FROM vinted_sessions WHERE user_id = ?`,
        [userId],
      );
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a

      if (!session) {
        return {
          connected: false,
          status: VINTED_SESSION_STATUS.DISCONNECTED,
          lastValidatedAt: null,
          lastRefreshedAt: null,
          errorMessage: null
        };
      }

      return {
        connected: session.status === VINTED_SESSION_STATUS.ACTIVE,
        status: session.status as SessionStatus,
        lastValidatedAt: session.lastValidatedAt,
        lastRefreshedAt: session.lastRefreshedAt,
        errorMessage: session.refreshErrorMessage
      };
    } catch (error) {
<<<<<<< HEAD
      logger.error('Error getting session status', { userId, error });
      return null;
    }
  }

  /**
   * Clear session for a user (disconnect)
   */
  async clearSession(userId: string): Promise<void> {
    try {
      await vintedRepository.deleteByUserId(userId);
      logger.info('Vinted session cleared', { userId });
    } catch (error) {
      logger.error('Failed to clear Vinted session', { userId, error });
      throw new Error('Failed to clear session');
    }
  }

  /**
   * Save session cookie for a user
   */
  async saveSession(userId: string, cookie: string): Promise<void> {
    try {
      const encryptedCookie = await encryptSecret(cookie, userId);
      const now = getCurrentTimestamp();

      const existing = await vintedRepository.findByUserId(userId);

      if (existing) {
        await vintedRepository.update(existing.id, {
          sessionCookie: encryptedCookie,
          status: VINTED_SESSION_STATUS.ACTIVE,
          lastValidatedAt: now,
          refreshErrorMessage: null,
        });
      } else {
        const { v4: uuidv4 } = await import('uuid');
        await vintedRepository.create({
          id: uuidv4(),
          userId,
          sessionCookie: encryptedCookie,
          status: VINTED_SESSION_STATUS.ACTIVE,
          lastValidatedAt: now,
        });
      }

      logger.info('Vinted session saved successfully', { userId });
    } catch (error) {
      logger.error('Failed to save Vinted session', { userId, error });
      throw new Error('Failed to save session');
    }
  }

  /**
   * Refresh session
   */
  async refreshSession(userId: string): Promise<RefreshResponse> {
    try {
      const session = await vintedRepository.findByUserId(userId);
      if (!session) return { success: false };

      const cookie = await decryptSecret(session.sessionCookie, userId);

      // 1. Check if current token is valid
      if (await this.isTokenValid(cookie)) {
        const now = getCurrentTimestamp();
        await vintedRepository.update(session.id, {
          status: VINTED_SESSION_STATUS.ACTIVE,
          lastValidatedAt: now,
          refreshErrorMessage: null,
        });
        return { success: true };
      }

      // 2. Token invalid, attempt refresh
      const authService = new VintedAuthService(cookie);
      const tokens = await authService.refreshAccessToken();

      if (!tokens) {
        // Failed to refresh
        await this.updateSessionStatus(
          userId,
          VINTED_SESSION_STATUS.REQUIRES_REFRESH,
          'Failed to refresh access token'
        );
        return { success: false };
      }

      // 3. Update with new tokens
      const updatedCookie = this.updateCookieTokens(
        cookie,
        tokens.accessToken,
        tokens.refreshToken,
      );

      const encryptedCookie = await encryptSecret(updatedCookie, userId);
      const now = getCurrentTimestamp();

      await vintedRepository.update(session.id, {
        sessionCookie: encryptedCookie,
        status: VINTED_SESSION_STATUS.ACTIVE,
        lastRefreshedAt: now,
        lastValidatedAt: now,
        refreshErrorMessage: null,
      });

      return {
        success: true,
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        },
      };

    } catch (error) {
      logger.error('Error refreshing session', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      await this.updateSessionStatus(
        userId,
        VINTED_SESSION_STATUS.REQUIRES_REFRESH,
        error instanceof Error ? error.message : 'Unknown error'
      );

=======
      logger.error('Error in refreshSession', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
      return { success: false };
    }
  }

<<<<<<< HEAD
  // --- Private Helpers ---

  private async updateSessionStatus(userId: string, status: Exclude<SessionStatus, 'disconnected'>, errorMessage: string | null = null) {
    const session = await vintedRepository.findByUserId(userId);
    if (session) {
      await vintedRepository.update(session.id, {
        status,
        refreshErrorMessage: errorMessage,
      });
    }
  }

  private async isTokenValid(cookie: string): Promise<boolean> {
    try {
      const match = cookie.match(/access_token_web=([^;]+)/);
      if (!match || !match[1]) return false;
      return match[1].length > 0;
    } catch {
      return false;
    }
  }

  private updateCookieTokens(cookie: string, accessToken: string, refreshToken: string): string {
=======
  /**
   * Update cookie tokens
   * @param cookie - The current cookie string
   * @param accessToken - The new access token
   * @param refreshToken - The new refresh token
   * @returns Updated cookie string
   */
  private updateCookieTokens(
    cookie: string,
    accessToken: string,
    refreshToken: string,
  ): string {
    // Replace tokens in cookie string
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
    let updated = cookie.replace(/access_token_web=[^;]*/, `access_token_web=${accessToken}`);
    updated = updated.replace(/refresh_token_web=[^;]*/, `refresh_token_web=${refreshToken}`);
    return updated;
  }
}

export const vintedSessionManager = new VintedSessionManager();
