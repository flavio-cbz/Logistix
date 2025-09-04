// Service pour récupérer et mettre en cache les catégories Vinted depuis l’API officielle

import { VintedAuthService } from '@/lib/services/auth/vinted-auth-service';
import { vintedSessionCipherService } from '@/lib/services/auth/vinted-session-cipher-service';
import { databaseService } from '@/lib/services/database/db';
const CATEGORY_CACHE_KEY = 'vinted_categories';
const CATEGORY_CACHE_TTL = 3600000; // 1h in milliseconds

// Simple in-memory cache
const cache = new Map<string, { data: any; expiry: number }>();

function getCached(_key: string): any | null {
  const cached = cache.get(_key);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }
  cache.delete(_key);
  return null;
}

function setCache(_key: string, _data: any): void {
  cache.set(_key, { data: _data, expiry: Date.now() + CATEGORY_CACHE_TTL });
}

export class VintedCategoryFetcher {
  static async fetchCategories(): Promise<any[]> {
    // Récupérer la session Vinted la plus récente
    const sessionRow = await databaseService.queryOne<{ user_id: string, session_cookie: string, encrypted_dek: string | null, encryption_metadata: string | null }>(
      'SELECT user_id, session_cookie, encrypted_dek, encryption_metadata FROM vinted_sessions ORDER BY updated_at DESC LIMIT 1',
      [],
      'fetchVintedSessionForCategories'
    );
    if (!sessionRow?.session_cookie || !sessionRow.user_id) throw new Error('Aucun cookie Vinted enregistré.');

    // Déchiffrer le cookie avec la nouvelle logique centralisée
    const cookie = await vintedSessionCipherService.decryptSession(
      sessionRow.user_id,
      sessionRow.session_cookie,
      sessionRow.encrypted_dek,
      
    );

    // Extraire le token access_token_web
    const token = VintedAuthService.extractAccessTokenFromCookie(cookie);
    if (!token) throw new Error('Token Vinted non disponible');

    // Vérifier le cache
    const cached = getCached(CATEGORY_CACHE_KEY);
    if (cached) return cached;

    // Appel à l’API Vinted
    const res = await fetch('https://www.vinted.fr/api/v2/catalogs', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    if (!res.ok) throw new Error('Erreur lors de la récupération des catégories Vinted');
    const data = await res.json();

    // Mettre en cache la structure hiérarchique complète
    setCache(CATEGORY_CACHE_KEY, data.catalogs);

    return data.catalogs;
  }

  static async clearCache() {
    cache.delete(CATEGORY_CACHE_KEY);
  }
}