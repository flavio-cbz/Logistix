import "server-only";
import { sql } from "drizzle-orm";
import { DatabaseService } from "./database-service";

// ============================================================================
// PERFORMANCE INDEXES
// ============================================================================
// Additional indexes for optimizing common query patterns

export interface IndexCreationResult {
  indexName: string;
  created: boolean;
  error?: string;
  executionTime: number;
}

/**
 * Performance Index Manager
 *
 * Creates and manages additional database indexes for optimal query performance
 */
export class PerformanceIndexManager {
  private databaseService: DatabaseService;

  constructor(databaseService: DatabaseService) {
    this.databaseService = databaseService;
  }

  /**
   * Create all performance indexes
   */
  public async createAllIndexes(): Promise<IndexCreationResult[]> {
    const results: IndexCreationResult[] = [];

    // Product performance indexes
    results.push(...(await this.createProductIndexes()));

    // Parcelle performance indexes
    results.push(...(await this.createParcelleIndexes()));

    // User performance indexes
    results.push(...(await this.createUserIndexes()));

    // Market analysis performance indexes
    results.push(...(await this.createMarketAnalysisIndexes()));

    return results;
  }

  /**
   * Create product-specific performance indexes
   */
  private async createProductIndexes(): Promise<IndexCreationResult[]> {
    const indexes = [
      // Composite index for user + status queries (most common)
      {
        name: "idx_products_user_status_created",
        sql: `CREATE INDEX IF NOT EXISTS idx_products_user_status_created 
              ON products(user_id, status, created_at DESC)`,
      },

      // Composite index for user + sold status + price (for statistics)
      {
        name: "idx_products_user_sold_price",
        sql: `CREATE INDEX IF NOT EXISTS idx_products_user_sold_price 
              ON products(user_id, vendu, price) WHERE vendu = '1'`,
      },

      // Composite index for search queries
      {
        name: "idx_products_search_composite",
        sql: `CREATE INDEX IF NOT EXISTS idx_products_search_composite 
              ON products(user_id, category, brand, condition, price)`,
      },

      // Index for price range queries
      {
        name: "idx_products_price_range",
        sql: `CREATE INDEX IF NOT EXISTS idx_products_price_range 
              ON products(price, created_at DESC) WHERE price > 0`,
      },

      // Index for date-based queries
      {
        name: "idx_products_date_status",
        sql: `CREATE INDEX IF NOT EXISTS idx_products_date_status 
              ON products(created_at DESC, status, user_id)`,
      },

      // Index for external ID lookups
      {
        name: "idx_products_external_ids",
        sql: `CREATE INDEX IF NOT EXISTS idx_products_external_ids 
              ON products(vinted_item_id, external_id) WHERE vinted_item_id IS NOT NULL OR external_id IS NOT NULL`,
      },

      // Full-text search optimization (SQLite FTS would be better, but this helps with LIKE queries)
      {
        name: "idx_products_text_search",
        sql: `CREATE INDEX IF NOT EXISTS idx_products_text_search 
              ON products(name COLLATE NOCASE, brand COLLATE NOCASE)`,
      },

      // Index for parcelle relationships
      {
        name: "idx_products_parcelle_user",
        sql: `CREATE INDEX IF NOT EXISTS idx_products_parcelle_user 
              ON products(parcelle_id, user_id) WHERE parcelle_id IS NOT NULL`,
      },
    ];

    return await this.createIndexes(indexes);
  }

  /**
   * Create parcelle-specific performance indexes
   */
  private async createParcelleIndexes(): Promise<IndexCreationResult[]> {
    const indexes = [
      // Composite index for user + date queries
      {
        name: "idx_parcelles_user_date",
        sql: `CREATE INDEX IF NOT EXISTS idx_parcelles_user_date 
              ON parcelles(user_id, created_at DESC)`,
      },

      // Index for numero searches (case-insensitive)
      {
        name: "idx_parcelles_numero_search",
        sql: `CREATE INDEX IF NOT EXISTS idx_parcelles_numero_search 
              ON parcelles(numero COLLATE NOCASE, user_id)`,
      },

      // Index for transporteur searches
      {
        name: "idx_parcelles_transporteur_search",
        sql: `CREATE INDEX IF NOT EXISTS idx_parcelles_transporteur_search 
              ON parcelles(transporteur COLLATE NOCASE, user_id)`,
      },

      // Index for price calculations
      {
        name: "idx_parcelles_price_calculations",
        sql: `CREATE INDEX IF NOT EXISTS idx_parcelles_price_calculations 
              ON parcelles(user_id, prix_achat, poids, prix_total)`,
      },
    ];

    return await this.createIndexes(indexes);
  }

