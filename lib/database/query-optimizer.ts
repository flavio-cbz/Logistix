import "server-only";
import {
  sql,
  SQL,
  and,
  eq,
  like,
  gte,
  lte,
  desc,
  asc,
  count,
} from "drizzle-orm";
import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { DatabaseService } from "./database-service";

// ============================================================================
// QUERY OPTIMIZATION UTILITIES
// ============================================================================

export interface QueryPerformanceMetrics {
  queryId: string;
  operation: string;
  executionTime: number;
  rowsAffected: number;
  indexesUsed: string[];
  queryPlan: any;
  timestamp: string;
}

export interface OptimizedQueryOptions {
  enableProfiling?: boolean;
  enableExplain?: boolean;
  cacheKey?: string;
  timeout?: number;
}

export interface SearchFilters {
  userId?: string;
  status?: string | string[];
  category?: string;
  brand?: string;
  condition?: string;
  priceMin?: number;
  priceMax?: number;
  dateFrom?: string;
  dateTo?: string;
  searchTerm?: string;
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: "asc" | "desc";
}

/**
 * Query Optimizer Service
 *
 * Provides optimized database queries with:
 * - Performance monitoring and profiling
 * - Query plan analysis
 * - Index usage optimization
 * - Common query patterns
 */
export class QueryOptimizer {
  private databaseService: DatabaseService;
  private performanceMetrics: Map<string, QueryPerformanceMetrics> = new Map();
  private queryCache: Map<
    string,
    { data: any; timestamp: number; ttl: number }
  > = new Map();

  constructor(databaseService: DatabaseService) {
    this.databaseService = databaseService;
  }

  /**
   * Execute an optimized query with performance monitoring
   */
  public async executeOptimizedQuery<T>(
    operation: (db: BetterSQLite3Database<typeof schema>) => T,
    operationName: string,
    options: OptimizedQueryOptions = {},
  ): Promise<T> {
    const queryId = this.generateQueryId(operationName);
    const startTime = Date.now();

    try {
      // Check cache first if cache key is provided
      if (options.cacheKey) {
        const cached = this.getFromCache(options.cacheKey);
        if (cached) {
          this.logPerformance(queryId, operationName, 0, 0, [], null, true);
          return cached;
        }
      }

      // Execute query with profiling if enabled
      let queryPlan: any = null;

      if (options.enableExplain) {
        // Get query plan for analysis (SQLite specific)
        queryPlan = await this.getQueryPlan(operation);
      }

      const result = await this.databaseService.executeQuery(
        operation,
        operationName,
      );

      const executionTime = Date.now() - startTime;

      // Store performance metrics
      if (options.enableProfiling) {
        this.recordPerformanceMetrics(
          queryId,
          operationName,
          executionTime,
          0,
          [],
          queryPlan,
        );
      }

      // Cache result if cache key is provided
      if (options.cacheKey && result) {
        this.setCache(options.cacheKey, result, 300000); // 5 minutes default TTL
      }

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logError(queryId, operationName, executionTime, error);
      throw error;
    }
  }

  /**
   * Optimized product search with multiple filters
   */
  public async searchProducts(filters: SearchFilters): Promise<{
    products: any[];
    total: number;
    metrics?: QueryPerformanceMetrics;
  }> {
    return await this.executeOptimizedQuery(
      (db) => {
        // Build WHERE conditions efficiently
        const conditions: SQL[] = [];

        // User filter (always required for security)
        if (filters.userId) {
          conditions.push(eq(schema.products.userId, filters.userId));
        }

        // Status filter with index optimization
        if (filters.status) {
          if (Array.isArray(filters.status)) {
            conditions.push(
              sql`${schema.products.status} IN ${filters.status}`,
            );
          } else {
            // Type assertion pour forcer la compatibilité
            conditions.push(eq(schema.products.status, filters.status as any));
          }
        }

        // Category filter (indexed)
        if (filters.category) {
          conditions.push(eq(schema.products.category, filters.category));
        }

        // Brand filter (indexed)
        if (filters.brand) {
          conditions.push(eq(schema.products.brand, filters.brand));
        }

        // Price range filter (indexed)
        if (filters.priceMin !== undefined) {
          conditions.push(gte(schema.products.price, filters.priceMin));
        }
        if (filters.priceMax !== undefined) {
          conditions.push(lte(schema.products.price, filters.priceMax));
        }

        // Date range filter (indexed)
        if (filters.dateFrom) {
          conditions.push(gte(schema.products.createdAt, filters.dateFrom));
        }
        if (filters.dateTo) {
          conditions.push(lte(schema.products.createdAt, filters.dateTo));
        }

        // Text search (optimized with LIKE)
        if (filters.searchTerm) {
          const searchPattern = `%${filters.searchTerm}%`;
          conditions.push(like(schema.products.name, searchPattern));
        }

        // Combine all conditions
        const whereClause =
          conditions.length > 0 ? and(...conditions) : undefined;

        // Get total count for pagination
        let countQuery = db.select({ count: count() }).from(schema.products);
        if (whereClause) {
          countQuery = countQuery.where(whereClause) as any;
        }
        const totalResult = countQuery.get();
        const total = totalResult?.count || 0;

        // Build main query with optimized ordering
        let query = db.select().from(schema.products);

        if (whereClause) {
          query = query.where(whereClause) as any;
        }

        // Optimized ordering (use indexed columns when possible)
        const orderBy = filters.orderBy || "createdAt";
        const direction = filters.orderDirection === "asc" ? asc : desc;

        switch (orderBy) {
          case "price":
            query = query.orderBy(direction(schema.products.price)) as any;
            break;
          case "status":
            query = query.orderBy(direction(schema.products.status)) as any;
            break;
          case "brand":
            query = query.orderBy(direction(schema.products.brand)) as any;
            break;
          case "updatedAt":
            query = query.orderBy(direction(schema.products.updatedAt)) as any;
            break;
          default:
            query = query.orderBy(direction(schema.products.createdAt)) as any;
        }

        // Apply pagination
        const limit = Math.min(filters.limit || 50, 1000);
        const offset = filters.offset || 0;

        query = query.limit(limit).offset(offset) as any;

        const products = query.all();

        return { products, total };
      },
      "searchProducts",
      {
        enableProfiling: true,
        cacheKey: this.generateCacheKey("products", filters),
      },
    );
  }

