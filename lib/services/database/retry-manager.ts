import type { PoolConfig } from '@/lib/types/database-pool';

/**
 * Types d'erreurs SQLite qui nécessitent un retry
 */
export enum SQLiteErrorCode {
  SQLITE_BUSY = 'SQLITE_BUSY',
  SQLITE_LOCKED = 'SQLITE_LOCKED',
  SQLITE_PROTOCOL = 'SQLITE_PROTOCOL',
  SQLITE_CANTOPEN = 'SQLITE_CANTOPEN',
  SQLITE_IOERR = 'SQLITE_IOERR',
  SQLITE_CORRUPT = 'SQLITE_CORRUPT',
  SQLITE_FULL = 'SQLITE_FULL',
  SQLITE_READONLY = 'SQLITE_READONLY',
  SQLITE_INTERRUPT = 'SQLITE_INTERRUPT',
  SQLITE_NOMEM = 'SQLITE_NOMEM',
}

/**
 * Catégories d'erreurs pour différentes stratégies de gestion
 */
export enum ErrorCategory {
  RETRYABLE_LOCK = 'retryable_lock',        // Erreurs de verrou - retry avec backoff
  RETRYABLE_IO = 'retryable_io',            // Erreurs I/O temporaires - retry avec délai court
  RETRYABLE_RESOURCE = 'retryable_resource', // Erreurs de ressources - retry avec délai long
  NON_RETRYABLE = 'non_retryable',          // Erreurs non retryables - fail fast
  CRITICAL = 'critical',                    // Erreurs critiques - circuit breaker
}

/**
 * Stratégies de retry
 */
export enum RetryStrategy {
  EXPONENTIAL_BACKOFF = 'exponential_backoff',
  LINEAR_BACKOFF = 'linear_backoff',
  FIXED_DELAY = 'fixed_delay',
}

/**
 * Configuration pour les retry
 */
export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  strategy: RetryStrategy;
  retryableErrors: SQLiteErrorCode[];
  jitter: boolean; // Ajouter du bruit pour éviter les thundering herds
  // Configurations spécifiques par catégorie d'erreur
  categoryConfigs: {
    [key in ErrorCategory]: {
      maxAttempts: number;
      baseDelay: number;
      strategy: RetryStrategy;
    };
  };
}

/**
 * Résultat d'une tentative de retry
 */
export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
  totalTime: number;
}

/**
 * Gestionnaire de retry avec différentes stratégies
 */
export class RetryManager {
  private config: RetryConfig;
  private logger: {
    debug: (msg: string, data?: any) => void;
    warn: (msg: string, data?: any) => void;
    error: (msg: string, data?: any) => void;
  };

  constructor(poolConfig: PoolConfig) {
    this.config = {
      maxAttempts: poolConfig.retryAttempts,
      baseDelay: poolConfig.retryDelay,
      maxDelay: poolConfig.retryDelay * 10, // Max 10x le délai de base
      strategy: RetryStrategy.EXPONENTIAL_BACKOFF,
      retryableErrors: [
        SQLiteErrorCode.SQLITE_BUSY,
        SQLiteErrorCode.SQLITE_LOCKED,
        SQLiteErrorCode.SQLITE_PROTOCOL,
        SQLiteErrorCode.SQLITE_IOERR,
        SQLiteErrorCode.SQLITE_INTERRUPT,
      ],
      jitter: true,
      // Configurations spécifiques par catégorie
      categoryConfigs: {
        [ErrorCategory.RETRYABLE_LOCK]: {
          maxAttempts: poolConfig.retryAttempts,
          baseDelay: poolConfig.retryDelay,
          strategy: RetryStrategy.EXPONENTIAL_BACKOFF,
        },
        [ErrorCategory.RETRYABLE_IO]: {
          maxAttempts: 3,
          baseDelay: poolConfig.retryDelay / 2,
          strategy: RetryStrategy.LINEAR_BACKOFF,
        },
        [ErrorCategory.RETRYABLE_RESOURCE]: {
          maxAttempts: 2,
          baseDelay: poolConfig.retryDelay * 2,
          strategy: RetryStrategy.EXPONENTIAL_BACKOFF,
        },
        [ErrorCategory.NON_RETRYABLE]: {
          maxAttempts: 0,
          baseDelay: 0,
          strategy: RetryStrategy.FIXED_DELAY,
        },
        [ErrorCategory.CRITICAL]: {
          maxAttempts: 1,
          baseDelay: poolConfig.retryDelay * 5,
          strategy: RetryStrategy.FIXED_DELAY,
        },
      },
    };

    this.logger = {
      debug: (msg: string, data?: any) => {
        if (process.env.DB_DEBUG === 'true') {
          console.debug(`[RetryManager] ${msg}`, data ? JSON.stringify(data) : '');
        }
      },
      warn: (msg: string, data?: any) => {
        console.warn(`[RetryManager] ${msg}`, data ? JSON.stringify(data) : '');
      },
      error: (msg: string, data?: any) => {
        console.error(`[RetryManager] ${msg}`, data ? JSON.stringify(data) : '');
      },
    };
  }

