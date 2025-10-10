/**
 * SQLite Database Adapter implementation
 * Wraps databaseService to conform to DatabaseAdapter interface
 */

import { databaseService } from '@/lib/services/database/db';
import { DatabaseAdapter } from './abstract-repository';

export class SQLiteDatabaseAdapter implements DatabaseAdapter {
  async query<T = any>(sql: string, params?: any[], context?: string): Promise<T[]> {
    return databaseService.query<T>(sql, params, context);
  }

  async queryOne<T = any>(sql: string, params?: any[], context?: string): Promise<T | null> {
    return databaseService.queryOne<T>(sql, params, context);
  }

  async execute(sql: string, params?: any[], context?: string): Promise<{ lastInsertRowid?: number; changes?: number }> {
    const result = await databaseService.execute(sql, params, context);
    return {
      lastInsertRowid: typeof result.lastInsertRowid === 'bigint' ? Number(result.lastInsertRowid) : result.lastInsertRowid,
      changes: result.changes
    };
  }

  async transaction<T>(callback: (adapter: DatabaseAdapter) => Promise<T>, context?: string): Promise<T> {
    return databaseService.transaction(async (db: any) => {
      // Create a scoped adapter for the transaction
      const transactionAdapter = new SQLiteTransactionAdapter(db);
      return callback(transactionAdapter);
    }, context);
  }
}

// Transaction-scoped adapter
class SQLiteTransactionAdapter implements DatabaseAdapter {
  constructor(private readonly db: any) {}

  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    const stmt = this.db.client.prepare(sql);
    return stmt.all(params || []);
  }

  async queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
    const stmt = this.db.client.prepare(sql);
    const result = stmt.get(params || []);
    return result || null;
  }

  async execute(sql: string, params?: any[]): Promise<{ lastInsertRowid?: number; changes?: number }> {
    const stmt = this.db.client.prepare(sql);
    const result = stmt.run(params || []);
    return {
      lastInsertRowid: typeof result.lastInsertRowid === 'bigint' ? Number(result.lastInsertRowid) : result.lastInsertRowid,
      changes: result.changes
    };
  }

  async transaction<T>(callback: (adapter: DatabaseAdapter) => Promise<T>): Promise<T> {
    // Nested transactions not supported in SQLite, just execute the callback
    return callback(this);
  }
}