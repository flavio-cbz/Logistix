import { logger } from '@/lib/utils/logging/logger';
import { PerformanceTimer } from '@/lib/utils/logging';

/**
 * EnhancedQueryLoggingService
 * Intercepte et logue les requêtes de base de données avec des détails enrichis,
 * y compris le temps d'exécution, le succès/échec, et les métadonnées contextuelles.
 */
class EnhancedQueryLoggingService {
  private static instance: EnhancedQueryLoggingService;

  public static getInstance(): EnhancedQueryLoggingService {
    if (!EnhancedQueryLoggingService.instance) {
      EnhancedQueryLoggingService.instance = new EnhancedQueryLoggingService();
    }
    return EnhancedQueryLoggingService.instance;
  }

  /**
   * Log a database query operation.
   * @param queryName A unique name for the query operation (e.g., "getUserById", "insertProduct").
   * @param operation The async function executing the database query.
   * @param sql The SQL query string.
   * @param params The parameters passed to the SQL query.
   * @param context Optional request context for linking logs.
   */
    async logQuery<T>(
    queryName: string,
    operation: () => Promise<T>,
    sql: string,
    params: unknown[] = [], // Changed from any[] to unknown[] with default
    context?: any // Changed from RequestContext to any as it's not found
  ): Promise<T> {
    const timer = new PerformanceTimer(`DB_QUERY_${queryName.toUpperCase()}`, logger);
    const sanitizedSql = sql.replace(/\s+/g, ' ').trim(); // Normaliser l'SQL pour le logging

    logger.info(`Executing DB query: ${queryName}`, {
      queryName,
      sql: sanitizedSql,
      paramsCount: params.length,
      userId: context?.userId,
      requestId: context?.requestId,
      sessionId: context?.sessionId,
    });

    try {
      const result = await operation();
      const duration = timer.end({
        queryName,
        success: true,
        sql: sanitizedSql,
        paramsCount: params.length,
        userId: context?.userId,
        requestId: context?.requestId,
        sessionId: context?.sessionId,
        resultType: typeof result,
      });

      logger.info(`DB query succeeded: ${queryName}`, {
        queryName,
        duration,
        success: true,
        userId: context?.userId,
        requestId: context?.requestId,
        sessionId: context?.sessionId,
      });
      return result;
    } catch (error: unknown) { // Changed from any to unknown
      const duration = Date.now() - (timer as any)['startTime']; // Access startTime directly if not exposed

      logger.error(`DB query failed: ${queryName}`, error instanceof Error ? error.message : String(error), { // Improved error handling
        queryName,
        duration,
        success: false,
        sql: sanitizedSql,
        paramsCount: params.length,
        userId: context?.userId,
        requestId: context?.requestId,
        sessionId: context?.sessionId,
        errorDetails: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : String(error), // Detailed error logging
      });

      timer.endWithError(error instanceof Error ? error : new Error(String(error)), { // Ensure Error object for timer
        queryName,
        userId: context?.userId,
        requestId: context?.requestId,
        sessionId: context?.sessionId,
      });

      throw error; // Re-throw the error after logging
    }
  }

  /**
   * Helper for Drizzle-specific query logging.
   * @param queryName
   * @param operation
   * @param sql
   * @param params
   * @param context
   */
  async logDrizzleQuery<T>(
    queryName: string,
    operation: () => Promise<T>,
    sql: string,
    params: unknown[] = [], // Changed from any[] to unknown[]
    context?: any // Changed from RequestContext to any as it's not found
  ): Promise<T> {
    return this.logQuery(queryName, operation, sql, params, context);
  }

  // Potentiellement d'autres méthodes de logging spécifiques à des ORM ou des types de requêtes
}

export const enhancedQueryLoggingService = EnhancedQueryLoggingService.getInstance();