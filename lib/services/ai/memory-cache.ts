/**
 * Cache en mémoire pour remplacer Redis
 * Système de cache simple et efficace pour les insights AI
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  accessCount: number;
  lastAccessed: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  entries: number;
  memoryUsage: number;
}

/**
 * Cache en mémoire avec expiration et LRU
 */
export class MemoryCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    entries: 0,
    memoryUsage: 0
  };
  private maxSize: number;
  private defaultTTL: number;
  private cleanupInterval: NodeJS.Timeout;

  constructor(maxSize: number = 1000, defaultTTL: number = 3600) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
    
    // Nettoyage automatique toutes les 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Obtenir une valeur du cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Vérifier l'expiration
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      this.updateStats();
      return null;
    }

    // Mettre à jour les statistiques d'accès
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.stats.hits++;

    return entry.value;
  }

  /**
   * Définir une valeur dans le cache
   */
  set(key: string, value: T, ttl?: number): void {
    const expiresAt = Date.now() + (ttl || this.defaultTTL) * 1000;
    
    // Si le cache est plein, supprimer les entrées les moins utilisées
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    this.cache.set(key, {
      value,
      expiresAt,
      accessCount: 0,
      lastAccessed: Date.now()
    });

    this.updateStats();
  }

  /**
   * Supprimer une entrée du cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.updateStats();
    }
    return deleted;
  }

  /**
   * Vérifier si une clé existe dans le cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    // Vérifier l'expiration
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.updateStats();
      return false;
    }
    
    return true;
  }

  /**
   * Vider le cache
   */
  clear(): void {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      entries: 0,
      memoryUsage: 0
    };
  }

  /**
   * Obtenir les statistiques du cache
   */
  getStats(): CacheStats & { hitRate: number } {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
    
    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100) / 100
    };
  }

  /**
   * Obtenir toutes les clés du cache
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Obtenir la taille actuelle du cache
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Nettoyer les entrées expirées
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.updateStats();
    }
  }

  /**
   * Supprimer les entrées les moins récemment utilisées
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Mettre à jour les statistiques
   */
  private updateStats(): void {
    this.stats.entries = this.cache.size;
    
    // Estimation approximative de l'utilisation mémoire
    let memoryUsage = 0;
    for (const [key, entry] of this.cache.entries()) {
      memoryUsage += key.length * 2; // UTF-16
      memoryUsage += JSON.stringify(entry.value).length * 2;
      memoryUsage += 32; // Métadonnées de l'entrée
    }
    this.stats.memoryUsage = memoryUsage;
  }

  /**
   * Nettoyer les ressources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

/**
 * Cache global pour les insights AI
 */
export class AIInsightsCache {
  private static instance: AIInsightsCache;
  private cache: MemoryCache;

  private constructor() {
    // Initialiser avec les paramètres par défaut
    this.cache = new MemoryCache(1000, 3600);
    
    // Écouter les changements de configuration
    this.setupConfigListener();
  }

  public static getInstance(): AIInsightsCache {
    if (!AIInsightsCache.instance) {
      AIInsightsCache.instance = new AIInsightsCache();
    }
    return AIInsightsCache.instance;
  }

  /**
   * Obtenir des insights du cache
   */
  async get(key: string): Promise<any | null> {
    return this.cache.get(key);
  }

  /**
   * Stocker des insights dans le cache
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    this.cache.set(key, value, ttl);
  }

  /**
   * Supprimer des insights du cache
   */
  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  /**
   * Vérifier si une clé existe
   */
  async has(key: string): Promise<boolean> {
    return this.cache.has(key);
  }

  /**
   * Vider le cache
   */
  async clear(): Promise<void> {
    this.cache.clear();
  }

  /**
   * Obtenir les statistiques
   */
  getStats() {
    return this.cache.getStats();
  }

  /**
   * Générer une clé de cache intelligente
   */
  generateCacheKey(params: {
    productName: string;
    catalogId: number;
    analysisType?: string;
    options?: any;
  }): string {
    const { productName, catalogId, analysisType = 'insights', options = {} } = params;
    
    // Normaliser le nom du produit
    const normalizedName = productName
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');
    
    // Créer un hash des options
    const optionsHash = this.hashObject(options);
    
    return `ai:${analysisType}:${catalogId}:${normalizedName}:${optionsHash}`;
  }

  /**
   * Configurer l'écoute des changements de configuration
   */
  private setupConfigListener(): void {
    try {
      const { AISettingsManager } = require('@/lib/config/ai-settings');
      const settingsManager = AISettingsManager.getInstance();
      
      settingsManager.addListener((settings) => {
        // Reconfigurer le cache selon les nouveaux paramètres
        if (settings.caching.enabled) {
          // Créer un nouveau cache avec les nouveaux paramètres
          const oldCache = this.cache;
          this.cache = new MemoryCache(settings.caching.maxSize, settings.caching.ttl);
          
          // Migrer les données si possible
          this.migrateCacheData(oldCache, this.cache);
          
          // Nettoyer l'ancien cache
          oldCache.destroy();
        } else {
          // Désactiver le cache
          this.cache.clear();
        }
      });
    } catch (error) {
      console.warn('Impossible de configurer l\'écoute des paramètres AI:', error);
    }
  }

  /**
   * Migrer les données d'un cache à un autre
   */
  private migrateCacheData(oldCache: MemoryCache, newCache: MemoryCache): void {
    try {
      const keys = oldCache.keys();
      let migrated = 0;
      
      for (const key of keys) {
        const value = oldCache.get(key);
        if (value !== null) {
          newCache.set(key, value);
          migrated++;
        }
      }
      
    } catch (error) {
      console.warn('Erreur lors de la migration du cache:', error);
    }
  }

  /**
   * Créer un hash simple d'un objet
   */
  private hashObject(obj: any): string {
    const str = JSON.stringify(obj, Object.keys(obj).sort());
    let hash = 0;
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convertir en 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }
}

// Instance globale
export const aiInsightsCache = AIInsightsCache.getInstance();