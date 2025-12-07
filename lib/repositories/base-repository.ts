import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { eq, and, desc, asc, count, SQL, sql } from "drizzle-orm";
import { DatabaseService } from "@/lib/database";
import * as schema from "@/lib/database/schema";

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected db: BetterSQLite3Database<typeof schema> | any;
  protected databaseService: DatabaseService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected table: any;
  protected options: RepositoryOptions;
  protected tableName: string;

  constructor(
    table: TTable,
    databaseService: DatabaseService,
    options: RepositoryOptions = {},
  ) {
    this.table = table;
    this.databaseService = databaseService;
    this.db = databaseService.getDb();
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
      return await this.databaseService.executeQuery((db) => {
        const result = db
          .select()
          .from(this.table)
          .where(eq(this.table.id, id))
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
      return await this.databaseService.executeQuery((db) => {
        let query = db.select().from(this.table);

        // Apply where clause
        if (options.where) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          query = (query as any).where(options.where);
        }

        // Apply ordering
        if (options.orderBy) {
          const direction = options.orderDirection === "desc" ? desc : asc;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const column = (this.table as any)[options.orderBy];
          if (column) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            query = (query as any).orderBy(direction(column));
          }
        }

        // Apply pagination
        const limit = Math.min(
          options.limit || this.options.defaultLimit!,
          this.options.maxLimit!,
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        query = (query as any).limit(limit);

        if (options.offset) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          query = (query as any).offset(options.offset);
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
      return await this.databaseService.executeQuery((db) => {
        // Get total count
        let countQuery = db.select({ count: count() }).from(this.table);
        if (options.where) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          countQuery = (countQuery as any).where(options.where);
        }
        const totalResult = countQuery.get();
        const total = totalResult?.count || 0;

        // Get data
        let dataQuery = db.select().from(this.table);

        if (options.where) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          dataQuery = (dataQuery as any).where(options.where);
        }

        if (options.orderBy) {
          const direction = options.orderDirection === "desc" ? desc : asc;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const column = (this.table as any)[options.orderBy];
          if (column) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            dataQuery = (dataQuery as any).orderBy(direction(column));
          }
        }

        const limit = Math.min(
          options.limit || this.options.defaultLimit!,
          this.options.maxLimit!,
        );
        const offset = options.offset || 0;



        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dataQuery = (dataQuery as any).limit(limit).offset(offset);
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
      return await this.databaseService.executeQuery((db) => {
        // Add timestamps if they exist
        const insertData = this.addTimestamps(data, "create");

        const result = db
          .insert(this.table)
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
        (db) => {
          const results: TSelect[] = [];

          for (const item of data) {
            const insertData = this.addTimestamps(item, "create");
            const result = db
              .insert(this.table)
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
      return await this.databaseService.executeQuery((db) => {
        // Add update timestamp if it exists
        const updateData = this.addTimestamps(data, "update");

        const result = db
          .update(this.table)
          .set(updateData)
          .where(eq(this.table.id, id))
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
      return await this.databaseService.executeQuery((db) => {
        const result = db
          .delete(this.table)
          .where(eq(this.table.id, id))
          .returning()
          .get();

        return result !== undefined;
      }, `${this.getTableName()}.delete`);
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
      return await this.databaseService.executeQuery((db) => {
        const result = db
          .select({ id: this.table.id })
          .from(this.table)
          .where(eq(this.table.id, id))
          .get();

        return result !== undefined;
      }, `${this.getTableName()}.exists`);
    } catch (error) {
      this.logError("exists failed", error, { id });
      throw error;
    }
  }

  /**
   * Count records with optional filtering
   */
  public async count(where?: SQL | undefined): Promise<number> {
    try {
      return await this.databaseService.executeQuery((db) => {
        let query = db.select({ count: count() }).from(this.table);

        if (where) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          query = (query as any).where(where);
        }

        const result = query.get();
        return result?.count || 0;
      }, `${this.getTableName()}.count`);
    } catch (error) {
      this.logError("count failed", error, { where });
      throw error;
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (table as any)._.name || "unknown";
    } catch {
      return "unknown";
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected addTimestamps(data: any, operation: "create" | "update"): any {
    const now = new Date().toISOString();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = { ...data } as any;

    if (operation === "create") {
      // Add createdAt if the field exists and is not already set
      if ("createdAt" in this.table && !result.createdAt) {
        result.createdAt = now;
      }
      // Add updatedAt if the field exists and is not already set
      if ("updatedAt" in this.table && !result.updatedAt) {
        result.updatedAt = now;
      }
    } else if (operation === "update") {
      // Always update updatedAt if the field exists
      if ("updatedAt" in this.table) {
        result.updatedAt = now;
      }
    }

    // Add ID if not present and this is a create operation
    if (operation === "create" && "id" in this.table && !result.id) {
      result.id = crypto.randomUUID();
    }

    return result;
  }

  protected log(message: string, data?: unknown): void {
    if (this.options.enableLogging) {
      const timestamp = new Date().toISOString();
      // eslint-disable-next-line no-console
      console.log(
        `[REPO:${this.getTableName()}] ${timestamp} - ${message}`,
        data ? JSON.stringify(data) : "",
      );
    }
  }

  protected logError(message: string, error: unknown, data?: unknown): void {
    const timestamp = new Date().toISOString();
    // eslint-disable-next-line no-console
    console.error(
      `[REPO:${this.getTableName()} ERROR] ${timestamp} - ${message}`,
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildTextSearch(column: any, searchTerm: string): SQL {
  return sql`${column} LIKE ${`%${searchTerm}%`}`;
}

/**
 * Build a WHERE clause for date range
 */
export function buildDateRange(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  column: any,
  startDate?: string,
  endDate?: string,
): SQL | undefined {
  if (!startDate && !endDate) return undefined;

  if (startDate && endDate) {
    return and(sql`${column} >= ${startDate}`, sql`${column} <= ${endDate}`);
  } else if (startDate) {
    return sql`${column} >= ${startDate}`;
  } else {
    return sql`${column} <= ${endDate}`;
  }
}

/**
 * Build a WHERE clause for multiple values (IN clause)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildInClause(column: any, values: unknown[]): SQL | undefined {
  if (!values || values.length === 0) return undefined;

  if (values.length === 1) {
    return eq(column, values[0]);
  }

  return sql`${column} IN ${values}`;
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
