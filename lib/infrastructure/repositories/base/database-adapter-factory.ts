/**
 * Database Adapter Factory
 * Provides the appropriate database adapter based on configuration
 */

import { DatabaseAdapter } from './abstract-repository';
import { SQLiteDatabaseAdapter } from './sqlite-database-adapter';
import { createPostgreSQLAdapter } from './postgres-database-adapter';

export type DatabaseType = 'sqlite' | 'postgres';

export class DatabaseAdapterFactory {
  private static instance: DatabaseAdapter | null = null;

  static getInstance(): DatabaseAdapter {
    if (!this.instance) {
      this.instance = this.createAdapter();
    }
    return this.instance;
  }

  private static createAdapter(): DatabaseAdapter {
    // Check feature flags and environment
    const dbType = this.getDatabaseType();
    
    switch (dbType) {
      case 'postgres':
        const pgAdapter = createPostgreSQLAdapter();
        if (pgAdapter) {
          console.log('[DatabaseAdapterFactory] Using PostgreSQL adapter (experimental)');
          return pgAdapter;
        }
        console.warn('[DatabaseAdapterFactory] PostgreSQL adapter not available, falling back to SQLite');
        return new SQLiteDatabaseAdapter();
        
      case 'sqlite':
      default:
        console.log('[DatabaseAdapterFactory] Using SQLite adapter');
        return new SQLiteDatabaseAdapter();
    }
  }

  private static getDatabaseType(): DatabaseType {
    // Priority: explicit env var > feature flag > default
    if (process.env.DATABASE_TYPE) {
      const type = process.env.DATABASE_TYPE.toLowerCase();
      if (type === 'postgres' || type === 'postgresql') return 'postgres';
      if (type === 'sqlite') return 'sqlite';
    }

    // Check PostgreSQL feature flag
    if (process.env.ENABLE_POSTGRES_ADAPTER === 'true') {
      return 'postgres';
    }

    // Default to SQLite
    return 'sqlite';
  }

  // For testing - allow manual override
  static setAdapter(adapter: DatabaseAdapter): void {
    this.instance = adapter;
  }

  // Reset instance (useful for tests)
  static reset(): void {
    this.instance = null;
  }
}

// Convenience function
export function getDatabaseAdapter(): DatabaseAdapter {
  return DatabaseAdapterFactory.getInstance();
}