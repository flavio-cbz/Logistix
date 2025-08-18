/**
 * Enhanced Database Query Logging
 * Comprehensive logging for all database operations with performance metrics
 */

import { 
  databaseLogger, 
  dbQueryLogger, 
  PerformanceTimer,
  createRequestLogger 
} from '../../utils/logging';
import { auditLogger } from '../audit-logger';
import { v4 as uuidv4 } from 'uuid';

interface QueryContext {
  operation: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  context?: string;
  metadata?: Record<string, any>;
}

interface QueryMetrics {
  duration: number;
  rowsAffected?: number;
  rowsReturned?: number;
  success: boolean;
  error?: Error;
}

interface TransactionContext extends QueryContext {
  transactionId: string;
  queries: QueryExecutionLog[];
}

interface QueryExecutionLog {
  query: string;
  params?: any[];
  duration: number;
  success: boolean;
  error?: string;
  timestamp: Date;
}

/**
 * Enhanced Database Query Logger
 */
export class EnhancedDatabaseQueryLogger {
  private static instance: EnhancedDatabaseQueryLogger;
  private activeTransactions = new Map<string, TransactionContext>();
  private recentQueryLogs: QueryExecutionLog[] = [];
  private readonly maxRecentQueryLogs = 200;

  public static getInstance(): EnhancedDatabaseQueryLogger {
    if (!EnhancedDatabaseQueryLogger.instance) {
      EnhancedDatabaseQueryLogger.instance = new EnhancedDatabaseQueryLogger();
    }
    return EnhancedDatabaseQueryLogger.instance;
  }

  /**
   * Log a database query with comprehensive metrics
   */
  async logQuery<T>(
    query: string,
    params: any[] = [],
    context: QueryContext,
    executor: () => T
  ): Promise<T> {
    const requestId = context.requestId || uuidv4();
    const logger = createRequestLogger(requestId, context.userId);
    const timer = new PerformanceTimer(`DB_QUERY_${context.operation}`, databaseLogger);

    // Sanitize query for logging (remove sensitive data)
    const sanitizedQuery = this.sanitizeQuery(query);
    const sanitizedParams = this.sanitizeParams(params);

    // Log query start

    try {
      // Execute the query
      const result = executor();
      
      // Calculate metrics
      const duration = timer.end({
        operation: context.operation,
        success: true,
        userId: context.userId,
        sessionId: context.sessionId,
        paramCount: params.length
      });

      const metrics: QueryMetrics = {
        duration,
        success: true,
        rowsReturned: Array.isArray(result) ? result.length : (result ? 1 : 0)
      };

      // Log successful query
      this.logQuerySuccess(query, sanitizedParams, metrics, context, logger);

      // Log to database query logger
     dbQueryLogger.logQuery(sanitizedQuery, sanitizedParams, duration, {
       operation: context.operation,
       userId: context.userId,
       sessionId: context.sessionId,
       requestId,
       ...context.metadata
     });

     // Ajout au stockage mémoire des requêtes récentes
     this.recentQueryLogs.push({
       query: sanitizedQuery,
       params: sanitizedParams,
       duration,
       success: true,
       timestamp: new Date()
     });
     if (this.recentQueryLogs.length > this.maxRecentQueryLogs) {
       this.recentQueryLogs.shift();
     }

     // Log slow queries
     if (duration > 1000) {
       await this.logSlowQuery(query, sanitizedParams, metrics, context);
     }

     // Add to transaction log si en transaction
     if (context.metadata?.transactionId && typeof this.addQueryToTransaction === "function") {
       this.addQueryToTransaction(context.metadata.transactionId, {
         query: sanitizedQuery,
         params: sanitizedParams,
         duration,
         success: true,
         timestamp: new Date()
       });
     }

     return result;

    } catch (error) {
      const duration = Date.now() - timer['startTime'];
      
      const metrics: QueryMetrics = {
        duration,
        success: false,
        error: error as Error
      };

      // Log query error
      this.logQueryError(query, sanitizedParams, metrics, context, logger);

      // End timer with error
      timer.endWithError(error as Error, {
        operation: context.operation,
        userId: context.userId,
        sessionId: context.sessionId,
        query: sanitizedQuery
      });

      // Add to transaction log si en transaction
      if (context.metadata?.transactionId && typeof this.addQueryToTransaction === "function") {
        this.addQueryToTransaction(context.metadata.transactionId, {
          query: sanitizedQuery,
          params: sanitizedParams,
          duration,
          success: false,
          error: (error as Error).message,
          timestamp: new Date()
        });
      }

      throw error;
    }
  }

