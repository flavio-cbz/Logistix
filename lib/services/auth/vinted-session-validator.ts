/**
 * lib/services/auth/vinted-session-validator.ts
 *
 * Fournit une fonction utilitaire pour valider un cookie/session Vinted.
 * Utilisé par :
 *  - scripts/validate-cookie.ts
 *  - app/api/v1/vinted/test-token/route.ts
 *
 * Comportement :
 *  1. Tente validateAccessToken() via VintedAuthService
 *  2. Si invalide, tente refreshAccessToken()
 *  3. En fallback, effectue un appel HTTP à l'endpoint "users/current"
 *
 * Renvoie un objet compact décrivant le résultat (ne pas exposer de secrets).
 */

import { logger as baseLogger } from "@/lib/utils/logging/logger";
import axios from "axios"; // Importer axios directement pour isAxiosError

export interface ValidationResult {
  success: boolean;
  valid: boolean;
  refreshed?: boolean;
  message?: string;
  details?: Record<string, unknown>;
  suggestions?: string[];
}

export async function testVintedSessionCookie(
  cookie: string,
): Promise<ValidationResult> {
  const logger = baseLogger;

  if (!cookie || typeof cookie !== "string" || cookie.length < 10) {
    return {
      success: false,
      valid: false,
      message: "Cookie manquant ou invalide",
    };
  }

  try {
    const authMod = await import("./vinted-auth-service");
    // Assurer que VintedAuthService est correctement typé
    const VintedAuthService = (authMod as { VintedAuthService: any })
      .VintedAuthService;
    const auth = new VintedAuthService(cookie);

    // 1) Validation directe
    try {
      const validation = await auth.validateAccessToken();
      if (
        validation &&
        (validation.valid || validation.user?.id || validation.userId)
      ) {
        return {
          success: true,
          valid: true,
          message: "Validation directe réussie",
          details: { validation: { status: "ok" } },
        };
      }
    } catch (err: unknown) {
      // Utilisation de unknown
      // non-fatal, on poursuit
    }

    // 2) Tentative de refresh si supportée
    try {
      if (typeof auth.refreshAccessToken === "function") {
        const refreshed = await auth.refreshAccessToken();
        if (refreshed && (refreshed.accessToken || refreshed.refreshToken)) {
          return {
            success: true,
            valid: true,
            refreshed: true,
            message: "Refresh réussi",
            details: { refreshed: Object.keys(refreshed) },
          };
        }
      }
    } catch (err: unknown) {
      // Utilisation de unknown
    }

    // 3) Fallback : appel direct à l'API Vinted 'users/current'
    try {
      const cfgMod = await import("../../config/vinted-config");
      const getVintedConfig = (cfgMod as { getVintedConfig: any })
        .getVintedConfig;
      const config =
        typeof getVintedConfig === "function"
          ? getVintedConfig()
          : (cfgMod as any);

      // axios est déjà importé en haut du fichier
      // const axiosMod = await import("axios");
      // const axios = axiosMod.default ?? axiosMod;

      const headers: Record<string, string> = {
        Cookie: cookie,
        "User-Agent": config?.headers?.userAgent ?? "Logistix/1.0",
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
      };

      const userCurrentUrl =
        config?.apiEndpoints?.userCurrent ??
        "https://www.vinted.fr/api/v2/users/current";

      const res = await axios.get(userCurrentUrl, { headers, timeout: 10000 });
      if (res.status === 200 && res.data?.user) {
        return {
          success: true,
          valid: true,
          message: "Appel API utilisateur OK",
          details: { userId: res.data.user.id },
        };
      }

      // Non 200 ou pas de user → invalide
      return {
        success: false,
        valid: false,
        message: `Appel API retourné status ${res.status}`,
      };
    } catch (err: unknown) {
      // Utilisation de unknown
      if (axios.isAxiosError(err)) {
        return {
          success: false,
          valid: false,
          message: `Cookie invalide ou expiré: ${err.response?.statusText || err.message}`,
        };
      } else if (err instanceof Error) {
        return {
          success: false,
          valid: false,
          message: `Cookie invalide ou expiré: ${err.message}`,
        };
      } else {
        return {
          success: false,
          valid: false,
          message: "Cookie invalide ou expiré",
        };
      }
    }
  } catch (err: unknown) {
    // Utilisation de unknown
    logger.error("Erreur inattendue dans testVintedSessionCookie", {
      error: err instanceof Error ? err.message : err,
    });
    return {
      success: false,
      valid: false,
      message: "Erreur interne lors de la validation",
    };
  }
}

export default testVintedSessionCookie;
