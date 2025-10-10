import Database from "better-sqlite3";
import { logger } from "@/lib/utils/logging/logger";

// =============================================================================
// TYPES DE BASE
// =============================================================================

export interface QueryContext {
  operationId: string;
  operation: string;
  startTime: number;
  userId?: string;
  entityId?: string;
}

export interface DatabaseOperation {
  type: "read" | "write" | "delete";
  table: string;
  operation: string;
}

// =============================================================================
// SERVICE DE BASE DE DONNÉES UNIFIÉ
// =============================================================================

/**
 * Service unifié pour toutes les opérations de base de données
 */
export class UnifiedDatabaseService {
  private db: Database.Database;
  private readonly serviceName = "UnifiedDatabaseService";

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    logger.info(
      `[${this.serviceName}] Base de données initialisée : ${dbPath}`,
    );
  }

  /**
   * Exécute une requête SELECT
   */
  select<T = any>(query: string, params: any[] = []): T[] {
    try {
      const stmt = this.db.prepare(query);
      return stmt.all(...params) as T[];
    } catch (error) {
      logger.error(`[${this.serviceName}] Erreur SELECT: ${error}`);
      throw error;
    }
  }

  /**
   * Exécute une requête SELECT pour un seul résultat
   */
  selectOne<T = any>(query: string, params: any[] = []): T | null {
    try {
      const stmt = this.db.prepare(query);
      const result = stmt.get(...params) as T | undefined;
      return result || null;
    } catch (error) {
      logger.error(`[${this.serviceName}] Erreur SELECT ONE: ${error}`);
      throw error;
    }
  }

  /**
   * Alias pour compatibilité avec l'ancien code
   */
  query<T = any>(
    query: string,
    params: any[] = [],
    _context?: QueryContext,
  ): Promise<T[]> {
    return Promise.resolve(this.select<T>(query, params));
  }

  /**
   * Alias pour compatibilité avec l'ancien code
   */
  queryOne<T = any>(
    query: string,
    params: any[] = [],
    _context?: QueryContext,
  ): Promise<T | null> {
    return Promise.resolve(this.selectOne<T>(query, params));
  }

  /**
   * Exécute une requête INSERT/UPDATE/DELETE
   */
  execute(query: string, params: any[] = []): Database.RunResult {
    try {
      const stmt = this.db.prepare(query);
      return stmt.run(...params);
    } catch (error) {
      logger.error(`[${this.serviceName}] Erreur EXECUTE: ${error}`);
      throw error;
    }
  }

  /**
   * Alias pour compatibilité avec l'ancien code
   */
  run(
    query: string,
    params: any[] = [],
    _context?: QueryContext,
  ): Promise<Database.RunResult> {
    return Promise.resolve(this.execute(query, params));
  }

  /**
   * Commence une transaction
   */
  transaction<T>(fn: () => T): T {
    return this.db.transaction(fn)();
  }

  /**
   * Ferme la connexion à la base de données
   */
  close(): void {
    this.db.close();
    logger.info(`[${this.serviceName}] Connexion fermée`);
  }

  /**
   * Vérifie si la base de données est ouverte
   */
  isOpen(): boolean {
    return this.db.open;
  }

  /**
   * Initialise la base de données (pour compatibilité)
   */
  async initialize(): Promise<void> {
    logger.info(`[${this.serviceName}] Base de données initialisée`);
  }

  /**
   * Retourne le statut de la base de données
   */
  getStatus(): { connected: boolean; path: string } {
    return {
      connected: this.isOpen(),
      path: "data/logistix.db",
    };
  }
}

// =============================================================================
// FONCTIONS UTILITAIRES
// =============================================================================

/**
 * Génère un ID unique
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Retourne le timestamp actuel
 */
export function getCurrentTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

// Instance unique exportée
export const unifiedDb = new UnifiedDatabaseService("data/logistix.db");