  /**
   * Optimized parcelle search with filters
   */
  public async searchParcelles(filters: SearchFilters): Promise<{
    parcelles: any[];
    total: number;
    metrics?: QueryPerformanceMetrics;
  }> {
    return await this.executeOptimizedQuery(
      (db) => {
        const conditions: SQL[] = [];

        // User filter (always required)
        if (filters.userId) {
          conditions.push(eq(schema.parcelles.userId, filters.userId));
        }

        // Search by numero or transporteur
        if (filters.searchTerm) {
          const searchPattern = `%${filters.searchTerm}%`;
          conditions.push(like(schema.parcelles.numero, searchPattern));
        }

        // Date range filter
        if (filters.dateFrom) {
          conditions.push(gte(schema.parcelles.createdAt, filters.dateFrom));
        }
        if (filters.dateTo) {
          conditions.push(lte(schema.parcelles.createdAt, filters.dateTo));
        }

        const whereClause =
          conditions.length > 0 ? and(...conditions) : undefined;

        // Get total count
        let countQuery = db.select({ count: count() }).from(schema.parcelles);
        if (whereClause) {
          countQuery = countQuery.where(whereClause) as any;
        }
        const totalResult = countQuery.get();
        const total = totalResult?.count || 0;

        // Main query
        let query = db.select().from(schema.parcelles);

        if (whereClause) {
          query = query.where(whereClause) as any;
        }

        // Ordering
        const orderBy = filters.orderBy || "createdAt";
        const direction = filters.orderDirection === "asc" ? asc : desc;

        switch (orderBy) {
          case "numero":
            query = query.orderBy(direction(schema.parcelles.numero)) as any;
            break;
          case "transporteur":
            query = query.orderBy(
              direction(schema.parcelles.transporteur),
            ) as any;
            break;
          default:
            query = query.orderBy(direction(schema.parcelles.createdAt)) as any;
        }

        // Pagination
        const limit = Math.min(filters.limit || 50, 1000);
        const offset = filters.offset || 0;

        query = query.limit(limit).offset(offset) as any;

        const parcelles = query.all();

        return { parcelles, total };
      },
      "searchParcelles",
      {
        enableProfiling: true,
        cacheKey: this.generateCacheKey("parcelles", filters),
      },
    );
  }

  /**
   * Get user statistics with optimized aggregation queries
   */
  public async getUserStatistics(userId: string): Promise<{
    totalProducts: number;
    soldProducts: number;
    totalRevenue: number;
    totalProfit: number;
    totalParcelles: number;
    averagePrice: number;
  }> {
    return await this.executeOptimizedQuery(
      (db) => {
        // Use a single query with subqueries for better performance
        const result = db.get(sql`
          SELECT 
            (SELECT COUNT(*) FROM products WHERE user_id = ${userId}) as totalProducts,
            (SELECT COUNT(*) FROM products WHERE user_id = ${userId} AND (status = 'sold' OR vendu = '1')) as soldProducts,
            (SELECT COALESCE(SUM(CASE WHEN selling_price IS NOT NULL THEN selling_price WHEN prix_vente IS NOT NULL THEN prix_vente ELSE 0 END), 0) 
             FROM products WHERE user_id = ${userId} AND (status = 'sold' OR vendu = '1')) as totalRevenue,
            (SELECT COALESCE(SUM(CASE 
               WHEN selling_price IS NOT NULL AND price IS NOT NULL THEN selling_price - price 
               WHEN prix_vente IS NOT NULL AND price IS NOT NULL THEN prix_vente - price 
               ELSE 0 
             END), 0) 
             FROM products WHERE user_id = ${userId} AND (status = 'sold' OR vendu = '1')) as totalProfit,
            (SELECT COUNT(*) FROM parcelles WHERE user_id = ${userId}) as totalParcelles,
            (SELECT COALESCE(AVG(price), 0) FROM products WHERE user_id = ${userId}) as averagePrice
        `) as any;

        return {
          totalProducts: result?.totalProducts || 0,
          soldProducts: result?.soldProducts || 0,
          totalRevenue: result?.totalRevenue || 0,
          totalProfit: result?.totalProfit || 0,
          totalParcelles: result?.totalParcelles || 0,
          averagePrice: result?.averagePrice || 0,
        };
      },
      "getUserStatistics",
      {
        enableProfiling: true,
        cacheKey: `user_stats_${userId}`,
      },
    );
  }

