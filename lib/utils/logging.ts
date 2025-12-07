/**
 * @fileoverview Logging utilities for the Logistix application
 * @description This module provides a comprehensive logging system with multiple logger types
 * and specialized logging functions for different aspects of the application including
 * security, performance, audit trails, and general application logging.
 * @version 1.0.0
 * @since 2025-01-09
 * @author Development Team
 */

/**
 * Standard logger interface defining core logging methods
 * 
 * @description Defines the contract for all logger implementations in the application.
 * Provides standard log levels and optional specialized logging methods for user actions
 * and performance monitoring.
 */
export interface Logger {
  /** Log informational messages */
  info: (message: string, ...args: any[]) => void;
  /** Log warning messages */
  warn: (message: string, ...args: any[]) => void;
  /** Log error messages */
  error: (message: string, ...args: any[]) => void;
  /** Log debug messages */
  debug: (message: string, ...args: any[]) => void;
  /** Optional: Log user actions for audit trails */
  userAction?: (action: string, userId: string, data?: any) => void;
  /** Optional: Log performance metrics */
  performance?: (operation: string, duration: number, data?: any) => void;
}

/**
 * Console-based logger implementation
 * 
 * @description Standard logger implementation that outputs to the browser console
 * or Node.js console. Formats messages with appropriate log level prefixes and
 * supports additional data logging for debugging purposes.
 * @example
 * ```typescript
 * const logger = new ConsoleLogger();
 * logger.info("Application started");
 * logger.error("Database connection failed", { error: dbError });
 * ```
 */
export class ConsoleLogger implements Logger {
  /**
   * Logs informational messages
   * 
   * @description Outputs informational messages to console.log with INFO prefix.
   * Use for general application flow and status updates.
   * @param {string} message - The main log message
   * @param {...any[]} args - Additional data to log
   */
  info(message: string, ...args: any[]) {
    console.log(`[INFO] ${message}`, ...args);
  }

  /**
   * Logs warning messages
   * 
   * @description Outputs warning messages to console.warn with WARN prefix.
   * Use for potentially problematic situations that don't prevent operation.
   * @param {string} message - The warning message
   * @param {...any[]} args - Additional data to log
   */
  warn(message: string, ...args: any[]) {
    console.warn(`[WARN] ${message}`, ...args);
  }

  /**
   * Logs error messages
   * 
   * @description Outputs error messages to console.error with ERROR prefix.
   * Use for actual errors and exceptions that need attention.
   * @param {string} message - The error message
   * @param {...any[]} args - Additional data to log (error objects, context)
   */
  error(message: string, ...args: any[]) {
    console.error(`[ERROR] ${message}`, ...args);
  }

  /**
   * Logs debug messages
   * 
   * @description Outputs debug messages to console.debug with DEBUG prefix.
   * Use for detailed debugging information during development.
   * @param {string} message - The debug message
   * @param {...any[]} args - Additional debugging data
   */
  debug(message: string, ...args: any[]) {
    console.debug(`[DEBUG] ${message}`, ...args);
  }

  /**
   * Logs user actions for audit trails
   * 
   * @description Records user actions with USER_ACTION prefix for security
   * and audit purposes. Tracks who performed what action and when.
   * @param {string} action - Description of the action performed
   * @param {string} userId - ID of the user who performed the action
   * @param {any} [data] - Optional additional data about the action
   */
  userAction?(action: string, userId: string, data?: any) {
    console.log(`[USER_ACTION] ${action} by ${userId}`, data || "");
  }

  /**
   * Logs performance metrics
   * 
   * @description Records performance measurements with PERFORMANCE prefix.
   * Used for monitoring operation durations and system performance.
   * @param {string} operation - Name of the operation being measured
   * @param {number} duration - Duration of the operation in milliseconds
   * @param {any} [data] - Optional additional performance data
   */
  performance?(operation: string, duration: number, data?: any) {
    console.log(`[PERFORMANCE] ${operation} took ${duration}ms`, data || "");
  }
}

/**
 * Gets the default logger instance
 * 
 * @description Returns a configured logger instance using the ConsoleLogger implementation.
 * This is the main entry point for getting a logger in the application.
 * @returns {Logger} Configured logger instance
 * @example
 * ```typescript
 * const logger = getLogger();
 * logger.info('Application started');
 * ```
 * @since 1.0.0
 */
export function getLogger(): Logger {
  return new ConsoleLogger();
}

export const securityLogger = new ConsoleLogger();
export const performanceLogger = new ConsoleLogger();
export const auditLogger = new ConsoleLogger();

// Exports additionnels pour compatibilité
export const apiRequestLogger = {
  ...auditLogger,
  logResponse: (..._args: any[]) => {},
  logError: (..._args: any[]) => {},
};
export const createRequestLogger = (..._args: any[]) => ({
  ...getLogger(),
  http: (..._args: any[]) => {},
});
export class PerformanceTimer {
  constructor(_name?: string, _logger?: any) {}
  end(_data?: any) {
    return 0;
  }
  endWithError(_error: Error, _data?: any) {}
}
export const apiLogger = {
  ...auditLogger,
  http: (..._args: any[]) => {},
};
export const databaseLogger = {
  info: auditLogger.info.bind(auditLogger),
  warn: auditLogger.warn.bind(auditLogger),
  error: auditLogger.error.bind(auditLogger),
  debug: auditLogger.debug.bind(auditLogger),
  logQuery: (..._args: any[]) => {},
  logTransaction: (..._args: any[]) => {},
};
export const authLogger = auditLogger;
export const marketAnalysisLogger = auditLogger;
export const vintedLogger = auditLogger;
export const dbQueryLogger = {
  info: auditLogger.info.bind(auditLogger),
  warn: auditLogger.warn.bind(auditLogger),
  error: auditLogger.error.bind(auditLogger),
  debug: auditLogger.debug.bind(auditLogger),
  logQuery: (..._args: any[]) => {},
  logTransaction: (..._args: any[]) => {},
};
