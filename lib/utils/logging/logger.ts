/**
 * Logger utility for the application
 * Provides structured logging with different levels
 */

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: any;
  error?: any;
}

export interface ILogger {
  error(message: string, context?: unknown, error?: unknown): void;
  warn(message: string, context?: unknown): void;
  info(message: string, context?: unknown): void;
  debug(message: string, context?: unknown): void;
  // Extended optional methods used across the codebase. Use flexible signatures to avoid
  // frequent type mismatches while preserving intent. Implementations should handle args.
  http?: (...args: any[]) => void;
  verbose?: (...args: any[]) => void;
  silly?: (...args: any[]) => void;
  performance?: (...args: any[]) => void;
  request?: (...args: any[]) => void;
  database?: (...args: any[]) => void;
  userAction?: (...args: any[]) => void;
}

// Utility to anonymize/mask sensitive data in logs
function maskString(str: string): string {
  if (!str) return str;

  // Mask emails: keep first char of local part, mask rest, keep domain
  str = str.replace(
    /([a-zA-Z0-9._%+-]{1})([a-zA-Z0-9._%+-]*?)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
    (_, first, _rest, domain) => `${first}***@${domain}`
  );

  // Mask JWTs (three base64url parts separated by .) - keep header, mask payload/signature
  str = str.replace(
    /\b([A-Za-z0-9-_]+\.)[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\b/g,
    (match, header) => `${header}***.***`
  );

  // Mask long alphanumeric tokens (>= 20 chars) - keep first 6 and last 4
  str = str.replace(
    /\b([A-Za-z0-9-_]{20,})\b/g,
    (m) => `${m.slice(0, 6)}***${m.slice(-4)}`
  );

  // Mask credit card numbers (keep last 4)
  str = str.replace(
    /\b(?:\d[ -]*){13,19}\b/g,
    (m) => {
      const digits = m.replace(/[^0-9]/g, '');
      if (digits.length < 13) return m;
      return `**** **** **** ${digits.slice(-4)}`;
    }
  );

  return str;
}

function anonymizeValue(value: any, key?: string, seen = new WeakSet(), depth = 3): any {
  if (value == null || depth <= 0) return value;

  // Primitive types
  if (typeof value === 'string') {
    // Keys that indicate secrets
    if (key && /password|pwd|secret|token|access[_-]?token|api[_-]?key|apikey|credential/i.test(key)) {
      return '***';
    }
    return maskString(value);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((v) => anonymizeValue(v, key, seen, depth - 1));
  }

  if (typeof value === 'object') {
    if (seen.has(value)) {
      return '[Circular]';
    }
    seen.add(value);
    const out: Record<string, any> = {};
    for (const k of Object.keys(value)) {
      try {
        const v = (value as any)[k];
        if (v == null) {
          out[k] = v;
          continue;
        }
        if (/password|pwd|secret|token|access[_-]?token|api[_-]?key|apikey|credential/i.test(k)) {
          out[k] = '***';
          continue;
        }
        out[k] = anonymizeValue(v, k, seen, depth - 1);
      } catch {
        out[k] = '[Unserializable]';
      }
    }
    seen.delete(value);
    return out;
  }

  return value;
}

export function anonymize(objOrString: any): any {
  return anonymizeValue(objOrString);
}

class Logger implements ILogger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private formatMessage(entry: LogEntry): string {
    const { level, message, timestamp, context, error } = entry;
    
    let logMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    
    if (context && Object.keys(context).length > 0) {
      try {
        logMessage += ` | Context: ${JSON.stringify(context)}`;
      } catch {
        logMessage += ` | Context: [Unserializable]`;
      }
    }
    
    if (error) {
      const errMsg = typeof error === 'string' ? error : (error && (error as any).message) ? (error as any).message : String(error);
      logMessage += ` | Error: ${errMsg}`;
      if (this.isDevelopment && (error as any)?.stack) {
        logMessage += `\nStack: ${(error as any).stack}`;
      }
    }
    
    return logMessage;
  }

  private log(level: LogLevel, message: string, context?: any, error?: any): void {
    // Anonymize sensitive data before logging
    const safeMessage = typeof message === 'string' ? anonymize(message) : message;
    const safeContext = context ? anonymize(context) : context;
    let safeError = error;
    if (error && (error as any).message) {
      const sanitizedError = new Error(anonymize((error as any).message));
      if ((error as any).stack && this.isDevelopment) {
        sanitizedError.stack = (error as any).stack;
      }
      safeError = sanitizedError;
    } else if (error && typeof error === 'string') {
      safeError = anonymize(error);
    }

    const entry: LogEntry = {
      level,
      message: safeMessage,
      timestamp: new Date().toISOString(),
      context: safeContext
    };
    if (safeError) {
      (entry as LogEntry).error = safeError;
    }

    const formattedMessage = this.formatMessage(entry);

    // In development, use console methods for better formatting
    if (this.isDevelopment) {
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
          console.debug(formattedMessage);
          break;
      }
    } else {
      // In production, use structured logging (could be extended to use winston, pino, etc.)
    }
  }

  error(message: string, context?: any, error?: any): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  warn(message: string, context?: any): void {
    this.log(LogLevel.WARN, message, context);
  }

  info(message: string, context?: any): void {
    this.log(LogLevel.INFO, message, context);
  }

  debug(message: string, context?: any): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  // Optional extended methods
  http(message: string, context?: any): void {
    this.log(LogLevel.INFO, message, { ...(context || {}), type: 'http' });
  }

  verbose(message: string, context?: any): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  silly(message: string, context?: any): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  performance(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, { performance: data });
  }

  request(...args: any[]): void {
    // Accept variable args and format
    this.log(LogLevel.INFO, String(args[0] ?? ''), { args: args.slice(1) });
  }

  database(message: string, duration?: number, meta?: any): void {
    this.log(LogLevel.INFO, message, { duration, ...meta });
  }

  userAction(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, { action: data });
  }
}

export const logger = new Logger();

/**
 * Creates a logger instance with a specific context/service name
 */
export function getLogger(serviceName: string): ILogger {
  return {
    error: (message: string, context?: unknown, error?: unknown) => {
      logger.error(`[${serviceName}] ${message}`, context as any, error as any);
    },
    warn: (message: string, context?: unknown) => {
      logger.warn(`[${serviceName}] ${message}`, context as any);
    },
    info: (message: string, context?: unknown) => {
      logger.info(`[${serviceName}] ${message}`, context as any);
    },
    debug: (message: string, context?: unknown) => {
      logger.debug(`[${serviceName}] ${message}`, context as any);
    },
    http: (message: string, context?: unknown) => {
      if (logger.http) logger.http(`[${serviceName}] ${message}`, context);
    },
    performance: (message: string, data?: unknown) => {
      if (logger.performance) logger.performance(message, data);
    },
    database: (message: string, duration?: number, meta?: unknown) => {
      if (logger.database) logger.database(message, duration, meta);
    },
    request: (message: string, data?: unknown) => {
      if (logger.request) logger.request(message, data);
    },
    userAction: (message: string, data?: unknown) => {
      if (logger.userAction) logger.userAction(message, data);
    }
  };
}