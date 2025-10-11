import "server-only";
import { sql } from "drizzle-orm";
import { DatabaseService } from "./database-service";

// ============================================================================
// DATABASE PERFORMANCE MONITORING
// ============================================================================

export interface DatabaseMetrics {
  connectionStats: {
    activeConnections: number;
    totalConnections: number;
    averageResponseTime: number;
    errorRate: number;
  };
  queryStats: {
    totalQueries: number;
    slowQueries: number;
    averageQueryTime: number;
    queriesPerSecond: number;
  };
  tableStats: {
    tableName: string;
    rowCount: number;
    sizeKB: number;
    indexCount: number;
  }[];
  indexStats: {
    indexName: string;
    tableName: string;
    unique: boolean;
    columns: string[];
  }[];
  performanceAlerts: PerformanceAlert[];
}

export interface PerformanceAlert {
  type:
    | "slow_query"
    | "high_error_rate"
    | "connection_limit"
    | "large_table"
    | "missing_index";
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  details: any;
  timestamp: string;
}

export interface QueryExecutionPlan {
  queryId: string;
  sql: string;
  executionTime: number;
  rowsExamined: number;
  rowsReturned: number;
  indexesUsed: string[];
  plan: any;
  timestamp: string;
}

/**
 * Database Performance Monitor
 *
 * Monitors database performance and provides insights for optimization
 */
export class DatabasePerformanceMonitor {
  private databaseService: DatabaseService;
  private queryExecutionHistory: Map<string, QueryExecutionPlan> = new Map();
  private performanceAlerts: PerformanceAlert[] = [];
  private monitoringStartTime: number = Date.now();

  constructor(databaseService: DatabaseService) {
    this.databaseService = databaseService;
  }

  /**
   * Get comprehensive database metrics
   */
  public async getDatabaseMetrics(): Promise<DatabaseMetrics> {
    try {
      const [connectionStats, queryStats, tableStats, indexStats] =
        await Promise.all([
          this.getConnectionStats(),
          this.getQueryStats(),
          this.getTableStats(),
          this.getIndexStats(),
        ]);

      // Generate performance alerts
      const performanceAlerts = this.generatePerformanceAlerts(
        connectionStats,
        queryStats,
        tableStats,
      );

      return {
        connectionStats,
        queryStats,
        tableStats,
        indexStats,
        performanceAlerts,
      };
    } catch (error) {
      console.error("Error getting database metrics:", error);
      throw error;
    }
  }

  /**
   * Monitor query execution and record performance data
   */
  public recordQueryExecution(
    queryId: string,
    sql: string,
    executionTime: number,
    rowsExamined: number = 0,
    rowsReturned: number = 0,
    indexesUsed: string[] = [],
  ): void {
    const plan: QueryExecutionPlan = {
      queryId,
      sql,
      executionTime,
      rowsExamined,
      rowsReturned,
      indexesUsed,
      plan: null, // Would be populated with actual query plan
      timestamp: new Date().toISOString(),
    };

    this.queryExecutionHistory.set(queryId, plan);

    // Keep only the last 1000 queries to prevent memory leaks
    if (this.queryExecutionHistory.size > 1000) {
      const oldestKey = this.queryExecutionHistory.keys().next().value;
      if (oldestKey !== undefined) {
        this.queryExecutionHistory.delete(oldestKey);
      }
    }

    // Check for performance issues
    this.checkQueryPerformance(plan);
  }

  /**
   * Get slow queries analysis
   */
  public getSlowQueriesAnalysis(): {
    slowQueries: QueryExecutionPlan[];
    averageSlowQueryTime: number;
    slowQueryPatterns: Array<{
      pattern: string;
      count: number;
      avgTime: number;
    }>;
  } {
    const slowQueries = Array.from(this.queryExecutionHistory.values())
      .filter((query) => query.executionTime > 1000) // Queries slower than 1 second
      .sort((a, b) => b.executionTime - a.executionTime);

    const averageSlowQueryTime =
      slowQueries.length > 0
        ? slowQueries.reduce((sum, query) => sum + query.executionTime, 0) /
          slowQueries.length
        : 0;

    // Analyze patterns in slow queries
    const patternMap = new Map<string, { count: number; totalTime: number }>();

    slowQueries.forEach((query) => {
      // Extract query pattern (simplified)
      const pattern = this.extractQueryPattern(query.sql);
      const existing = patternMap.get(pattern) || { count: 0, totalTime: 0 };
      patternMap.set(pattern, {
        count: existing.count + 1,
        totalTime: existing.totalTime + query.executionTime,
      });
    });

    const slowQueryPatterns = Array.from(patternMap.entries())
      .map(([pattern, stats]) => ({
        pattern,
        count: stats.count,
        avgTime: stats.totalTime / stats.count,
      }))
      .sort((a, b) => b.avgTime - a.avgTime);

    return {
      slowQueries: slowQueries.slice(0, 20), // Return top 20 slowest
      averageSlowQueryTime,
      slowQueryPatterns,
    };
  }

