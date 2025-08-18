import { logger } from '@/lib/utils/logging/logger';

/**
 * Service de gestion du cache pour les analyses de marché
 */
class CacheManager {
    private static instance: CacheManager;
    private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
    private readonly DEFAULT_TTL = 30 * 60 * 1000; // 30 minutes

    public static getInstance(): CacheManager {
        if (!CacheManager.instance) {
            CacheManager.instance = new CacheManager();
        }
        return CacheManager.instance;
    }

    /**
     * Génère une clé de cache à partir d'un objet
     */
    private generateCacheKey(key: Record<string, any>): string {
        return JSON.stringify(key, Object.keys(key).sort());
    }

    /**
     * Vérifie si une entrée de cache est expirée
     */
    private isExpired(entry: { timestamp: number; ttl: number }): boolean {
        return Date.now() - entry.timestamp > entry.ttl;
    }

    /**
     * Nettoie les entrées expirées du cache
     */
    private cleanup(): void {
        const now = Date.now();
        let cleanedCount = 0;

        for (const [key, entry] of this.cache.entries()) {
            if (this.isExpired(entry)) {
                this.cache.delete(key);
                cleanedCount++;
            }
        }

        if (cleanedCount > 0) {
            logger.info(`[CacheManager] Nettoyage: ${cleanedCount} entrées supprimées`);
        }
    }

    /**
     * Récupère une valeur du cache
     */
    async get<T>(key: Record<string, any>): Promise<T | null> {
        const cacheKey = this.generateCacheKey(key);
        const entry = this.cache.get(cacheKey);

        if (!entry) {
            return null;
        }

        if (this.isExpired(entry)) {
            this.cache.delete(cacheKey);
            return null;
        }

        return entry.data as T;
    }

    /**
     * Stocke une valeur dans le cache
     */
    async set<T>(
        key: Record<string, any>, 
        data: T, 
        operationId?: string, 
        ttl: number = this.DEFAULT_TTL
    ): Promise<void> {
        const cacheKey = this.generateCacheKey(key);
        
        this.cache.set(cacheKey, {
            data,
            timestamp: Date.now(),
            ttl,
        });


        // Nettoyer périodiquement le cache
        if (this.cache.size % 10 === 0) {
            this.cleanup();
        }
    }

    /**
     * Supprime une entrée du cache
     */
    async delete(key: Record<string, any>): Promise<boolean> {
        const cacheKey = this.generateCacheKey(key);
        const deleted = this.cache.delete(cacheKey);

        if (deleted) {
        }

        return deleted;
    }

    /**
     * Vide complètement le cache
     */
    async clear(): Promise<void> {
        const size = this.cache.size;
        this.cache.clear();
        logger.info(`[CacheManager] Cache vidé: ${size} entrées supprimées`);
    }

    /**
     * Retourne les statistiques du cache
     */
    getStats(): { size: number; keys: string[] } {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys()),
        };
    }

    /**
     * Nettoie manuellement le cache
     */
    async cleanupExpired(): Promise<number> {
        const initialSize = this.cache.size;
        this.cleanup();
        const cleanedCount = initialSize - this.cache.size;

        logger.info(`[CacheManager] Nettoyage manuel: ${cleanedCount} entrées supprimées`);
        return cleanedCount;
    }
}

// Export de l'instance singleton
export const cacheManager = CacheManager.getInstance();