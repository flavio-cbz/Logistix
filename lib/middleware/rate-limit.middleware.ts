/**
 * Rate Limiting Middleware
 * 
 * Protège les endpoints sensibles contre les attaques par force brute
 * et les abus en limitant le nombre de requêtes par IP/utilisateur.
 * 
 * Stratégie : In-memory storage (Map) avec nettoyage automatique.
 * Pour un environnement distribué, utiliser Redis.
 * 
 * @module middleware/rate-limit
 */

import { NextRequest } from "next/server";
import { RateLimitError } from "@/lib/shared/errors/base-errors";

/**
 * Configuration du rate limiter
 */
export interface RateLimitConfig {
  /**
   * Nombre maximum de requêtes autorisées dans la fenêtre temporelle
   * @default 5
   */
  maxRequests: number;

  /**
   * Durée de la fenêtre en millisecondes
   * @default 60000 (1 minute)
   */
  windowMs: number;

  /**
   * Message d'erreur personnalisé
   * @default "Trop de tentatives. Veuillez réessayer plus tard."
   */
  message?: string;

  /**
   * Clé pour identifier l'utilisateur (par défaut : IP)
   * @default "ip"
   */
  keyGenerator?: (req: NextRequest) => string;

  /**
   * Fonction de skip pour ignorer certaines requêtes
   */
  skip?: (req: NextRequest) => boolean;
}

/**
 * Entrée du rate limiter
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/**
 * Store in-memory pour le rate limiting
 */
class RateLimitStore {
  private store = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Nettoyage automatique toutes les minutes
    this.startCleanup();
  }

  /**
   * Démarre le nettoyage automatique des entrées expirées
   */
  private startCleanup() {
    if (this.cleanupInterval) return;

    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store.entries()) {
        if (now > entry.resetTime) {
          this.store.delete(key);
        }
      }
    }, 60000); // Toutes les minutes

    // Permet au process de se terminer proprement
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Arrête le nettoyage automatique (pour les tests)
   */
  stopCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Incrémente le compteur pour une clé donnée
   */
  increment(key: string, windowMs: number): RateLimitEntry {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now > entry.resetTime) {
      // Nouvelle entrée ou fenêtre expirée
      const newEntry: RateLimitEntry = {
        count: 1,
        resetTime: now + windowMs,
      };
      this.store.set(key, newEntry);
      return newEntry;
    }

    // Incrémenter le compteur existant
    entry.count++;
    this.store.set(key, entry);
    return entry;
  }

  /**
   * Récupère une entrée
   */
  get(key: string): RateLimitEntry | undefined {
    return this.store.get(key);
  }

  /**
   * Réinitialise le store (pour les tests)
   */
  reset() {
    this.store.clear();
  }

  /**
   * Retourne la taille du store
   */
  size(): number {
    return this.store.size;
  }
}

// Instance globale du store
const globalStore = new RateLimitStore();

/**
 * Extrait l'adresse IP de la requête
 */
function getClientIp(req: NextRequest): string {
  // Essayer les headers standards de proxy
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  // Fallback (localhost en dev)
  return "127.0.0.1";
}

/**
 * Configuration par défaut du rate limiter
 */
const defaultConfig: Required<Omit<RateLimitConfig, "skip">> = {
  maxRequests: 5,
  windowMs: 60000, // 1 minute
  message: "Trop de tentatives. Veuillez réessayer dans quelques instants.",
  keyGenerator: getClientIp,
};

/**
 * Crée un middleware de rate limiting
 * 
 * @example
 * ```ts
 * const limiter = createRateLimiter({
 *   maxRequests: 5,
 *   windowMs: 60000, // 1 minute
 * });
 * 
 * export async function POST(req: NextRequest) {
 *   await limiter(req);
 *   // ... handler logic
 * }
 * ```
 */
export function createRateLimiter(config: Partial<RateLimitConfig> = {}) {
  const finalConfig: Required<Omit<RateLimitConfig, "skip">> & Pick<RateLimitConfig, "skip"> = {
    ...defaultConfig,
    ...config,
  };

  return async (req: NextRequest): Promise<void> => {
    // Skip si fonction définie
    if (finalConfig.skip && finalConfig.skip(req)) {
      return;
    }

    // Générer la clé d'identification
    const key = finalConfig.keyGenerator(req);

    // Incrémenter le compteur
    const entry = globalStore.increment(key, finalConfig.windowMs);

    // Calculer les headers de rate limit
  // remaining calculé si besoin futur: const remaining = Math.max(0, finalConfig.maxRequests - entry.count);
    const resetTimeSeconds = Math.ceil(entry.resetTime / 1000);

    // Vérifier si la limite est dépassée
    if (entry.count > finalConfig.maxRequests) {
      const retryAfterSeconds = Math.ceil((entry.resetTime - Date.now()) / 1000);

      throw new RateLimitError(finalConfig.message, {
        limit: finalConfig.maxRequests,
        remaining: 0,
        reset: resetTimeSeconds,
        retryAfter: retryAfterSeconds,
      });
    }

    // Ajouter les headers de rate limit à la requête (pour les lire dans le handler)
    // Note: On ne peut pas modifier directement les headers de NextRequest
    // Les headers seront ajoutés dans la réponse via le handler
  };
}

/**
 * Configuration prédéfinie pour les endpoints d'authentification
 */
export const authRateLimiter = createRateLimiter({
  maxRequests: 5,
  windowMs: 60000, // 5 tentatives par minute
  message: "Trop de tentatives de connexion. Veuillez réessayer dans 1 minute.",
});

/**
 * Configuration prédéfinie pour les endpoints d'API standards
 */
export const apiRateLimiter = createRateLimiter({
  maxRequests: 100,
  windowMs: 60000, // 100 requêtes par minute
  message: "Limite de requêtes dépassée. Veuillez réessayer plus tard.",
});

/**
 * Configuration prédéfinie pour les endpoints sensibles (mutations)
 */
export const strictRateLimiter = createRateLimiter({
  maxRequests: 10,
  windowMs: 60000, // 10 requêtes par minute
  message: "Trop de requêtes. Veuillez patienter avant de réessayer.",
});

/**
 * Réinitialise le store global (pour les tests uniquement)
 */
export function resetRateLimitStore() {
  globalStore.reset();
}

/**
 * Arrête le cleanup du store (pour les tests)
 */
export function stopRateLimitCleanup() {
  globalStore.stopCleanup();
}

/**
 * Retourne la taille du store (pour les tests/monitoring)
 */
export function getRateLimitStoreSize(): number {
  return globalStore.size();
}
