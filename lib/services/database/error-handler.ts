import 'server-only';
import { ErrorCategory } from './retry-manager';

/**
 * Types d'erreurs SQLite étendus
 */
export enum SQLiteErrorType {
  // Erreurs de verrou
  BUSY = 'SQLITE_BUSY',
  LOCKED = 'SQLITE_LOCKED',
  
  // Erreurs I/O
  IOERR = 'SQLITE_IOERR',
  INTERRUPT = 'SQLITE_INTERRUPT',
  
  // Erreurs de ressources
  NOMEM = 'SQLITE_NOMEM',
  FULL = 'SQLITE_FULL',
  
  // Erreurs critiques
  CORRUPT = 'SQLITE_CORRUPT',
  NOTADB = 'SQLITE_NOTADB',
  
  // Erreurs de configuration
  READONLY = 'SQLITE_READONLY',
  CANTOPEN = 'SQLITE_CANTOPEN',
  PERM = 'SQLITE_PERM',
  
  // Erreurs de protocole
  PROTOCOL = 'SQLITE_PROTOCOL',
  SCHEMA = 'SQLITE_SCHEMA',
  
  // Erreurs génériques
  ERROR = 'SQLITE_ERROR',
  INTERNAL = 'SQLITE_INTERNAL',
}

/**
 * Stratégies de réponse aux erreurs
 */
export enum ErrorResponseStrategy {
  RETRY_WITH_BACKOFF = 'retry_with_backoff',
  RETRY_IMMEDIATE = 'retry_immediate',
  FAIL_FAST = 'fail_fast',
  CIRCUIT_BREAK = 'circuit_break',
  ESCALATE = 'escalate',
}

/**
 * Informations détaillées sur une erreur
 */
export interface ErrorInfo {
  type: SQLiteErrorType | 'UNKNOWN';
  category: ErrorCategory;
  strategy: ErrorResponseStrategy;
  isRetryable: boolean;
  isCritical: boolean;
  message: string;
  originalError: any;
  context?: string;
  timestamp: Date;
}

/**
 * Configuration des stratégies d'erreur
 */
interface ErrorStrategyConfig {
  [key: string]: {
    category: ErrorCategory;
    strategy: ErrorResponseStrategy;
    isRetryable: boolean;
    isCritical: boolean;
  };
}

/**
 * Gestionnaire d'erreurs avancé pour les opérations de base de données
 */
export class DatabaseErrorHandler {
  private static instance: DatabaseErrorHandler;
  
