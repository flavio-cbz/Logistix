import 'server-only';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { RetryManager, CircuitBreaker, ErrorCategory } from './retry-manager';
import { QueueManager, RequestType, RequestPriority } from './queue-manager';
import { databaseLogger } from './database-logger';

// Configuration du pool de connexions
export interface PoolConfig {
  maxConnections: number;        // Nombre maximum de connexions (défaut: 5)
  connectionTimeout: number;     // Timeout pour obtenir une connexion (ms)
  idleTimeout: number;          // Timeout avant fermeture d'une connexion inactive (ms)
  retryAttempts: number;        // Nombre de tentatives en cas d'erreur
  retryDelay: number;           // Délai entre les tentatives (ms)
}

// État d'une connexion
export interface ConnectionState {
  id: string;                   // Identifiant unique de la connexion
  database: Database.Database;  // Instance de la base de données
  isActive: boolean;            // Connexion en cours d'utilisation
  lastUsed: Date;              // Dernière utilisation
  createdAt: Date;             // Date de création
}

// Interface du pool de connexions
export interface DatabaseConnectionPool {
  getConnection(): Promise<Database.Database>;
  releaseConnection(connection: Database.Database): void;
  executeWithConnection<T>(operation: (db: Database.Database) => T): Promise<T>;
  executeTransaction<T>(operation: (db: Database.Database) => T): Promise<T>;
  closeAll(): Promise<void>;
  getPoolStatus(): PoolStatus;
}

// Statut du pool
export interface PoolStatus {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingRequests: number;
}

// Logger optimisé pour le pool
const logger = {
  info: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development' || process.env.DB_DEBUG === 'true') {
      console.log(`[ConnectionPool] ${message}`, data ? JSON.stringify(data) : '');
    }
  },
  warn: (message: string, data?: any) => {
    console.warn(`[ConnectionPool] ${message}`, data ? JSON.stringify(data) : '');
  },
  error: (message: string, data?: any) => {
    console.error(`[ConnectionPool] ${message}`, data ? JSON.stringify(data) : '');
  },
  debug: (message: string, data?: any) => {
    if (process.env.DB_DEBUG === 'true') {
      console.debug(`[ConnectionPool] ${message}`, data ? JSON.stringify(data) : '');
    }
  },
};

/**
 * Gestionnaire de pool de connexions SQLite thread-safe
 * Implémente le pattern singleton pour garantir une seule instance globale
 */
export class DatabaseConnectionPoolImpl implements DatabaseConnectionPool {
  private static instance: DatabaseConnectionPoolImpl;
  private connections: Map<string, ConnectionState> = new Map();
  private availableConnections: string[] = [];
  private config: PoolConfig;
  private dbPath: string;
  private isShuttingDown = false;
  private cleanupInterval?: NodeJS.Timeout;
  private monitoringInterval?: NodeJS.Timeout;
  private transactionMutex = new Set<string>(); // Pour gérer les transactions exclusives
  
  // Nouveaux gestionnaires
  private retryManager: RetryManager;
  private queueManager: QueueManager;
  private circuitBreaker: CircuitBreaker;

  private constructor(config?: Partial<PoolConfig>) {
    this.config = {
      maxConnections: config?.maxConnections ?? 5,
      connectionTimeout: config?.connectionTimeout ?? 30000, // 30s
      idleTimeout: config?.idleTimeout ?? 300000, // 5min
      retryAttempts: config?.retryAttempts ?? 5,
      retryDelay: config?.retryDelay ?? 500,
    };

    this.dbPath = path.join(process.cwd(), 'data', 'logistix.db');
    this.ensureDataDirectory();
    
    // Initialiser les gestionnaires
    this.retryManager = new RetryManager(this.config);
    this.queueManager = new QueueManager();
    this.circuitBreaker = new CircuitBreaker(5, 60000, 2); // 5 échecs, 1min recovery, 2 succès
    
    // Démarrer le nettoyage périodique des connexions inactives
    this.startCleanupTimer();
    
    // Démarrer le monitoring périodique
    this.startMonitoringTimer();
    
    logger.info('DatabaseConnectionPool initialized', {
      maxConnections: this.config.maxConnections,
      dbPath: this.dbPath,
      retryConfig: this.retryManager.getConfig(),
    });
  }

