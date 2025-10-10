/**
 * Abstract base repository providing common database abstraction
 * This layer completely hides SQL implementation details from the domain/application layers
 */

export interface DatabaseAdapter {
  query<T = any>(sql: string, params?: any[], context?: string): Promise<T[]>;
  queryOne<T = any>(sql: string, params?: any[], context?: string): Promise<T | null>;
  execute(sql: string, params?: any[], context?: string): Promise<{ lastInsertRowid?: number; changes?: number }>;
  transaction<T>(callback: (adapter: DatabaseAdapter) => Promise<T>, context?: string): Promise<T>;
}

export abstract class AbstractRepository {
  protected constructor(protected readonly db: DatabaseAdapter) {}

  // Helper methods for common operations
  protected async createRecord<TInput, TEntity>(
    tableName: string,
    data: TInput,
    entityBuilder: (row: any) => TEntity,
    context: string
  ): Promise<TEntity> {
    const fields = Object.keys(data as object);
    const placeholders = fields.map(() => '?').join(', ');
    const values = fields.map(field => (data as any)[field]);
    
    await this.db.execute(
      `INSERT INTO ${tableName} (${fields.join(', ')}) VALUES (${placeholders})`,
      values,
      context
    );
    
    const row = await this.db.queryOne(
      `SELECT * FROM ${tableName} WHERE rowid = last_insert_rowid()`,
      [],
      `${context}:fetchCreated`
    );
    
    if (!row) {
      throw new Error(`Failed to fetch created record from ${tableName}`);
    }
    
    return entityBuilder(row);
  }

  protected async findRecordById<TEntity>(
    tableName: string,
    id: string | number,
    userId: string,
    entityBuilder: (row: any) => TEntity,
    context: string
  ): Promise<TEntity | null> {
    const row = await this.db.queryOne(
      `SELECT * FROM ${tableName} WHERE id = ? AND user_id = ?`,
      [id, userId],
      context
    );
    
    return row ? entityBuilder(row) : null;
  }

  protected async findRecordsByUser<TEntity>(
    tableName: string,
    userId: string,
    entityBuilder: (row: any) => TEntity,
    context: string,
    orderBy: string = 'created_at DESC'
  ): Promise<TEntity[]> {
    const rows = await this.db.query(
      `SELECT * FROM ${tableName} WHERE user_id = ? ORDER BY ${orderBy}`,
      [userId],
      context
    );
    
    return rows.map(entityBuilder);
  }

  protected async updateRecord<TInput, TEntity>(
    tableName: string,
    id: string | number,
    userId: string,
    patch: Partial<TInput>,
    entityBuilder: (row: any) => TEntity,
    context: string
  ): Promise<TEntity> {
    const fields = Object.keys(patch as object).filter(key => (patch as any)[key] !== undefined);
    if (fields.length === 0) {
      // No changes, fetch and return existing record
      const existing = await this.findRecordById(tableName, id, userId, entityBuilder, `${context}:noChanges`);
      if (!existing) {
        throw new Error(`Record not found: ${tableName} id=${id} userId=${userId}`);
      }
      return existing;
    }
    
    const setPart = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => (patch as any)[field]);
    
    const result = await this.db.execute(
      `UPDATE ${tableName} SET ${setPart} WHERE id = ? AND user_id = ?`,
      [...values, id, userId],
      context
    );
    
    if (result.changes === 0) {
      throw new Error(`Record not found or no permission: ${tableName} id=${id} userId=${userId}`);
    }
    
    const updated = await this.findRecordById(tableName, id, userId, entityBuilder, `${context}:fetchUpdated`);
    if (!updated) {
      throw new Error(`Failed to fetch updated record from ${tableName}`);
    }
    
    return updated;
  }

  protected async deleteRecord(
    tableName: string,
    id: string | number,
    userId: string,
    context: string
  ): Promise<void> {
    const result = await this.db.execute(
      `DELETE FROM ${tableName} WHERE id = ? AND user_id = ?`,
      [id, userId],
      context
    );
    
    if (result.changes === 0) {
      throw new Error(`Record not found or no permission: ${tableName} id=${id} userId=${userId}`);
    }
  }
}