  private readonly errorStrategies: ErrorStrategyConfig = {
    // Erreurs de verrou - retry avec backoff exponentiel
    [SQLiteErrorType.BUSY]: {
      category: ErrorCategory.RETRYABLE_LOCK,
      strategy: ErrorResponseStrategy.RETRY_WITH_BACKOFF,
      isRetryable: true,
      isCritical: false,
    },
    [SQLiteErrorType.LOCKED]: {
      category: ErrorCategory.RETRYABLE_LOCK,
      strategy: ErrorResponseStrategy.RETRY_WITH_BACKOFF,
      isRetryable: true,
      isCritical: false,
    },
    
    // Erreurs I/O - retry immédiat avec limite
    [SQLiteErrorType.IOERR]: {
      category: ErrorCategory.RETRYABLE_IO,
      strategy: ErrorResponseStrategy.RETRY_IMMEDIATE,
      isRetryable: true,
      isCritical: false,
    },
    [SQLiteErrorType.INTERRUPT]: {
      category: ErrorCategory.RETRYABLE_IO,
      strategy: ErrorResponseStrategy.RETRY_IMMEDIATE,
      isRetryable: true,
      isCritical: false,
    },
    
    // Erreurs de ressources - retry avec délai long
    [SQLiteErrorType.NOMEM]: {
      category: ErrorCategory.RETRYABLE_RESOURCE,
      strategy: ErrorResponseStrategy.RETRY_WITH_BACKOFF,
      isRetryable: true,
      isCritical: false,
    },
    [SQLiteErrorType.FULL]: {
      category: ErrorCategory.RETRYABLE_RESOURCE,
      strategy: ErrorResponseStrategy.RETRY_WITH_BACKOFF,
      isRetryable: true,
      isCritical: false,
    },
    
    // Erreurs critiques - circuit breaker
    [SQLiteErrorType.CORRUPT]: {
      category: ErrorCategory.CRITICAL,
      strategy: ErrorResponseStrategy.CIRCUIT_BREAK,
      isRetryable: false,
      isCritical: true,
    },
    [SQLiteErrorType.NOTADB]: {
      category: ErrorCategory.CRITICAL,
      strategy: ErrorResponseStrategy.CIRCUIT_BREAK,
      isRetryable: false,
      isCritical: true,
    },
    
    // Erreurs de configuration - fail fast
    [SQLiteErrorType.READONLY]: {
      category: ErrorCategory.NON_RETRYABLE,
      strategy: ErrorResponseStrategy.FAIL_FAST,
      isRetryable: false,
      isCritical: false,
    },
    [SQLiteErrorType.CANTOPEN]: {
      category: ErrorCategory.NON_RETRYABLE,
      strategy: ErrorResponseStrategy.FAIL_FAST,
      isRetryable: false,
      isCritical: false,
    },
    [SQLiteErrorType.PERM]: {
      category: ErrorCategory.NON_RETRYABLE,
      strategy: ErrorResponseStrategy.FAIL_FAST,
      isRetryable: false,
      isCritical: false,
    },
    
    // Erreurs de protocole - retry avec backoff
    [SQLiteErrorType.PROTOCOL]: {
      category: ErrorCategory.RETRYABLE_LOCK,
      strategy: ErrorResponseStrategy.RETRY_WITH_BACKOFF,
      isRetryable: true,
      isCritical: false,
    },
    [SQLiteErrorType.SCHEMA]: {
      category: ErrorCategory.RETRYABLE_LOCK,
      strategy: ErrorResponseStrategy.RETRY_WITH_BACKOFF,
      isRetryable: true,
      isCritical: false,
    },
  };

  private logger = {
    debug: (msg: string, data?: any) => {
      if (process.env.DB_DEBUG === 'true') {
      }
    },
    warn: (msg: string, data?: any) => {
      console.warn(`[ErrorHandler] ${msg}`, data ? JSON.stringify(data) : '');
    },
    error: (msg: string, data?: any) => {
      console.error(`[ErrorHandler] ${msg}`, data ? JSON.stringify(data) : '');
    },
  };

  private constructor() {}

  /**
   * Récupère l'instance unique du gestionnaire d'erreurs
   */
  public static getInstance(): DatabaseErrorHandler {
    if (!DatabaseErrorHandler.instance) {
      DatabaseErrorHandler.instance = new DatabaseErrorHandler();
    }
    return DatabaseErrorHandler.instance;
  }

  /**
   * Analyse une erreur et retourne des informations détaillées
   */
  public analyzeError(error: any, context?: string): ErrorInfo {
    const errorType = this.identifyErrorType(error);
    const strategy = this.errorStrategies[errorType] || {
      category: ErrorCategory.NON_RETRYABLE,
      strategy: ErrorResponseStrategy.FAIL_FAST,
      isRetryable: false,
      isCritical: false,
    };

    const errorInfo: ErrorInfo = {
      type: errorType,
      category: strategy.category,
      strategy: strategy.strategy,
      isRetryable: strategy.isRetryable,
      isCritical: strategy.isCritical,
      message: error?.message || 'Unknown database error',
      originalError: error,
      context,
      timestamp: new Date(),
    };


    return errorInfo;
  }

