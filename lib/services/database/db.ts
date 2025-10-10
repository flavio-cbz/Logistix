import "server-only";
import Database from "better-sqlite3";
import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3"; // Importez BetterSQLite3Database directement
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { SQLiteConnectionPool } from "./connection-pool";
import { DatabaseInitializationManagerImpl } from "./initialization-manager";
import { RequestType, RequestPriority } from "./queue-manager";
import { databaseLogger } from "./database-logger";

// Fallback logger that works in all environments (plus silencieux)
const logger = {
  info: (_message: string, ...args: any[]) => {
    // Log important messages when not in production, or when DB_DEBUG enabled
    if (
      typeof console !== "undefined" &&
      ((process.env as any)["NODE_ENV"] !== "production" ||
        (process.env as any)["DB_DEBUG"] === "true")
    ) {
      console.info(`[DB] ${_message}`, ...args);
    }
  },
  warn: (_message: string, ...args: any[]) => {
    if (typeof console !== "undefined") {
      console.warn(`[DB] ${_message}`, ...args);
    }
  },
  error: (_message: string, ...args: any[]) => {
    if (typeof console !== "undefined") {
      console.error(`[DB] ${_message}`, ...args);
    }
  },
  debug: (_message: string, ..._args: any[]) => {
    if (
      typeof console !== "undefined" &&
      (process.env as any)["DB_DEBUG"] === "true"
    ) {
    }
  },
};

/**
 * Classe encapsulant la gestion de la base de données SQLite.
 * Utilise le pool de connexions pour optimiser les performances et éviter les verrous.
 */
class DatabaseService {
  private static instance: DatabaseService;
  private connectionPool: SQLiteConnectionPool;
  private initializationManager: DatabaseInitializationManagerImpl;
  private isInitialized = false;

  private constructor() {
    this.connectionPool = SQLiteConnectionPool.getInstance();
    this.initializationManager =
      DatabaseInitializationManagerImpl.getInstance();

    logger.info("DatabaseService initialized with connection pool");
  }

  /**
   * Récupère l'instance unique de DatabaseService.
   */
  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * S'assure que la base de données est initialisée avant utilisation
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      if (this.initializationManager.isInitialized()) {
        this.isInitialized = true;
        logger.info("Database already initialized by initialization manager");
        return;
      }

      if (
        this.initializationManager.getInitializationState() === "in_progress"
      ) {
        logger.info("Database initialization in progress, waiting...");
        await this.initializationManager.waitForInitialization();
        this.isInitialized = true;
        return;
      }

      await this.initializationManager.initialize();
      this.isInitialized = true;
      logger.info("Database initialization completed");
    }
  }

  /**
   * Exécute une requête SELECT avec gestion automatique de connexion
   */
  public async query<T = any>(
    sql: string,
    params: any[] = [],
    context?: string,
  ): Promise<T[]> {
    await this.ensureInitialized();

    return this.connectionPool.executeWithConnection(
      (db: BetterSQLite3Database) => {
        // Type 'db' explicitement
        const stmt = (db as any).client.prepare(sql); // Accéder au client better-sqlite3
        return stmt.all(...params) as T[];
      },
      RequestType.READ,
      RequestPriority.NORMAL,
      context || "query",
    );
  }

  /**
   * Exécute une requête qui retourne une seule ligne
   */
  public async queryOne<T = any>(
    sql: string,
    params: any[] = [],
    context?: string,
  ): Promise<T | null> {
    await this.ensureInitialized();

    return this.connectionPool.executeWithConnection(
      (db: BetterSQLite3Database) => {
        // Type 'db' explicitement
        const stmt = (db as any).client.prepare(sql); // Accéder au client better-sqlite3
        return (stmt.get(...params) as T | undefined) || null;
      },
      RequestType.READ,
      RequestPriority.NORMAL,
      context || "queryOne",
    );
  }

  /**
   * Exécute une requête INSERT, UPDATE ou DELETE
   */
  public async execute(
    sql: string,
    params: any[] = [],
    context?: string,
  ): Promise<Database.RunResult> {
    await this.ensureInitialized();

    return this.connectionPool.executeWithConnection(
      (db: BetterSQLite3Database) => {
        // Type 'db' explicitement
        const stmt = (db as any).client.prepare(sql); // Accéder au client better-sqlite3
        return stmt.run(...params);
      },
      RequestType.WRITE,
      RequestPriority.NORMAL,
      context || "execute",
    );
  }

  /**
   * Exécute plusieurs requêtes dans une transaction
   */
  public async transaction<T>(
    operations: (db: BetterSQLite3Database) => T, // Type 'db' explicitement
    context?: string,
  ): Promise<T> {
    await this.ensureInitialized();

    return this.connectionPool.executeTransaction(
      operations,
      context || "transaction",
    );
  }

  /**
   * Exécute une opération avec une connexion spécifique (pour compatibilité)
   */
  public async executeWithConnection<T>(
    operation: (db: BetterSQLite3Database) => T, // Type 'db' explicitement
    type: RequestType = RequestType.READ,
    priority: RequestPriority = RequestPriority.NORMAL,
    context?: string,
  ): Promise<T> {
    await this.ensureInitialized();

    return this.connectionPool.executeWithConnection(
      operation,
      type,
      priority,
      context || "executeWithConnection",
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
        [],
        "healthCheck",
      );

      return result?.result === 1;
    } catch (error) {
      logger.error("Database health check failed", error);
      return false;
    }
  }

  /**
   * Obtient les statistiques du pool de connexions
   */
  public getPoolStatus() {
    return this.connectionPool.getPoolStatus();
  }

  /**
   * Obtient les statistiques détaillées du pool
   */
  public getDetailedStats() {
    return this.connectionPool.getDetailedStats();
  }

  /**
   * Obtient les logs récents du système de monitoring
   */
  public getRecentLogs(
    type: "connections" | "locks" | "errors" | "monitoring",
    limit: number = 50,
  ) {
    return this.connectionPool.getRecentLogs(type, limit);
  }

  /**
   * Obtient les détails des connexions actives
   */
  public getActiveConnectionsDetails() {
    return this.connectionPool.getActiveConnectionsDetails();
  }

  /**
   * Obtient les statistiques de logging
   */
  public getLoggingStats() {
    return databaseLogger.getLoggingStats();
  }

  /**
   * Force une mise à jour des statistiques de monitoring
   */
  public forceMonitoringUpdate(): void {
    this.connectionPool.forceMonitoringUpdate();
  }

  /**
   * Obtient l'état d'initialisation
   */
  public getInitializationState() {
    return this.initializationManager.getInitializationState();
  }

  /**
   * Ferme toutes les connexions du pool
   */
  public async close(): Promise<void> {
    await this.connectionPool.closeAll();
    logger.info("All database connections closed");
  }

  /**
   * Propriété de compatibilité pour accéder directement à une connexion
   * @deprecated Utiliser les méthodes query, execute, transaction à la place
   */
  public get db(): Database.Database {
    logger.warn(
      "Direct database access is deprecated. Use databaseService.query, execute, or transaction methods instead.",
    );
    throw new Error(
      "Direct database access is not available with connection pool. Use query, execute, or transaction methods.",
    );
  }
}