  /**
   * Get database health score (0-100)
   */
  public async getDatabaseHealthScore(): Promise<{
    score: number;
    factors: Array<{
      name: string;
      score: number;
      weight: number;
      details: string;
    }>;
  }> {
    const metrics = await this.getDatabaseMetrics();
    const factors = [];

    // Connection health (20% weight)
    const connectionScore = this.calculateConnectionScore(
      metrics.connectionStats,
    );
    factors.push({
      name: "Connection Health",
      score: connectionScore,
      weight: 0.2,
      details: `Error rate: ${(metrics.connectionStats.errorRate * 100).toFixed(2)}%, Avg response: ${metrics.connectionStats.averageResponseTime.toFixed(2)}ms`,
    });

    // Query performance (30% weight)
    const queryScore = this.calculateQueryScore(metrics.queryStats);
    factors.push({
      name: "Query Performance",
      score: queryScore,
      weight: 0.3,
      details: `Avg query time: ${metrics.queryStats.averageQueryTime.toFixed(2)}ms, Slow queries: ${metrics.queryStats.slowQueries}`,
    });

    // Table optimization (25% weight)
    const tableScore = this.calculateTableScore(metrics.tableStats);
    factors.push({
      name: "Table Optimization",
      score: tableScore,
      weight: 0.25,
      details: `${metrics.tableStats.length} tables monitored`,
    });

    // Index efficiency (25% weight)
    const indexScore = this.calculateIndexScore(metrics.indexStats);
    factors.push({
      name: "Index Efficiency",
      score: indexScore,
      weight: 0.25,
      details: `${metrics.indexStats.length} indexes available`,
    });

    // Calculate weighted score
    const totalScore = factors.reduce(
      (sum, factor) => sum + factor.score * factor.weight,
      0,
    );

    return {
      score: Math.round(totalScore),
      factors,
    };
  }

  /**
   * Get performance recommendations
   */
  public async getPerformanceRecommendations(): Promise<
    Array<{
      type: string;
      priority: "low" | "medium" | "high" | "critical";
      title: string;
      description: string;
      action: string;
    }>
  > {
    const recommendations = [];
    const metrics = await this.getDatabaseMetrics();
    const slowQueries = this.getSlowQueriesAnalysis();

    // Check for slow queries
    if (slowQueries.slowQueries.length > 0) {
      recommendations.push({
        type: "query_optimization",
        priority: "high" as const,
        title: "Optimize Slow Queries",
        description: `Found ${slowQueries.slowQueries.length} slow queries with average execution time of ${slowQueries.averageSlowQueryTime.toFixed(2)}ms`,
        action:
          "Review and optimize the slowest queries, consider adding indexes or rewriting queries",
      });
    }

    // Check for missing indexes
    const largeTablesWithoutIndexes = metrics.tableStats.filter(
      (table) => table.rowCount > 1000 && table.indexCount < 2,
    );

    if (largeTablesWithoutIndexes.length > 0) {
      recommendations.push({
        type: "indexing",
        priority: "medium" as const,
        title: "Add Indexes to Large Tables",
        description: `Tables ${largeTablesWithoutIndexes.map((t) => t.tableName).join(", ")} have many rows but few indexes`,
        action: "Consider adding indexes on frequently queried columns",
      });
    }

    // Check error rate
    if (metrics.connectionStats.errorRate > 0.05) {
      // 5% error rate
      recommendations.push({
        type: "error_handling",
        priority: "critical" as const,
        title: "High Error Rate Detected",
        description: `Database error rate is ${(metrics.connectionStats.errorRate * 100).toFixed(2)}%`,
        action: "Investigate and fix the root cause of database errors",
      });
    }

    // Check response time
    if (metrics.connectionStats.averageResponseTime > 500) {
      recommendations.push({
        type: "performance",
        priority: "medium" as const,
        title: "High Response Time",
        description: `Average response time is ${metrics.connectionStats.averageResponseTime.toFixed(2)}ms`,
        action: "Optimize queries, add indexes, or consider connection pooling",
      });
    }

    return recommendations;
  }