  /**
   * Log a database transaction with all queries
   */
  async logTransaction<T>(
    transactionName: string,
    context: QueryContext,
    executor: (transactionId: string) => Promise<T>
  ): Promise<T> {
    const transactionId = uuidv4();
    const requestId = context.requestId || uuidv4();
    const logger = createRequestLogger(requestId, context.userId);
    const timer = new PerformanceTimer(`DB_TRANSACTION_${transactionName}`, databaseLogger);

    // Initialize transaction context
    const transactionContext: TransactionContext = {
      ...context,
      transactionId,
      queries: []
    };
    
    this.activeTransactions.set(transactionId, transactionContext);

    // Log transaction start
    logger.info(`Starting database transaction: ${transactionName}`, {
      transactionId,
      transactionName,
      userId: context.userId,
      sessionId: context.sessionId,
      requestId
    });

    try {
      // Execute the transaction
      const result = await executor(transactionId);
      
      // Calculate duration
      const duration = timer.end({
        transactionName,
        transactionId,
        success: true,
        userId: context.userId,
        sessionId: context.sessionId,
        queryCount: transactionContext.queries.length
      });

      // Log successful transaction
      logger.info(`Database transaction completed: ${transactionName}`, {
        transactionId,
        transactionName,
        duration,
        queryCount: transactionContext.queries.length,
        success: true,
        userId: context.userId,
        sessionId: context.sessionId
      });

      // Log transaction to database query logger
      dbQueryLogger.logTransaction(transactionName, duration, {
        transactionId,
        queryCount: transactionContext.queries.length,
        userId: context.userId,
        sessionId: context.sessionId,
        queries: transactionContext.queries
      });

      // Log user action for audit trail
      if (context.userId) {
        await auditLogger.logUserAction(
          context.userId,
          {
            action: 'DATABASE_TRANSACTION',
            resource: 'database',
            details: {
              transactionName,
              transactionId,
              duration,
              queryCount: transactionContext.queries.length,
              success: true
            }
          },
          Object.assign(
            {},
            context.sessionId ? { sessionId: context.sessionId } : {},
            { requestId }
          )
        );
      }

      // Clean up transaction context
      this.activeTransactions.delete(transactionId);

      return result;

    } catch (error) {
      const duration = Date.now() - timer['startTime'];

      // Log transaction error
      logger.error(`Database transaction failed: ${transactionName}`, error as Error, {
        transactionId,
        transactionName,
        duration,
        queryCount: transactionContext.queries.length,
        success: false,
        userId: context.userId,
        sessionId: context.sessionId,
        queries: transactionContext.queries
      });

      // End timer with error
      timer.endWithError(error as Error, {
        transactionName,
        transactionId,
        userId: context.userId,
        sessionId: context.sessionId
      });

      // Log failed user action for audit trail
      if (context.userId) {
        await auditLogger.logFailedUserAction(
          context.userId,
          {
            action: 'DATABASE_TRANSACTION',
            resource: 'database',
            details: {
              transactionName,
              transactionId,
              duration,
              queryCount: transactionContext.queries.length,
              success: false
            }
          },
          error as Error,
          Object.assign(
            {},
            context.sessionId ? { sessionId: context.sessionId } : {},
            { requestId }
          )
        );
      }

      // Clean up transaction context
      this.activeTransactions.delete(transactionId);

      throw error;
    }
  }

  /**
   * Log database connection events
   */
  logConnectionEvent(
    event: 'connect' | 'disconnect' | 'error' | 'pool_created' | 'pool_destroyed',
    metadata?: Record<string, any>
  ): void {
    const logger = databaseLogger;

    switch (event) {
      case 'connect':
        logger.info('Database connection established', metadata);
        break;
      case 'disconnect':
        logger.info('Database connection closed', metadata);
        break;
      case 'error':
        logger.error('Database connection error', metadata?.error, metadata);
        break;
      case 'pool_created':
        logger.info('Database connection pool created', metadata);
        break;
      case 'pool_destroyed':
        logger.info('Database connection pool destroyed', metadata);
        break;
    }

    // Log to database query logger
    if (event === "connect" || event === "disconnect" || event === "error") {
      dbQueryLogger.logConnection(event, metadata);
    }
  }

