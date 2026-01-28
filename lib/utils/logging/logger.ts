/**
 * Logger utility for the application
 * Provides structured logging with different levels, correlation IDs, and operation context
 */

export enum LogLevel {
  ERROR = "error",
  WARN = "warn",
  INFO = "info",
  DEBUG = "debug",
}

/**
 * Enhanced log entry interface with correlation and operation context
 */
interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  requestId?: string;
  userId?: string;
  operation?: string;
  duration?: number;
  context?: unknown;
  error?: unknown;
  service?: string;
}

/**
 * Log context for correlation and tracing
 */
export interface LogContext {
  requestId?: string | undefined;
  userId?: string | undefined;
  operation?: string | undefined;
  duration?: number | undefined;
  service?: string | undefined;
  [key: string]: unknown;
}

/**
 * Enhanced logger interface with correlation and context support
 */
export interface ILogger {
  error(message: string, context?: LogContext, error?: unknown): void;
  warn(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  debug(message: string, context?: LogContext): void;

  // Extended methods for specific use cases
  http?(message: string, context?: LogContext): void;
  verbose?(message: string, context?: LogContext): void;
  silly?(message: string, context?: LogContext): void;
  performance?(message: string, context?: LogContext): void;
  request?(message: string, context?: LogContext): void;
  database?(message: string, context?: LogContext): void;
  userAction?(message: string, context?: LogContext): void;

  // Correlation methods
  withRequestId?(requestId: string): ILogger;
  withUserId?(userId: string): ILogger;
  withOperation?(operation: string): ILogger;
  withContext?(context: LogContext): ILogger;
}

// Utility to anonymize/mask sensitive data in logs
function maskString(str: string): string {
  if (!str) return str;

  // Mask emails: keep first char of local part, mask rest, keep domain
  str = str.replace(
    /([a-zA-Z0-9._%+-]{1})([a-zA-Z0-9._%+-]*?)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
    (_, first, _rest, domain) => `${first}***@${domain}`,
  );

  // Mask JWTs (three base64url parts separated by .) - keep header, mask payload/signature
  str = str.replace(
    /\b([A-Za-z0-9-_]+\.)[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\b/g,
    (_match, header) => `${header}***.***`,
  );

  // Mask long alphanumeric tokens (>= 20 chars) - keep first 6 and last 4
  str = str.replace(
    /\b([A-Za-z0-9-_]{20,})\b/g,
    (m) => `${m.slice(0, 6)}***${m.slice(-4)}`,
  );

  // Mask credit card numbers (keep last 4)
  str = str.replace(/\b(?:\d[ -]!*){13,19}\b/g, (m) => {
    const digits = m.replace(/[^0-9]/g, "");
    if (digits.length < 13) return m;
    return `**** **** **** ${digits.slice(-4)}`;
  });

  return str;
}

function anonymizeValue(
  value: unknown,
  key?: string,
  seen = new WeakSet(),
  depth = 3,
): unknown {
  if (value == null || depth <= 0) return value;

  // Primitive types
  if (typeof value === "string") {
    // Keys that indicate secrets
    if (
      key &&
      /password|pwd|secret|token|access[_-]!?token|api[_-]!?key|apikey|credential/i.test(
        key,
      )
    ) {
      return "***";
    }
    return maskString(value);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((v) => anonymizeValue(v, key, seen, depth - 1));
  }

  if (typeof value === "object") {
    if (seen.has(value)) {
      return "[Circular]";
    }
    seen.add(value);
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(value)) {
      try {
        const v = (value as Record<string, unknown>)[k];
        if (v == null) {
          (out as Record<string, unknown>)[k] = v;
          continue;
        }
        if (
          /password|pwd|secret|token|access[_-]!?token|api[_-]!?key|apikey|credential/i.test(
            k,
          )
        ) {
          (out as Record<string, unknown>)[k] = "***";
          continue;
        }
        (out as Record<string, unknown>)[k] = anonymizeValue(v, k, seen, depth - 1);
      } catch {
        (out as Record<string, unknown>)[k] = "[Unserializable]";
      }
    }
    seen.delete(value);
    return out;
  }

  return value;
}

function anonymize(objOrString: unknown): unknown {
  return anonymizeValue(objOrString);
}

/**
 * Enhanced Logger class with correlation IDs and structured logging
 */
class Logger implements ILogger {
  private isDevelopment = process.env['NODE_ENV'] === "development";
  private logLevel: LogLevel;
  private defaultContext: LogContext = {};