  /**
   * Catégorise une erreur selon son type et sa gravité
   */
  private categorizeError(error: any): ErrorCategory {
    if (!error) return ErrorCategory.NON_RETRYABLE;

    const code = error.code;
    const message = error.message?.toLowerCase() || '';

    // Erreurs de verrou - les plus communes, retry avec backoff exponentiel
    if (
      code === SQLiteErrorCode.SQLITE_BUSY ||
      code === SQLiteErrorCode.SQLITE_LOCKED ||
      message.includes('database is locked') ||
      message.includes('database is busy') ||
      message.includes('sqlite_busy') ||
      message.includes('sqlite_locked')
    ) {
      return ErrorCategory.RETRYABLE_LOCK;
    }

    // Erreurs I/O temporaires - retry rapide avec backoff linéaire
    if (
      code === SQLiteErrorCode.SQLITE_IOERR ||
      code === SQLiteErrorCode.SQLITE_INTERRUPT ||
      message.includes('disk i/o error') ||
      message.includes('interrupted')
    ) {
      return ErrorCategory.RETRYABLE_IO;
    }

    // Erreurs de ressources - retry avec délai plus long
    if (
      code === SQLiteErrorCode.SQLITE_NOMEM ||
      code === SQLiteErrorCode.SQLITE_FULL ||
      message.includes('out of memory') ||
      message.includes('database or disk is full')
    ) {
      return ErrorCategory.RETRYABLE_RESOURCE;
    }

    // Erreurs critiques - déclencher le circuit breaker
    if (
      code === SQLiteErrorCode.SQLITE_CORRUPT ||
      message.includes('database disk image is malformed') ||
      message.includes('corruption')
    ) {
      return ErrorCategory.CRITICAL;
    }

    // Erreurs non retryables - fail fast
    if (
      code === SQLiteErrorCode.SQLITE_READONLY ||
      code === SQLiteErrorCode.SQLITE_CANTOPEN ||
      message.includes('readonly database') ||
      message.includes('unable to open database file')
    ) {
      return ErrorCategory.NON_RETRYABLE;
    }

    // Par défaut, traiter comme une erreur de verrou
    return ErrorCategory.RETRYABLE_LOCK;
  }

  /**
   * Vérifie si une erreur est retryable selon sa catégorie
   */
  private isRetryableError(error: any): boolean {
    const category = this.categorizeError(error);
    return category !== ErrorCategory.NON_RETRYABLE;
  }

  /**
   * Calcule le délai pour la prochaine tentative selon la catégorie d'erreur
   */
  private calculateDelay(attempt: number, errorCategory?: ErrorCategory): number {
    let strategy = this.config.strategy;
    let baseDelay = this.config.baseDelay;

    // Utiliser la configuration spécifique à la catégorie si disponible
    if (errorCategory && this.config.categoryConfigs[errorCategory]) {
      const categoryConfig = this.config.categoryConfigs[errorCategory];
      strategy = categoryConfig.strategy;
      baseDelay = categoryConfig.baseDelay;
    }

    let delay: number;

    switch (strategy) {
      case RetryStrategy.EXPONENTIAL_BACKOFF:
        delay = baseDelay * Math.pow(2, attempt - 1);
        break;
      
      case RetryStrategy.LINEAR_BACKOFF:
        delay = baseDelay * attempt;
        break;
      
      case RetryStrategy.FIXED_DELAY:
      default:
        delay = baseDelay;
        break;
    }

    // Appliquer la limite maximale
    delay = Math.min(delay, this.config.maxDelay);

    // Ajouter du jitter pour éviter les thundering herds
    if (this.config.jitter) {
      const jitterAmount = delay * 0.1; // 10% de jitter
      delay += (Math.random() - 0.5) * 2 * jitterAmount;
    }

    return Math.max(delay, 0);
  }

