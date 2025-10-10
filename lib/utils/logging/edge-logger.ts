/**
 * Logger simplifié pour l'environnement Edge Runtime
 * Compatible avec Next.js middleware
 */

export enum LogLevel {
  ERROR = "error",
  WARN = "warn",
  INFO = "info",
  DEBUG = "debug",
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: any;
  error?: any;
}

export interface IEdgeLogger {
  error(message: string, context?: unknown, error?: unknown): void;
  warn(message: string, context?: unknown): void;
  info(message: string, context?: unknown): void;
  debug(message: string, context?: unknown): void;
}

class EdgeLogger implements IEdgeLogger {
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === "development";
  }

  private formatMessage(entry: LogEntry): string {
    const { level, message, timestamp, context } = entry;
    const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : "";
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`;
  }

  private log(
    level: LogLevel,
    message: string,
    context?: any,
    error?: any,
  ): void {
    const timestamp = new Date().toISOString();

    const entry: LogEntry = {
      level,
      message,
      timestamp,
      ...(context && { context }),
    };

    // Sérialisation sécurisée des erreurs pour Edge Runtime
    let safeError = null;
    if (error) {
      if (error instanceof Error) {
        safeError = {
          name: error.name,
          message: error.message,
          stack: error.stack,
        };
      } else if (typeof error === "object" && error !== null) {
        try {
          safeError = JSON.parse(JSON.stringify(error));
        } catch {
          safeError = { error: "Non-serializable error object" };
        }
      } else {
        safeError = { error: String(error) };
      }
    }

    if (safeError) {
      (entry as LogEntry).error = safeError;
    }

    const formattedMessage = this.formatMessage(entry);

    // Utiliser console pour tous les environnements dans Edge Runtime
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
        if (this.isDevelopment) {
          console.log(formattedMessage);
        }
        break;
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
}

// Instance unique pour l'Edge Runtime
export const edgeLogger = new EdgeLogger();
