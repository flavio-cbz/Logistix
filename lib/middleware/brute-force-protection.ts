/**
 * Protection Brute Force Renforcée
 * 
 * Système avancé de protection contre les attaques par force brute avec:
 * - Compteur de tentatives échouées
 * - Backoff exponentiel
 * - Blocage temporaire après X tentatives
 * - Réinitialisation automatique après succès
 * - Logging détaillé des tentatives suspectes
 * 
 * @module middleware/brute-force-protection
 */

import { logger } from '@/lib/utils/logging/logger';

/**
 * Configuration du système de protection
 */
export interface BruteForceConfig {
  /**
   * Nombre maximum de tentatives échouées avant blocage
   * @default 5
   */
  maxAttempts: number;

  /**
   * Durée initiale de blocage en millisecondes
   * @default 60000 (1 minute)
   */
  initialBlockDuration: number;

  /**
   * Facteur de multiplication pour le backoff exponentiel
   * @default 2
   */
  backoffMultiplier: number;

  /**
   * Durée maximale de blocage en millisecondes
   * @default 3600000 (1 heure)
   */
  maxBlockDuration: number;

  /**
   * Durée après laquelle les tentatives échouées sont réinitialisées (sans blocage)
   * @default 900000 (15 minutes)
   */
  resetAfter: number;
}

/**
 * Entrée de tentative dans le store
 */
interface AttemptEntry {
  /**
   * Nombre de tentatives échouées consécutives
   */
  attempts: number;

  /**
   * Timestamp de la dernière tentative échouée
   */
  lastAttemptAt: number;

  /**
   * Timestamp jusqu'auquel l'identifiant est bloqué (null si pas bloqué)
   */
  blockedUntil: number | null;

  /**
   * Durée actuelle de blocage (pour calcul du backoff)
   */
  currentBlockDuration: number;

  /**
   * Timestamp de la première tentative échouée de la série
   */
  firstAttemptAt: number;
}

/**
 * Store in-memory pour les tentatives
 */
class BruteForceStore {
  private store = new Map<string, AttemptEntry>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanup();
  }

  /**
   * Démarre le nettoyage automatique
   */
  private startCleanup() {
    if (this.cleanupInterval) return;

    // Nettoyage toutes les 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 300000);

    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Nettoie les entrées expirées
   */
  private cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.store.entries()) {
      // Supprimer si le blocage est terminé ET aucune tentative récente
      if (
        (!entry.blockedUntil || now > entry.blockedUntil) &&
        now - entry.lastAttemptAt > 3600000 // 1 heure
      ) {
        this.store.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug(`[BruteForce] Nettoyage: ${cleaned} entrées supprimées`);
    }
  }

  /**
   * Arrête le nettoyage (pour tests)
   */
  stopCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Récupère une entrée
   */
  get(key: string): AttemptEntry | undefined {
    return this.store.get(key);
  }

  /**
   * Définit une entrée
   */
  set(key: string, entry: AttemptEntry): void {
    this.store.set(key, entry);
  }

  /**
   * Supprime une entrée
   */
  delete(key: string): void {
    this.store.delete(key);
  }

  /**
   * Retourne le nombre d'entrées dans le store
   */
  size(): number {
    return this.store.size;
  }

  /**
   * Vide complètement le store (pour tests)
   */
  clear(): void {
    this.store.clear();
  }
}

// Store singleton
const store = new BruteForceStore();

/**
 * Classe principale de protection brute force
 */
export class BruteForceProtection {
  private config: BruteForceConfig;

  constructor(config?: Partial<BruteForceConfig>) {
    this.config = {
      maxAttempts: config?.maxAttempts ?? 5,
      initialBlockDuration: config?.initialBlockDuration ?? 60000, // 1 minute
      backoffMultiplier: config?.backoffMultiplier ?? 2,
      maxBlockDuration: config?.maxBlockDuration ?? 3600000, // 1 heure
      resetAfter: config?.resetAfter ?? 900000, // 15 minutes
    };
  }

  /**
   * Vérifie si un identifiant est actuellement bloqué
   * 
   * @param identifier - Identifiant unique (IP, username, email, etc.)
   * @returns Objet avec statut de blocage et informations
   */
  isBlocked(identifier: string): {
    blocked: boolean;
    remainingTime?: number;
    attempts?: number;
    blockedUntil?: number;
  } {
    const entry = store.get(identifier);

    if (!entry) {
      return { blocked: false };
    }

    const now = Date.now();

    // Vérifier si le blocage est actif
    if (entry.blockedUntil && now < entry.blockedUntil) {
      const remainingTime = entry.blockedUntil - now;

      logger.warn(`[BruteForce] Tentative sur identifiant bloqué`, {
        identifier,
        attempts: entry.attempts,
        remainingTime,
        blockedUntil: new Date(entry.blockedUntil).toISOString(),
      });

      return {
        blocked: true,
        remainingTime,
        attempts: entry.attempts,
        blockedUntil: entry.blockedUntil,
      };
    }

    // Vérifier si les tentatives doivent être réinitialisées
    if (now - entry.lastAttemptAt > this.config.resetAfter) {
      store.delete(identifier);
      logger.info(`[BruteForce] Tentatives réinitialisées pour ${identifier}`);
      return { blocked: false };
    }

    return {
      blocked: false,
      attempts: entry.attempts,
    };
  }