  /**
   * Attend pendant le délai spécifié
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Exécute une opération avec retry automatique et gestion d'erreurs avancée
   */
  async executeWithRetry<T>(
    operation: () => Promise<T> | T,
    context: string = 'database operation'
  ): Promise<RetryResult<T>> {
    const startTime = Date.now();
    let lastError: Error | undefined;
    let attempts = 0;
    let errorCategory: ErrorCategory | undefined;

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      attempts = attempt;
      
      try {
        this.logger.debug(`Executing ${context}`, { 
          attempt, 
          maxAttempts: this.config.maxAttempts,
          errorCategory: errorCategory || 'none'
        });

        const result = await operation();
        
        const totalTime = Date.now() - startTime;
        
        if (attempt > 1) {
          this.logger.debug(`${context} succeeded after retry`, { 
            attempt, 
            totalTime,
            errorCategory,
            recoveredFromError: lastError?.message
          });
        }

        return {
          success: true,
          result,
          attempts,
          totalTime,
        };

      } catch (error) {
        lastError = error as Error;
        errorCategory = this.categorizeError(lastError);
        
        this.logger.debug(`${context} failed on attempt ${attempt}`, { 
          error: lastError.message,
          code: (lastError as any).code,
          category: errorCategory,
          attempt,
          context
        });

        // Vérifier si l'erreur est retryable selon sa catégorie
        if (!this.isRetryableError(lastError)) {
          this.logger.error(`${context} failed with non-retryable error`, { 
            error: lastError.message,
            code: (lastError as any).code,
            category: errorCategory,
            context
          });
          break;
        }

        // Utiliser la configuration spécifique à la catégorie pour les tentatives max
        const categoryConfig = this.config.categoryConfigs[errorCategory];
        const maxAttemptsForCategory = categoryConfig?.maxAttempts || this.config.maxAttempts;

        // Si c'est la dernière tentative pour cette catégorie, ne pas attendre
        if (attempt >= maxAttemptsForCategory) {
          this.logger.error(`${context} failed after all retry attempts for category ${errorCategory}`, { 
            attempts: maxAttemptsForCategory,
            category: errorCategory,
            lastError: lastError.message,
            context
          });
          break;
        }

        // Calculer et attendre le délai selon la catégorie d'erreur
        const delay = this.calculateDelay(attempt, errorCategory);
        this.logger.debug(`Retrying ${context} in ${delay}ms`, { 
          attempt: attempt + 1,
          delay,
          category: errorCategory,
          maxAttempts: maxAttemptsForCategory,
          context
        });
        
        await this.sleep(delay);
      }
    }

    const totalTime = Date.now() - startTime;
    
    return {
      success: false,
      error: lastError,
      attempts,
      totalTime,
    };
  }

  /**
   * Met à jour la configuration de retry
   */
  updateConfig(newConfig: Partial<RetryConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.logger.debug('Retry configuration updated', this.config);
  }

  /**
   * Obtient la configuration actuelle
   */
  getConfig(): RetryConfig {
    return { ...this.config };
  }
}

/**
 * Circuit breaker avancé pour éviter les retry excessifs avec gestion d'erreurs par catégorie
 */
export class CircuitBreaker {
  private failures = 0;
  private consecutiveFailures = 0;
  private lastFailureTime = 0;
  private lastSuccessTime = Date.now();
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private halfOpenSuccesses = 0;
  private failuresByCategory: Map<ErrorCategory, number> = new Map();
  private criticalErrorCount = 0;
  
  private logger = {
    debug: (msg: string, data?: any) => {
      if (process.env.DB_DEBUG === 'true') {
        console.debug(`[CircuitBreaker] ${msg}`, data ? JSON.stringify(data) : '');
      }
    },
    warn: (msg: string, data?: any) => {
      console.warn(`[CircuitBreaker] ${msg}`, data ? JSON.stringify(data) : '');
    },
    error: (msg: string, data?: any) => {
      console.error(`[CircuitBreaker] ${msg}`, data ? JSON.stringify(data) : '');
    },
  };
  
  constructor(
    private failureThreshold: number = 5,
    private recoveryTimeout: number = 60000, // 1 minute
    private successThreshold: number = 2,
    private criticalErrorThreshold: number = 2 // Seuil pour les erreurs critiques
  ) {
    // Initialiser les compteurs par catégorie
    Object.values(ErrorCategory).forEach(category => {
      this.failuresByCategory.set(category, 0);
    });
  }

  /**
   * Vérifie si le circuit breaker permet l'exécution
   */
  canExecute(): boolean {
    const now = Date.now();

    switch (this.state) {
      case 'CLOSED':
        return true;
      
      case 'OPEN':
        if (now - this.lastFailureTime >= this.recoveryTimeout) {
          this.state = 'HALF_OPEN';
          this.halfOpenSuccesses = 0;
          this.logger.debug('Circuit breaker transitioning to HALF_OPEN', {
            timeSinceLastFailure: now - this.lastFailureTime,
            recoveryTimeout: this.recoveryTimeout
          });
          return true;
        }
        return false;
      
      case 'HALF_OPEN':
        return true;
      
      default:
        return false;
    }
  }

