// Service d’authentification Vinted basé sur axios
import axios from 'axios';

export interface VintedTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt?: Date;
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
    return match ? match[1] : null;
  }

  /**
   * Extrait le token refresh_token_web de la chaîne de cookies.
   */
  public static extractRefreshTokenFromCookie(cookie: string): string | null {
    const match = cookie.match(/refresh_token_web=([^;]+)/);
    return match ? match[1] : null;
  }

  /**
   * Vérifie la validité du token access_token_web en effectuant une requête protégée.
   * Retourne un objet détaillé pour le debug.
   */
  public async validateAccessToken(): Promise<{ valid: boolean; status?: number; body?: any; cookieSent?: string; error?: any }> {
    const accessToken = VintedAuthService.extractAccessTokenFromCookie(this.cookie);
    if (!accessToken) return { valid: false, error: 'Aucun access_token_web trouvé dans le cookie.' };

    let cookieHeader = this.cookie;
    if (accessToken && !/access_token_web=/.test(cookieHeader)) {
      cookieHeader = `${cookieHeader}; access_token_web=${accessToken}`;
    }

    try {
      const response = await axios.get('https://www.vinted.fr/api/v2/users/', {
        headers: {
          'Cookie': cookieHeader,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        validateStatus: () => true, // Ne pas jeter d'erreur pour les status non-2xx
      });

      const body = response.data;
      const valid = response.status === 200 && !!body && typeof body === 'object' && (!!body.id || !!body.user?.id);
      
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
      const response = await axios.post('https://www.vinted.fr/session-refresh', {}, {
        headers: {
          'Cookie': this.cookie,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
        },
      });

      // Chercher les nouveaux cookies dans les headers de réponse
      const setCookie = response.headers['set-cookie'];
      let accessToken: string | null = null;
      let refreshToken: string | null = null;

      if (setCookie && Array.isArray(setCookie)) {
        for (const cookieStr of setCookie) {
          if (cookieStr.startsWith('access_token_web=')) {
            accessToken = cookieStr.match(/access_token_web=([^;]+)/)?.[1] || null;
          }
          if (cookieStr.startsWith('refresh_token_web=')) {
            refreshToken = cookieStr.match(/refresh_token_web=([^;]+)/)?.[1] || null;
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