  /**
   * Identifie le type d'erreur SQLite
   */
  private identifyErrorType(error: any): SQLiteErrorType | 'UNKNOWN' {
    if (!error) return 'UNKNOWN';

    const code = error.code;
    const message = error.message?.toLowerCase() || '';

    // Vérifier d'abord le code d'erreur
    if (code && Object.values(SQLiteErrorType).includes(code)) {
      return code as SQLiteErrorType;
    }

    // Fallback sur l'analyse du message d'erreur
    if (message.includes('database is locked')) return SQLiteErrorType.LOCKED;
    if (message.includes('database is busy')) return SQLiteErrorType.BUSY;
    if (message.includes('disk i/o error')) return SQLiteErrorType.IOERR;
    if (message.includes('interrupted')) return SQLiteErrorType.INTERRUPT;
    if (message.includes('out of memory')) return SQLiteErrorType.NOMEM;
    if (message.includes('database or disk is full')) return SQLiteErrorType.FULL;
    if (message.includes('database disk image is malformed')) return SQLiteErrorType.CORRUPT;
    if (message.includes('file is not a database')) return SQLiteErrorType.NOTADB;
    if (message.includes('readonly database')) return SQLiteErrorType.READONLY;
    if (message.includes('unable to open database file')) return SQLiteErrorType.CANTOPEN;
    if (message.includes('access permission denied')) return SQLiteErrorType.PERM;
    if (message.includes('database schema has changed')) return SQLiteErrorType.SCHEMA;

    return 'UNKNOWN';
  }

  /**
   * Détermine si une erreur doit déclencher le circuit breaker
   */
  public shouldTriggerCircuitBreaker(errorInfo: ErrorInfo): boolean {
    return errorInfo.strategy === ErrorResponseStrategy.CIRCUIT_BREAK || errorInfo.isCritical;
  }

  /**
   * Génère un message d'erreur utilisateur approprié
   */
  public generateUserMessage(errorInfo: ErrorInfo): string {
    switch (errorInfo.category) {
      case ErrorCategory.RETRYABLE_LOCK:
        return 'Database is temporarily busy. The operation will be retried automatically.';
      
      case ErrorCategory.RETRYABLE_IO:
        return 'Temporary I/O error occurred. Retrying operation...';
      
      case ErrorCategory.RETRYABLE_RESOURCE:
        return 'System resources are temporarily unavailable. Please try again in a moment.';
      
      case ErrorCategory.CRITICAL:
        return 'A critical database error occurred. Please contact support if the problem persists.';
      
      case ErrorCategory.NON_RETRYABLE:
        return 'Database operation failed due to configuration or permission issues.';
      
      default:
        return 'An unexpected database error occurred.';
    }
  }

  /**
   * Crée une erreur enrichie avec les informations d'analyse
   */
  public createEnrichedError(errorInfo: ErrorInfo): DatabaseError {
    return new DatabaseError(
      errorInfo.message,
      errorInfo.type,
      errorInfo.category,
      errorInfo.strategy,
      errorInfo.originalError,
      errorInfo.context
    );
  }

  /**
   * Log une erreur avec le niveau approprié
   */
  public logError(errorInfo: ErrorInfo): void {
    const logData = {
      type: errorInfo.type,
      category: errorInfo.category,
      strategy: errorInfo.strategy,
      isRetryable: errorInfo.isRetryable,
      isCritical: errorInfo.isCritical,
      context: errorInfo.context,
      timestamp: errorInfo.timestamp.toISOString(),
    };

    if (errorInfo.isCritical) {
      this.logger.error(`Critical database error: ${errorInfo.message}`, logData);
    } else if (!errorInfo.isRetryable) {
      this.logger.error(`Non-retryable database error: ${errorInfo.message}`, logData);
    } else {
      this.logger.warn(`Retryable database error: ${errorInfo.message}`, logData);
    }
  }
}

/**
 * Classe d'erreur enrichie pour les opérations de base de données
 */
export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly type: SQLiteErrorType | 'UNKNOWN',
    public readonly category: ErrorCategory,
    public readonly strategy: ErrorResponseStrategy,
    public readonly originalError?: any,
    public readonly context?: string
  ) {
    super(message);
    this.name = 'DatabaseError';
  }

  /**
   * Vérifie si l'erreur est retryable
   */
  isRetryable(): boolean {
    return this.strategy !== ErrorResponseStrategy.FAIL_FAST;
  }

  /**
   * Vérifie si l'erreur est critique
   */
  isCritical(): boolean {
    return this.strategy === ErrorResponseStrategy.CIRCUIT_BREAK;
  }

  /**
   * Retourne une représentation JSON de l'erreur
   */
  toJSON(): object {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      category: this.category,
      strategy: this.strategy,
      context: this.context,
      stack: this.stack,
    };
  }
}

// Export de l'instance singleton
export const errorHandler = DatabaseErrorHandler.getInstance();