import { databaseService } from "@/lib/services/database/db";
// Simple logger disabled
// import { Logger } from "@/lib/utils/logging/simple-logger";

import { getLogger } from '@/lib/utils/logging/simple-logger';

const logger = getLogger('CacheService');

interface CacheEntry {
  key: string;
  value: string;
  expires_at: number; // Timestamp UNIX
}

class CacheService {
  private tableName = "api_cache";
  private initialized = false;

  constructor() {
    // Initialization will be done lazily
  }

  private async ensureInitialized() {
    if (!this.initialized) {
      await this.initializeCacheTable();
      this.initialized = true;
    }
  }

  private async initializeCacheTable() {
    try {
      await databaseService.execute(`
        CREATE TABLE IF NOT EXISTS ${this.tableName} (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          expires_at INTEGER NOT NULL
        )
      `, [], 'cache-init');
      logger.info(`Table de cache '${this.tableName}' créée ou existante.`);
    } catch (error) {
      logger.error(`Erreur lors de la création de la table de cache: ${error}`);
      throw error;
    }
  }

  public async get<T>(key: string): Promise<T | null> {
    try {
      await this.ensureInitialized();
      
      const entry = await databaseService.queryOne<CacheEntry>(
        `SELECT value, expires_at FROM ${this.tableName} WHERE key = ?`,
        [key],
        'cache-get'
      );

      if (!entry) {
        return null;
      }

      if (entry.expires_at < Date.now()) {
        // Cache expiré, le supprimer
        await this.delete(key);
        return null;
      }

      return JSON.parse(entry.value) as T;
    } catch (error) {
      logger.error(`Erreur lors de la récupération du cache pour la clé '${key}': ${error}`);
      return null;
    }
  }

  public async set<T>(key: string, value: T, ttlSeconds: number = 3600): Promise<void> {
    try {
      await this.ensureInitialized();
      
      const expires_at = Date.now() + ttlSeconds * 1000;
      const serializedValue = JSON.stringify(value);

      await databaseService.execute(`
        INSERT OR REPLACE INTO ${this.tableName} (key, value, expires_at)
        VALUES (?, ?, ?)
      `, [key, serializedValue, expires_at], 'cache-set');
      
      logger.info(`Cache défini pour la clé '${key}', expiration dans ${ttlSeconds} secondes.`);
    } catch (error) {
      logger.error(`Erreur lors de la définition du cache pour la clé '${key}': ${error}`);
    }
  }

  public async delete(key: string): Promise<void> {
    try {
      await this.ensureInitialized();
      
      await databaseService.execute(
        `DELETE FROM ${this.tableName} WHERE key = ?`,
        [key],
        'cache-delete'
      );
      
      logger.info(`Cache supprimé pour la clé '${key}'.`);
    } catch (error) {
      logger.error(`Erreur lors de la suppression du cache pour la clé '${key}': ${error}`);
    }
  }

  public async clear(): Promise<void> {
    try {
      await this.ensureInitialized();
      
      await databaseService.execute(
        `DELETE FROM ${this.tableName}`,
        [],
        'cache-clear'
      );
      
      logger.info("Cache vidé.");
    } catch (error) {
      logger.error(`Erreur lors du vidage du cache: ${error}`);
    }
  }
}

export const cacheService = new CacheService();