  /**
   * Get query statistics for a time period
   */
  async getQueryStatistics(timeRange?: { start: Date; end: Date }) {
    // This would typically query a metrics store
    // For now, return placeholder data
    return {
      totalQueries: 0,
      successfulQueries: 0,
      failedQueries: 0,
      averageDuration: 0,
      slowQueries: 0,
      timeRange
    };
  }

  /**
   * Get active transaction information
   */
  getActiveTransactions(): TransactionContext[] {
    return Array.from(this.activeTransactions.values());
  }

  /**
   * Sanitize query for logging (remove sensitive data)
   */
  private sanitizeQuery(query: string): string {
    // Remove potential sensitive data patterns
    return query
      .replace(/password\s*=\s*'[^']*'/gi, "password = '[REDACTED]'")
      .replace(/password\s*=\s*"[^"]*"/gi, 'password = "[REDACTED]"')
      .replace(/token\s*=\s*'[^']*'/gi, "token = '[REDACTED]'")
      .replace(/secret\s*=\s*'[^']*'/gi, "secret = '[REDACTED]'");
  }

  /**
   * Sanitize parameters for logging
   */
  private sanitizeParams(params: any[]): any[] {
    if (!params || params.length === 0) return [];
    
    return params.map((param) => {
      if (typeof param === 'string' && param.length > 100) {
        return `${param.substring(0, 100)}... [truncated]`;
      }
      return param;
    });
  }

  /**
   * Log successful query execution
   */
  private logQuerySuccess(
    _query: string,
    _params: any[],
    metrics: QueryMetrics,
    context: QueryContext,
    logger: any
  ): void {
  }

  /**
   * Log query execution error
   */
  private logQueryError(
    query: string,
    params: any[],
    metrics: QueryMetrics,
    context: QueryContext,
    logger: any
  ): void {
    logger.error(`Database query failed: ${context.operation}`, metrics.error!, {
      operation: context.operation,
      duration: metrics.duration,
      query: query.substring(0, 200),
      paramCount: params.length,
      success: false,
      userId: context.userId,
      sessionId: context.sessionId
    });
  }

  /**
   * Log slow query for performance monitoring
   */
  private async logSlowQuery(
    query: string,
    params: any[],
    metrics: QueryMetrics,
    context: QueryContext
  ): Promise<void> {
    databaseLogger.warn(`Slow database query detected: ${context.operation}`, {
      operation: context.operation,
      duration: metrics.duration,
      query: query.substring(0, 200),
      paramCount: params.length,
      threshold: 1000,
      userId: context.userId,
      sessionId: context.sessionId
    });

    // Log performance event for audit
    if (context.userId) {
      await auditLogger.logPerformanceEvent(
        {
          operation: `DB_${context.operation}`,
          duration: metrics.duration,
          threshold: 1000,
          metadata: {
            query: query.substring(0, 200),
            paramCount: params.length
          }
        },
        Object.assign(
          {},
          context.userId ? { userId: context.userId } : {},
          context.sessionId ? { sessionId: context.sessionId } : {},
          context.requestId ? { requestId: context.requestId } : {}
        )
      );
    }
  }

  /**
   * Retourne les logs de requêtes SQL récentes, avec filtrage optionnel par durée minimale.
   */
  public getRecentQueryLogs(limit: number = 50, minDuration: number = 0): QueryExecutionLog[] {
    const filtered = minDuration > 0
      ? this.recentQueryLogs.filter(log => log.duration >= minDuration)
      : this.recentQueryLogs;
    return filtered.slice(-limit);
  }

  /**
   * Ajoute une requête au log de transaction.
   */
  private addQueryToTransaction(transactionId: string, queryLog: QueryExecutionLog): void {
    const transaction = this.activeTransactions.get(transactionId);
    if (transaction) {
      transaction.queries.push(queryLog);
    }
  }
}
export const enhancedDbQueryLogger = EnhancedDatabaseQueryLogger.getInstance();