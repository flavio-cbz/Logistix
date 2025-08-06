import winston, { format, transport, Logform } from 'winston';
import 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Définition des niveaux de log de Winston avec plus de granularité
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6
};

// Définition des couleurs pour la console
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  verbose: 'cyan',
  debug: 'blue',
  silly: 'grey'
};

// Ajout des couleurs à Winston
winston.addColors(logColors);

// Détermination du niveau de log en fonction de l'environnement
const getLogLevel = (): string => {
  if (process.env.LOG_LEVEL) {
    return process.env.LOG_LEVEL;
  }
  return process.env.NODE_ENV === 'production' ? 'warn' : 'info';
};

const level = getLogLevel();

// Format pour la console (plus condensé et informatif)
const consoleFormat = format.combine(
  format.colorize(),
  format.timestamp({ format: 'HH:mm:ss.SSS' }),
  format.printf(({ timestamp, level, message, context, requestId, userId, duration, ...meta }) => {
    const contextStr = context ? `[${context}]` : '';
    const requestIdStr = requestId ? `[${requestId}]` : '';
    const userIdStr = userId ? `[user:${userId}]` : '';
    const durationStr = duration ? `[${duration}ms]` : '';
    
    // Format metadata for console display
    const metaStr = Object.keys(meta).length > 0 
      ? ` ${JSON.stringify(meta, null, 0)}` 
      : '';
    
    return `${timestamp} ${level}:${contextStr}${requestIdStr}${userIdStr}${durationStr} ${message}${metaStr}`;
  })
);

// Custom formatter to add process info
const addProcessInfo = format((info: Logform.TransformableInfo): Logform.TransformableInfo => {
  info.hostname = process.env.HOSTNAME || 'localhost';
  info.pid = process.pid;
  info.memory = process.memoryUsage();
  info.uptime = process.uptime();
  return info;
});

// Custom filter format
const filter = (predicate: (info: Logform.TransformableInfo) => boolean) => {
  return format((info: Logform.TransformableInfo): Logform.TransformableInfo | boolean => {
    if (predicate(info)) {
      return info;
    }
    return false;
  })();
};


// Format pour les fichiers avec plus de détails
const fileFormat = format.combine(
  format.timestamp(),
  format.errors({ stack: true }),
  format.splat(),
  addProcessInfo(),
  format.json()
);

// Performance format for performance logs
const performanceFormat = format.combine(
  filter(info => info.level === 'info' && info.operation !== undefined),
  format.timestamp(),
  addProcessInfo(),
  format.json()
);

// Error format for error logs
const errorFormat = format.combine(
  format.timestamp(),
  format.errors({ stack: true }),
  addProcessInfo(),
  format.json()
);

// HTTP format for http logs
const httpFormat = format.combine(
    filter(info => info.level === 'http'),
    format.timestamp(),
    addProcessInfo(),
    format.json()
);


