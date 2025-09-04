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

export class MemoryCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private stats: CacheStats = { hits: 0, misses: 0, entries: 0, memoryUsage: 0 };
  private maxSize: number;
  private defaultTTL: number; // seconds
  private cleanupInterval?: NodeJS.Timeout;

  constructor(maxSize: number = 1000, defaultTTL: number = 3600) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      this.updateStats();
      return null;
    }
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.stats.hits++;
    return entry.value;
  }

  set(key: string, value: T, ttl?: number): void {
    const expiresAt = Date.now() + (ttl ?? this.defaultTTL) * 1000;
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }
    this.cache.set(key, { value, expiresAt, accessCount: 0, lastAccessed: Date.now() });
    this.updateStats();
  }

  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) this.updateStats();
    return deleted;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.updateStats();
      return false;
    }
    return true;
  }

  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, entries: 0, memoryUsage: 0 };
  }

  getStats(): CacheStats & { hitRate: number } {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
    return { ...this.stats, hitRate: Math.round(hitRate * 100) / 100 };
  }

  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  size(): number {
    return this.cache.size;
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    if (cleaned > 0) this.updateStats();
  }

  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }
    if (oldestKey) this.cache.delete(oldestKey);
  }

  private updateStats(): void {
    this.stats.entries = this.cache.size;
    let memoryUsage = 0;
    for (const [key, entry] of this.cache.entries()) {
      memoryUsage += key.length * 2;
      try {
        memoryUsage += JSON.stringify(entry.value).length * 2;
      } catch {
        memoryUsage += 64;
      }
      memoryUsage += 32;
    }
    this.stats.memoryUsage = memoryUsage;
  }

  destroy(): void {
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
    this.clear();
  }
}

export class AIInsightsCache {
  private static instance: AIInsightsCache;
  private cache: MemoryCache<any>;

  private constructor() {
    this.cache = new MemoryCache(1000, 3600);
    this.setupConfigListener();
  }

  public static getInstance(): AIInsightsCache {
    if (!AIInsightsCache.instance) AIInsightsCache.instance = new AIInsightsCache();
    return AIInsightsCache.instance;
  }

  async get(key: string): Promise<any | null> {
    return this.cache.get(key);
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    this.cache.set(key, value, ttl);
  }

  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  async has(key: string): Promise<boolean> {
    return this.cache.has(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  getStats() {
    return this.cache.getStats();
  }

  generateCacheKey(params: { productName: string; catalogId: number; analysisType?: string; options?: any; }): string {
    const { productName, catalogId, analysisType = 'insights', options = {} } = params;
    const normalizedName = productName.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
    const optionsHash = this.hashObject(options);
    return `ai:${analysisType}:${catalogId}:${normalizedName}:${optionsHash}`;
  }

  private setupConfigListener(): void {
    try {
      // Lazy require to avoid startup dependency issues
      
      const { AISettingsManager } = require('@/lib/config/ai-settings');
      const settingsManager = AISettingsManager.getInstance();
      settingsManager.addListener((settings: any) => {
        if (settings?.caching?.enabled) {
          const oldCache = this.cache;
          this.cache = new MemoryCache(settings.caching.maxSize || 1000, settings.caching.ttl || 3600);
          this.migrateCacheData(oldCache, this.cache);
          oldCache.destroy();
        } else {
          this.cache.clear();
        }
      });
    } catch (e) {
      // Ignore if AISettingsManager is not available in some environments
      // console.warn('AI settings listener unavailable', e);
    }
  }

  private migrateCacheData(oldCache: MemoryCache<any>, newCache: MemoryCache<any>): void {
    try {
      const keys = oldCache.keys();
      for (const key of keys) {
        const value = oldCache.get(key);
        if (value !== null) newCache.set(key, value as any);
      }
    } catch (e) {
      // swallow
    }
  }

  private hashObject(obj: any): string {
    const str = JSON.stringify(obj, Object.keys(obj || {}).sort());
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}

export const aiInsightsCache = AIInsightsCache.getInstance();