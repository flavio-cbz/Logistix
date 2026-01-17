/**
 * Vinted Session Manager
 * Manages Vinted session cookies with encryption and token validation
 */

import { databaseService, getCurrentTimestamp } from '@/lib/database';
import { encryptSecret, decryptSecret } from '@/lib/utils/crypto';
import { getLogger } from '@/lib/utils/logging/logger';
import { VintedAuthService } from '@/lib/services/auth/vinted-auth-service';

const logger = getLogger('VintedSessionManager');

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
      const session = await databaseService.queryOne<{
        id: string;
        user_id: string;
        session_cookie: string;
        status: string;
      }>(
        `SELECT id, user_id, session_cookie, status FROM vinted_sessions WHERE user_id = ?`,
        [userId],
      );

      if (!session) {
        return null;
      }

      try {
        const decrypted = await decryptSecret(session.session_cookie, userId);
        return decrypted;
      } catch (error) {
        logger.error('Failed to decrypt session cookie', {
          userId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        // Mark session as requiring configuration
        await databaseService.execute(
          `UPDATE vinted_sessions SET status = ?, refresh_error_message = ?, last_validated_at = ?, updated_at = ? WHERE user_id = ?`,
          [
            'requires_configuration',
            'Impossible de déchiffrer la session',
            null,
            getCurrentTimestamp(),
            userId,
          ],
          'vinted-session-decrypt-failure',
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
   * Check if token is valid
   * @param cookie - The session cookie
   * @returns Whether the token is valid
   */
  async isTokenValid(cookie: string): Promise<boolean> {
    try {
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

      if (!session) {
        return { success: false };
      }

      try {
        const cookie = await decryptSecret(session.session_cookie, userId);

        // Check if token is still valid
        const isValid = await this.isTokenValid(cookie);

        if (isValid) {
          // Just validate the session
          await databaseService.execute(
            `UPDATE vinted_sessions SET status = ?, last_validated_at = ?, refresh_error_message = ?, updated_at = ? WHERE user_id = ?`,
            [
              'active',
              getCurrentTimestamp(),
              null,
              getCurrentTimestamp(),
              userId,
            ],
            'vinted-session-validated',
          );

          return { success: true };
        }

        // Token is invalid, try to refresh
        const authService = new VintedAuthService(cookie);
        const tokens = await authService.refreshAccessToken();

        if (!tokens) {
          return { success: false };
        }

        // Update cookie with new tokens
        const updatedCookie = this.updateCookieTokens(
          cookie,
          tokens.accessToken,
          tokens.refreshToken,
        );

        const encryptedCookie = await encryptSecret(updatedCookie, userId);

        await databaseService.execute(
          `UPDATE vinted_sessions SET session_cookie = ?, status = ?, last_refreshed_at = ?, last_validated_at = ?, refresh_error_message = ?, updated_at = ? WHERE user_id = ?`,
          [
            encryptedCookie,
            'active',
            getCurrentTimestamp(),
            getCurrentTimestamp(),
            null,
            getCurrentTimestamp(),
            userId,
          ],
          'vinted-session-refresh-success',
        );

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

        await databaseService.execute(
          `UPDATE vinted_sessions SET status = ?, refresh_error_message = ?, updated_at = ? WHERE user_id = ?`,
          [
            'requires_refresh',
            error instanceof Error ? error.message : 'Unknown error',
            getCurrentTimestamp(),
            userId,
          ],
          'vinted-session-refresh-error',
        );

        return { success: false };
      }
    } catch (error) {
      logger.error('Error in refreshSession', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return { success: false };
    }
  }

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
    let updated = cookie.replace(/access_token_web=[^;]*/, `access_token_web=${accessToken}`);
    updated = updated.replace(/refresh_token_web=[^;]*/, `refresh_token_web=${refreshToken}`);
    return updated;
  }
}

export const vintedSessionManager = new VintedSessionManager();