  /**
   * Clear monitoring data
   */
  public clearMonitoringData(): void {
    this.queryExecutionHistory.clear();
    this.performanceAlerts = [];
    this.monitoringStartTime = Date.now();
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async getConnectionStats(): Promise<
    DatabaseMetrics["connectionStats"]
  > {
    const stats = this.databaseService.getConnectionStats();
    return {
      activeConnections: stats.activeConnections,
      totalConnections: stats.totalConnections,
      averageResponseTime: stats.averageResponseTime,
      errorRate: stats.errorRate,
    };
  }

  private async getQueryStats(): Promise<DatabaseMetrics["queryStats"]> {
    const queries = Array.from(this.queryExecutionHistory.values());
    const slowQueries = queries.filter((q) => q.executionTime > 1000);
    const totalTime = queries.reduce((sum, q) => sum + q.executionTime, 0);
    const averageQueryTime =
      queries.length > 0 ? totalTime / queries.length : 0;

    const timeWindow = Date.now() - this.monitoringStartTime;
    const queriesPerSecond =
      timeWindow > 0 ? queries.length / (timeWindow / 1000) : 0;

    return {
      totalQueries: queries.length,
      slowQueries: slowQueries.length,
      averageQueryTime,
      queriesPerSecond,
    };
  }

  private async getTableStats(): Promise<DatabaseMetrics["tableStats"]> {
    try {
      const tables = await this.databaseService.executeQuery(
        (db) =>
          db.all(
            sql.raw(`
          SELECT 
            name as tableName,
            0 as rowCount,
            0 as sizeKB
          FROM sqlite_master 
          WHERE type = 'table' 
          AND name NOT LIKE 'sqlite_%'
          ORDER BY name
        `),
          ),
        "getTableStats",
      );

      const tableStats = [];

      for (const table of tables as any[]) {
        try {
          // Get row count
          const countResult = await this.databaseService.executeQuery(
            (db) =>
              db.get(
                sql.raw(`SELECT COUNT(*) as count FROM ${table.tableName}`),
              ),
            `getRowCount_${table.tableName}`,
          );

          // Get index count
          const indexResult = await this.databaseService.executeQuery(
            (db) =>
              db.all(
                sql.raw(`
              SELECT COUNT(*) as count 
              FROM sqlite_master 
              WHERE type = 'index' 
              AND tbl_name = '${table.tableName}'
              AND name NOT LIKE 'sqlite_%'
            `),
              ),
            `getIndexCount_${table.tableName}`,
          );

          tableStats.push({
            tableName: table.tableName,
            rowCount: (countResult as any)?.count || 0,
            sizeKB: 0, // SQLite doesn't provide easy size calculation
            indexCount: (indexResult as any[])?.[0]?.count || 0,
          });
        } catch (error) {
          console.warn(
            `Error getting stats for table ${table.tableName}:`,
            error,
          );
          tableStats.push({
            tableName: table.tableName,
            rowCount: 0,
            sizeKB: 0,
            indexCount: 0,
          });
        }
      }

      return tableStats;
    } catch (error) {
      console.error("Error getting table stats:", error);
      return [];
    }
  }

  private async getIndexStats(): Promise<DatabaseMetrics["indexStats"]> {
    try {
      const indexes = await this.databaseService.executeQuery(
        (db) =>
          db.all(
            sql.raw(`
          SELECT 
            name as indexName,
            tbl_name as tableName,
            sql,
            "unique" as isUnique
          FROM sqlite_master 
          WHERE type = 'index' 
          AND name NOT LIKE 'sqlite_%'
          ORDER BY tbl_name, name
        `),
          ),
        "getIndexStats",
      );

      return (indexes as any[]).map((index) => ({
        indexName: index.indexName,
        tableName: index.tableName,
        unique: index.isUnique === 1,
        columns: this.extractColumnsFromIndexSQL(index.sql || ""),
      }));
    } catch (error) {
      console.error("Error getting index stats:", error);
      return [];
    }
  }

  private generatePerformanceAlerts(
    connectionStats: DatabaseMetrics["connectionStats"],
    queryStats: DatabaseMetrics["queryStats"],
    tableStats: DatabaseMetrics["tableStats"],
  ): PerformanceAlert[] {
    const alerts: PerformanceAlert[] = [];

    // High error rate alert
    if (connectionStats.errorRate > 0.1) {
      alerts.push({
        type: "high_error_rate",
        severity: "critical",
        message: `High database error rate: ${(connectionStats.errorRate * 100).toFixed(2)}%`,
        details: { errorRate: connectionStats.errorRate },
        timestamp: new Date().toISOString(),
      });
    }

    // Slow query alert
    if (queryStats.slowQueries > 0) {
      alerts.push({
        type: "slow_query",
        severity: queryStats.slowQueries > 10 ? "high" : "medium",
        message: `${queryStats.slowQueries} slow queries detected`,
        details: {
          slowQueries: queryStats.slowQueries,
          averageQueryTime: queryStats.averageQueryTime,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Large table without indexes alert
    const largeTablesNoIndexes = tableStats.filter(
      (table) => table.rowCount > 5000 && table.indexCount < 2,
    );

    if (largeTablesNoIndexes.length > 0) {
      alerts.push({
        type: "missing_index",
        severity: "medium",
        message: `Large tables without sufficient indexes: ${largeTablesNoIndexes.map((t) => t.tableName).join(", ")}`,
        details: { tables: largeTablesNoIndexes },
        timestamp: new Date().toISOString(),
      });
    }

    return alerts;
  }

  private checkQueryPerformance(plan: QueryExecutionPlan): void {
    // Alert for very slow queries
    if (plan.executionTime > 5000) {
      // 5 seconds
      this.performanceAlerts.push({
        type: "slow_query",
        severity: "critical",
        message: `Very slow query detected: ${plan.executionTime}ms`,
        details: { queryId: plan.queryId, executionTime: plan.executionTime },
        timestamp: new Date().toISOString(),
      });
    }
  }

  private extractQueryPattern(sql: string): string {
    // Simplified pattern extraction - replace values with placeholders
    return sql
      .replace(/\b\d+\b/g, "?")
      .replace(/'[^']*'/g, "?")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 100);
  }

  private extractColumnsFromIndexSQL(sql: string): string[] {
    // Extract column names from CREATE INDEX SQL
    const match = sql.match(/\(([^)]+)\)/);
    if (match && match[1]) {
      return match[1].split(",").map((col) => col.trim().replace(/["`]/g, ""));
    }
    return [];
  }

  private calculateConnectionScore(
    stats: DatabaseMetrics["connectionStats"],
  ): number {
    let score = 100;

    // Penalize high error rate
    score -= stats.errorRate * 1000; // 10% error rate = -100 points

    // Penalize high response time
    if (stats.averageResponseTime > 100) {
      score -= Math.min((stats.averageResponseTime - 100) / 10, 50);
    }

    return Math.max(0, Math.min(100, score));
  }

  private calculateQueryScore(stats: DatabaseMetrics["queryStats"]): number {
    let score = 100;

    // Penalize slow queries
    if (stats.totalQueries > 0) {
      const slowQueryRatio = stats.slowQueries / stats.totalQueries;
      score -= slowQueryRatio * 100;
    }

    // Penalize high average query time
    if (stats.averageQueryTime > 100) {
      score -= Math.min((stats.averageQueryTime - 100) / 20, 50);
    }

    return Math.max(0, Math.min(100, score));
  }

  private calculateTableScore(
    tableStats: DatabaseMetrics["tableStats"],
  ): number {
    if (tableStats.length === 0) return 100;

    let totalScore = 0;

    for (const table of tableStats) {
      let tableScore = 100;

      // Penalize large tables without indexes
      if (table.rowCount > 1000 && table.indexCount < 2) {
        tableScore -= 30;
      }

      // Penalize very large tables
      if (table.rowCount > 100000) {
        tableScore -= 20;
      }

      totalScore += tableScore;
    }

    return totalScore / tableStats.length;
  }

  private calculateIndexScore(
    indexStats: DatabaseMetrics["indexStats"],
  ): number {
    // Simple scoring based on number of indexes
    // In practice, this would be more sophisticated
    return Math.min(100, indexStats.length * 10);
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create a database performance monitor instance
 */
export function createDatabasePerformanceMonitor(
  databaseService: DatabaseService,
): DatabasePerformanceMonitor {
  return new DatabasePerformanceMonitor(databaseService);
}

// Export singleton instance
export const databasePerformanceMonitor = createDatabasePerformanceMonitor(
  DatabaseService.getInstance(),
);