  /**
   * Create user-specific performance indexes
   */
  private async createUserIndexes(): Promise<IndexCreationResult[]> {
    const indexes = [
      // Index for login queries (username lookup)
      {
        name: "idx_users_username_active",
        sql: `CREATE INDEX IF NOT EXISTS idx_users_username_active 
              ON users(username COLLATE NOCASE) WHERE username IS NOT NULL`,
      },

      // Index for user activity tracking
      {
        name: "idx_users_activity",
        sql: `CREATE INDEX IF NOT EXISTS idx_users_activity 
              ON users(created_at DESC, updated_at DESC)`,
      },
    ];

    return await this.createIndexes(indexes);
  }

  /**
   * Create market analysis performance indexes
   */
  private async createMarketAnalysisIndexes(): Promise<IndexCreationResult[]> {
    const indexes = [
      // Index for user + status + date queries
      {
        name: "idx_market_analyses_user_status_date",
        sql: `CREATE INDEX IF NOT EXISTS idx_market_analyses_user_status_date 
              ON market_analyses(user_id, status, created_at DESC)`,
      },

      // Index for product name searches
      {
        name: "idx_market_analyses_product_search",
        sql: `CREATE INDEX IF NOT EXISTS idx_market_analyses_product_search 
              ON market_analyses(product_name COLLATE NOCASE, user_id)`,
      },

      // Index for expiration cleanup
      {
        name: "idx_market_analyses_expiration",
        sql: `CREATE INDEX IF NOT EXISTS idx_market_analyses_expiration 
              ON market_analyses(expires_at) WHERE expires_at IS NOT NULL`,
      },

      // Historical prices optimization
      {
        name: "idx_historical_prices_product_date_desc",
        sql: `CREATE INDEX IF NOT EXISTS idx_historical_prices_product_date_desc 
              ON historical_prices(product_name, date DESC, price)`,
      },

      // Similar sales cache optimization
      {
        name: "idx_similar_sales_hash_expires",
        sql: `CREATE INDEX IF NOT EXISTS idx_similar_sales_hash_expires 
              ON similar_sales(query_hash, expires_at DESC)`,
      },

      // User actions for analytics
      {
        name: "idx_user_actions_user_type_timestamp",
        sql: `CREATE INDEX IF NOT EXISTS idx_user_actions_user_type_timestamp 
              ON user_actions(user_id, action_type, timestamp DESC)`,
      },
    ];

    return await this.createIndexes(indexes);
  }

  /**
   * Analyze query performance and suggest optimizations
   */
  public async analyzeQueryPerformance(): Promise<{
    slowQueries: Array<{ query: string; avgTime: number; count: number }>;
    indexUsage: Array<{ indexName: string; usage: number }>;
    recommendations: string[];
  }> {
    try {
      // Get SQLite query statistics (if available)
      const slowQueries = await this.getSlowQueries();
      const indexUsage = await this.getIndexUsage();
      const recommendations = this.generateRecommendations(
        slowQueries,
        indexUsage,
      );

      return {
        slowQueries,
        indexUsage,
        recommendations,
      };
    } catch (error) {
      console.error("Error analyzing query performance:", error);
      return {
        slowQueries: [],
        indexUsage: [],
        recommendations: [
          "Unable to analyze performance - check database connection",
        ],
      };
    }
  }

