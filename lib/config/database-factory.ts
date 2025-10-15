/**
 * Database Factory - Switche entre SQLite et PostgreSQL
 * 
 * Utilise DATABASE_TYPE env variable pour déterminer quelle implémentation utiliser.
 * Fournit une API unifiée pour obtenir les repositories sans se soucier de l'implémentation.
 */

import { Pool } from 'pg';
// import { IProduitRepository } from '@/lib/repositories/interfaces/produit-repository.interface';
import { IParcelleRepository } from '@/lib/repositories/interfaces/parcelle-repository.interface';

// PostgreSQL repositories
import { PostgresConfig } from '@/lib/infrastructure/repositories/postgres/produit-repository';
import { PostgresParcelleRepository } from '@/lib/infrastructure/repositories/postgres/parcelle-repository';

// SQLite repositories
import { SQLiteParcelleRepository } from '@/lib/infrastructure/repositories/sqlite/parcelle-repository';

/**
 * Types de bases de données supportées
 */
export enum DatabaseType {
  SQLITE = 'sqlite',
  POSTGRES = 'postgres',
}

/**
 * Configuration complète pour la factory
 */
export interface DatabaseFactoryConfig {
  type: DatabaseType;
  sqlite?: {
    path: string;
  };
  postgres?: PostgresConfig;
}

/**
 * Container pour tous les repositories
 */
export interface RepositoryContainer {
  parcelleRepository: IParcelleRepository;
}

/**
 * Factory principale pour les connexions DB
 */
export class DatabaseFactory {
  private static instance: DatabaseFactory;
  private config: DatabaseFactoryConfig;
  private postgresPool?: Pool;
  private repositories?: RepositoryContainer | undefined;

  private constructor(config: DatabaseFactoryConfig) {
    this.config = config;
  }

  /**
   * Obtient l'instance singleton de la factory
   */
  static getInstance(config?: DatabaseFactoryConfig): DatabaseFactory {
    if (!DatabaseFactory.instance) {
      if (!config) {
        throw new Error('DatabaseFactory requires config on first initialization');
      }
      DatabaseFactory.instance = new DatabaseFactory(config);
    }
    return DatabaseFactory.instance;
  }

  /**
   * Crée la configuration à partir des variables d'environnement
   */
  static createConfigFromEnv(): DatabaseFactoryConfig {
    const databaseType = (process.env['DATABASE_TYPE'] || 'sqlite').toLowerCase() as DatabaseType;

    if (databaseType === DatabaseType.POSTGRES) {
      return {
        type: DatabaseType.POSTGRES,
        postgres: {
          host: process.env['POSTGRES_HOST'] || 'localhost',
          port: parseInt(process.env['POSTGRES_PORT'] || '5432'),
          database: process.env['POSTGRES_DATABASE'] || 'logistix',
          username: process.env['POSTGRES_USERNAME'] || 'postgres',
          password: process.env['POSTGRES_PASSWORD'] || '',
          ssl: process.env['POSTGRES_SSL'] === 'true',
          connectionTimeoutMillis: parseInt(process.env['POSTGRES_CONNECTION_TIMEOUT'] || '5000'),
          idleTimeoutMillis: parseInt(process.env['POSTGRES_IDLE_TIMEOUT'] || '30000'),
          max: parseInt(process.env['POSTGRES_MAX_CONNECTIONS'] || '20'),
        },
      };
    }

    // SQLite par défaut
    return {
      type: DatabaseType.SQLITE,
      sqlite: {
        path: process.env['SQLITE_PATH'] || './data/logistix.db',
      },
    };
  }

  /**
   * Initialise les connexions selon le type de DB
   */
  private async initializeConnections(): Promise<void> {
    if (this.config.type === DatabaseType.POSTGRES) {
      if (!this.config.postgres) {
        throw new Error('PostgreSQL configuration is required when DATABASE_TYPE=postgres');
      }

      this.postgresPool = new Pool({
        host: this.config.postgres.host,
        port: this.config.postgres.port,
        database: this.config.postgres.database,
        user: this.config.postgres.username,
        password: this.config.postgres.password,
        ssl: this.config.postgres.ssl ? { rejectUnauthorized: false } : false,
        connectionTimeoutMillis: this.config.postgres.connectionTimeoutMillis,
        idleTimeoutMillis: this.config.postgres.idleTimeoutMillis,
        max: this.config.postgres.max,
      });

      // Test de la connexion
      try {
        const client = await this.postgresPool.connect();
        await client.query('SELECT 1');
        client.release();
        console.log('[DatabaseFactory] PostgreSQL connection established successfully');
      } catch (error) {
        console.error('[DatabaseFactory] Failed to connect to PostgreSQL:', error);
        throw new Error(`PostgreSQL connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  /**
   * Crée les repositories selon le type de DB
   */
  private createRepositories(): RepositoryContainer {
    if (this.config.type === DatabaseType.POSTGRES) {
      if (!this.postgresPool) {
        throw new Error('PostgreSQL pool not initialized');
      }

      return {
        parcelleRepository: new PostgresParcelleRepository(this.postgresPool),
      };
    }

    // SQLite (utilise le service de base de données existant)
    return {
      parcelleRepository: new SQLiteParcelleRepository(),
    };
  }

  /**
   * Obtient les repositories (initialise si nécessaire)
   */
  async getRepositories(): Promise<RepositoryContainer> {
    if (!this.repositories) {
      await this.initializeConnections();
      this.repositories = this.createRepositories();
    }
    return this.repositories;
  }

  /**
   * Ferme toutes les connexions
   */
  async close(): Promise<void> {
    if (this.postgresPool) {
      await this.postgresPool.end();
      console.log('[DatabaseFactory] PostgreSQL connections closed');
    }

    this.repositories = undefined;
  }

    /**
     * Alias pour close() - utilisé dans les tests
     */
    async cleanup(): Promise<void> {
      await this.close();
    }

  /**
   * Obtient le type de DB configuré
   */
  getDatabaseType(): DatabaseType {
    return this.config.type;
  }

  /**
   * Vérifie si PostgreSQL est configuré
   */
  isPostgres(): boolean {
    return this.config.type === DatabaseType.POSTGRES;
  }

  /**
   * Vérifie si SQLite est configuré
   */
  isSQLite(): boolean {
    return this.config.type === DatabaseType.SQLITE;
  }
}

/**
 * Helper function pour obtenir rapidement les repositories
 */
export async function getDatabaseConnection(): Promise<RepositoryContainer> {
  const config = DatabaseFactory.createConfigFromEnv();
  const factory = DatabaseFactory.getInstance(config);
  return factory.getRepositories();
}

/**
 * Helper function pour fermer les connexions (utile pour les tests)
 */
export async function closeDatabaseConnections(): Promise<void> {
  const factory = DatabaseFactory.getInstance();
  if (factory) {
    await factory.close();
  }
}

/**
 * Helper function pour obtenir le type de DB
 */
export function getDatabaseType(): DatabaseType {
  const config = DatabaseFactory.createConfigFromEnv();
  return config.type;
}