  /**
   * Enregistre une tentative échouée
   * 
   * @param identifier - Identifiant unique
   * @param metadata - Métadonnées additionnelles pour logging
   */
  recordFailedAttempt(identifier: string, metadata?: Record<string, unknown>): void {
    const now = Date.now();
    const entry = store.get(identifier);

    if (!entry) {
      // Première tentative échouée
      const newEntry: AttemptEntry = {
        attempts: 1,
        lastAttemptAt: now,
        blockedUntil: null,
        currentBlockDuration: this.config.initialBlockDuration,
        firstAttemptAt: now,
      };

      store.set(identifier, newEntry);

      logger.warn(`[BruteForce] Première tentative échouée`, {
        identifier,
        attempts: 1,
        ...metadata,
      });

      return;
    }

    // Incrémenter le compteur
    entry.attempts++;
    entry.lastAttemptAt = now;

    // Vérifier si on doit bloquer
    if (entry.attempts >= this.config.maxAttempts) {
      // Utiliser la durée actuelle (ou calculer avec backoff si déjà bloqué avant)
      let blockDuration = entry.currentBlockDuration;

      // Si c'est un re-blocage (après une expiration de blocage précédent),
      // appliquer le backoff exponentiel
      if (entry.blockedUntil && now > entry.blockedUntil) {
        blockDuration = Math.min(
          entry.currentBlockDuration * this.config.backoffMultiplier,
          this.config.maxBlockDuration
        );
      }

      entry.blockedUntil = now + blockDuration;
      entry.currentBlockDuration = blockDuration;

      store.set(identifier, entry);

      logger.error(`[BruteForce] Identifiant bloqué après ${entry.attempts} tentatives`, {
        identifier,
        attempts: entry.attempts,
        blockDuration,
        blockedUntil: new Date(entry.blockedUntil).toISOString(),
        firstAttemptAt: new Date(entry.firstAttemptAt).toISOString(),
        ...metadata,
      });

      return;
    }

    store.set(identifier, entry);

    logger.warn(`[BruteForce] Tentative échouée ${entry.attempts}/${this.config.maxAttempts}`, {
      identifier,
      attempts: entry.attempts,
      maxAttempts: this.config.maxAttempts,
      ...metadata,
    });
  }

  /**
   * Enregistre une tentative réussie (réinitialise le compteur)
   * 
   * @param identifier - Identifiant unique
   */
  recordSuccessfulAttempt(identifier: string): void {
    const entry = store.get(identifier);

    if (entry) {
      logger.info(`[BruteForce] Tentative réussie - réinitialisation du compteur`, {
        identifier,
        previousAttempts: entry.attempts,
      });

      store.delete(identifier);
    }
  }

  /**
   * Réinitialise manuellement un identifiant (déblocage manuel)
   * 
   * @param identifier - Identifiant à débloquer
   */
  reset(identifier: string): void {
    const entry = store.get(identifier);

    if (entry) {
      logger.info(`[BruteForce] Réinitialisation manuelle`, {
        identifier,
        attempts: entry.attempts,
        wasBlocked: !!entry.blockedUntil,
      });

      store.delete(identifier);
    }
  }

  /**
   * Retourne les statistiques globales
   */
  getStats(): {
    totalEntries: number;
    blockedEntries: number;
    averageAttempts: number;
  } {
    const now = Date.now();
    let blockedCount = 0;
    let totalAttempts = 0;
    const size = store.size();

    store['store'].forEach((entry) => {
      if (entry.blockedUntil && now < entry.blockedUntil) {
        blockedCount++;
      }
      totalAttempts += entry.attempts;
    });

    return {
      totalEntries: size,
      blockedEntries: blockedCount,
      averageAttempts: size > 0 ? totalAttempts / size : 0,
    };
  }
}

/**
 * Instance par défaut pour les endpoints de login
 */
export const loginBruteForceProtection = new BruteForceProtection({
  maxAttempts: 5,
  initialBlockDuration: 60000, // 1 minute
  backoffMultiplier: 2,
  maxBlockDuration: 3600000, // 1 heure
  resetAfter: 900000, // 15 minutes
});

/**
 * Instance stricte pour les endpoints critiques (admin, reset password, etc.)
 */
export const strictBruteForceProtection = new BruteForceProtection({
  maxAttempts: 3,
  initialBlockDuration: 300000, // 5 minutes
  backoffMultiplier: 3,
  maxBlockDuration: 86400000, // 24 heures
  resetAfter: 1800000, // 30 minutes
});

/**
 * Helper pour extraire l'identifiant d'une requête (IP + optionnel username/email)
 */
export function getIdentifier(
  ip: string,
  additionalKey?: string
): string {
  if (additionalKey) {
    return `${ip}:${additionalKey}`;
  }
  return ip;
}

// Export du store pour tests
export { store as _bruteForceStore };
