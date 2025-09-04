import 'server-only';
import Database from 'better-sqlite3';
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import path from 'path';
import { getLogger } from '@/lib/utils/logging/simple-logger';
import { CircuitBreaker, ErrorCategory } from './retry-manager';
import { initializationManager } from './initialization-manager';
import { RequestType, RequestPriority } from './queue-manager';

// Configuration du logger
const logger = getLogger('DatabaseConnectionPool');

/**
 * Interface pour le pool de connexion à la base de données.
 */
export interface DatabaseConnectionPool {
  getConnection(): BetterSQLite3Database;
  releaseConnection(db: BetterSQLite3Database): void;
  shutdown(): Promise<void>;
  isHealthy(): boolean;
  
  executeWithConnection<T>(operation: (db: BetterSQLite3Database) => T, _type: RequestType, _priority: RequestPriority, context?: string): Promise<T>; // Renommé type et priority
  executeTransaction<T>(operations: (db: BetterSQLite3Database) => T, context?: string): Promise<T>;
  getPoolStatus(): { totalConnections: number; activeConnections: number; availableConnections: number; waitingRequests: number; idleConnections: number; }; // Ajout de waitingRequests et idleConnections
  getDetailedStats(): { poolSize: number; currentActive: number; circuitBreakerState: any; isHealthy: boolean; dbPath: string; waitingRequests: number; idleConnections: number; transactionCount: number; }; // Ajout de waitingRequests, idleConnections et transactionCount
  getRecentLogs(type: 'connections' | 'locks' | 'errors' | 'monitoring', limit: number): any[];
  getActiveConnectionsDetails(): any[];
  forceMonitoringUpdate(): void;
  closeAll(): Promise<void>;
}

/**
 * Implémentation du pool de connexion SQLite.
 * Utilise un pool de connexions pour gérer les accès concurrents à la base de données SQLite.
 * Implémente un Circuit Breaker pour gérer les défaillances de connexion.
 */
export class SQLiteConnectionPool implements DatabaseConnectionPool {
  private static instance: SQLiteConnectionPool;
  private db: BetterSQLite3Database | null = null;
  private dbPath: string;
  private isShuttingDown: boolean = false;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private circuitBreaker: CircuitBreaker;
  private readonly MAX_POOL_SIZE = 10; // Nombre maximal de connexions/déclarations concurrentes
  private currentConnections: number = 0; // Suivi des connexions/déclarations actives
  private requestQueue: Array<{ resolve: (value: any) => void; reject: (reason?: any) => void; operation: (db: BetterSQLite3Database) => any; type: RequestType; priority: RequestPriority; context?: string }> = [];
  
  private _transactionCount: number = 0; // Nouvelle propriété pour le nombre de transactions

  private constructor() {
    this.dbPath = path.join(process.cwd(), 'data', 'logistix.db');
    this.circuitBreaker = new CircuitBreaker(5, 5000, 'database_connection_pool'); // 5 échecs, 5 secondes de timeout
    logger.info(`SQLiteConnectionPool initialized for database: ${this.dbPath}`);
    this.startHealthCheck();
  }

  /**
   * Récupère l'instance unique du pool de connexion.
   */
  public static getInstance(): SQLiteConnectionPool {
    if (!SQLiteConnectionPool.instance) {
      SQLiteConnectionPool.instance = new SQLiteConnectionPool();
    }
    return SQLiteConnectionPool.instance;
  }

