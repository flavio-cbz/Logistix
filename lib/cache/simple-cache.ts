// Simple cache implementation for Logistix
export interface CacheEntry<T = any> {
  value: T
  timestamp: number
  ttl?: number
}

export class SimpleCache {
  private cache = new Map<string, CacheEntry>()

  set<T>(key: string, value: T, ttl?: number): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ...(ttl !== undefined && { ttl })
    })
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    // Check if expired
    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl * 1000) {
      this.cache.delete(key)
      return null
    }

    return entry.value as T
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  has(key: string): boolean {
    return this.cache.has(key)
  }

  size(): number {
    return this.cache.size
  }

  getStats(): any {
    return {
      size: this.size(),
      entries: Array.from(this.cache.keys()),
    }
  }
}

// Global cache instance
export const cache = new SimpleCache()

// Export for compatibility
export { cache as CacheManager }
export { SimpleCache as RedisCacheService }