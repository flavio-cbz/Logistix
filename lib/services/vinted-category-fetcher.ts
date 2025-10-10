// Service pour récupérer et mettre en cache les catégories Vinted depuis l’API officielle

import { VintedAuthService } from "@/lib/services/auth/vinted-auth-service";
import { vintedSessionCipherService } from "@/lib/services/auth/vinted-session-cipher-service";
import { databaseService } from "@/lib/services/database/db";
import { autoPerf } from "@/lib/services/auto-performance-integration";
import { vintedApi } from "@/lib/services/vinted-api";
const CATEGORY_CACHE_KEY = "vinted_categories";

export class VintedCategoryFetcher {
  static async fetchCategories(): Promise<any[]> {
    // Récupérer la session Vinted la plus récente
    const sessionRow = await databaseService.queryOne<{
      user_id: string;
      session_cookie: string;
      encrypted_dek: string | null;
      encryption_metadata: string | null;
    }>(
      "SELECT user_id, session_cookie, encrypted_dek, encryption_metadata FROM vinted_sessions ORDER BY updated_at DESC LIMIT 1",
      [],
      "fetchVintedSessionForCategories",
    );
    if (!sessionRow?.session_cookie || !sessionRow.user_id)
      throw new Error("Aucun cookie Vinted enregistré.");

    // Déchiffrer le cookie avec la nouvelle logique centralisée
    const cookie = await vintedSessionCipherService.decryptSession(
      sessionRow.user_id,
      sessionRow.session_cookie,
      sessionRow.encrypted_dek,
    );

    // Extraire le token access_token_web
    const token = VintedAuthService.extractAccessTokenFromCookie(cookie);
    if (!token) throw new Error("Token Vinted non disponible");

    // Vérifier le cache (autoPerf)
    const cached = autoPerf.cacheGet<any[]>(CATEGORY_CACHE_KEY);
    if (cached) return cached;

    // Appel à l’API Vinted via client unifié + timeouts/retry auto
    const data = await vintedApi.getJson<any>("catalogs", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    // Mettre en cache la structure hiérarchique complète (TTL auto)
    await autoPerf.cacheSet(CATEGORY_CACHE_KEY, data.catalogs);

    return data.catalogs;
  }

  static async clearCache() {
    await autoPerf.cacheSet(CATEGORY_CACHE_KEY, null as any, 0);
  }
}
