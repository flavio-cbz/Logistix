import axios from "axios";
import type { VintedTokens } from "@/lib/services/auth/vinted-auth-service";
import { databaseService, getCurrentTimestamp } from "@/lib/services/database/db";
import { logger } from "@/lib/utils/logging/logger";
import { getVintedConfig } from "@/lib/config/vinted-config";
import { encryptSecret, decryptSecret } from "@/lib/utils/crypto";

type VintedSessionStatus = "active" | "expired" | "error" | "requires_configuration";

interface VintedSessionRecord {
  id: string;
  user_id: string;
  session_cookie: string | null;
  status: VintedSessionStatus;
  last_validated_at: string | null;
  last_refreshed_at: string | null;
  refresh_error_message: string | null;
}

type SessionUpdateFields = Partial<{
  status: VintedSessionStatus;
  refresh_error_message: string | null;
  last_validated_at: string | null;
  session_cookie: string | null;
  last_refreshed_at: string | null;
  last_refresh_attempt_at: string | null;
}>;

const SESSION_SELECT_SQL = `
  SELECT id, user_id, session_cookie, status, last_validated_at, last_refreshed_at, refresh_error_message
  FROM vinted_sessions
  WHERE user_id = ?
  LIMIT 1
`;

async function findSessionByUserId(userId: string): Promise<VintedSessionRecord | null> {
  return databaseService.queryOne<VintedSessionRecord>(
    SESSION_SELECT_SQL,
    [userId],
    "vinted-session-find-by-user",
  );
}

async function updateSession(
  userId: string,
  fields: SessionUpdateFields,
  context: string,
): Promise<void> {
  const now = getCurrentTimestamp();
  const assignments: string[] = [];
  const params: (string | null)[] = [];

  for (const [column, value] of Object.entries(fields)) {
    if (typeof value === "undefined") continue;
    assignments.push(`${column} = ?`);
    params.push(value);
  }

  assignments.push("updated_at = ?");
  params.push(now);
  params.push(userId);

  const setClause = assignments.join(", ");

  await databaseService.execute(
    `UPDATE vinted_sessions SET ${setClause} WHERE user_id = ?`,
    params,
    context,
  );
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return typeof error === "string" ? error : "Unknown error";
}

async function markRequiresConfiguration(userId: string, message: string, context: string): Promise<void> {
  await updateSession(
    userId,
    {
      status: "requires_configuration",
      refresh_error_message: message,
      last_validated_at: null,
    },
    context,
  );
}

async function markError(userId: string, message: string, context: string): Promise<void> {
  await updateSession(
    userId,
    {
      status: "error",
      refresh_error_message: message,
    },
    context,
  );
}

async function markExpired(userId: string, message: string, context: string): Promise<void> {
  await updateSession(
    userId,
    {
      status: "expired",
      refresh_error_message: message,
    },
    context,
  );
}

async function markValidated(userId: string, timestamp: string, context: string): Promise<void> {
  await updateSession(
    userId,
    {
      status: "active",
      last_validated_at: timestamp,
      refresh_error_message: null,
    },
    context,
  );
}

async function persistRefreshedCookie(
  userId: string,
  cookie: string,
  timestamp: string,
  context: string,
): Promise<void> {
  const encrypted = await encryptSecret(cookie);
  await updateSession(
    userId,
    {
      session_cookie: encrypted,
      status: "active",
      last_validated_at: timestamp,
      last_refreshed_at: timestamp,
      refresh_error_message: null,
    },
    context,
  );
}

interface RefreshResult {
  success: boolean;
  error?: string;
  tokens?: VintedTokens;
}

// Configuration centralisée via vinted-config.ts

