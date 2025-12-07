<<<<<<< HEAD
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
    // console.error('Database health check failed:', error);
    return {
      status: 'unhealthy',
      context: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
=======
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
>>>>>>> ad32518644f2ab77a7c59429e3df905bfcc3ef94