  constructor(defaultContext: LogContext = {}) {
    this.defaultContext = defaultContext;
    this.logLevel = this.getLogLevel();
  }

  /**
   * Gets the current log level from environment
   */
  private getLogLevel(): LogLevel {
    const envLevel = process.env['LOG_LEVEL']?.toLowerCase();
    switch (envLevel) {
      case "error":
        return LogLevel.ERROR;
      case "warn":
        return LogLevel.WARN;
      case "info":
        return LogLevel.INFO;
      case "debug":
        return LogLevel.DEBUG;
      default:
        return this.isDevelopment ? LogLevel.DEBUG : LogLevel.INFO;
    }
  }

  /**
   * Checks if a log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [
      LogLevel.ERROR,
      LogLevel.WARN,
      LogLevel.INFO,
      LogLevel.DEBUG,
    ];
    const currentIndex = levels.indexOf(this.logLevel);
    const messageIndex = levels.indexOf(level);
    return messageIndex <= currentIndex;
  }

  /**
   * Formats log entry for output
   */
  private formatMessage(entry: LogEntry): string {
    const {
      level,
      message,
      timestamp,
      requestId,
      userId,
      operation,
      duration,
      service,
      context,
      error,
    } = entry;

    // Build correlation info
    const correlationParts = [];
    if (requestId) correlationParts.push(`req:${requestId}`);
    if (userId) correlationParts.push(`user:${userId}`);
    if (operation) correlationParts.push(`op:${operation}`);
    if (service) correlationParts.push(`svc:${service}`);
    if (duration !== undefined) correlationParts.push(`dur:${duration}ms`);

    const correlation =
      correlationParts.length > 0 ? ` [${correlationParts.join("|")}]` : "";

    let logMessage = `[${timestamp}] ${level.toUpperCase()}${correlation}: ${message}`;

    // Add context if present
    if (context && Object.keys(context).length > 0) {
      try {
        const contextStr = JSON.stringify(context);
        logMessage += ` | Context: ${contextStr}`;
      } catch {
        logMessage += ` | Context: [Unserializable]`;
      }
    }

    // Add error information
    if (error) {
      if (error instanceof Error) {
        logMessage += ` | Error: ${error.message}`;
        if (this.isDevelopment && error.stack) {
          logMessage += `\nStack: ${error.stack}`;
        }
      } else if (typeof error === "object" && error !== null && "message" in error) {
        logMessage += ` | Error: ${String((error as { message: unknown }).message)}`;
      } else {
        logMessage += ` | Error: ${String(error)}`;
      }
    }

    return logMessage;
  }

  /**
   * Formats log entry as structured JSON for production
   */
  private formatStructured(entry: LogEntry): string {
    const structuredEntry = {
      timestamp: entry.timestamp,
      level: entry.level,
      message: entry.message,
      requestId: entry.requestId,
      userId: entry.userId,
      operation: entry.operation,
      duration: entry.duration,
      service: entry.service,
      context: entry.context,
      error: entry.error,
    };

    return JSON.stringify(structuredEntry);
  }