  /**
   * Initialise la connexion à la base de données.
   */
  private async initializeConnection(): Promise<void> {
    if (this.db) {
      logger.debug('Database already initialized.');
      return;
    }

    if (this.isShuttingDown) {
      throw new Error('Pool is shutting down, cannot initialize new connection.');
    }

    await initializationManager.waitForInitialization();

    try {
      logger.info('Initializing new database connection...');
      const client = new Database(this.dbPath);
      // Configurer les PRAGMA pour des performances et une fiabilité optimales
      client.pragma('journal_mode = WAL');
      client.pragma('synchronous = NORMAL');
      client.pragma('cache_size = 10000');
      client.pragma('temp_store = memory');
      client.pragma('mmap_size = 268435456'); // 256MB
      client.pragma('busy_timeout = 30000'); // 30s de timeout pour les verrous
      this.db = drizzle(client);
      logger.info('Database connection initialized successfully.');
      this.circuitBreaker.recordSuccess(); // Réinitialiser le circuit breaker en cas de connexion réussie
    } catch (error: unknown) {
      const errorCategory = this.categorizeError(error);
      logger.error(`Failed to initialize database connection. Category: ${errorCategory}`, { error: error instanceof Error ? error.message : String(error) });
      this.circuitBreaker.recordFailure();
      throw new Error(`Database initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Obtient une connexion à la base de données.
   */
  public getConnection(): BetterSQLite3Database {
    if (this.isShuttingDown) {
      throw new Error('Pool is shutting down, no new connections allowed.');
    }

    if (!this.db) {
      throw new Error('Database connection not initialized. Call initialize() first.');
    }

    if (!this.circuitBreaker.canExecute()) {
      logger.warn('Circuit breaker is open, preventing database access.');
      throw new Error('Database access temporarily blocked by circuit breaker.');
    }

    this.currentConnections++;
    logger.debug(`Connection obtained. Current active: ${this.currentConnections}`);
    return this.db;
  }

  /**
   * Relâche une connexion (pas d'opérations réelles pour drizzle-orm, mais pour la symétrie de l'API).
   */
  public releaseConnection(_db: BetterSQLite3Database): void {
    this.currentConnections--;
    logger.debug(`Connection released. Current active: ${this.currentConnections}`);
  }

  /**
   * Exécute une opération avec une connexion du pool.
   */
  public async executeWithConnection<T>(
    operation: (db: BetterSQLite3Database) => T,
    _type: RequestType, // Renommé
    _priority: RequestPriority, // Renommé
    context?: string
  ): Promise<T> {
    if (!this.db) {
      await this.initializeConnection();
    }
    if (!this.db) {
      throw new Error('Database not connected after initialization attempt.');
    }

    if (!this.circuitBreaker.canExecute()) {
      logger.warn(`Circuit breaker is open, preventing database access for ${context || 'unknown'} operation.`);
      throw new Error('Database access temporarily blocked by circuit breaker.');
    }

    this.currentConnections++;
    try {
      const result = operation(this.db);
      this.circuitBreaker.recordSuccess();
      return result;
    } catch (error: unknown) {
      const errorCategory = this.categorizeError(error);
      this.circuitBreaker.recordFailure();
      logger.error(`Error executing operation (${context || 'unknown'}): ${error instanceof Error ? error.message : String(error)}`, { errorCategory, error });
      throw error;
    } finally {
      this.currentConnections--;
    }
  }

  /**
   * Exécute une série d'opérations dans une transaction.
   */
  public async executeTransaction<T>(
    operations: (db: BetterSQLite3Database) => T,
    context?: string
  ): Promise<T> {
    if (!this.db) {
      await this.initializeConnection();
    }
    if (!this.db) {
      throw new Error('Database not connected after initialization attempt.');
    }

    if (!this.circuitBreaker.canExecute()) {
      logger.warn(`Circuit breaker is open, preventing transaction for ${context || 'unknown'} operation.`);
      throw new Error('Database access temporarily blocked by circuit breaker.');
    }

    this.currentConnections++;
    this._transactionCount++; // Incrémenter le compteur de transactions
    try {
      const dbClient = (this.db as any).client;
      if (!dbClient) {
        throw new Error('Underlying SQLite client not available for transaction.');
      }
      const transaction = dbClient.transaction(() => operations(this.db!));
      const result = transaction();
      this.circuitBreaker.recordSuccess();
      return result;
    } catch (error: unknown) {
      const errorCategory = this.categorizeError(error);
      this.circuitBreaker.recordFailure();
      logger.error(`Error executing transaction (${context || 'unknown'}): ${error instanceof Error ? error.message : String(error)}`, { errorCategory, error });
      throw error;
    } finally {
      this.currentConnections--;
    }
  }

  /**
   * Obtient l'état du pool de connexions.
   */
  public getPoolStatus(): { totalConnections: number; activeConnections: number; availableConnections: number; waitingRequests: number; idleConnections: number; } {
    return {
      totalConnections: this.MAX_POOL_SIZE,
      activeConnections: this.currentConnections,
      availableConnections: this.MAX_POOL_SIZE - this.currentConnections,
      waitingRequests: this.requestQueue.length, // Simule la longueur de la file d'attente
      idleConnections: this.MAX_POOL_SIZE - this.currentConnections, // Connexions inactives
    };
  }

  /**
   * Obtient des statistiques détaillées sur le pool.
   */
  public getDetailedStats(): { poolSize: number; currentActive: number; circuitBreakerState: any; isHealthy: boolean; dbPath: string; waitingRequests: number; idleConnections: number; transactionCount: number; } {
    return {
      poolSize: this.MAX_POOL_SIZE,
      currentActive: this.currentConnections,
      circuitBreakerState: this.circuitBreaker.getState(),
      isHealthy: this.isHealthy(),
      dbPath: this.dbPath,
      waitingRequests: this.requestQueue.length,
      idleConnections: this.MAX_POOL_SIZE - this.currentConnections,
      transactionCount: this._transactionCount,
    };
  }

  /**
   * Obtient les logs récents liés à la base de données.
   */
  public getRecentLogs(type: 'connections' | 'locks' | 'errors' | 'monitoring', limit: number = 50): any[] {
    logger.warn(`getRecentLogs is a placeholder in SQLiteConnectionPool. Type: ${type}, Limit: ${limit}`);
    return [];
  }

  /**
   * Obtient les détails des connexions actives.
   */
  public getActiveConnectionsDetails(): any[] {
    logger.warn('getActiveConnectionsDetails is a placeholder in SQLiteConnectionPool.');
    return [];
  }

  /**
   * Force une mise à jour des statistiques de monitoring.
   */
  public forceMonitoringUpdate(): void {
    logger.info('forceMonitoringUpdate called in SQLiteConnectionPool (placeholder).');
  }

  /**
   * Arrête toutes les connexions et nettoie les ressources.
   */
  public async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      logger.info('Shutdown already in progress.');
      return;
    }
    this.isShuttingDown = true;
    logger.info('Shutting down database connection pool...');

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (this.db) {
      try {
        (this.db as any).client?.close();
        logger.info('Underlying SQLite database client closed.');
      } catch (error: unknown) {
        logger.error('Error closing database client:', { error: error instanceof Error ? error.message : String(error) });
      } finally {
        this.db = null;
      }
    }
    logger.info('Database connection pool shut down.');
  }

  /**
   * Alias pour shutdown, pour la cohérence avec les noms de méthodes du service de base de données.
   */
  public async closeAll(): Promise<void> {
    return this.shutdown();
  }

  /**
   * Vérifie la santé de la base de données.
   */
  public isHealthy(): boolean {
    if (this.circuitBreaker.canExecute()) {
      try {
        if (this.db) {
          (this.db as any).client?.prepare('SELECT 1').get();
          this.circuitBreaker.recordSuccess();
          return true;
        }
      } catch (error: unknown) {
        const errorCategory = this.categorizeError(error);
        logger.error(`Health check failed. Category: ${errorCategory}`, { error: error instanceof Error ? error.message : String(error) });
        this.circuitBreaker.recordFailure();
        return false;
      }
    }
    logger.warn('Database not healthy or circuit breaker open.');
    return false;
  }

  /**
   * Démarre la vérification périodique de la santé de la base de données.
   */
  private startHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    this.healthCheckInterval = setInterval(async () => {
      if (!this.isHealthy()) {
        logger.warn('Attempting to re-initialize database connection due to health check failure.');
        try {
          await this.initializeConnection();
        } catch (error: unknown) {
          logger.error('Failed to re-initialize connection after health check failure.', { error: error instanceof Error ? error.message : String(error) });
        }
      }
    }, 30000); // Vérifie toutes les 30 secondes
    logger.info('Database health check started.');
  }

  /**
   * Catégorise les erreurs pour le Circuit Breaker.
   */
  private categorizeError(error: unknown): ErrorCategory {
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      if (errorMessage.includes('locked') || errorMessage.includes('busy')) {
        return ErrorCategory.RETRYABLE_LOCK;
      }
      if (errorMessage.includes('disk i/o error')) {
        return ErrorCategory.RETRYABLE_IO;
      }
      if (errorMessage.includes('database is closed')) {
        return ErrorCategory.CRITICAL;
      }
      if (errorMessage.includes('timeout')) {
        return ErrorCategory.TIMEOUT_ERROR;
      }
    }
    // Fallback pour les erreurs non reconnues
    return ErrorCategory.NON_RETRYABLE;
  }

  /**
   * Réinitialise le pool (principalement pour les tests).
   */
  public reset(): void {
    logger.warn('Resetting database connection pool (for testing purposes).');
    this.shutdown();
    this.db = null;
    this.isShuttingDown = false;
    this.circuitBreaker = new CircuitBreaker(5, 5000, 'database_connection_pool');
    this.startHealthCheck();
  }
}

// Export de l'instance singleton du pool de connexion
export const dbConnectionPool = SQLiteConnectionPool.getInstance();