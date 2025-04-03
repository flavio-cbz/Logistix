// Niveaux de log
export enum LogLevel {
  NONE = 0,
  ERROR = 1,
  WARN = 2,
  INFO = 3,
  DEBUG = 4,
}

// Configuration du niveau de log
const LOG_LEVEL = process.env.NODE_ENV === "production" ? LogLevel.ERROR : LogLevel.INFO

export const logger = {
  debug: (message: string, ...args: any[]) => {
    if (LOG_LEVEL >= LogLevel.DEBUG) {
      console.debug(`[DEBUG] ${message}`, ...args)
    }
  },

  info: (message: string, ...args: any[]) => {
    if (LOG_LEVEL >= LogLevel.INFO) {
      console.info(`[INFO] ${message}`, ...args)
    }
  },

  warn: (message: string, ...args: any[]) => {
    if (LOG_LEVEL >= LogLevel.WARN) {
      console.warn(`[WARN] ${message}`, ...args)
    }
  },

  error: (message: string, ...args: any[]) => {
    if (LOG_LEVEL >= LogLevel.ERROR) {
      console.error(`[ERROR] ${message}`, ...args)
    }
  },
}

