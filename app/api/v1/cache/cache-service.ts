import { db } from "@/lib/services/db";
import { Logger } from "@/lib/utils/logger";

const logger = new Logger("app/api/v1/cache/cache-service");

interface CacheEntry {
  key: string;
  value: string;
  expires_at: number; // Timestamp UNIX
}

class CacheService {
  private tableName = "api_cache";

  constructor() {
    this.initializeCacheTable();
  }

  private initializeCacheTable() {
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS ${this.tableName} (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          expires_at INTEGER NOT NULL
        );
      `);
      logger.info(`Table de cache '${this.tableName}' créée ou existante.`);
    } catch (error) {
      logger.error(`Erreur lors de la création de la table de cache: ${error}`);
      throw error;
    }
  }

  public async get<T>(key: string): Promise<T | null> {
    try {
      const stmt = db.prepare(`SELECT value, expires_at FROM ${this.tableName} WHERE key = ?`);
      const entry: CacheEntry | undefined = stmt.get(key) as CacheEntry | undefined;

      if (!entry) {
        return null;
      }

      if (entry.expires_at < Date.now()) {
        // Cache expiré, le supprimer
        this.delete(key);
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
      const expires_at = Date.now() + ttlSeconds * 1000;
      const serializedValue = JSON.stringify(value);

      const stmt = db.prepare(`
        INSERT OR REPLACE INTO ${this.tableName} (key, value, expires_at)
        VALUES (?, ?, ?)
      `);
      stmt.run(key, serializedValue, expires_at);
      logger.info(`Cache défini pour la clé '${key}', expiration dans ${ttlSeconds} secondes.`);
    } catch (error) {
      logger.error(`Erreur lors de la définition du cache pour la clé '${key}': ${error}`);
    }
  }

  public async delete(key: string): Promise<void> {
    try {
      const stmt = db.prepare(`DELETE FROM ${this.tableName} WHERE key = ?`);
      stmt.run(key);
      logger.info(`Cache supprimé pour la clé '${key}'.`);
    } catch (error) {
      logger.error(`Erreur lors de la suppression du cache pour la clé '${key}': ${error}`);
    }
  }

  public async clear(): Promise<void> {
    try {
      db.exec(`DELETE FROM ${this.tableName}`);
      logger.info("Cache vidé.");
    } catch (error) {
      logger.error(`Erreur lors du vidage du cache: ${error}`);
    }
  }
}

export const cacheService = new CacheService();