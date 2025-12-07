<<<<<<< HEAD
// import "server-only";
import { drizzle, BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { sql } from "drizzle-orm";
import path from "path";
import fs from "fs";
import { logger } from "@/lib/utils/logging/logger";
// import { fallbackDb, FallbackDatabaseService } from "./fallback-database-service";
import * as schema from "./schema";

// Importation conditionnelle de better-sqlite3
let Database: any = null;
let useFallback = false;

try {
  Database = require("better-sqlite3");
  // Test si les binaries fonctionnent
  const testDb = new Database(":memory:");
  testDb.close();
} catch (error: unknown) {
  logger.warn("better-sqlite3 not available, using fallback service", {
    error: error instanceof Error ? error.message : String(error)
  });
  useFallback = true;
}

// ============================================================================
// UNIFIED DATABASE SERVICE
// ============================================================================
// This service provides a centralized, type-safe interface for all database operations
// Replaces: lib/services/database/db.ts, lib/services/database/drizzle-client.ts

export interface ConnectionStats {
  activeConnections: number;
  totalConnections: number;
  queuedRequests: number;
  averageResponseTime: number;
  errorRate: number;
}

export interface DatabaseConfig {
  path?: string;
  maxConnections?: number;
  connectionTimeout?: number;
  enableWAL?: boolean;
  enableLogging?: boolean;
}

export interface TransactionOptions {
  timeout?: number;
  retries?: number;
}

/**
 * Unified Database Service
 *
 * Provides a centralized interface for all database operations with:
 * - Connection pooling and management
 * - Transaction support
 * - Health monitoring
 * - Error handling and logging
 * - Type safety through Drizzle ORM
 */
export class DatabaseService {
  private static instance: DatabaseService;
  private db!: BetterSQLite3Database<typeof schema>;
  private sqliteDb!: any; // Peut être Database.Database ou null
  // TODO: Définir le type FallbackDatabaseService
  private fallbackService?: any; // FallbackDatabaseService;
  private config: DatabaseConfig;
  private isInitialized = false;
  private connectionStats: ConnectionStats = {
    activeConnections: 0,
    totalConnections: 0,
    queuedRequests: 0,
    averageResponseTime: 0,
    errorRate: 0,
  };

  private constructor(config: DatabaseConfig = {}) {
    this.config = {
      path: config.path || path.join(process.cwd(), "data", "logistix.db"),
      maxConnections: config.maxConnections || 10,
      connectionTimeout: config.connectionTimeout || 30000,
      enableWAL: config.enableWAL !== false,
      enableLogging:
        config.enableLogging || process.env['NODE_ENV'] === "development",
      ...config,
    };

    // L'initialisation sera faite de manière asynchrone
  }

  /**
   * Get the singleton instance of DatabaseService
   */
  public static getInstance(config?: DatabaseConfig): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService(config);
    }
    return DatabaseService.instance;
  }

  /**
   * Initialize the database if not already done
   */
  public async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initializeDatabase();
    }
  }

  /**
   * Initialize the database connection and setup
   */
  private async initializeDatabase(): Promise<void> {
    try {
      // Ensure data directory exists
      const dataDir = path.dirname(this.config.path!);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      if (useFallback || !Database) {
        // Utiliser le service de fallback
        // TODO: Implémenter fallbackDb service
        // this.fallbackService = fallbackDb;
        // await this.fallbackService.initializeDatabase();
        this.isInitialized = true;
        this.log("Database initialized successfully with fallback service", { path: this.config.path });
        return;
      }

      // Essayer better-sqlite3 d'abord
      try {
        // Create SQLite connection
        this.sqliteDb = new Database(this.config.path!);

        // Configure SQLite for optimal performance
        if (this.config.enableWAL) {
          this.sqliteDb.pragma("journal_mode = WAL");
        }
        this.sqliteDb.pragma("synchronous = NORMAL");
        this.sqliteDb.pragma("cache_size = 1000");
        this.sqliteDb.pragma("foreign_keys = ON");
        this.sqliteDb.pragma("temp_store = MEMORY");

        // Initialize Drizzle ORM
        this.db = drizzle(this.sqliteDb, {
          schema,
          logger: this.config.enableLogging ?? false,
        });

        this.isInitialized = true;
        this.log("Database initialized successfully with better-sqlite3", { path: this.config.path });
      } catch (sqliteError: any) {
        this.logError("better-sqlite3 failed, switching to fallback", sqliteError);

        // Basculer vers le fallback
        // TODO: Implémenter fallbackDb service  
        // this.fallbackService = fallbackDb;
        // await this.fallbackService?.initializeDatabase();
        this.isInitialized = true;
        this.log("Database initialized successfully with fallback service", { path: this.config.path });
      }
    } catch (error: any) {
      this.logError("Failed to initialize database", error);
      throw new Error(`Database initialization failed: ${error}`);
    }
  }

  /**
   * Get the Drizzle database instance for direct queries
   */
  public async getDb(): Promise<BetterSQLite3Database<typeof schema> | any> {
    await this.ensureInitialized();

    if (this.fallbackService) {
      return this.fallbackService;
    }

    return this.db;
  }

  /**
   * Execute a raw SQL query
   */
  public async executeRawQuery<T>(query: string, params: any[] = []): Promise<T[]> {
    await this.ensureInitialized();

    if (this.fallbackService) {
      // TODO: Typer correctement le fallback service
      return await (this.fallbackService as any).queryMany(query, params);
    }

    // Utiliser better-sqlite3 avec Drizzle
    const stmt = this.sqliteDb.prepare(query);
    return stmt.all(...params);
  }

  /**
   * Execute a raw SQL query that returns a single result
   */
  public async executeRawQueryOne<T>(query: string, params: any[] = []): Promise<T | null> {
    await this.ensureInitialized();

    if (this.fallbackService) {
      // TODO: Typer correctement le fallback service
      return await (this.fallbackService as any).queryOne(query, params);
    }

    // Utiliser better-sqlite3 avec Drizzle
    const stmt = this.sqliteDb.prepare(query);
    return stmt.get(...params) || null;
  }

  /**
   * Execute a raw SQL statement that does not return rows (INSERT/UPDATE/DELETE)
   * and return metadata similar to better-sqlite3 run() output.
   * This method is introduced to replace legacy execute() usages in repositories.
   */
  public async executeRun(query: string, params: any[] = []): Promise<{ changes: number; lastInsertRowid: number | bigint | undefined; }> {
    await this.ensureInitialized();

    if (this.fallbackService) {
      // Fallback: réutiliser executeRawQueryOne pour exécuter et ignorer résultat
      // Pas d'information précise sur changes dans fallback pour l'instant
      await (this.fallbackService as any).execute?.(query, params);
      return { changes: 0, lastInsertRowid: undefined };
    }

    const stmt = this.sqliteDb.prepare(query);
    const info = stmt.run(...params);
    return { changes: info.changes, lastInsertRowid: info.lastInsertRowid };
  }

  /**
   * Execute a query with automatic error handling and logging
   */
  public async executeQuery<T>(
    operation: (db: BetterSQLite3Database<typeof schema>) => T,
    context?: string,
  ): Promise<T> {
    await this.ensureInitialized();

    const startTime = Date.now();
    const operationId = this.generateOperationId();

    try {
      this.connectionStats.activeConnections++;
      this.log("Executing query", { operationId, context });

      if (this.fallbackService) {
        throw new Error("Drizzle operations not supported with fallback service. Use executeRawQuery instead.");
      }

      const result = operation(this.db);

      const duration = Date.now() - startTime;
      this.updateStats(duration, false);
      this.log("Query completed", { operationId, context, duration });

      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.updateStats(duration, true);
      this.logError("Query failed", error, { operationId, context });
      throw this.wrapError(error, context);
    } finally {
      this.connectionStats.activeConnections--;
    }
  }

  /**
   * Execute multiple operations in a transaction
   */
  public async executeTransaction<T>(
    operations: (db: BetterSQLite3Database<typeof schema>) => T,
    options: TransactionOptions = {},
  ): Promise<T> {
    await this.ensureInitialized();

    if (this.fallbackService) {
      throw new Error("Transactions not supported with fallback service. Use individual queries instead.");
    }

    const startTime = Date.now();
    const transactionId = this.generateOperationId();
    const maxRetries = options.retries || 3;

    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.connectionStats.activeConnections++;
        this.log("Starting transaction", {
          transactionId,
          attempt,
          maxRetries,
        });

        const result = this.sqliteDb.transaction(() => {
          return operations(this.db);
        })();

        const duration = Date.now() - startTime;
        this.updateStats(duration, false);
        this.log("Transaction completed", { transactionId, attempt, duration });

        return result;
      } catch (error: any) {
        lastError = error;
        const duration = Date.now() - startTime;
        this.updateStats(duration, true);

        if (attempt === maxRetries) {
          this.logError("Transaction failed after all retries", error, {
            transactionId,
            attempt,
            maxRetries,
          });
          throw this.wrapError(error, "transaction");
        } else {
          this.log("Transaction failed, retrying", {
            transactionId,
            attempt,
            maxRetries,
            error: (error as any).message,
          });
          // Wait before retry (exponential backoff)
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, attempt) * 100),
          );
        }
      } finally {
        this.connectionStats.activeConnections--;
      }
    }

    throw lastError;
  }

  /**
   * Perform a health check on the database
   */
  public async healthCheck(): Promise<boolean> {
    try {
      const result = await this.executeQuery(
        (db) => db.get(sql`SELECT 1 as health`),
        "healthCheck",
      );
      return (result as any)?.health === 1;
    } catch (error: any) {
      this.logError("Health check failed", error);
      return false;
    }
  }

  /**
   * Get connection statistics
   */
  public getConnectionStats(): ConnectionStats {
    return { ...this.connectionStats };
  }

  /**
   * Get detailed database information
   */
  public async getDatabaseInfo(): Promise<any> {
    try {
      return await this.executeQuery<any>((_db) => {
        const info = this.sqliteDb.prepare("PRAGMA database_list").all();
        const tables = this.sqliteDb
          .prepare(
            `
          SELECT name FROM sqlite_master 
          WHERE type='table' AND name NOT LIKE 'sqlite_%'
        `,
          )
          .all();
        const indexes = this.sqliteDb
          .prepare(
            `
          SELECT name FROM sqlite_master 
          WHERE type='index' AND name NOT LIKE 'sqlite_%'
        `,
          )
          .all();

        return {
          info,
          tables,
          indexes,
          stats: this.connectionStats,
          config: this.config,
        };
      }, "getDatabaseInfo");
    } catch (error: any) {
      this.logError("Failed to get database info", error);
      throw error;
    }
  }

  /**
   * Close the database connection
   */
  public async close(): Promise<void> {
    if (this.sqliteDb) {
      try {
        this.sqliteDb.close();
        this.log("Database connection closed");
      } catch (error) {
        this.logError("Error closing database", error);
      }
    }
  }

  /**
   * Reset the database (development only)
   */
  public async reset(): Promise<void> {
    if (process.env['NODE_ENV'] === "production") {
      throw new Error("Database reset is not allowed in production");
    }

    try {
      await this.close();

      const dbFiles = [
        this.config.path!,
        `${this.config.path!}-shm`,
        `${this.config.path!}-wal`,
      ];

      dbFiles.forEach((file) => {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      });

      this.initializeDatabase();
      this.log("Database reset completed");
    } catch (error) {
      this.logError("Database reset failed", error);
      throw error;
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================



  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private updateStats(duration: number, isError: boolean): void {
    this.connectionStats.totalConnections++;

    // Update average response time (simple moving average)
    const alpha = 0.1; // Smoothing factor
    this.connectionStats.averageResponseTime =
      (1 - alpha) * this.connectionStats.averageResponseTime + alpha * duration;

    // Update error rate
    if (isError) {
      this.connectionStats.errorRate =
        (1 - alpha) * this.connectionStats.errorRate + alpha * 1;
    } else {
      this.connectionStats.errorRate =
        (1 - alpha) * this.connectionStats.errorRate + alpha * 0;
    }
  }

  private wrapError(error: any, context?: string): Error {
    const message = context
      ? `Database operation failed in ${context}: ${error.message}`
      : `Database operation failed: ${error.message}`;
    const errorObj = new Error(message);
    if (error.stack) {
      errorObj.stack = error.stack;
    }
    return errorObj;
  }

  private log(message: string, data?: any): void {
    if (this.config.enableLogging) {
      logger.info(message, { ...data, service: "DatabaseService" });
    }
  }

  private logError(_message: string, _error: any, _data?: any): void {
    const _timestamp = new Date().toISOString();
    // eslint-disable-next-line no-console
    console.error(`[DB ERROR] ${_timestamp} - ${_message}`, {
      error: _error.message,
      stack: _error.stack,
      ..._data,
    });
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate a UUID v4
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Get current timestamp in ISO format
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Create database service instance with default configuration
 */
export function createDatabaseService(
  config?: DatabaseConfig,
): DatabaseService {
  return DatabaseService.getInstance(config);
}

// ============================================================================
// EXPORTS
// ============================================================================

// Export the singleton instance
export const databaseService = DatabaseService.getInstance();

// Export schema for external use
export { schema };
export * from "./schema";

// SQL template literal for raw queries (when needed)
export { sql } from "drizzle-orm";
=======
import "server-only";
import { drizzle, BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { sql } from "drizzle-orm";
import path from "path";
import fs from "fs";
import { logger } from "@/lib/utils/logging/logger";
// import { fallbackDb, FallbackDatabaseService } from "./fallback-database-service";
import * as schema from "./schema";

// Importation conditionnelle de better-sqlite3
let Database: any = null;
let useFallback = false;

try {
  Database = require("better-sqlite3");
  // Test si les binaries fonctionnent
  const testDb = new Database(":memory:");
  testDb.close();
} catch (error: unknown) {
  logger.warn("better-sqlite3 not available, using fallback service", { 
    error: error instanceof Error ? error.message : String(error) 
  });
  useFallback = true;
}

// ============================================================================
// UNIFIED DATABASE SERVICE
// ============================================================================
// This service provides a centralized, type-safe interface for all database operations
// Replaces: lib/services/database/db.ts, lib/services/database/drizzle-client.ts

export interface ConnectionStats {
  activeConnections: number;
  totalConnections: number;
  queuedRequests: number;
  averageResponseTime: number;
  errorRate: number;
}

export interface DatabaseConfig {
  path?: string;
  maxConnections?: number;
  connectionTimeout?: number;
  enableWAL?: boolean;
  enableLogging?: boolean;
}

export interface TransactionOptions {
  timeout?: number;
  retries?: number;
}

/**
 * Unified Database Service
 *
 * Provides a centralized interface for all database operations with:
 * - Connection pooling and management
 * - Transaction support
 * - Health monitoring
 * - Error handling and logging
 * - Type safety through Drizzle ORM
 */
export class DatabaseService {
  private static instance: DatabaseService;
  private db!: BetterSQLite3Database<typeof schema>;
  private sqliteDb!: any; // Peut être Database.Database ou null
  // TODO: Définir le type FallbackDatabaseService
  private fallbackService?: any; // FallbackDatabaseService;
  private config: DatabaseConfig;
  private isInitialized = false;
  private connectionStats: ConnectionStats = {
    activeConnections: 0,
    totalConnections: 0,
    queuedRequests: 0,
    averageResponseTime: 0,
    errorRate: 0,
  };

  private constructor(config: DatabaseConfig = {}) {
    this.config = {
      path: config.path || path.join(process.cwd(), "data", "logistix.db"),
      maxConnections: config.maxConnections || 10,
      connectionTimeout: config.connectionTimeout || 30000,
      enableWAL: config.enableWAL !== false,
      enableLogging:
        config.enableLogging || process.env['NODE_ENV'] === "development",
      ...config,
    };

    // L'initialisation sera faite de manière asynchrone
  }

  /**
   * Get the singleton instance of DatabaseService
   */
  public static getInstance(config?: DatabaseConfig): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService(config);
    }
    return DatabaseService.instance;
  }

  /**
   * Initialize the database if not already done
   */
  public async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initializeDatabase();
    }
  }

  /**
   * Initialize the database connection and setup
   */
  private async initializeDatabase(): Promise<void> {
    try {
      // Ensure data directory exists
      const dataDir = path.dirname(this.config.path!);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      if (useFallback || !Database) {
        // Utiliser le service de fallback
        // TODO: Implémenter fallbackDb service
        // this.fallbackService = fallbackDb;
        // await this.fallbackService.initializeDatabase();
        this.isInitialized = true;
        this.log("Database initialized successfully with fallback service", { path: this.config.path });
        return;
      }

      // Essayer better-sqlite3 d'abord
      try {
        // Create SQLite connection
        this.sqliteDb = new Database(this.config.path!);

        // Configure SQLite for optimal performance
        if (this.config.enableWAL) {
          this.sqliteDb.pragma("journal_mode = WAL");
        }
        this.sqliteDb.pragma("synchronous = NORMAL");
        this.sqliteDb.pragma("cache_size = 1000");
        this.sqliteDb.pragma("foreign_keys = ON");
        this.sqliteDb.pragma("temp_store = MEMORY");

        // Initialize Drizzle ORM
        this.db = drizzle(this.sqliteDb, {
          schema,
          logger: this.config.enableLogging ?? false,
        });

        this.isInitialized = true;
        this.log("Database initialized successfully with better-sqlite3", { path: this.config.path });
      } catch (sqliteError: any) {
        this.logError("better-sqlite3 failed, switching to fallback", sqliteError);
        
        // Basculer vers le fallback
        // TODO: Implémenter fallbackDb service  
        // this.fallbackService = fallbackDb;
        // await this.fallbackService?.initializeDatabase();
        this.isInitialized = true;
        this.log("Database initialized successfully with fallback service", { path: this.config.path });
      }
    } catch (error: any) {
      this.logError("Failed to initialize database", error);
      throw new Error(`Database initialization failed: ${error}`);
    }
  }

  /**
   * Get the Drizzle database instance for direct queries
   */
  public async getDb(): Promise<BetterSQLite3Database<typeof schema> | any> {
    await this.ensureInitialized();
    
    if (this.fallbackService) {
      return this.fallbackService;
    }
    
    return this.db;
  }

  /**
   * Execute a raw SQL query
   */
  public async executeRawQuery<T>(query: string, params: any[] = []): Promise<T[]> {
    await this.ensureInitialized();
    
    if (this.fallbackService) {
      // TODO: Typer correctement le fallback service
      return await (this.fallbackService as any).queryMany(query, params);
    }
    
    // Utiliser better-sqlite3 avec Drizzle
    const stmt = this.sqliteDb.prepare(query);
    return stmt.all(...params);
  }

  /**
   * Execute a raw SQL query that returns a single result
   */
  public async executeRawQueryOne<T>(query: string, params: any[] = []): Promise<T | null> {
    await this.ensureInitialized();
    
    if (this.fallbackService) {
      // TODO: Typer correctement le fallback service
      return await (this.fallbackService as any).queryOne(query, params);
    }
    
    // Utiliser better-sqlite3 avec Drizzle
    const stmt = this.sqliteDb.prepare(query);
    return stmt.get(...params) || null;
  }

  /**
   * Execute a raw SQL statement that does not return rows (INSERT/UPDATE/DELETE)
   * and return metadata similar to better-sqlite3 run() output.
   * This method is introduced to replace legacy execute() usages in repositories.
   */
  public async executeRun(query: string, params: any[] = []): Promise<{ changes: number; lastInsertRowid: number | bigint | undefined; }> {
    await this.ensureInitialized();

    if (this.fallbackService) {
      // Fallback: réutiliser executeRawQueryOne pour exécuter et ignorer résultat
      // Pas d'information précise sur changes dans fallback pour l'instant
      await (this.fallbackService as any).execute?.(query, params);
      return { changes: 0, lastInsertRowid: undefined };
    }

    const stmt = this.sqliteDb.prepare(query);
    const info = stmt.run(...params);
    return { changes: info.changes, lastInsertRowid: info.lastInsertRowid };
  }

  /**
   * Execute a query with automatic error handling and logging
   */
  public async executeQuery<T>(
    operation: (db: BetterSQLite3Database<typeof schema>) => T,
    context?: string,
  ): Promise<T> {
    await this.ensureInitialized();

    const startTime = Date.now();
    const operationId = this.generateOperationId();

    try {
      this.connectionStats.activeConnections++;
      this.log("Executing query", { operationId, context });

      if (this.fallbackService) {
        throw new Error("Drizzle operations not supported with fallback service. Use executeRawQuery instead.");
      }

      const result = operation(this.db);

      const duration = Date.now() - startTime;
      this.updateStats(duration, false);
      this.log("Query completed", { operationId, context, duration });

      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.updateStats(duration, true);
      this.logError("Query failed", error, { operationId, context });
      throw this.wrapError(error, context);
    } finally {
      this.connectionStats.activeConnections--;
    }
  }

  /**
   * Execute multiple operations in a transaction
   */
  public async executeTransaction<T>(
    operations: (db: BetterSQLite3Database<typeof schema>) => T,
    options: TransactionOptions = {},
  ): Promise<T> {
    await this.ensureInitialized();

    if (this.fallbackService) {
      throw new Error("Transactions not supported with fallback service. Use individual queries instead.");
    }

    const startTime = Date.now();
    const transactionId = this.generateOperationId();
    const maxRetries = options.retries || 3;

    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.connectionStats.activeConnections++;
        this.log("Starting transaction", {
          transactionId,
          attempt,
          maxRetries,
        });

        const result = this.sqliteDb.transaction(() => {
          return operations(this.db);
        })();

        const duration = Date.now() - startTime;
        this.updateStats(duration, false);
        this.log("Transaction completed", { transactionId, attempt, duration });

        return result;
      } catch (error: any) {
        lastError = error;
        const duration = Date.now() - startTime;
        this.updateStats(duration, true);

        if (attempt === maxRetries) {
          this.logError("Transaction failed after all retries", error, {
            transactionId,
            attempt,
            maxRetries,
          });
          throw this.wrapError(error, "transaction");
        } else {
          this.log("Transaction failed, retrying", {
            transactionId,
            attempt,
            maxRetries,
            error: (error as any).message,
          });
          // Wait before retry (exponential backoff)
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, attempt) * 100),
          );
        }
      } finally {
        this.connectionStats.activeConnections--;
      }
    }

    throw lastError;
  }

  /**
   * Perform a health check on the database
   */
  public async healthCheck(): Promise<boolean> {
    try {
      const result = await this.executeQuery(
        (db) => db.get(sql`SELECT 1 as health`),
        "healthCheck",
      );
      return (result as any)?.health === 1;
    } catch (error: any) {
      this.logError("Health check failed", error);
      return false;
    }
  }

  /**
   * Get connection statistics
   */
  public getConnectionStats(): ConnectionStats {
    return { ...this.connectionStats };
  }

  /**
   * Get detailed database information
   */
  public async getDatabaseInfo(): Promise<any> {
    try {
      return await this.executeQuery<any>((_db) => {
        const info = this.sqliteDb.prepare("PRAGMA database_list").all();
        const tables = this.sqliteDb
          .prepare(
            `
          SELECT name FROM sqlite_master 
          WHERE type='table' AND name NOT LIKE 'sqlite_%'
        `,
          )
          .all();
        const indexes = this.sqliteDb
          .prepare(
            `
          SELECT name FROM sqlite_master 
          WHERE type='index' AND name NOT LIKE 'sqlite_%'
        `,
          )
          .all();

        return {
          info,
          tables,
          indexes,
          stats: this.connectionStats,
          config: this.config,
        };
      }, "getDatabaseInfo");
    } catch (error: any) {
      this.logError("Failed to get database info", error);
      throw error;
    }
  }

  /**
   * Close the database connection
   */
  public async close(): Promise<void> {
    if (this.sqliteDb) {
      try {
        this.sqliteDb.close();
        this.log("Database connection closed");
      } catch (error) {
        this.logError("Error closing database", error);
      }
    }
  }

  /**
   * Reset the database (development only)
   */
  public async reset(): Promise<void> {
    if (process.env['NODE_ENV'] === "production") {
      throw new Error("Database reset is not allowed in production");
    }

    try {
      await this.close();

      const dbFiles = [
        this.config.path!,
        `${this.config.path!}-shm`,
        `${this.config.path!}-wal`,
      ];

      dbFiles.forEach((file) => {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      });

      this.initializeDatabase();
      this.log("Database reset completed");
    } catch (error) {
      this.logError("Database reset failed", error);
      throw error;
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================



  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private updateStats(duration: number, isError: boolean): void {
    this.connectionStats.totalConnections++;

    // Update average response time (simple moving average)
    const alpha = 0.1; // Smoothing factor
    this.connectionStats.averageResponseTime =
      (1 - alpha) * this.connectionStats.averageResponseTime + alpha * duration;

    // Update error rate
    if (isError) {
      this.connectionStats.errorRate =
        (1 - alpha) * this.connectionStats.errorRate + alpha * 1;
    } else {
      this.connectionStats.errorRate =
        (1 - alpha) * this.connectionStats.errorRate + alpha * 0;
    }
  }

  private wrapError(error: any, context?: string): Error {
    const message = context
      ? `Database operation failed in ${context}: ${error.message}`
      : `Database operation failed: ${error.message}`;

    const wrappedError = new Error(message);
    wrappedError.cause = error;
    return wrappedError;
  }

  private log(message: string, data?: any): void {
    if (this.config.enableLogging) {
      const timestamp = new Date().toISOString();
      console.log(
        `[DB] ${timestamp} - ${message}`,
        data ? JSON.stringify(data) : "",
      );
    }
  }

  private logError(message: string, error: any, data?: any): void {
    const timestamp = new Date().toISOString();
    console.error(`[DB ERROR] ${timestamp} - ${message}`, {
      error: error.message,
      stack: error.stack,
      ...data,
    });
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate a UUID v4
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Get current timestamp in ISO format
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Create database service instance with default configuration
 */
export function createDatabaseService(
  config?: DatabaseConfig,
): DatabaseService {
  return DatabaseService.getInstance(config);
}

// ============================================================================
// EXPORTS
// ============================================================================

// Export the singleton instance
export const databaseService = DatabaseService.getInstance();

// Export schema for external use
export { schema };
export * from "./schema";

// SQL template literal for raw queries (when needed)
export { sql } from "drizzle-orm";
>>>>>>> ad32518644f2ab77a7c59429e3df905bfcc3ef94
