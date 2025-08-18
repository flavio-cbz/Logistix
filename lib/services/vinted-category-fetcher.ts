// Service pour récupérer et mettre en cache les catégories Vinted depuis l’API officielle

import { VintedAuthService } from '@/lib/services/auth/vinted-auth-service';
import { vintedCredentialService } from '@/lib/services/auth/vinted-credential-service';
import { db } from '@/lib/services/database/drizzle-client';
import { vintedSessions } from '@/lib/services/database/drizzle-schema';
const CATEGORY_CACHE_KEY = 'vinted_categories';
const CATEGORY_CACHE_TTL = 3600000; // 1h in milliseconds

// Simple in-memory cache
const cache = new Map<string, { data: any; expiry: number }>();

function getCached(key: string): any | null {
  const cached = cache.get(key);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: any): void {
  cache.set(key, { data, expiry: Date.now() + CATEGORY_CACHE_TTL });
}

export class VintedCategoryFetcher {
  static async fetchCategories(): Promise<any[]> {
    // Récupérer le cookie chiffré de la session Vinted
    const session = await db.select().from(vintedSessions).limit(1);
    if (!session[0]?.sessionCookie) throw new Error('Aucun cookie Vinted enregistré.');
    const cookie = await vintedCredentialService.decrypt(session[0].sessionCookie);
  
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