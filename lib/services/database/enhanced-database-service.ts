
import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { SQLiteConnectionPool } from "./connection-pool";
import { DatabaseInitializationManagerImpl } from "./initialization-manager";
import { RequestType, RequestPriority } from "./queue-manager";

// Logger optimisé pour le service
const logger = {
  info: (_message: string, _data?: any) => {
    if (
      (process.env as any)["NODE_ENV"] === "development" ||
      (process.env as any)["DB_DEBUG"] === "true"
    ) {
      // console.info(
      //   `[EnhancedDB] ${_message}`,
      //   data ? JSON.stringify(data) : "",
      // );
    }
  },
  warn: (_message: string, _data?: any) => {
    // console.warn(`[EnhancedDB] ${_message}`, data ? JSON.stringify(data) : "");
  },
  error: (_message: string, _data?: any) => {
    // console.error(`[EnhancedDB] ${_message}`, data ? JSON.stringify(data) : "");
  },
  debug: (_message: string, _data?: any) => {
    if ((process.env as any)["DB_DEBUG"] === "true") {
    }
  },
};

/**
 * Service de base de données amélioré qui combine l'initialisation thread-safe
 * avec le pool de connexions pour une gestion optimale des accès concurrents
 */
export class EnhancedDatabaseService {
  private static instance: EnhancedDatabaseService;
  private connectionPool: SQLiteConnectionPool;
  private initializationManager: DatabaseInitializationManagerImpl;

  private constructor() {
    this.initializationManager =
      DatabaseInitializationManagerImpl.getInstance();
    this.connectionPool = SQLiteConnectionPool.getInstance();

    logger.info("EnhancedDatabaseService initialized");
  }

  /**
   * Récupère l'instance unique du service
   */
  public static getInstance(): EnhancedDatabaseService {
    if (!EnhancedDatabaseService.instance) {
      EnhancedDatabaseService.instance = new EnhancedDatabaseService();
    }
    return EnhancedDatabaseService.instance;
  }

  /**
   * Initialise la base de données si nécessaire
   */
  public async ensureInitialized(): Promise<void> {
    if (!this.initializationManager.isInitialized()) {
      logger.info("Database not initialized, starting initialization...");
      await this.initializationManager.initialize();
    }
  }

  /**
   * Exécute une requête avec gestion automatique de l'initialisation et du pool
   */
  public async query<T>(
    sql: string,
    params?: any[],
    context?: string,
  ): Promise<T[]> {
    await this.ensureInitialized();

    return this.connectionPool.executeWithConnection(
      (db: BetterSQLite3Database) => {
        const stmt = (db as any).client.prepare(sql); // Accéder au client better-sqlite3
        const result = params ? stmt.all(...params) : stmt.all();
        return result as T[];
      },
      RequestType.READ,
      RequestPriority.NORMAL,
      context || "query",
    );
  }

  /**
   * Exécute une requête qui retourne un seul résultat
   */
  public async queryOne<T>(
    sql: string,
    params?: any[],
    context?: string,
  ): Promise<T | null> {
    await this.ensureInitialized();

    return this.connectionPool.executeWithConnection(
      (db: BetterSQLite3Database) => {
        const stmt = (db as any).client.prepare(sql); // Accéder au client better-sqlite3
        const result = params ? stmt.get(...params) : stmt.get();
        return (result as T) || null;
      },
      RequestType.READ,
      RequestPriority.NORMAL,
      context || "queryOne",
    );
  }

  /**
   * Exécute une requête de modification (INSERT, UPDATE, DELETE)
   */
  public async execute(
    sql: string,
    params?: any[],
    context?: string,
  ): Promise<{ changes: number; lastInsertRowid: number }> {
    await this.ensureInitialized();

    return this.connectionPool.executeWithConnection(
      (db: BetterSQLite3Database) => {
        const stmt = (db as any).client.prepare(sql); // Accéder au client better-sqlite3
        const result = params ? stmt.run(...params) : stmt.run();
        return {
          changes: result.changes,
          lastInsertRowid: Number(result.lastInsertRowid),
        };
      },
      RequestType.WRITE,
      RequestPriority.NORMAL,
      context || "execute",
    );
  }

  /**
   * Exécute une transaction avec gestion automatique des erreurs
   */
  public async transaction<T>(
    operations: (db: BetterSQLite3Database) => T,
    context?: string,
  ): Promise<T> {
    await this.ensureInitialized();

    return this.connectionPool.executeTransaction(
      operations,
      context || "transaction",
    );
  }

  /**
   * Exécute plusieurs requêtes dans une transaction
   */
  public async batchExecute(
    queries: Array<{ sql: string; params?: any[] }>,
    context?: string,
  ): Promise<Array<{ changes: number; lastInsertRowid: number }>> {
    await this.ensureInitialized();

    return this.connectionPool.executeTransaction(
      (db: BetterSQLite3Database) => {
        const results: Array<{ changes: number; lastInsertRowid: number }> = [];

        for (const query of queries) {
          const stmt = (db as any).client.prepare(query.sql); // Accéder au client better-sqlite3
          const result = query.params ? stmt.run(...query.params) : stmt.run();
          results.push({
            changes: result.changes,
            lastInsertRowid: Number(result.lastInsertRowid),
          });
        }

        return results;
      },
      context || "batchExecute",
    );
  }

  /**
   * Vérifie la santé de la base de données
   */
  public async healthCheck(): Promise<boolean> {
    try {
      await this.ensureInitialized();

      const result = await this.queryOne<{ result: number }>(
        "SELECT 1 as result",
        undefined,
        "healthCheck",
      );

      const isHealthy = result?.result === 1;

      return isHealthy;
    } catch (error) {
      logger.error("Health check failed", { error });
      return false;
    }
  }

  /**
   * Obtient les statistiques du service
   */
  public getStats() {
    return {
      initialization: {
        state: this.initializationManager.getInitializationState(),
        isInitialized: this.initializationManager.isInitialized(),
      },
      connectionPool: this.connectionPool.getDetailedStats(),
    };
  }

  /**
   * Ferme toutes les connexions (pour les tests ou l'arrêt de l'application)
   */
  public async shutdown(): Promise<void> {
    logger.info("Shutting down EnhancedDatabaseService...");
    await this.connectionPool.closeAll();
    logger.info("EnhancedDatabaseService shutdown completed");
  }
}

// Export de l'instance singleton
export const enhancedDb = EnhancedDatabaseService.getInstance();
