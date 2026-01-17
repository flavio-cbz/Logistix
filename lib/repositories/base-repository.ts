import {
  type BetterSQLite3Database,
} from "drizzle-orm/better-sqlite3";
import { eq, sql, count as sqlCount, type SQL, desc, asc, and, type AnyColumn } from "drizzle-orm";
import { type SQLiteTable } from "drizzle-orm/sqlite-core";
import * as schema from "@/lib/database/schema";
import { logger } from "@/lib/utils/logging/logger";
import { DatabaseService } from "@/lib/database/database-service";

// ============================================================================
// BASE REPOSITORY PATTERN
// ============================================================================
// Provides a standardized interface for all database operations
// Implements common CRUD operations with type safety

export interface FilterOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: "asc" | "desc";
  where?: SQL | undefined;
}

export interface PaginationResult<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface RepositoryOptions {
  enableLogging?: boolean;
  defaultLimit?: number;
  maxLimit?: number;
  tableName?: string;
}

/**
 * Base Repository Class
 *
 * Provides common CRUD operations for all entities with:
 * - Type safety through generics
 * - Standardized error handling
 * - Pagination support
 * - Flexible filtering
 * - Transaction support
 */
export abstract class BaseRepository<
  TTable = unknown,
  TSelect = unknown,
  TInsert = unknown,