export const vintedSessionManager = {
  async getSessionCookie(userId: string): Promise<string | null> {
    const session = await findSessionByUserId(userId);
    if (!session?.session_cookie) {
      return null;
    }

    try {
      return await decryptSecret(session.session_cookie);
    } catch (error: unknown) {
      const message = `Impossible de déchiffrer la session`;
      logger.error(
        `[VintedSessionManager] Erreur lors du déchiffrement du cookie pour ${userId}: ${formatError(error)}`,
        { userId, operation: "vinted-session-decrypt", error },
      );
      await markRequiresConfiguration(userId, message, "vinted-session-decrypt-failure");
      return null;
    }
  },

  async refreshSession(userId: string): Promise<RefreshResult> {
    const session = await findSessionByUserId(userId);

    if (!session || !session.session_cookie) {
      const message = "Session non trouvée";
      logger.warn(
        `[VintedSessionManager] Aucune session à rafraîchir pour l'utilisateur ${userId}`,
      );
      await markRequiresConfiguration(userId, message, "vinted-session-missing");
      return { success: false, error: message };
    }

    let cookie: string;
    try {
      cookie = await decryptSecret(session.session_cookie);
    } catch (error: unknown) {
      const message = "Impossible de déchiffrer la session";
      logger.error(
        `[VintedSessionManager] Erreur de déchiffrement du cookie pour ${userId}: ${formatError(error)}`,
        { userId, operation: "vinted-session-refresh-decrypt", error },
      );
      await markRequiresConfiguration(userId, message, "vinted-session-refresh-decrypt-failure");
      return { success: false, error: message };
    }

    try {
      const isValid = await this.isTokenValid(cookie);
      const now = getCurrentTimestamp();

      if (isValid) {
        await markValidated(userId, now, "vinted-session-validated");
        logger.info("[VintedSessionManager] Session validée", {
          userId,
          operation: "vinted-session-validated",
        });
        return { success: true };
      }

      logger.info("[VintedSessionManager] Token expiré, tentative de refresh", {
        userId,
        operation: "vinted-session-refresh",
      });

      const { VintedAuthService } = await import("@/lib/services/auth/vinted-auth-service");
      const authService = new VintedAuthService(cookie);
      const newTokens = await authService.refreshAccessToken();

      if (newTokens?.accessToken && newTokens.refreshToken) {
        const newCookie = cookie
          .replace(/access_token_web=[^;]+/, `access_token_web=${newTokens.accessToken}`)
          .replace(/refresh_token_web=[^;]+/, `refresh_token_web=${newTokens.refreshToken}`);

        await persistRefreshedCookie(
          userId,
          newCookie,
          now,
          "vinted-session-refresh-success",
        );

        logger.info("[VintedSessionManager] Token rafraîchi avec succès", {
          userId,
          operation: "vinted-session-refresh-success",
        });
        return { success: true, tokens: newTokens };
      }

      const message = "Impossible de rafraîchir le token";
      await markExpired(userId, `${message}.`, "vinted-session-refresh-failure");
      logger.warn("[VintedSessionManager] Impossible de rafraîchir le token", {
        userId,
        operation: "vinted-session-refresh-failure",
      });
      return { success: false, error: message };
    } catch (error: unknown) {
      const message = formatError(error);
      logger.error(
        `[VintedSessionManager] Erreur lors du rafraîchissement de la session pour ${userId}: ${message}`,
        { userId, operation: "vinted-session-refresh-error", error },
      );
      await markError(userId, message, "vinted-session-refresh-error");
      return { success: false, error: message };
    }
  },

  async isTokenValid(cookieString: string): Promise<boolean> {
    if (!cookieString) {
      return false;
    }

    try {
      const config = getVintedConfig();
      const headers = {
        Cookie: cookieString,
        "User-Agent": config.headers.userAgent,
        Accept: config.headers.accept,
        "X-Requested-With": config.headers.xRequestedWith,
      };

      const response = await axios.get(config.apiEndpoints.userCurrent, {
        headers,
        timeout: 10_000,
      });

      return response.status === 200 && Boolean(response.data?.user?.id);
    } catch (error: unknown) {
      if (
        axios.isAxiosError(error) &&
        (error.response?.status === 401 || error.response?.status === 403)
      ) {
        logger.warn(
          `[isTokenValid] Validation failed with status ${error.response.status}. Token is invalid.`,
        );
        return false;
      }

      logger.error(
        "[isTokenValid] Erreur inattendue lors de la validation du token:",
        { error, operation: "vinted-session-token-validation" },
      );
      return true;
    }
  },
};