// Transports avec configuration avancée
const transports: transport[] = [
  // Console transport
  new winston.transports.Console({
    level,
    format: consoleFormat,
    handleExceptions: true,
    handleRejections: true
  }),
  
  // Application logs (general)
  new winston.transports.DailyRotateFile({
    level: 'info',
    filename: path.join(logsDir, 'application-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '30d',
    format: fileFormat,
    handleExceptions: true,
    handleRejections: true
  }),
  
  // Error logs (separate file for errors)
  new winston.transports.DailyRotateFile({
    level: 'error',
    filename: path.join(logsDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '10m',
    maxFiles: '30d',
    format: errorFormat,
    handleExceptions: true,
    handleRejections: true
  }),
  
  // Performance logs
  new winston.transports.DailyRotateFile({
    level: 'info',
    filename: path.join(logsDir, 'performance-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '10m',
    maxFiles: '14d',
    format: performanceFormat,
  }),
  
  // HTTP logs
  new winston.transports.DailyRotateFile({
    level: 'http',
    filename: path.join(logsDir, 'http-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '10m',
    maxFiles: '7d',
    format: httpFormat,
  })
];

// Création du logger principal
const rootLogger = winston.createLogger({
  levels: logLevels,
  transports,
  exitOnError: false,
});

/**
 * Interface pour notre logger personnalisé.
 * Cela permet de s'assurer que tous les loggers ont les mêmes méthodes.
 */
export interface ILogger {
  error(message: string, error?: Error | unknown, meta?: Record<string, any>): void;
  warn(message: string, meta?: Record<string, any>): void;
  info(message: string, meta?: Record<string, any>): void;
  http(message: string, meta?: Record<string, any>): void;
  verbose(message: string, meta?: Record<string, any>): void;
  debug(message: string, meta?: Record<string, any>): void;
  silly(message: string, meta?: Record<string, any>): void;
  
  // Performance logging methods
  performance(operation: string, duration: number, meta?: Record<string, any>): void;
  
  // Request logging methods
  request(method: string, url: string, statusCode: number, duration: number, meta?: Record<string, any>): void;
  
  // Database logging methods
  database(query: string, duration: number, meta?: Record<string, any>): void;
  
  // User action logging
  userAction(action: string, userId: string, meta?: Record<string, any>): void;
}

// Wrapper autour du logger Winston pour fournir une API plus simple et typée
const createLoggerWrapper = (loggerInstance: winston.Logger): ILogger => ({
  error: (message: string, error?: Error | unknown, meta?: Record<string, any>) => {
    const logMeta = { ...meta };
    if (error instanceof Error) {
      // Winston gère l'objet Error et sa stack trace grâce à `format.errors({ stack: true })`
      loggerInstance.error(message, { ...logMeta, error, stack: error.stack });
    } else if (error) {
      loggerInstance.error(message, { ...logMeta, error: String(error) });
    } else {
      loggerInstance.error(message, logMeta);
    }
  },
  
  warn: (message: string, meta?: Record<string, any>) => {
    loggerInstance.warn(message, meta);
  },
  
  info: (message: string, meta?: Record<string, any>) => {
    loggerInstance.info(message, meta);
  },
  
  http: (message: string, meta?: Record<string, any>) => {
    loggerInstance.http(message, meta);
  },
  
  verbose: (message: string, meta?: Record<string, any>) => {
    loggerInstance.verbose(message, meta);
  },
  
  debug: (message: string, meta?: Record<string, any>) => {
    loggerInstance.debug(message, meta);
  },
  
  silly: (message: string, meta?: Record<string, any>) => {
    loggerInstance.silly(message, meta);
  },
  
  performance: (operation: string, duration: number, meta?: Record<string, any>) => {
    loggerInstance.info('Performance metric', {
      operation,
      duration,
      type: 'performance',
      ...meta
    });
  },
  
  request: (method: string, url: string, statusCode: number, duration: number, meta?: Record<string, any>) => {
    loggerInstance.http('HTTP Request', {
      method,
      url,
      statusCode,
      duration,
      type: 'http_request',
      ...meta
    });
  },
  
  database: (query: string, duration: number, meta?: Record<string, any>) => {
    loggerInstance.debug('Database Query', {
      query: query.substring(0, 200) + (query.length > 200 ? '...' : ''), // Truncate long queries
      duration,
      type: 'database',
      ...meta
    });
  },
  
  userAction: (action: string, userId: string, meta?: Record<string, any>) => {
    loggerInstance.info('User Action', {
      action,
      userId,
      type: 'user_action',
      timestamp: new Date().toISOString(),
      ...meta
    });
  }
});

/**
 * Crée un logger avec un contexte spécifique.
 * Utilise les "child loggers" de Winston pour une meilleure performance.
 * @param context - Le nom du module ou du contexte pour ce logger.
 * @returns Une instance de ILogger avec le contexte défini.
 */
export const getLogger = (context: string): ILogger => {
  const childLogger = rootLogger.child({ context });
  return createLoggerWrapper(childLogger);
};

/**
 * Logger global par défaut, sans contexte spécifique.
 * À utiliser pour les scripts simples ou les points d'entrée de l'application.
 */
export const logger: ILogger = createLoggerWrapper(rootLogger);