  /**
   * Core logging method with enhanced context support
   */
  private log(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: unknown,
  ): void {
    if (!this.shouldLog(level)) {
      return;
    }

    // Anonymize sensitive data before logging
    const safeMessage =
      typeof message === "string" ? anonymize(message) : message;
    const mergedContext = { ...this.defaultContext, ...context };
    const safeContext = mergedContext ? anonymize(mergedContext) : undefined;

    let safeError: unknown;

    if (error instanceof Error) {
      const anonymizedMessage = anonymize(error.message);
      const sanitizedError = new Error(typeof anonymizedMessage === 'string' ? anonymizedMessage : String(anonymizedMessage));
      if (this.isDevelopment && error.stack) {
        sanitizedError.stack = error.stack;
      }
      safeError = sanitizedError;
    } else if (typeof error === "object" && error !== null && "message" in error) {
      const msg = (error as { message: unknown }).message;
      const anonymizedMessage = anonymize(msg);
      const sanitizedError = new Error(typeof anonymizedMessage === 'string' ? anonymizedMessage : String(anonymizedMessage));
      safeError = sanitizedError;
    } else if (error && typeof error === "string") {
      safeError = anonymize(error);
    } else if (error) {
      safeError = anonymize(error);
    }

    const entry: LogEntry = {
      level,
      message: typeof safeMessage === 'string' ? safeMessage : String(safeMessage),
      timestamp: new Date().toISOString(),
      requestId: mergedContext?.requestId,
      userId: mergedContext?.userId,
      operation: mergedContext?.operation,
      duration: mergedContext?.duration,
      service: mergedContext?.service,
      context: safeContext,
      error: safeError || undefined,
    };

    // Format and output the log
    const formattedMessage = this.isDevelopment
      ? this.formatMessage(entry)
      : this.formatStructured(entry);

    // Output to appropriate console method
    if (this.isDevelopment) {
      switch (level) {
        case LogLevel.ERROR:
          // eslint-disable-next-line no-console
          console.error(formattedMessage);
          break;
        case LogLevel.WARN:
          // eslint-disable-next-line no-console
          console.warn(formattedMessage);
          break;
        case LogLevel.INFO:
          // eslint-disable-next-line no-console
          console.info(formattedMessage);
          break;
        case LogLevel.DEBUG:
          // eslint-disable-next-line no-console
          console.debug(formattedMessage);
          break;
      }
    } else {
      // In production, use structured logging to stdout
      // eslint-disable-next-line no-console
      console.log(formattedMessage);
    }
  }

  /**
   * Creates a new logger instance with additional context
   */
  withContext(context: LogContext): ILogger {
    return new Logger({ ...this.defaultContext, ...context });
  }

  withRequestId(requestId: string): ILogger {
    return this.withContext({ requestId });
  }

  withUserId(userId: string): ILogger {
    return this.withContext({ userId });
  }

  withOperation(operation: string): ILogger {
    return this.withContext({ operation });
  }

  // Core logging methods
  error(message: string, context?: LogContext, error?: unknown): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  // Extended methods for specific use cases
  http(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, { ...context, type: "http" });
  }

  verbose(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  silly(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  performance(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, { ...context, type: "performance" });
  }

  request(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, { ...context, type: "request" });
  }

  database(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, { ...context, type: "database" });
  }

  userAction(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, { ...context, type: "user_action" });
  }
}

/**
 * Creates a logger instance with a specific service context
 */
export function getLogger(serviceName: string, context?: LogContext): ILogger {
  return new Logger({ service: serviceName, ...context });
}

/**
 * Performance measurement utility
 */
export class PerformanceLogger {
  private startTime: number;
  private logger: ILogger;
  private operation: string;
  private context: LogContext;

  constructor(operation: string, logger: ILogger, context?: LogContext) {
    this.startTime = Date.now();
    this.logger = logger;
    this.operation = operation;
    this.context = context || {};
  }

  /**
   * Ends performance measurement and logs the result
   */
  end(message?: string, additionalContext?: LogContext): void {
    const duration = Date.now() - this.startTime;
    const logMessage = message || `Operation '${this.operation}' completed`;

    this.logger.info(logMessage, {
      ...this.context,
      ...additionalContext,
      operation: this.operation,
      duration,
    });
  }

  /**
   * Logs an intermediate checkpoint
   */
  checkpoint(message: string, additionalContext?: LogContext): void {
    const duration = Date.now() - this.startTime;

    this.logger.debug(`${this.operation} checkpoint: ${message}`, {
      ...this.context,
      ...additionalContext,
      operation: this.operation,
      duration,
    });
  }
}

/**
 * Creates a performance logger for measuring operation duration
 */
export function createPerformanceLogger(
  operation: string,
  logger: ILogger = globalLogger,
  context?: LogContext,
): PerformanceLogger {
  return new PerformanceLogger(operation, logger, context);
}

/**
 * Decorator for automatic performance logging of async methods
 */
export function logPerformance(operation?: string) {
  return function (
    target: object,
    propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const method = descriptor.value;
    const operationName =
      operation || `${target.constructor.name}.${propertyName}`;

    descriptor.value = async function (...args: unknown[]) {
      const perfLogger = createPerformanceLogger(operationName, globalLogger);

      try {
        const result = await method.apply(this, args);
        perfLogger.end("Operation completed successfully");
        return result;
      } catch (error) {
        perfLogger.end("Operation failed", {
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    };

    return descriptor;
  };
}

// Global logger instance
const globalLogger = new Logger();

export { globalLogger as logger };
