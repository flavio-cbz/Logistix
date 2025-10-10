import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from '../../drizzle/schema';
import { logger } from '../../lib/utils/logging/logger';

/**
 * Service de base de données pour les scripts - sans contrainte server-only
 */
class DatabaseScriptService {
  private static instance: DatabaseScriptService;
  private db: any;

  private constructor() {
    // Utiliser la même base de données que l'application
    const dbPath = process.env.DATABASE_URL || './logistix.db';
    const sqlite = new Database(dbPath);
    this.db = drizzle(sqlite, { schema });
  }

  public static getInstance(): DatabaseScriptService {
    if (!DatabaseScriptService.instance) {
      DatabaseScriptService.instance = new DatabaseScriptService();
    }
    return DatabaseScriptService.instance;
  }

  public getDb() {
    return this.db;
  }

  /**
   * Exécute une requête de sélection
   */
  public async query<T>(sql: string, params?: any[]): Promise<T[]> {
    const stmt = this.db.client.prepare(sql);
    const result = params ? stmt.all(...params) : stmt.all();
    return result as T[];
  }

  /**
   * Exécute une requête de sélection qui retourne un seul résultat
   */
  public async queryOne<T>(sql: string, params?: any[]): Promise<T | null> {
    const stmt = this.db.client.prepare(sql);
    const result = params ? stmt.get(...params) : stmt.get();
    return (result as T) || null;
  }

  /**
   * Exécute une requête de modification (INSERT, UPDATE, DELETE)
   */
  public async execute(sql: string, params?: any[]): Promise<{ changes: number; lastInsertRowid: number }> {
    const stmt = this.db.client.prepare(sql);
    const result = params ? stmt.run(...params) : stmt.run();
    return {
      changes: result.changes,
      lastInsertRowid: Number(result.lastInsertRowid),
    };
  }

  /**
   * Vérifie la santé de la base de données
   */
  public async healthCheck(): Promise<boolean> {
    try {
      const result = await this.queryOne<{ result: number }>("SELECT 1 as result");
      return result?.result === 1;
    } catch (error) {
      logger.error("Health check failed", { error });
      return false;
    }
  }
}

export const dbScriptService = DatabaseScriptService.getInstance();