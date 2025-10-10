// Cache aliases for compatibility
export { SimpleCache as CacheManager } from './simple-cache'
export { SimpleCache as RedisCacheService } from './simple-cache'
export { cache } from './simple-cache'

// Mock functions for missing cache utilities
export function generateCacheKey(...parts: string[]): string {
  return parts.join(':')
}

export function generateHashKey(data: any): string {
  return JSON.stringify(data)
}