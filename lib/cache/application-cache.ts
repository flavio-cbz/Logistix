/**
 * Application Cache Service - Simple implementation
 */

import { SimpleCache } from './simple-cache';

export class ApplicationCacheService {
  private cache = new SimpleCache();

  async get<T>(key: string): Promise<T | null> {
    return this.cache.get(key) as T | null;
  }

  async set<T>(key: string, value: T, ttl: number = 3600): Promise<void> {
    this.cache.set(key, value, ttl);
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }
}

export const createApplicationCacheService = () => new ApplicationCacheService();