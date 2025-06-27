// lib/logger.ts

// Niveaux de log
export enum LogLevel {
  NONE = 0,
  ERROR = 1,
  WARN = 2,
  INFO = 3,
  DEBUG = 4,
}

// Configuration du niveau de log
const LOG_LEVEL = process.env.NODE_ENV === "production" ? LogLevel.INFO : LogLevel.DEBUG

// Couleurs pour la console
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
}

const getTimestamp = () => new Date().toISOString()

const formatMessage = (level: "DEBUG" | "INFO" | "WARN" | "ERROR", color: string, message: string, context?: string, ...args: any[]) => {
  const timestamp = getTimestamp()
  const levelStr = `${color}[${level.padEnd(5)}]${colors.reset}`
  const contextStr = context ? ` ${colors.cyan}[${context}]${colors.reset}` : ""
  const logMessage = `${timestamp} ${levelStr}${contextStr} - ${message}`

  switch (level) {
    case "DEBUG":
      // eslint-disable-next-line no-console
      console.debug(logMessage, ...args)
      break
    case "INFO":
      // eslint-disable-next-line no-console
      console.info(logMessage, ...args)
      break
    case "WARN":
      // eslint-disable-next-line no-console
      console.warn(logMessage, ...args)
      break
    case "ERROR":
      // eslint-disable-next-line no-console
      console.error(logMessage, ...args)
      break
  }
}

export class Logger {
  private context?: string

  constructor(context?: string) {
    this.context = context
  }

  debug(message: string, ...args: any[]) {
    if (LOG_LEVEL >= LogLevel.DEBUG) {
      formatMessage("DEBUG", colors.blue, message, this.context, ...args)
    }
  }

  info(message: string, ...args: any[]) {
    if (LOG_LEVEL >= LogLevel.INFO) {
      formatMessage("INFO", colors.green, message, this.context, ...args)
    }
  }

  warn(message: string, ...args: any[]) {
    if (LOG_LEVEL >= LogLevel.WARN) {
      formatMessage("WARN", colors.yellow, message, this.context, ...args)
    }
  }

  error(message: string, error?: Error | unknown, ...args: any[]) {
    if (LOG_LEVEL >= LogLevel.ERROR) {
      const errorMessage = error instanceof Error ? `${message} - ${error.stack || error.message}` : message
      formatMessage("ERROR", colors.red, errorMessage, this.context, ...args)
    }
  }
}

export const logger = new Logger()