  /**
   * Récupère l'instance unique du pool de connexions
   */
  public static getInstance(config?: Partial<PoolConfig>): DatabaseConnectionPoolImpl {
    if (!DatabaseConnectionPoolImpl.instance) {
      DatabaseConnectionPoolImpl.instance = new DatabaseConnectionPoolImpl(config);
    }
    return DatabaseConnectionPoolImpl.instance;
  }

  /**
   * S'assure que le répertoire des données existe
   */
  private ensureDataDirectory(): void {
    const dataDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dataDir)) {
      logger.info('Creating data directory...');
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  /**
   * Catégorise une erreur de connexion pour le circuit breaker
   */
  private categorizeConnectionError(error: any): ErrorCategory {
    if (!error) return ErrorCategory.NON_RETRYABLE;

    const code = error.code;
    const message = error.message?.toLowerCase() || '';

    // Erreurs de verrou - les plus communes
    if (
      code === 'SQLITE_BUSY' ||
      code === 'SQLITE_LOCKED' ||
      message.includes('database is locked') ||
      message.includes('database is busy')
    ) {
      return ErrorCategory.RETRYABLE_LOCK;
    }

    // Erreurs I/O temporaires
    if (
      code === 'SQLITE_IOERR' ||
      code === 'SQLITE_INTERRUPT' ||
      message.includes('disk i/o error') ||
      message.includes('interrupted')
    ) {
      return ErrorCategory.RETRYABLE_IO;
    }

    // Erreurs de ressources
    if (
      code === 'SQLITE_NOMEM' ||
      code === 'SQLITE_FULL' ||
      message.includes('out of memory') ||
      message.includes('database or disk is full')
    ) {
      return ErrorCategory.RETRYABLE_RESOURCE;
    }

    // Erreurs critiques
    if (
      code === 'SQLITE_CORRUPT' ||
      message.includes('database disk image is malformed') ||
      message.includes('corruption')
    ) {
      return ErrorCategory.CRITICAL;
    }

    // Erreurs non retryables
    if (
      code === 'SQLITE_READONLY' ||
      code === 'SQLITE_CANTOPEN' ||
      message.includes('readonly database') ||
      message.includes('unable to open database file')
    ) {
      return ErrorCategory.NON_RETRYABLE;
    }

    // Par défaut, traiter comme une erreur de verrou
    return ErrorCategory.RETRYABLE_LOCK;
  }

  /**
   * Crée une nouvelle connexion à la base de données avec retry
   */
  private async createConnection(): Promise<ConnectionState> {
    const connectionId = randomUUID();
    const operationId = randomUUID();
    
    // Démarrer le suivi de l'opération
    databaseLogger.startOperation(operationId, 'connection-pool', 'create-connection');
    
    const result = await this.retryManager.executeWithRetry(async () => {
      const database = new Database(this.dbPath);
      
      // Configuration optimale pour SQLite
      database.pragma('foreign_keys = ON');
      database.pragma('journal_mode = WAL');
      database.pragma('synchronous = NORMAL');
      database.pragma('cache_size = 10000');
      database.pragma('temp_store = memory');
      database.pragma('mmap_size = 268435456'); // 256MB
      database.pragma('busy_timeout = 30000'); // 30s timeout pour les verrous
      
      return database;
    }, `create connection ${connectionId}`);

    const duration = databaseLogger.endOperation(operationId);

    if (!result.success || !result.result) {
      // Catégoriser l'erreur pour le circuit breaker
      const errorCategory = this.categorizeConnectionError(result.error);
      this.circuitBreaker.recordFailure(errorCategory);
      
      // Logger l'erreur de création de connexion
      databaseLogger.logDatabaseError(
        connectionId,
        'connection-pool',
        'create-connection',
        result.error,
        result.attempts,
        duration,
        { dbPath: this.dbPath }
      );
      
      databaseLogger.logConnectionEvent(connectionId, 'error', 'create-connection', duration, {
        attempts: result.attempts,
        error: result.error?.message
      });
      
      throw result.error || new Error('Failed to create database connection');
    }

    this.circuitBreaker.recordSuccess();
    
    const connectionState: ConnectionState = {
      id: connectionId,
      database: result.result,
      isActive: false,
      lastUsed: new Date(),
      createdAt: new Date(),
    };

    this.connections.set(connectionId, connectionState);
    
    // Logger la création réussie de la connexion
    databaseLogger.logConnectionEvent(connectionId, 'created', 'connection-pool', duration, {
      attempts: result.attempts,
      totalTime: result.totalTime,
      dbPath: this.dbPath
    });
    
    logger.info('New connection created', { 
      connectionId, 
      attempts: result.attempts,
      totalTime: result.totalTime 
    });
    
    return connectionState;
  }

  /**
   * Obtient une connexion du pool avec retry et timeout
   */
  public async getConnection(
    type: RequestType = RequestType.READ,
    priority: RequestPriority = RequestPriority.NORMAL,
    context?: string
  ): Promise<Database.Database> {
    const operationId = randomUUID();
    const startTime = Date.now();
    
    // Démarrer le suivi de l'opération
    databaseLogger.startOperation(operationId, context || 'unknown', 'get-connection');

    if (this.isShuttingDown) {
      const duration = databaseLogger.endOperation(operationId);
      databaseLogger.logDatabaseError(
        undefined,
        context || 'unknown',
        'get-connection',
        new Error('Connection pool is shutting down'),
        0,
        duration
      );
      throw new Error('Connection pool is shutting down');
    }

    // Vérifier le circuit breaker
    if (!this.circuitBreaker.canExecute()) {
      const duration = databaseLogger.endOperation(operationId);
      const error = new Error('Circuit breaker is open - too many recent failures');
      databaseLogger.logDatabaseError(
        undefined,
        context || 'unknown',
        'get-connection',
        error,
        0,
        duration
      );
      throw error;
    }

    // Vérifier s'il y a une connexion disponible
    if (this.availableConnections.length > 0) {
      const connectionId = this.availableConnections.pop()!;
      const connectionState = this.connections.get(connectionId);
      
      if (connectionState && !connectionState.isActive) {
        connectionState.isActive = true;
        connectionState.lastUsed = new Date();
        
        const duration = databaseLogger.endOperation(operationId);
        databaseLogger.logConnectionEvent(connectionId, 'acquired', context, duration, {
          type,
          priority,
          reused: true
        });
        
        logger.debug('Reusing existing connection', { connectionId, type, context });
        return connectionState.database;
      }
    }

    // Créer une nouvelle connexion si possible
    if (this.connections.size < this.config.maxConnections) {
      try {
        const connectionState = await this.createConnection();
        connectionState.isActive = true;
        
        const duration = databaseLogger.endOperation(operationId);
        databaseLogger.logConnectionEvent(connectionState.id, 'acquired', context, duration, {
          type,
          priority,
          reused: false,
          newConnection: true
        });
        
        return connectionState.database;
      } catch (error) {
        // Si la création échoue, passer à la file d'attente
        logger.warn('Failed to create new connection, queuing request', { error });
        databaseLogger.logDatabaseError(
          undefined,
          context || 'unknown',
          'create-connection-fallback',
          error,
          0,
          Date.now() - startTime
        );
      }
    }

    // Utiliser la file d'attente avec priorité
    try {
      const connection = await this.queueManager.enqueue(
        type,
        priority,
        this.config.connectionTimeout,
        context
      );
      
      const duration = databaseLogger.endOperation(operationId);
      
      // Trouver l'ID de la connexion
      const connectionState = Array.from(this.connections.values())
        .find(state => state.database === connection);
      
      if (connectionState) {
        databaseLogger.logConnectionEvent(connectionState.id, 'acquired', context, duration, {
          type,
          priority,
          fromQueue: true,
          waitTime: duration
        });
        
        // Alerter si l'attente est trop longue
        if (duration > this.config.connectionTimeout * 0.8) {
          databaseLogger.logConnectionEvent(connectionState.id, 'timeout', context, duration, {
            type,
            priority,
            threshold: this.config.connectionTimeout
          });
        }
      }
      
      return connection;
    } catch (error) {
      const duration = databaseLogger.endOperation(operationId);
      databaseLogger.logDatabaseError(
        undefined,
        context || 'unknown',
        'get-connection-queue',
        error,
        0,
        duration
      );
      throw error;
    }
  }

  /**
   * Libère une connexion vers le pool
   */
  public releaseConnection(connection: Database.Database): void {
    const connectionState = Array.from(this.connections.values())
      .find(state => state.database === connection);

    if (!connectionState) {
      logger.warn('Attempted to release unknown connection');
      databaseLogger.logConnectionEvent('unknown', 'error', 'release-connection', 0, {
        error: 'Unknown connection attempted to be released'
      });
      return;
    }

    const wasActive = connectionState.isActive;
    connectionState.isActive = false;
    connectionState.lastUsed = new Date();

    // Traiter la file d'attente avec priorité
    if (this.queueManager.processRequest(connection)) {
      connectionState.isActive = true;
      
      databaseLogger.logConnectionEvent(connectionState.id, 'acquired', 'queue-processing', 0, {
        fromQueue: true,
        queueLength: this.queueManager.getQueueLength()
      });
      
      logger.debug('Connection assigned to queued request', { 
        connectionId: connectionState.id,
        queueLength: this.queueManager.getQueueLength()
      });
    } else {
      // Remettre dans le pool disponible
      this.availableConnections.push(connectionState.id);
      
      if (wasActive) {
        databaseLogger.logConnectionEvent(connectionState.id, 'released', 'connection-pool', 0, {
          returnedToPool: true
        });
      }
      
      logger.debug('Connection returned to pool', { 
        connectionId: connectionState.id 
      });
    }

    // Mettre à jour les statistiques de monitoring
    this.updateMonitoringStats();
  }

  /**
   * Exécute une opération avec gestion automatique de connexion
   */
  public async executeWithConnection<T>(
    operation: (db: Database.Database) => T,
    type: RequestType = RequestType.READ,
    priority: RequestPriority = RequestPriority.NORMAL,
    context?: string
  ): Promise<T> {
    const operationId = randomUUID();
    const operationContext = context || 'executeWithConnection';
    
    databaseLogger.startOperation(operationId, operationContext, 'execute-with-connection');

    const result = await this.retryManager.executeWithRetry(async () => {
      const connection = await this.getConnection(type, priority, context);
      
      try {
        return operation(connection);
      } finally {
        this.releaseConnection(connection);
      }
    }, operationContext);

    const duration = databaseLogger.endOperation(operationId);

    if (!result.success) {
      // Catégoriser l'erreur pour le circuit breaker
      const errorCategory = this.categorizeConnectionError(result.error);
      this.circuitBreaker.recordFailure(errorCategory);
      
      // Logger l'erreur avec détails
      databaseLogger.logDatabaseError(
        undefined,
        operationContext,
        'execute-with-connection',
        result.error,
        result.attempts,
        duration,
        { type, priority }
      );
      
      // Logger les verrous de base de données si applicable
      if (this.isLockError(result.error)) {
        databaseLogger.logDatabaseLock(
          this.getLockType(result.error),
          operationContext,
          'execute-with-connection',
          duration,
          result.attempts,
          false,
          undefined,
          result.error?.message
        );
      }
      
      throw result.error || new Error('Operation failed');
    }

    this.circuitBreaker.recordSuccess();
    return result.result!;
  }

  /**
   * Exécute une transaction avec verrou exclusif
   */
  public async executeTransaction<T>(
    operation: (db: Database.Database) => T,
    context?: string
  ): Promise<T> {
    const operationId = randomUUID();
    const operationContext = context || 'executeTransaction';
    
    databaseLogger.startOperation(operationId, operationContext, 'execute-transaction');

    const result = await this.retryManager.executeWithRetry(async () => {
      const connection = await this.getConnection(
        RequestType.TRANSACTION, 
        RequestPriority.HIGH, 
        context
      );
      
      const connectionState = Array.from(this.connections.values())
        .find(state => state.database === connection);
      
      if (!connectionState) {
        throw new Error('Connection state not found');
      }

      // Marquer comme transaction en cours
      this.transactionMutex.add(connectionState.id);
      
      try {
        const transaction = connection.transaction(() => operation(connection));
        const transactionResult = transaction();
        
        logger.debug('Transaction completed successfully', { 
          connectionId: connectionState.id,
          context
        });
        
        return transactionResult;
      } catch (error) {
        logger.error('Transaction failed', { 
          connectionId: connectionState.id, 
          error,
          context
        });
        
        // Logger l'erreur de transaction
        databaseLogger.logDatabaseError(
          connectionState.id,
          operationContext,
          'transaction-execution',
          error,
          0,
          Date.now() - (databaseLogger as any).activeOperations.get(operationId)?.startTime || 0,
          { transactionMutex: true }
        );
        
        throw error;
      } finally {
        this.transactionMutex.delete(connectionState.id);
        this.releaseConnection(connection);
      }
    }, operationContext);

    const duration = databaseLogger.endOperation(operationId);

    if (!result.success) {
      // Catégoriser l'erreur pour le circuit breaker
      const errorCategory = this.categorizeConnectionError(result.error);
      this.circuitBreaker.recordFailure(errorCategory);
      
      // Logger l'erreur de transaction avec détails
      databaseLogger.logDatabaseError(
        undefined,
        operationContext,
        'execute-transaction',
        result.error,
        result.attempts,
        duration,
        { transactionMutex: true }
      );
      
      // Logger les verrous de transaction si applicable
      if (this.isLockError(result.error)) {
        databaseLogger.logDatabaseLock(
          'TRANSACTION_LOCK',
          operationContext,
          'execute-transaction',
          duration,
          result.attempts,
          false,
          undefined,
          result.error?.message
        );
      }
      
      throw result.error || new Error('Transaction failed');
    }

    this.circuitBreaker.recordSuccess();
    return result.result!;
  }

  /**
   * Obtient le statut du pool
   */
  public getPoolStatus(): PoolStatus {
    const activeConnections = Array.from(this.connections.values())
      .filter(state => state.isActive).length;
    
    return {
      totalConnections: this.connections.size,
      activeConnections,
      idleConnections: this.connections.size - activeConnections,
      waitingRequests: this.queueManager.getQueueLength(),
    };
  }

  /**
   * Obtient les statistiques détaillées du pool
   */
  public getDetailedStats() {
    return {
      pool: this.getPoolStatus(),
      queue: this.queueManager.getStats(),
      queueByType: this.queueManager.getQueueByType(),
      circuitBreaker: this.circuitBreaker.getState(),
      retry: this.retryManager.getConfig(),
      logging: databaseLogger.getLoggingStats(),
    };
  }

  /**
   * Obtient les logs récents du système de monitoring
   */
  public getRecentLogs(type: 'connections' | 'locks' | 'errors' | 'monitoring', limit: number = 50) {
    return databaseLogger.getRecentLogs(type, limit);
  }

  /**
   * Obtient les détails des connexions actives
   */
  public getActiveConnectionsDetails() {
    const activeConnections = Array.from(this.connections.values())
      .filter(state => state.isActive)
      .map(state => ({
        id: state.id.substring(0, 8),
        createdAt: state.createdAt.toISOString(),
        lastUsed: state.lastUsed.toISOString(),
        ageMs: Date.now() - state.createdAt.getTime(),
        idleMs: Date.now() - state.lastUsed.getTime(),
        isInTransaction: this.transactionMutex.has(state.id)
      }));

    return {
      count: activeConnections.length,
      connections: activeConnections,
      transactionCount: this.transactionMutex.size
    };
  }

  /**
   * Force une mise à jour des statistiques de monitoring
   */
  public forceMonitoringUpdate(): void {
    this.updateMonitoringStats();
  }

  /**
   * Démarre le timer de nettoyage des connexions inactives
   */
  private startCleanupTimer(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleConnections();
    }, 60000); // Vérifier toutes les minutes
  }

  /**
   * Démarre le timer de monitoring périodique
   */
  private startMonitoringTimer(): void {
    this.monitoringInterval = setInterval(() => {
      this.updateMonitoringStats();
      this.checkConnectionHealth();
    }, 30000); // Monitoring toutes les 30 secondes
  }

  /**
   * Vérifie la santé des connexions et émet des alertes si nécessaire
   */
  private checkConnectionHealth(): void {
    const status = this.getPoolStatus();
    const utilizationPercent = status.totalConnections > 0 ? 
      (status.activeConnections / status.totalConnections) * 100 : 0;

    // Alerte si utilisation élevée
    if (utilizationPercent > 90) {
      databaseLogger.logConnectionEvent('pool', 'error', 'health-check', 0, {
        alert: 'HIGH_UTILIZATION',
        utilization: `${utilizationPercent.toFixed(1)}%`,
        activeConnections: status.activeConnections,
        totalConnections: status.totalConnections
      });
    }

    // Alerte si trop de requêtes en attente
    if (status.waitingRequests > 5) {
      databaseLogger.logConnectionEvent('pool', 'error', 'health-check', 0, {
        alert: 'HIGH_QUEUE_LENGTH',
        waitingRequests: status.waitingRequests,
        activeConnections: status.activeConnections
      });
    }

    // Vérifier les connexions anciennes
    const now = Date.now();
    const oldConnections = Array.from(this.connections.values())
      .filter(state => state.isActive && (now - state.lastUsed.getTime()) > 300000); // 5 minutes

    if (oldConnections.length > 0) {
      oldConnections.forEach(state => {
        databaseLogger.logConnectionEvent(state.id, 'timeout', 'health-check', 
          now - state.lastUsed.getTime(), {
          alert: 'LONG_RUNNING_CONNECTION',
          ageMs: now - state.createdAt.getTime(),
          idleMs: now - state.lastUsed.getTime()
        });
      });
    }
  }

  /**
   * Vérifie si une erreur est liée à un verrou de base de données
   */
  private isLockError(error: any): boolean {
    if (!error) return false;
    
    const code = error.code;
    const message = error.message?.toLowerCase() || '';
    
    return (
      code === 'SQLITE_BUSY' ||
      code === 'SQLITE_LOCKED' ||
      message.includes('database is locked') ||
      message.includes('database is busy')
    );
  }

  /**
   * Détermine le type de verrou à partir de l'erreur
   */
  private getLockType(error: any): 'SQLITE_BUSY' | 'SQLITE_LOCKED' | 'TRANSACTION_LOCK' | 'UNKNOWN' {
    if (!error) return 'UNKNOWN';
    
    const code = error.code;
    const message = error.message?.toLowerCase() || '';
    
    if (code === 'SQLITE_BUSY' || message.includes('database is busy')) {
      return 'SQLITE_BUSY';
    }
    
    if (code === 'SQLITE_LOCKED' || message.includes('database is locked')) {
      return 'SQLITE_LOCKED';
    }
    
    if (message.includes('transaction')) {
      return 'TRANSACTION_LOCK';
    }
    
    return 'UNKNOWN';
  }

  /**
   * Met à jour les statistiques de monitoring
   */
  private updateMonitoringStats(): void {
    const status = this.getPoolStatus();
    const queueStats = this.queueManager.getStats();
    
    databaseLogger.logConnectionMonitoring(
      status.totalConnections,
      status.activeConnections,
      status.idleConnections,
      status.waitingRequests,
      queueStats.averageWaitTime
    );
  }

  /**
   * Nettoie les connexions inactives
   */
  private cleanupIdleConnections(): void {
    const now = new Date();
    const connectionsToClose: string[] = [];

    for (const [connectionId, state] of this.connections.entries()) {
      if (!state.isActive && 
          (now.getTime() - state.lastUsed.getTime()) > this.config.idleTimeout) {
        connectionsToClose.push(connectionId);
      }
    }

    for (const connectionId of connectionsToClose) {
      const state = this.connections.get(connectionId);
      if (state) {
        try {
          state.database.close();
          this.connections.delete(connectionId);
          
          // Retirer de la liste des connexions disponibles
          const index = this.availableConnections.indexOf(connectionId);
          if (index !== -1) {
            this.availableConnections.splice(index, 1);
          }
          
          // Logger la fermeture de la connexion
          databaseLogger.logConnectionEvent(connectionId, 'closed', 'cleanup', 0, {
            reason: 'idle-timeout',
            idleTime: now.getTime() - state.lastUsed.getTime()
          });
          
          logger.debug('Idle connection closed', { connectionId });
        } catch (error) {
          logger.error('Error closing idle connection', { connectionId, error });
          
          databaseLogger.logDatabaseError(
            connectionId,
            'cleanup',
            'close-idle-connection',
            error,
            0,
            0,
            { reason: 'idle-timeout' }
          );
        }
      }
    }

    if (connectionsToClose.length > 0) {
      logger.info('Cleaned up idle connections', { 
        closedCount: connectionsToClose.length,
        remainingConnections: this.connections.size 
      });
      
      // Mettre à jour les statistiques après le nettoyage
      this.updateMonitoringStats();
    }
  }

  /**
   * Remet à zéro l'état de shutdown (pour les tests)
   */
  public resetShutdownState(): void {
    this.isShuttingDown = false;
  }

  /**
   * Ferme toutes les connexions
   */
  public async closeAll(): Promise<void> {
    this.isShuttingDown = true;
    
    // Arrêter les timers
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    // Arrêter le gestionnaire de file d'attente
    this.queueManager.shutdown();

    // Fermer toutes les connexions
    const closePromises: Promise<void>[] = [];
    
    for (const [connectionId, state] of this.connections.entries()) {
      closePromises.push(
        new Promise<void>((resolve) => {
          try {
            if (state.database.open) {
              state.database.close();
            }
            
            // Logger la fermeture de la connexion
            databaseLogger.logConnectionEvent(connectionId, 'closed', 'shutdown', 0, {
              reason: 'pool-shutdown',
              wasActive: state.isActive
            });
            
            logger.debug('Connection closed', { connectionId });
          } catch (error) {
            logger.error('Error closing connection', { connectionId, error });
            
            databaseLogger.logDatabaseError(
              connectionId,
              'shutdown',
              'close-connection',
              error,
              0,
              0,
              { reason: 'pool-shutdown' }
            );
          } finally {
            resolve();
          }
        })
      );
    }

    await Promise.all(closePromises);
    
    this.connections.clear();
    this.availableConnections.length = 0;
    
    logger.info('All connections closed', { 
      closedCount: closePromises.length 
    });
  }
}

// Export de l'instance singleton
export const connectionPool = DatabaseConnectionPoolImpl.getInstance();