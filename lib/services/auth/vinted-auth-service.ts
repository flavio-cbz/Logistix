// Service d’authentification Vinted basé sur axios
import axios from "axios";
import { getVintedConfig } from "@/lib/config/vinted-config";

export interface VintedTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt?: string;
}

export class VintedAuthService {
  private cookie: string;

  constructor(cookie: string) {
    this.cookie = cookie;
  }

  /**
   * Extrait le token access_token_web de la chaîne de cookies.
   */
  public static extractAccessTokenFromCookie(cookie: string): string | null {
    const match = cookie.match(/access_token_web=([^;]+)/);
    return match ? (match[1]! ?? null) : null;
  }

  /**
   * Extrait le token refresh_token_web de la chaîne de cookies.
   */
  public static extractRefreshTokenFromCookie(cookie: string): string | null {
    const match = cookie.match(/refresh_token_web=([^;]+)/);
    return match ? (match[1]! ?? null) : null;
  }

  /**
   * Vérifie la validité du token access_token_web en effectuant une requête protégée.
   * Retourne un objet détaillé pour le debug.
   */
  public async validateAccessToken(): Promise<{
    valid: boolean;
    status?: number;
    body?: any;
    cookieSent?: string;
    error?: any;
  }> {
    const accessToken = VintedAuthService.extractAccessTokenFromCookie(
      this.cookie,
    );
    if (!accessToken)
      return {
        valid: false,
        error: "Aucun access_token_web trouvé dans le cookie.",
      };

    let cookieHeader = this.cookie;
    if (accessToken && !/access_token_web=/.test(cookieHeader)) {
      cookieHeader = `${cookieHeader}; access_token_web=${accessToken}`;
    }

    try {
      const config = getVintedConfig();
      const response = await axios.get(config.apiEndpoints.userCurrent, {
        headers: {
          Cookie: cookieHeader,
          "User-Agent": config.headers.userAgent,
          Accept: config.headers.accept,
          "X-Requested-With": config.headers.xRequestedWith,
        },
        validateStatus: () => true, // Ne pas jeter d'erreur pour les status non-2xx
      });

      const body = response.data;
      const valid =
        response.status === 200 &&
        !!body &&
        typeof body === "object" &&
        (!!body.id || !!body.user?.id);

      return {
        valid,
        status: response.status,
        body: body,
        cookieSent: cookieHeader,
      };
    } catch (err: any) {
      return {
        valid: false,
        error: err?.message || err,
        cookieSent: cookieHeader,
        status: err?.response?.status,
        body: err?.response?.data,
      };
    }
  }

  /**
   * Rafraîchit la session Vinted via l’endpoint /session-refresh.
   * Retourne les nouveaux tokens si succès, sinon null.
   */
  public async refreshAccessToken(): Promise<VintedTokens | null> {
    try {
      const config = getVintedConfig();
      const response = await axios.post(
        config.apiEndpoints.sessionRefresh,
        {},
        {
          headers: {
            Cookie: this.cookie,
            "User-Agent": config.headers.userAgent,
            Accept: config.headers.accept,
          },
        },
      );

      // Chercher les nouveaux cookies dans les headers de réponse
      const setCookie = response.headers["set-cookie"]!;
      let accessToken: string | null = null;
      let refreshToken: string | null = null;

      if (setCookie && Array.isArray(setCookie)) {
        for (const cookieStr of setCookie) {
          if (cookieStr.startsWith("access_token_web=")) {
            accessToken =
              cookieStr.match(/access_token_web=([^;]+)/)?.[1] || null;
          }
          if (cookieStr.startsWith("refresh_token_web=")) {
            refreshToken =
              cookieStr.match(/refresh_token_web=([^;]+)/)?.[1] || null;
          }
        }
      }

      if (accessToken && refreshToken) {
        return {
          accessToken,
          refreshToken,
        };
      }
      return null;
    } catch (err) {
      return null;
    }
  }
}