  /**
   * Get performance metrics for analysis
   */
  public getPerformanceMetrics(): QueryPerformanceMetrics[] {
    return Array.from(this.performanceMetrics.values());
  }

  /**
   * Clear performance metrics
   */
  public clearPerformanceMetrics(): void {
    this.performanceMetrics.clear();
  }

  /**
   * Get cache statistics
   */
  public getCacheStatistics(): {
    size: number;
    hitRate: number;
    entries: Array<{ key: string; timestamp: number; ttl: number }>;
  } {
    const entries = Array.from(this.queryCache.entries()).map(
      ([key, value]) => ({
        key,
        timestamp: value.timestamp,
        ttl: value.ttl,
      }),
    );

    return {
      size: this.queryCache.size,
      hitRate: 0, // TODO: Implement hit rate tracking
      entries,
    };
  }

  /**
   * Clear expired cache entries
   */
  public clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.queryCache.entries()) {
      if (now - value.timestamp > value.ttl) {
        this.queryCache.delete(key);
      }
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private generateQueryId(operation: string): string {
    return `${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCacheKey(entity: string, filters: SearchFilters): string {
    const filterString = JSON.stringify(filters);
    return `${entity}_${Buffer.from(filterString).toString("base64")}`;
  }

  private async getQueryPlan(_operation: (db: any) => any): Promise<any> {
    try {
      // This is a simplified version - in practice, you'd need to extract the SQL
      // and run EXPLAIN QUERY PLAN on it
      return { plan: "Query plan analysis not implemented yet" };
    } catch (error) {
      return { error: "Failed to get query plan" };
    }
  }

  private recordPerformanceMetrics(
    queryId: string,
    operation: string,
    executionTime: number,
    rowsAffected: number,
    indexesUsed: string[],
    queryPlan: any,
  ): void {
    const metrics: QueryPerformanceMetrics = {
      queryId,
      operation,
      executionTime,
      rowsAffected,
      indexesUsed,
      queryPlan,
      timestamp: new Date().toISOString(),
    };

    this.performanceMetrics.set(queryId, metrics);

    // Keep only the last 1000 metrics to prevent memory leaks
    if (this.performanceMetrics.size > 1000) {
      const oldestKey = this.performanceMetrics.keys().next().value;
      if (oldestKey !== undefined) {
        this.performanceMetrics.delete(oldestKey);
      }
    }
  }

  private logPerformance(
    queryId: string,
    operation: string,
    executionTime: number,
    rowsAffected: number,
    indexesUsed: string[],
    queryPlan: any,
    fromCache: boolean = false,
  ): void {
    console.log(`[QUERY OPTIMIZER] ${operation} - ${executionTime}ms`, {
      queryId,
      rowsAffected,
      indexesUsed,
      fromCache,
      queryPlan: queryPlan ? "Available" : "Not available",
    });
  }

  private logError(
    queryId: string,
    operation: string,
    executionTime: number,
    error: any,
  ): void {
    console.error(`[QUERY OPTIMIZER ERROR] ${operation} - ${executionTime}ms`, {
      queryId,
      error: error.message,
      stack: error.stack,
    });
  }

  private getFromCache(key: string): any | null {
    const cached = this.queryCache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      this.queryCache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCache(key: string, data: any, ttl: number): void {
    this.queryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });

    // Limit cache size to prevent memory issues
    if (this.queryCache.size > 500) {
      const oldestKey = this.queryCache.keys().next().value;
      if (oldestKey !== undefined) {
        this.queryCache.delete(oldestKey);
      }
    }
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create a query optimizer instance
 */
export function createQueryOptimizer(
  databaseService: DatabaseService,
): QueryOptimizer {
  return new QueryOptimizer(databaseService);
}

/**
 * Build optimized WHERE conditions for common patterns
 */
export function buildOptimizedConditions(
  filters: SearchFilters,
): SQL | undefined {
  const conditions: SQL[] = [];

  if (filters.userId) {
    conditions.push(eq(schema.products.userId, filters.userId));
  }

  if (filters.status) {
    if (Array.isArray(filters.status)) {
      conditions.push(sql`status IN ${filters.status}`);
    } else {
      conditions.push(eq(schema.products.status, filters.status as any));
    }
  }

  if (filters.searchTerm) {
    const searchPattern = `%${filters.searchTerm}%`;
    conditions.push(like(schema.products.name, searchPattern));
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

// Export singleton instance
export const queryOptimizer = createQueryOptimizer(
  DatabaseService.getInstance(),
);