/**
 * Réinitialise la base de données en supprimant le fichier et en la réinitialisant.
 * Destiné uniquement à l'environnement de développement.
 */
export async function resetDatabase(): Promise<boolean> {
  if ((process.env as any)["NODE_ENV"] === "production") {
    logger.warn(
      "Tentative de réinitialisation de la base de données en production. Opération annulée.",
    );
    return false;
  }

  logger.info("Réinitialisation de la base de données...");

  try {
    const dbService = DatabaseService.getInstance();

    // Fermer toutes les connexions du pool
    await dbService.close();

    // Réinitialiser le gestionnaire d'initialisation
    const initManager = DatabaseInitializationManagerImpl.getInstance();
    initManager.reset();

    const dbPath = path.join(process.cwd(), "data", "logistix.db");
    const dbFiles = [dbPath, `${dbPath}-shm`, `${dbPath}-wal`];

    dbFiles.forEach((file) => {
      if (fs.existsSync(file)) {
        try {
          fs.unlinkSync(file);
          logger.info(`Fichier ${file} supprimé.`);
        } catch (err: any) {
          if (err.code !== "EBUSY") throw err;
          logger.warn(`Impossible de supprimer ${file} (occupé).`);
        }
      }
    });

    // Réinitialiser les instances pour forcer la recréation
    (DatabaseService as any).instance = null;
    // L'instance SQLiteConnectionPool est maintenant gérée via le singleton pattern
    (DatabaseInitializationManagerImpl as any).instance = null;

    // Créer une nouvelle instance qui réinitialisera la base de données
    const newDbService = DatabaseService.getInstance();
    await newDbService.healthCheck(); // Force l'initialisation

    logger.info("Base de données réinitialisée avec succès.");
    return true;
  } catch (error) {
    logger.error(
      "Erreur lors de la réinitialisation de la base de données:",
      error,
    );
    return false;
  }
}

/**
 * Génère un identifiant unique universel (UUID).
 * @returns {string} Un UUID v4.
 */
export function generateId(): string {
  return randomUUID();
}

/**
 * Récupère l'horodatage actuel au format ISO 8601.
 * @returns {string} L'horodatage actuel.
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

// Exporter l'instance du service de base de données
export const databaseService = DatabaseService.getInstance();

// Export de compatibilité (deprecated)
export const db = {
  prepare: (_sql: string) => {
    console.warn(
      "Direct database access is deprecated. Use databaseService.query, execute, or transaction methods instead.",
    );
    return {
      all: (..._params: any[]) => {
        throw new Error(
          "Direct database access is deprecated. Use databaseService.query method instead.",
        );
      },
      get: (..._params: any[]) => {
        throw new Error(
          "Direct database access is deprecated. Use databaseService.queryOne method instead.",
        );
      },
      run: (..._params: any[]) => {
        throw new Error(
          "Direct database access is deprecated. Use databaseService.execute method instead.",
        );
      },
    };
  },
  exec: () => {
    throw new Error(
      "Direct database access is deprecated. Use databaseService.execute or transaction methods instead.",
    );
  },
  transaction: () => {
    throw new Error(
      "Direct database access is deprecated. Use databaseService.transaction method instead.",
    );
  },
  close: () => databaseService.close(),
};
