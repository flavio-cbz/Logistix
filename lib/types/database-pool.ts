import type Database from 'better-sqlite3';

/**
 * Configuration du pool de connexions à la base de données
 */
export interface PoolConfig {
  /** Nombre maximum de connexions simultanées */
  maxConnections: number;
  /** Timeout pour obtenir une connexion (en millisecondes) */
  connectionTimeout: number;
  /** Timeout avant fermeture d'une connexion inactive (en millisecondes) */
  idleTimeout: number;
  /** Nombre de tentatives en cas d'erreur */
  retryAttempts: number;
  /** Délai entre les tentatives (en millisecondes) */
  retryDelay: number;
}

/**
 * État d'une connexion dans le pool
 */
export interface ConnectionState {
  /** Identifiant unique de la connexion */
  id: string;
  /** Instance de la base de données SQLite */
  database: Database.Database;
  /** Indique si la connexion est actuellement utilisée */
  isActive: boolean;
  /** Timestamp de la dernière utilisation */
  lastUsed: Date;
  /** Timestamp de création de la connexion */
  createdAt: Date;
}

/**
 * Statut actuel du pool de connexions
 */
export interface PoolStatus {
  /** Nombre total de connexions dans le pool */
  totalConnections: number;
  /** Nombre de connexions actuellement actives */
  activeConnections: number;
  /** Nombre de connexions inactives disponibles */
  idleConnections: number;
  /** Nombre de requêtes en attente d'une connexion */
  waitingRequests: number;
}

/**
 * Types de requête pour optimiser la gestion
 */
export enum RequestType {
  READ = 'READ',
  WRITE = 'WRITE',
  TRANSACTION = 'TRANSACTION',
}

/**
 * Priorité des requêtes dans la file d'attente
 */
export enum RequestPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3,
}

/**
 * Interface principale du pool de connexions
 */
export interface DatabaseConnectionPool {
  /** Obtenir une connexion du pool */
  getConnection(type?: RequestType, priority?: RequestPriority, context?: string): Promise<Database.Database>;
  
  /** Libérer une connexion vers le pool */
  releaseConnection(connection: Database.Database): void;
  
  /** Exécuter une opération avec gestion automatique de connexion */
  executeWithConnection<T>(
    operation: (db: Database.Database) => T, 
    type?: RequestType, 
    priority?: RequestPriority, 
    context?: string
  ): Promise<T>;
  
  /** Exécuter une transaction avec verrou exclusif */
  executeTransaction<T>(operation: (db: Database.Database) => T, context?: string): Promise<T>;
  
  /** Fermer toutes les connexions */
  closeAll(): Promise<void>;
  
  /** Obtenir le statut actuel du pool */
  getPoolStatus(): PoolStatus;
  
  /** Obtenir les statistiques détaillées */
  getDetailedStats(): any;
}

/**
 * Erreurs spécifiques au pool de connexions
 */
export class ConnectionPoolError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'ConnectionPoolError';
  }
}

/**
 * Codes d'erreur du pool de connexions
 */
export enum ConnectionPoolErrorCode {
  TIMEOUT = 'CONNECTION_TIMEOUT',
  MAX_CONNECTIONS_REACHED = 'MAX_CONNECTIONS_REACHED',
  POOL_SHUTTING_DOWN = 'POOL_SHUTTING_DOWN',
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  INVALID_CONNECTION = 'INVALID_CONNECTION',
}

/**
 * Configuration par défaut du pool
 */
export const DEFAULT_POOL_CONFIG: PoolConfig = {
  maxConnections: 5,
  connectionTimeout: 30000, // 30 secondes
  idleTimeout: 300000,      // 5 minutes
  retryAttempts: 5,
  retryDelay: 500,          // 500ms
};

/**
 * Métriques de performance du pool
 */
export interface PoolMetrics {
  /** Nombre total de connexions créées depuis le démarrage */
  totalConnectionsCreated: number;
  /** Nombre total de connexions fermées */
  totalConnectionsClosed: number;
  /** Nombre total d'opérations exécutées */
  totalOperations: number;
  /** Nombre total de transactions exécutées */
  totalTransactions: number;
  /** Temps moyen d'attente pour obtenir une connexion (ms) */
  averageWaitTime: number;
  /** Temps moyen d'exécution des opérations (ms) */
  averageOperationTime: number;
  /** Nombre d'erreurs de timeout */
  timeoutErrors: number;
  /** Nombre d'erreurs de connexion */
  connectionErrors: number;
}