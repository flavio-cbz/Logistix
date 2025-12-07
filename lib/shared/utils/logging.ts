/**
 * @fileoverview Unified logging system for all environments
 * @description Consolidates ConsoleLogger, SimpleLogger, and EdgeLogger into a single, flexible logging system
 * @version 1.0.0
 * @since 2025-01-10
 */

/**
 * Log levels in order of severity
 */
export enum LogLevel {
  ERROR = "error",
  WARN = "warn", 
  INFO = "info",
  DEBUG = "debug",
}

/**
 * Context information for log entries
 */
export interface LogContext {
  requestId?: string;
  userId?: string;
  service?: string;
  operation?: string;
  [key: string]: any;
}

/**
 * Structured log entry
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
  error?: any;
}

/**
 * Logger interface for consistent logging across all implementations
 */
export interface Logger {
  error(message: string, context?: LogContext, error?: any): void;
  warn(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  debug(message: string, context?: LogContext): void;
  userAction?(action: string, userId: string, data?: any): void;
  performance?(operation: string, duration: number, data?: any): void;
}

/**
 * Environment detection utilities
 */
// const isEdgeRuntime = () => { // Unused
//   try {
//     // Check for Edge Runtime specific globals
//     return typeof globalThis !== 'undefined' &&
//            'EdgeRuntime' in globalThis;
//   } catch {
//     return false;
//   }
// };

const isDevelopment = () => process.env.NODE_ENV === 'development';

/**
 * Unified logger implementation that adapts to different environments
 */
export class UnifiedLogger implements Logger {
  private context: string;
  private minLevel: LogLevel;
  private isDev: boolean;

  constructor(context?: string, minLevel: LogLevel = LogLevel.INFO) {
    this.context = context ?? "";
    this.minLevel = minLevel;
    this.isDev = isDevelopment();
  }

  /**
   * Determines if a log level should be output based on minimum level
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.DEBUG];
    const currentLevelIndex = levels.indexOf(this.minLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex <= currentLevelIndex;
  }

  /**
   * Formats a log message with timestamp and context
   */
  private formatMessage(entry: LogEntry): string {
    const { level, message, timestamp, context } = entry;
    const contextStr = this.context ? ` [${this.context}]` : "";
    const additionalContext = context ? ` | ${JSON.stringify(context)}` : "";
    return `[${timestamp}] ${level.toUpperCase()}:${contextStr} ${message}${additionalContext}`;
  }

  /**
   * Safely serializes error objects for logging
   */
  private serializeError(error: any): any {
    if (!error) return null;

    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    if (typeof error === "object" && error !== null) {
      try {
        return JSON.parse(JSON.stringify(error));
      } catch {
        return { error: "Non-serializable error object" };
      }
    }

    return { error: String(error) };
  }

  /**
   * Core logging method that handles all log levels
   */
  private log(level: LogLevel, message: string, context?: LogContext, error?: any): void {
    if (!this.shouldLog(level)) return;

    const timestamp = new Date().toISOString();
    const entry: LogEntry = {
      level,
      message,
      timestamp,
      ...(context && { context }),
    };

    const safeError = this.serializeError(error);
    if (safeError) {
      entry.error = safeError;
    }

    const formattedMessage = this.formatMessage(entry);

    // Use appropriate console method based on level
    switch (level) {
      case LogLevel.ERROR:
        console.error(formattedMessage);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage);
        break;
      case LogLevel.DEBUG:
        // Only log debug in development
        if (this.isDev) {
          console.log(formattedMessage);
        }
        break;
    }
  }

  /**
   * Log error messages
   */
  error(message: string, context?: LogContext, error?: any): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  /**
   * Log warning messages
   */
  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Log info messages
   */
  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Log debug messages (development only)
   */
  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Log user actions for audit purposes
   */
  userAction(action: string, userId: string, data?: any): void {
    this.info(`User Action: ${action}`, {
      userId,
      action,
      data,
      type: 'user_action'
    });
  }

  /**
   * Log performance metrics
   */
  performance(operation: string, duration: number, data?: any): void {
    this.info(`Performance: ${operation} took ${duration}ms`, {
      operation,
      duration,
      data,
      type: 'performance'
    });
  }
}

/**
 * Factory function to create loggers with context
 */
export function createLogger(context?: string, minLevel?: LogLevel): Logger {
  return new UnifiedLogger(context, minLevel);
}

/**
 * Default logger instance
 */
export const logger = new UnifiedLogger();

/**
 * Specialized logger instances for different purposes
 */
export const securityLogger = new UnifiedLogger("Security");
export const performanceLogger = new UnifiedLogger("Performance");
export const auditLogger = new UnifiedLogger("Audit");
export const databaseLogger = new UnifiedLogger("Database");
export const apiLogger = new UnifiedLogger("API");
export const authLogger = new UnifiedLogger("Auth");
export const vintedLogger = new UnifiedLogger("Vinted");

/**
 * Performance timer utility
 */
export class PerformanceTimer {
  private startTime: number;
  private name: string;
  private logger: Logger;

  constructor(name: string = "Operation", logger: Logger = performanceLogger) {
    this.name = name;
    this.logger = logger;
    this.startTime = Date.now();
  }

  /**
   * End timing and log the result
   */
  end(data?: any): number {
    const duration = Date.now() - this.startTime;
    this.logger.performance?.(this.name, duration, data);
    return duration;
  }

  /**
   * End timing with error and log both
   */
  endWithError(error: Error, data?: any): void {
    const duration = Date.now() - this.startTime;
    this.logger.error(`${this.name} failed after ${duration}ms`, { duration, data }, error);
  }
}

/**
 * Legacy compatibility functions and exports
 */

// Legacy ConsoleLogger compatibility
export class ConsoleLogger extends UnifiedLogger {
  constructor() {
    super("Console");
  }
}

// Legacy SimpleLogger compatibility  
export class SimpleLogger extends UnifiedLogger {
  constructor(context?: string, minLevel?: LogLevel) {
    super(context, minLevel);
  }
}

// Legacy EdgeLogger compatibility
export class EdgeLogger extends UnifiedLogger {
  constructor() {
    super("Edge");
  }
}

// Legacy function exports for backward compatibility
export function getLogger(context?: string, minLevel?: LogLevel): Logger {
  return new UnifiedLogger(context, minLevel);
}

// Legacy specialized logger exports
export const edgeLogger = new EdgeLogger();
export const dbQueryLogger = databaseLogger;

// Legacy API logger with additional methods for compatibility
export const apiRequestLogger = {
  ...apiLogger,
  logResponse: (..._args: any[]) => {},
  logError: (..._args: any[]) => {},
};

export const createRequestLogger = (..._args: any[]) => ({
  ...getLogger(),
  http: (..._args: any[]) => {},
});

// Export the main logger as default
export default logger;