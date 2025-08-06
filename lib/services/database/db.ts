import 'server-only';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { randomUUID, createHash } from 'crypto';
import { DatabaseConnectionPoolImpl } from './connection-pool';
import { DatabaseInitializationManagerImpl } from './initialization-manager';
import { RequestType, RequestPriority } from './queue-manager';
import { databaseLogger } from './database-logger';
import { DatabaseServiceInstrumentation } from '../logging-instrumentation';
import { PerformanceTimer, dbQueryLogger } from '@/lib/utils/logging';
import type { PoolConfig } from '@/lib/types/database-pool';

// Fallback logger that works in all environments (plus silencieux)
const logger = {
  info: (message: string, ...args: any[]) => {
    // Seulement les messages importants en développement
    if (typeof console !== 'undefined' && process.env.NODE_ENV === 'production') {
      console.log(`[DB] ${message}`, ...args);
    }
  },
  warn: (message: string, ...args: any[]) => {
    if (typeof console !== 'undefined') {
      console.warn(`[DB] ${message}`, ...args);
    }
  },
  error: (message: string, ...args: any[]) => {
    if (typeof console !== 'undefined') {
      console.error(`[DB] ${message}`, ...args);
    }
  },
  debug: (message: string, ...args: any[]) => {
    // Complètement silencieux en développement
    if (typeof console !== 'undefined' && process.env.NODE_ENV === 'production') {
      console.debug(`[DB] ${message}`, ...args);
    }
  },
};

/**
 * Classe encapsulant la gestion de la base de données SQLite.
 * Utilise le pool de connexions pour optimiser les performances et éviter les verrous.
 */
class DatabaseService {
  private static instance: DatabaseService;
  private connectionPool: DatabaseConnectionPoolImpl;
  private initializationManager: DatabaseInitializationManagerImpl;
  private isInitialized = false;

  private constructor(poolConfig?: Partial<PoolConfig>) {
    // Initialiser le pool de connexions
    this.connectionPool = DatabaseConnectionPoolImpl.getInstance(poolConfig);
    
    // Initialiser le gestionnaire d'initialisation
    this.initializationManager = DatabaseInitializationManagerImpl.getInstance();
    
    logger.info('DatabaseService initialized with connection pool');
  }

