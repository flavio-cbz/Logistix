/**
 * Simple logger compatible client/serveur
 * Remplace le logger Winston pour éviter les erreurs de compilation côté client
 */

import { LogLevel, NODE_ENV, LOG_LEVEL } from '@/lib/constants/config';

export { LogLevel };

export class SimpleLogger {
  private context?: string

  constructor(context?: string) {
    this.context = context
  }

  private formatMessage(level: string, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString()
    const contextStr = this.context ? ` [${this.context}]` : ''
    const argsStr = args.length > 0 ? ` ${JSON.stringify(args)}` : ''
    return `${timestamp} ${level}:${contextStr} ${message}${argsStr}`
  }

  error(message: string, error?: Error | any, ...args: any[]): void {
    if (LOG_LEVEL >= LogLevel.ERROR) {
      const errorMessage = error instanceof Error ? `${message} - ${error.stack || error.message}` : message
      console.error(this.formatMessage('ERROR', errorMessage, ...args))
    }
  }

  warn(message: string, ...args: any[]): void {
    if (LOG_LEVEL >= LogLevel.WARN) {
      console.warn(this.formatMessage('WARN', message, ...args))
    }
  }

  info(message: string, ...args: any[]): void {
    if (LOG_LEVEL >= LogLevel.INFO) {
      console.info(this.formatMessage('INFO', message, ...args))
    }
  }

  debug(message: string, ...args: any[]): void {
    if (LOG_LEVEL >= LogLevel.DEBUG) {
      console.debug(this.formatMessage('DEBUG', message, ...args))
    }
  }
}

// Instance par défaut
export const logger = new SimpleLogger()

// Factory function pour créer des loggers avec contexte
export function getLogger(context: string): SimpleLogger {
  return new SimpleLogger(context)
}

// Alias pour compatibilité
export const Logger = SimpleLogger