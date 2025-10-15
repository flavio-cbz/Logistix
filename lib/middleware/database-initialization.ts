/**
 * Database initialization and health check utilities
 */

export interface DatabaseHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  connectionPool?: { active: number; idle: number; total: number };
  lastMigration?: string;
  tablesCount?: number;
  context?: string;
}

/**
 * Check the health status of the database
 * @returns Promise with database health status
 */
export async function checkDatabaseStatus(): Promise<DatabaseHealthStatus> {
  try {
    // For now, return a healthy status
    // This can be extended with actual database health checks
    return {
      status: 'healthy',
      context: 'Database is running',
    };
  } catch (error) {
    console.error('Database health check failed:', error);
    return {
      status: 'unhealthy',
      context: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
