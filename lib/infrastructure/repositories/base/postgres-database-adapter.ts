/**
 * PostgreSQL Database Adapter implementation (Experimental)
 * Feature flag: ENABLE_POSTGRES_ADAPTER
 */

import { DatabaseAdapter } from './abstract-repository';

export class PostgreSQLDatabaseAdapter implements DatabaseAdapter {
  private client: any; // pg.Client or pg.Pool
  
  constructor(client: any) {
    this.client = client;
  }

  async query<T = any>(sql: string, params?: any[], _context?: string): Promise<T[]> {
    // Convert SQLite-style positional params (?) to PostgreSQL ($1, $2, ...)
    const pgSql = this.convertSqlToPostgres(sql);
    const result = await this.client.query(pgSql, params);
    return result.rows;
  }

  async queryOne<T = any>(sql: string, params?: any[], context?: string): Promise<T | null> {
    const rows = await this.query<T>(sql, params, context);
    return rows[0] || null;
  }

  async execute(sql: string, params?: any[], _context?: string): Promise<{ lastInsertRowid?: number; changes?: number }> {
    const pgSql = this.convertSqlToPostgres(sql);
    const result = await this.client.query(pgSql, params);
    
    // For INSERT queries, try to get the inserted ID if SQL has RETURNING clause
    let lastInsertRowid: number | undefined = undefined;
    if (sql.toLowerCase().includes('insert') && result.rows.length > 0 && result.rows[0].id) {
      lastInsertRowid = Number(result.rows[0].id);
    }
    
    // Build the return object conditionally to respect exactOptionalPropertyTypes
    const returnObj: { lastInsertRowid?: number; changes?: number } = {
      changes: result.rowCount || 0
    };
    if (lastInsertRowid !== undefined) {
      returnObj.lastInsertRowid = lastInsertRowid;
    }
    
    return returnObj;
  }

  async transaction<T>(callback: (adapter: DatabaseAdapter) => Promise<T>, _context?: string): Promise<T> {
    const client = await this.client.connect();
    try {
      await client.query('BEGIN');
      const transactionAdapter = new PostgreSQLDatabaseAdapter(client);
      const result = await callback(transactionAdapter);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private convertSqlToPostgres(sql: string): string {
    // Simple conversion from SQLite ? placeholders to PostgreSQL $1, $2, ...
    let paramCounter = 1;
    return sql.replace(/\?/g, () => `$${paramCounter++}`);
  }
}

// Factory function for creating PostgreSQL adapter
export function createPostgreSQLAdapter(): PostgreSQLDatabaseAdapter | null {
  // Feature flag check
  if (!process.env.ENABLE_POSTGRES_ADAPTER || process.env.ENABLE_POSTGRES_ADAPTER !== 'true') {
    return null;
  }

  // Stub implementation - would need actual pg client setup
  console.warn('[PostgreSQL Adapter] Experimental feature enabled - not fully implemented yet');
  
  // In real implementation, would create pg.Pool here
  const mockClient = {
    query: async (_sql: string, _params?: any[]) => {
      throw new Error('PostgreSQL adapter not fully implemented - this is a stub');
    },
    connect: async () => ({
      query: async (_sql: string, _params?: any[]) => {
        throw new Error('PostgreSQL adapter not fully implemented - this is a stub');
      },
      release: () => {}
    })
  };
  
  return new PostgreSQLDatabaseAdapter(mockClient);
}