  /**
   * Drop all performance indexes (for cleanup or recreation)
   */
  public async dropAllPerformanceIndexes(): Promise<IndexCreationResult[]> {
    const indexNames = [
      "idx_products_user_status_created",
      "idx_products_user_sold_price",
      "idx_products_search_composite",
      "idx_products_price_range",
      "idx_products_date_status",
      "idx_products_external_ids",
      "idx_products_text_search",
      "idx_products_parcelle_user",
      "idx_parcelles_user_date",
      "idx_parcelles_numero_search",
      "idx_parcelles_transporteur_search",
      "idx_parcelles_price_calculations",
      "idx_users_username_active",
      "idx_users_activity",
      "idx_market_analyses_user_status_date",
      "idx_market_analyses_product_search",
      "idx_market_analyses_expiration",
      "idx_historical_prices_product_date_desc",
      "idx_similar_sales_hash_expires",
      "idx_user_actions_user_type_timestamp",
    ];

    const results: IndexCreationResult[] = [];

    for (const indexName of indexNames) {
      const startTime = Date.now();
      try {
        await this.databaseService.executeQuery(
          (db) => db.run(sql.raw(`DROP INDEX IF EXISTS ${indexName}`)),
          `dropIndex_${indexName}`,
        );

        results.push({
          indexName,
          created: true,
          executionTime: Date.now() - startTime,
        });
      } catch (error: any) {
        results.push({
          indexName,
          created: false,
          error: error.message,
          executionTime: Date.now() - startTime,
        });
      }
    }

    return results;
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async createIndexes(
    indexes: Array<{ name: string; sql: string }>,
  ): Promise<IndexCreationResult[]> {
    const results: IndexCreationResult[] = [];

    for (const index of indexes) {
      const startTime = Date.now();
      try {
        await this.databaseService.executeQuery(
          (db) => db.run(sql.raw(index.sql)),
          `createIndex_${index.name}`,
        );

        results.push({
          indexName: index.name,
          created: true,
          executionTime: Date.now() - startTime,
        });

        console.log(
          `[PERFORMANCE INDEX] Created index: ${index.name} (${Date.now() - startTime}ms)`,
        );
      } catch (error: any) {
        results.push({
          indexName: index.name,
          created: false,
          error: error.message,
          executionTime: Date.now() - startTime,
        });

        console.error(
          `[PERFORMANCE INDEX ERROR] Failed to create index: ${index.name}`,
          error.message,
        );
      }
    }

    return results;
  }

  private async getSlowQueries(): Promise<
    Array<{ query: string; avgTime: number; count: number }>
  > {
    try {
      // SQLite doesn't have built-in slow query logging like MySQL/PostgreSQL
      // This would need to be implemented through application-level monitoring
      return [];
    } catch (error) {
      console.error("Error getting slow queries:", error);
      return [];
    }
  }

  private async getIndexUsage(): Promise<
    Array<{ indexName: string; usage: number }>
  > {
    try {
      // Get index information from SQLite
      const indexes = await this.databaseService.executeQuery(
        (db) =>
          db.all(
            sql.raw(`
          SELECT name, sql 
          FROM sqlite_master 
          WHERE type = 'index' 
          AND name NOT LIKE 'sqlite_%'
          ORDER BY name
        `),
          ),
        "getIndexUsage",
      );

      return (indexes as any[]).map((index) => ({
        indexName: index.name,
        usage: 0, // SQLite doesn't provide usage statistics directly
      }));
    } catch (error) {
      console.error("Error getting index usage:", error);
      return [];
    }
  }

  private generateRecommendations(
    slowQueries: Array<{ query: string; avgTime: number; count: number }>,
    indexUsage: Array<{ indexName: string; usage: number }>,
  ): string[] {
    const recommendations: string[] = [];

    // General recommendations
    recommendations.push("Consider using LIMIT clauses for large result sets");
    recommendations.push("Use indexed columns in WHERE clauses when possible");
    recommendations.push(
      "Avoid SELECT * queries - specify only needed columns",
    );

    // Slow query recommendations
    if (slowQueries.length > 0) {
      recommendations.push(
        `Found ${slowQueries.length} slow queries - consider optimization`,
      );
    }

    // Index usage recommendations
    const unusedIndexes = indexUsage.filter((idx) => idx.usage === 0);
    if (unusedIndexes.length > 0) {
      recommendations.push(
        `Consider dropping ${unusedIndexes.length} unused indexes`,
      );
    }

    return recommendations;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create a performance index manager instance
 */
export function createPerformanceIndexManager(
  databaseService: DatabaseService,
): PerformanceIndexManager {
  return new PerformanceIndexManager(databaseService);
}

/**
 * Initialize all performance indexes
 */
export async function initializePerformanceIndexes(
  databaseService: DatabaseService,
): Promise<IndexCreationResult[]> {
  const manager = new PerformanceIndexManager(databaseService);
  return await manager.createAllIndexes();
}

// Export singleton instance
export const performanceIndexManager = createPerformanceIndexManager(
  DatabaseService.getInstance(),
);