  /**
   * Récupère l'instance unique de DatabaseService.
   */
  public static getInstance(poolConfig?: Partial<PoolConfig>): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService(poolConfig);
    }
    return DatabaseService.instance;
  }

  /**
   * S'assure que la base de données est initialisée avant utilisation
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      // Vérifier si l'initialisation est déjà en cours ou terminée
      if (this.initializationManager.isInitialized()) {
        this.isInitialized = true;
        logger.info('Database already initialized by initialization manager');
        return;
      }

      // Attendre l'initialisation si elle est en cours
      if (this.initializationManager.getInitializationState() === 'in_progress') {
        logger.info('Database initialization in progress, waiting...');
        await this.initializationManager.waitForInitialization();
        this.isInitialized = true;
        return;
      }

      // Initialiser la base de données
      await this.initializationManager.initialize();
      this.isInitialized = true;
      logger.info('Database initialization completed');
    }
  }

  /**
   * Exécute une requête SELECT avec gestion automatique de connexion
   */
  public async query<T = any>(
    sql: string, 
    params: any[] = [], 
    context?: string
  ): Promise<T[]> {
    await this.ensureInitialized();
    
    return DatabaseServiceInstrumentation.instrumentQuery(
      context || 'query',
      () => this.connectionPool.executeWithConnection(
        (db) => {
          const stmt = db.prepare(sql);
          return stmt.all(...params) as T[];
        },
        RequestType.READ,
        RequestPriority.NORMAL,
        context || 'query'
      ),
      sql
    );
  }

  /**
   * Exécute une requête qui retourne une seule ligne
   */
  public async queryOne<T = any>(
    sql: string, 
    params: any[] = [], 
    context?: string
  ): Promise<T | null> {
    await this.ensureInitialized();
    
    return DatabaseServiceInstrumentation.instrumentQuery(
      context || 'queryOne',
      () => this.connectionPool.executeWithConnection(
        (db) => {
          const stmt = db.prepare(sql);
          return stmt.get(...params) as T | undefined || null;
        },
        RequestType.READ,
        RequestPriority.NORMAL,
        context || 'queryOne'
      ),
      sql
    );
  }

  /**
   * Exécute une requête INSERT, UPDATE ou DELETE
   */
  public async execute(
    sql: string, 
    params: any[] = [], 
    context?: string
  ): Promise<Database.RunResult> {
    await this.ensureInitialized();
    
    return DatabaseServiceInstrumentation.instrumentQuery(
      context || 'execute',
      () => this.connectionPool.executeWithConnection(
        (db) => {
          const stmt = db.prepare(sql);
          return stmt.run(...params);
        },
        RequestType.WRITE,
        RequestPriority.NORMAL,
        context || 'execute'
      ),
      sql
    );
  }

  /**
   * Exécute plusieurs requêtes dans une transaction
   */
  public async transaction<T>(
    operations: (db: Database.Database) => T,
    context?: string
  ): Promise<T> {
    await this.ensureInitialized();
    
    return DatabaseServiceInstrumentation.instrumentTransaction(
      context || 'transaction',
      () => this.connectionPool.executeTransaction(
        operations,
        context || 'transaction'
      )
    );
  }

  /**
   * Exécute une opération avec une connexion spécifique (pour compatibilité)
   */
  public async executeWithConnection<T>(
    operation: (db: Database.Database) => T,
    type: RequestType = RequestType.READ,
    priority: RequestPriority = RequestPriority.NORMAL,
    context?: string
  ): Promise<T> {
    await this.ensureInitialized();
    
    return this.connectionPool.executeWithConnection(
      operation,
      type,
      priority,
      context || 'executeWithConnection'
    );
  }

  /**
   * Vérifie la santé de la base de données
   */
  public async healthCheck(): Promise<boolean> {
    try {
      await this.ensureInitialized();
      
      const result = await this.queryOne<{ result: number }>(
        'SELECT 1 as result',
        [],
        'healthCheck'
      );
      
      return result?.result === 1;
    } catch (error) {
      logger.error('Database health check failed', error);
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
  public getRecentLogs(type: 'connections' | 'locks' | 'errors' | 'monitoring', limit: number = 50) {
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
    logger.info('All database connections closed');
  }

  /**
   * Propriété de compatibilité pour accéder directement à une connexion
   * @deprecated Utiliser les méthodes query, execute, transaction à la place
   */
  public get db(): Database.Database {
    logger.warn('Direct database access is deprecated. Use query, execute, or transaction methods instead.');
    throw new Error('Direct database access is not available with connection pool. Use query, execute, or transaction methods.');
  }
}

/**
 * Réinitialise la base de données en supprimant le fichier et en la réinitialisant.
 * Destiné uniquement à l'environnement de développement.
 */
export async function resetDatabase(): Promise<boolean> {
  if (process.env.NODE_ENV === 'production') {
    logger.warn('Tentative de réinitialisation de la base de données en production. Opération annulée.');
    return false;
  }

  logger.info('Réinitialisation de la base de données...');

  try {
    const dbService = DatabaseService.getInstance();
    
    // Fermer toutes les connexions du pool
    await dbService.close();

    // Réinitialiser le gestionnaire d'initialisation
    const initManager = DatabaseInitializationManagerImpl.getInstance();
    initManager.reset();

    const dbPath = path.join(process.cwd(), 'data', 'logistix.db');
    const dbFiles = [dbPath, `${dbPath}-shm`, `${dbPath}-wal`];
    
    dbFiles.forEach(file => {
      if (fs.existsSync(file)) {
        try {
          fs.unlinkSync(file);
          logger.info(`Fichier ${file} supprimé.`);
        } catch (err: any) {
          // Si le fichier est occupé (EBUSY), on ignore l'erreur.
          // Il sera probablement supprimé au prochain redémarrage.
          if (err.code !== 'EBUSY') throw err;
          logger.warn(`Impossible de supprimer ${file} (occupé).`);
        }
      }
    });

    // Réinitialiser les instances pour forcer la recréation
    (DatabaseService as any).instance = null;
    (DatabaseConnectionPoolImpl as any).instance = null;
    (DatabaseInitializationManagerImpl as any).instance = null;
    
    // Créer une nouvelle instance qui réinitialisera la base de données
    const newDbService = DatabaseService.getInstance();
    await newDbService.healthCheck(); // Force l'initialisation
    
    logger.info('Base de données réinitialisée avec succès.');
    return true;
  } catch (error) {
    logger.error('Erreur lors de la réinitialisation de la base de données:', error);
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
 * Hache un mot de passe en utilisant SHA-256.
 * NOTE : Pour une sécurité accrue, envisagez d'utiliser bcrypt ou scrypt avec un salt.
 * @param password - Le mot de passe à hacher.
 * @returns {string} Le hash du mot de passe.
 */
export function hashPassword(password: string): string {
    
    return createHash('sha256').update(password).digest('hex');
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
  prepare: (sql: string) => {
    console.warn('Direct database access is deprecated. Use databaseService.query, execute, or transaction methods instead.');
    // Retourner un objet avec les méthodes attendues pour la compatibilité
    return {
      all: (...params: any[]) => {
        throw new Error('Direct database access is deprecated. Use databaseService.query method instead.');
      },
      get: (...params: any[]) => {
        throw new Error('Direct database access is deprecated. Use databaseService.queryOne method instead.');
      },
      run: (...params: any[]) => {
        throw new Error('Direct database access is deprecated. Use databaseService.execute method instead.');
      }
    };
  },
  exec: () => {
    throw new Error('Direct database access is deprecated. Use databaseService.execute or transaction methods instead.');
  },
  transaction: () => {
    throw new Error('Direct database access is deprecated. Use databaseService.transaction method instead.');
  },
  close: () => databaseService.close(),
};