  /**
   * Enregistre un succès avec gestion de l'état HALF_OPEN
   */
  recordSuccess(): void {
    this.lastSuccessTime = Date.now();
    this.consecutiveFailures = 0;

    if (this.state === 'HALF_OPEN') {
      this.halfOpenSuccesses++;
      this.logger.debug('Success recorded in HALF_OPEN state', {
        halfOpenSuccesses: this.halfOpenSuccesses,
        successThreshold: this.successThreshold
      });

      if (this.halfOpenSuccesses >= this.successThreshold) {
        this.state = 'CLOSED';
        this.failures = 0;
        this.criticalErrorCount = 0;
        this.failuresByCategory.clear();
        Object.values(ErrorCategory).forEach(category => {
          this.failuresByCategory.set(category, 0);
        });
        this.logger.debug('Circuit breaker transitioned to CLOSED after recovery');
      }
    } else if (this.state === 'CLOSED') {
      // Réduire progressivement le compteur d'échecs lors des succès
      if (this.failures > 0) {
        this.failures = Math.max(0, this.failures - 1);
      }
    }
  }

  /**
   * Enregistre un échec avec catégorisation d'erreur
   */
  recordFailure(errorCategory?: ErrorCategory): void {
    this.failures++;
    this.consecutiveFailures++;
    this.lastFailureTime = Date.now();

    // Compter les échecs par catégorie
    if (errorCategory) {
      const currentCount = this.failuresByCategory.get(errorCategory) || 0;
      this.failuresByCategory.set(errorCategory, currentCount + 1);

      // Traitement spécial pour les erreurs critiques
      if (errorCategory === ErrorCategory.CRITICAL) {
        this.criticalErrorCount++;
        this.logger.error('Critical error recorded', {
          criticalErrorCount: this.criticalErrorCount,
          criticalErrorThreshold: this.criticalErrorThreshold
        });

        // Ouvrir immédiatement le circuit pour les erreurs critiques
        if (this.criticalErrorCount >= this.criticalErrorThreshold) {
          this.state = 'OPEN';
          this.logger.error('Circuit breaker opened due to critical errors', {
            criticalErrorCount: this.criticalErrorCount
          });
          return;
        }
      }
    }

    this.logger.debug('Failure recorded', {
      failures: this.failures,
      consecutiveFailures: this.consecutiveFailures,
      errorCategory,
      state: this.state
    });

    // Ouvrir le circuit si le seuil est atteint
    if (this.failures >= this.failureThreshold || this.consecutiveFailures >= this.failureThreshold) {
      if (this.state !== 'OPEN') {
        this.state = 'OPEN';
        this.logger.warn('Circuit breaker opened', {
          failures: this.failures,
          consecutiveFailures: this.consecutiveFailures,
          failureThreshold: this.failureThreshold
        });
      }
    }

    // En état HALF_OPEN, retourner à OPEN immédiatement en cas d'échec
    if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      this.halfOpenSuccesses = 0;
      this.logger.warn('Circuit breaker returned to OPEN from HALF_OPEN due to failure');
    }
  }

  /**
   * Obtient l'état actuel du circuit breaker avec statistiques détaillées
   */
  getState(): {
    state: string;
    failures: number;
    consecutiveFailures: number;
    lastFailureTime: number;
    lastSuccessTime: number;
    halfOpenSuccesses: number;
    criticalErrorCount: number;
    failuresByCategory: Record<string, number>;
    timeUntilRecovery: number;
  } {
    const now = Date.now();
    const timeUntilRecovery = this.state === 'OPEN' 
      ? Math.max(0, this.recoveryTimeout - (now - this.lastFailureTime))
      : 0;

    return {
      state: this.state,
      failures: this.failures,
      consecutiveFailures: this.consecutiveFailures,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      halfOpenSuccesses: this.halfOpenSuccesses,
      criticalErrorCount: this.criticalErrorCount,
      failuresByCategory: Object.fromEntries(this.failuresByCategory),
      timeUntilRecovery,
    };
  }

  /**
   * Force la réinitialisation du circuit breaker (pour les tests ou la maintenance)
   */
  reset(): void {
    this.state = 'CLOSED';
    this.failures = 0;
    this.consecutiveFailures = 0;
    this.halfOpenSuccesses = 0;
    this.criticalErrorCount = 0;
    this.lastFailureTime = 0;
    this.lastSuccessTime = Date.now();
    this.failuresByCategory.clear();
    Object.values(ErrorCategory).forEach(category => {
      this.failuresByCategory.set(category, 0);
    });
    this.logger.debug('Circuit breaker reset');
  }

  /**
   * Vérifie si le circuit breaker est dans un état sain
   */
  isHealthy(): boolean {
    return this.state === 'CLOSED' && this.consecutiveFailures === 0;
  }
}