> {
  protected databaseService: DatabaseService;
  protected table: TTable;
  protected options: RepositoryOptions;
  protected tableName: string;

  constructor(
    table: TTable,
    databaseService: DatabaseService,
    options: RepositoryOptions = {},
  ) {
    this.table = table;
    this.databaseService = databaseService;
    this.tableName = options.tableName || this.extractTableName(table);
    this.options = {
      enableLogging: options.enableLogging || false,
      defaultLimit: options.defaultLimit || 50,
      maxLimit: options.maxLimit || 1000,
      ...options,
    };
  }

  /**
   * Find a record by ID
   */
  public async findById(id: string): Promise<TSelect | null> {
    try {
      return await this.databaseService.executeQuery((db: BetterSQLite3Database<typeof schema>) => {
        const table = this.table as SQLiteTable & { id: AnyColumn };
        const result = db
          .select()
          .from(table)
          .where(eq(table.id, id))
          .get();
        return (result as TSelect | undefined) || null;
      }, `${this.getTableName()}.findById`);
    } catch (error) {
      this.logError("findById failed", error, { id });
      throw error;
    }
  }

  /**
   * Find all records with optional filtering
   */
  public async findAll(options: FilterOptions = {}): Promise<TSelect[]> {
    try {
      return await this.databaseService.executeQuery((db: BetterSQLite3Database<typeof schema>) => {
        let query = db.select().from(this.table as SQLiteTable);

        // Apply where clause
        if (options.where) {
          query = query.where(options.where) as typeof query;
        }

        // Apply ordering
        if (options.orderBy) {
          const direction = options.orderDirection === "desc" ? desc : asc;
          const tableWithColumns = this.table as Record<string, AnyColumn>;
          const column = tableWithColumns[options.orderBy];
          if (column) {
            query = query.orderBy(direction(column)) as typeof query;
          }
        }

        // Apply pagination
        const limit = Math.min(
          options.limit || this.options.defaultLimit!,
          this.options.maxLimit!,
        );
        query = query.limit(limit) as typeof query;

        if (options.offset) {
          query = query.offset(options.offset) as typeof query;
        }

        return query.all() as TSelect[];
      }, `${this.getTableName()}.findAll`);
    } catch (error) {
      this.logError("findAll failed", error, { options });
      throw error;
    }
  }

  /**
   * Find records with pagination
   */
  public async findWithPagination(
    options: FilterOptions = {},
  ): Promise<PaginationResult<TSelect>> {
    try {
      return await this.databaseService.executeQuery((db: BetterSQLite3Database<typeof schema>) => {
        // Get total count
        let countQuery = db.select({ count: sqlCount() }).from(this.table as SQLiteTable);
        if (options.where) {
          countQuery = countQuery.where(options.where) as typeof countQuery;
        }
        const totalResult = countQuery.get();
        const total = totalResult?.count || 0;

        // Get data
        let dataQuery = db.select().from(this.table as SQLiteTable);

        if (options.where) {
          dataQuery = dataQuery.where(options.where) as typeof dataQuery;
        }

        if (options.orderBy) {
          const direction = options.orderDirection === "desc" ? desc : asc;
          const tableWithColumns = this.table as Record<string, AnyColumn>;
          const column = tableWithColumns[options.orderBy];
          if (column) {
            dataQuery = dataQuery.orderBy(direction(column)) as typeof dataQuery;
          }
        }

        const limit = Math.min(
          options.limit || this.options.defaultLimit!,
          this.options.maxLimit!,
        );
        const offset = options.offset || 0;

        dataQuery = dataQuery.limit(limit).offset(offset) as typeof dataQuery;
        const data = dataQuery.all() as TSelect[];

        return {
          data,
          total,
          limit,
          offset,
          hasMore: offset + data.length < total,
        };
      }, `${this.getTableName()}.findWithPagination`);
    } catch (error) {
      this.logError("findWithPagination failed", error, { options });
      throw error;
    }
  }

  /**
   * Create a new record
   */
  public async create(data: TInsert): Promise<TSelect> {
    try {
      return await this.databaseService.executeQuery((db: BetterSQLite3Database<typeof schema>) => {
        // Add timestamps if they exist
        const insertData = this.addTimestamps(data, "create");

        const result = db
          .insert(this.table as SQLiteTable)
          .values(insertData)
          .returning()
          .get();

        return result as TSelect;
      }, `${this.getTableName()}.create`);
    } catch (error) {
      this.logError("create failed", error, { data });
      throw error;
    }
  }

  /**
   * Create multiple records
   */
  public async createMany(data: TInsert[]): Promise<TSelect[]> {
    try {
      return await this.databaseService.executeTransaction(
        (db: BetterSQLite3Database<typeof schema>) => {
          const results: TSelect[] = [];

          for (const item of data) {
            const insertData = this.addTimestamps(item, "create");
            const result = db
              .insert(this.table as SQLiteTable)
              .values(insertData)
              .returning()
              .get();
            results.push(result as TSelect);
          }

          return results;
        },
        { retries: 3 },
      );
    } catch (error) {
      this.logError("createMany failed", error, { count: data.length });
      throw error;
    }
  }

  /**
   * Update a record by ID
   */
  public async update(
    id: string,
    data: Partial<TInsert>,
  ): Promise<TSelect | null> {
    try {
      return await this.databaseService.executeQuery((db: BetterSQLite3Database<typeof schema>) => {
        // Add update timestamp if it exists
        const updateData = this.addTimestamps(data as Partial<TInsert>, "update");
        const table = this.table as SQLiteTable & { id: AnyColumn };

        const result = db
          .update(table)
          .set(updateData)
          .where(eq(table.id, id))
          .returning()
          .get();

        return (result as TSelect | undefined) || null;
      }, `${this.getTableName()}.update`);
    } catch (error) {
      this.logError("update failed", error, { id, data });
      throw error;
    }
  }

  /**
   * Delete a record by ID
   */
  public async delete(id: string): Promise<boolean> {
    try {
      return await this.databaseService.executeQuery((db: BetterSQLite3Database<typeof schema>) => {
        const table = this.table as SQLiteTable & { id: AnyColumn };
        const result = db
          .delete(table)
          .where(eq(table.id, id))
          .returning()
          .get();

        return result !== undefined;
      }, `${this.getTableName()}.delete `);
    } catch (error) {
      this.logError("delete failed", error, { id });
      throw error;
    }
  }

  /**
   * Check if a record exists by ID
   */
  public async exists(id: string): Promise<boolean> {
    try {
      return await this.databaseService.executeQuery((db: BetterSQLite3Database<typeof schema>) => {
        const table = this.table as SQLiteTable & { id: AnyColumn };
        const result = db
          .select({ count: sqlCount() })
          .from(table)
          .where(eq(table.id, id))
          .get();

        return !!result && result.count > 0;
      }, `${this.getTableName()}.exists`);
    } catch (error) {
      this.logError("exists check failed", error, { id });
      return false;
    }
  }

  /**
   * Count records matching criteria
   */
  public async count(options?: FilterOptions): Promise<number> {
    try {
      return await this.databaseService.executeQuery((db: BetterSQLite3Database<typeof schema>) => {
        const table = this.table as SQLiteTable;
        let query = db.select({ count: sqlCount() }).from(table);

        if (options?.where) {
          query = query.where(options.where) as typeof query;
        }

        const result = query.get();
        return result?.count || 0;
      }, `${this.getTableName()}.count`);
    } catch (error) {
      this.logError("count failed", error, { options });
      return 0;
    }
  }

  /**
   * Execute a custom query within this repository's context
   */
  protected async executeCustomQuery<T>(
    operation: (db: BetterSQLite3Database<typeof schema>) => T,
    _context?: string,
  ): Promise<T> {
    return await this.databaseService.executeQuery(operation, _context);
  }

  /**
   * Execute a custom transaction within this repository's context
   */
  protected async executeCustomTransaction<T>(
    operations: (db: BetterSQLite3Database<typeof schema>) => T,
    _context?: string,
  ): Promise<T> {
    return await this.databaseService.executeTransaction(operations, {
      retries: 3,
    });
  }

  // ============================================================================
  // PROTECTED HELPER METHODS
  // ============================================================================

  protected getTableName(): string {
    return this.tableName;
  }

  protected extractTableName(table: unknown): string {
    // Fallback method to extract table name from Drizzle table object
    try {
      return (table as { _: { name: string } })._.name || "unknown";
    } catch {
      return "unknown";
    }
  }

  protected addTimestamps(data: TInsert | Partial<TInsert>, operation: "create" | "update"): TInsert {
    const now = new Date().toISOString();
    const tableAny = this.table as Record<string, unknown>; // Access the Drizzle table definition

    // Check for createdAt/updatedAt/id columns in the table definition using bracket notation
    const hasCreatedAt = tableAny['createdAt'] !== undefined;
    const hasUpdatedAt = tableAny['updatedAt'] !== undefined;
    const hasId = tableAny['id'] !== undefined;

    const result = { ...data } as Record<string, unknown>;

    if (operation === "create") {
      // Add createdAt if the field exists in the table and is not already set in data
      if (hasCreatedAt && !result['createdAt']) {
        result['createdAt'] = now;
      }
      // Add updatedAt if the field exists in the table and is not already set in data
      if (hasUpdatedAt && !result['updatedAt']) {
        result['updatedAt'] = now;
      }
      // Add ID if not present and this is a create operation
      if (hasId && !result['id']) {
        result['id'] = crypto.randomUUID();
      }
    } else if (operation === "update") {
      // Always update updatedAt if the field exists
      if (hasUpdatedAt) {
        result['updatedAt'] = now;
      }
    }

    return result as TInsert;
  }

  protected log(message: string, data?: unknown): void {
    if (this.options.enableLogging) {
      const timestamp = new Date().toISOString();
      logger.info(
        `[REPO:${this.getTableName()}] ${timestamp} - ${message} `,
        { data: data ? JSON.stringify(data) : undefined },
      );
    }
  }

  protected logError(message: string, error: unknown, data?: unknown): void {
    const timestamp = new Date().toISOString();
    logger.error(
      `[REPO:${this.getTableName()} ERROR] ${timestamp} - ${message} `,
      {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        ...(data as object),
      },
    );
  }
}

// ============================================================================
// HELPER FUNCTIONS FOR BUILDING QUERIES
// ============================================================================

/**
 * Build a WHERE clause for text search
 */
export function buildTextSearch(column: AnyColumn, searchTerm: string): SQL {
  return sql`${column} LIKE ${`%${searchTerm}%`} `;
}

/**
 * Build a WHERE clause for date range
 */
export function buildDateRange(
  column: AnyColumn,
  startDate?: string,
  endDate?: string,
): SQL | undefined {
  if (!startDate && !endDate) return undefined;

  if (startDate && endDate) {
    return and(sql`${column} >= ${startDate} `, sql`${column} <= ${endDate} `);
  } else if (startDate) {
    return sql`${column} >= ${startDate} `;
  } else {
    return sql`${column} <= ${endDate} `;
  }
}

/**
 * Build a WHERE clause for multiple values (IN clause)
 */
export function buildInClause(column: AnyColumn, values: unknown[]): SQL | undefined {
  if (!values || values.length === 0) return undefined;

  if (values.length === 1) {
    return eq(column, values[0]);
  }

  return sql`${column} IN ${values} `;
}

/**
 * Combine multiple WHERE conditions with AND
 */
export function combineConditions(
  ...conditions: (SQL | undefined)[]
): SQL | undefined {
  const validConditions = conditions.filter(Boolean) as SQL[];

  if (validConditions.length === 0) return undefined;
  if (validConditions.length === 1) return validConditions[0];

  return and(...validConditions);
}
