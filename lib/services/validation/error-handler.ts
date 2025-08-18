/**
 * Comprehensive Error Handler and Recovery Service
 * Implements retry logic, fallback mechanisms, error categorization, and graceful degradation
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

// Simple logger disabled
// import { getLogger } from '../../utils/simple-logger.js';

// Simple logger disabled
const logger = { 
  trace: console.log, 
  error: console.error, 
  warn: console.warn,
  debug: console.log,
  info: console.log
};

/**
 * Error categories for systematic error handling
 */
export enum ErrorCategory {
  TOKEN_ERROR = 'TOKEN_ERROR',
  API_ERROR = 'API_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR'
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

/**
 * Recovery strategy types
 */
export enum RecoveryStrategy {
  RETRY = 'RETRY',
  FALLBACK = 'FALLBACK',
  SKIP = 'SKIP',
  ABORT = 'ABORT',
  DEGRADE = 'DEGRADE'
}

/**
 * Categorized error interface
 */
export interface CategorizedError {
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  originalError: Error | unknown;
  context?: Record<string, any>;
  timestamp: string;
  recoveryStrategy: RecoveryStrategy;
  retryable: boolean;
  maxRetries?: number;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
  retryableErrors: ErrorCategory[];
}

/**
 * Fallback configuration
 */
export interface FallbackConfig {
  enabled: boolean;
  fallbackFunction?: () => Promise<any>;
  fallbackValue?: any;
  degradedMode: boolean;
}

/**
 * Recovery result
 */
export interface RecoveryResult<T = any> {
  success: boolean;
  result?: T;
  error?: CategorizedError;
  attemptsUsed: number;
  recoveryStrategy: RecoveryStrategy;
  degradedMode: boolean;
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitter: true,
  retryableErrors: [
    ErrorCategory.NETWORK_ERROR,
    ErrorCategory.TIMEOUT_ERROR,
    ErrorCategory.API_ERROR
  ]
};

/**
 * Comprehensive Error Handler class
 */
export class ErrorHandler {
  private static instance: ErrorHandler;
  private retryConfig: RetryConfig;
  private errorHistory: CategorizedError[] = [];
  private degradedMode: boolean = false;

  private constructor(retryConfig?: Partial<RetryConfig>) {
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  }

  /**
   * Get singleton instance
   */
  public static getInstance(retryConfig?: Partial<RetryConfig>): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler(retryConfig);
    }
    return ErrorHandler.instance;
  }

  /**
   * Categorize error based on type and context
   */
  public categorizeError(error: Error | unknown, context?: Record<string, any>): CategorizedError {
    const timestamp = new Date().toISOString();
    let category: ErrorCategory;
    let severity: ErrorSeverity;
    let recoveryStrategy: RecoveryStrategy;
    let retryable: boolean;
    let maxRetries: number | undefined;

    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : 'UnknownError';

    // Categorize based on error patterns
    if (this.isTokenError(errorMessage, errorName)) {
      category = ErrorCategory.TOKEN_ERROR;
      severity = ErrorSeverity.HIGH;
      recoveryStrategy = RecoveryStrategy.ABORT;
      retryable = false;
    } else if (this.isNetworkError(errorMessage, errorName)) {
      category = ErrorCategory.NETWORK_ERROR;
      severity = ErrorSeverity.MEDIUM;
      recoveryStrategy = RecoveryStrategy.RETRY;
      retryable = true;
      maxRetries = 5;
    } else if (this.isTimeoutError(errorMessage, errorName)) {
      category = ErrorCategory.TIMEOUT_ERROR;
      severity = ErrorSeverity.MEDIUM;
      recoveryStrategy = RecoveryStrategy.RETRY;
      retryable = true;
      maxRetries = 3;
    } else if (this.isApiError(errorMessage, errorName, context)) {
      category = ErrorCategory.API_ERROR;
      severity = this.getApiErrorSeverity(errorMessage, context);
      recoveryStrategy = this.getApiRecoveryStrategy(errorMessage, context);
      retryable = this.isApiErrorRetryable(errorMessage, context);
      maxRetries = retryable ? 3 : undefined;
    } else if (this.isDatabaseError(errorMessage, errorName)) {
      category = ErrorCategory.DATABASE_ERROR;
      severity = ErrorSeverity.HIGH;
      recoveryStrategy = RecoveryStrategy.FALLBACK;
      retryable = false;
    } else if (this.isValidationError(errorMessage, errorName)) {
      category = ErrorCategory.VALIDATION_ERROR;
      severity = ErrorSeverity.LOW;
      recoveryStrategy = RecoveryStrategy.SKIP;
      retryable = false;
    } else if (this.isConfigurationError(errorMessage, errorName)) {
      category = ErrorCategory.CONFIGURATION_ERROR;
      severity = ErrorSeverity.CRITICAL;
      recoveryStrategy = RecoveryStrategy.ABORT;
      retryable = false;
    } else {
      category = ErrorCategory.SYSTEM_ERROR;
      severity = ErrorSeverity.MEDIUM;
      recoveryStrategy = RecoveryStrategy.RETRY;
      retryable = true;
      maxRetries = 2;
    }

    const categorizedError: CategorizedError = {
      category,
      severity,
      message: errorMessage,
      originalError: error,
      context: context || {},
      timestamp,
      recoveryStrategy,
      retryable,
      maxRetries
    };

    // Add to error history
    this.errorHistory.push(categorizedError);
    
    // Keep only last 100 errors
    if (this.errorHistory.length > 100) {
      this.errorHistory = this.errorHistory.slice(-100);
    }

    logger.warn(`Error categorized: ${category} (${severity})`, {
      message: errorMessage,
      category,
      severity,
      recoveryStrategy,
      retryable
    });

    return categorizedError;
  }

  /**
   * Execute operation with comprehensive error handling and recovery
   */
  public async executeWithRecovery<T>(
    operation: () => Promise<T>,
    operationName: string,
    context?: Record<string, any>,
    fallbackConfig?: FallbackConfig
  ): Promise<RecoveryResult<T>> {
    let lastError: CategorizedError | undefined;
    let attemptsUsed = 0;
    const maxAttempts = this.retryConfig.maxRetries + 1;

    logger.info(`Starting operation with recovery: ${operationName}`, { context });

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      attemptsUsed = attempt;
      
      try {
        
        const result = await operation();
        
        if (attempt > 1) {
          logger.info(`Operation succeeded after ${attempt} attempts: ${operationName}`);
        }
        
        return {
          success: true,
          result,
          attemptsUsed,
          recoveryStrategy: attempt > 1 ? RecoveryStrategy.RETRY : RecoveryStrategy.RETRY,
          degradedMode: this.degradedMode
        };

      } catch (error) {
        const categorizedError = this.categorizeError(error, { 
          ...context, 
          operationName, 
          attempt, 
          maxAttempts 
        });
        
        lastError = categorizedError;

        logger.warn(`Attempt ${attempt} failed for operation: ${operationName}`, {
          error: categorizedError.message,
          category: categorizedError.category,
          severity: categorizedError.severity
        });

        // Check if we should retry
        if (attempt < maxAttempts && this.shouldRetry(categorizedError)) {
          const delay = this.calculateRetryDelay(attempt - 1);
          logger.info(`Retrying operation ${operationName} in ${delay}ms (attempt ${attempt + 1}/${maxAttempts})`);
          await this.sleep(delay);
          continue;
        }

        // No more retries, check for fallback or degradation
        break;
      }
    }

    // Operation failed, try recovery strategies
    if (lastError) {
      return await this.handleFailedOperation(lastError, operationName, fallbackConfig, attemptsUsed);
    }

    // Should not reach here, but handle gracefully
    return {
      success: false,
      error: {
        category: ErrorCategory.SYSTEM_ERROR,
        severity: ErrorSeverity.HIGH,
        message: `Operation ${operationName} failed with unknown error`,
        originalError: new Error('Unknown error'),
        timestamp: new Date().toISOString(),
        recoveryStrategy: RecoveryStrategy.ABORT,
        retryable: false
      },
      attemptsUsed,
      recoveryStrategy: RecoveryStrategy.ABORT,
      degradedMode: this.degradedMode
    };
  }

  /**
   * Handle failed operation with appropriate recovery strategy
   */
  private async handleFailedOperation<T>(
    error: CategorizedError,
    operationName: string,
    fallbackConfig?: FallbackConfig,
    attemptsUsed: number = 0
  ): Promise<RecoveryResult<T>> {
    logger.error(`Operation failed: ${operationName}`, {
      category: error.category,
      severity: error.severity,
      recoveryStrategy: error.recoveryStrategy
    });

    switch (error.recoveryStrategy) {
      case RecoveryStrategy.FALLBACK:
        return await this.executeFallback(error, operationName, fallbackConfig, attemptsUsed);
      
      case RecoveryStrategy.DEGRADE:
        return await this.executeDegradedMode(error, operationName, fallbackConfig, attemptsUsed);
      
      case RecoveryStrategy.SKIP:
        logger.info(`Skipping failed operation: ${operationName}`);
        return {
          success: false,
          error,
          attemptsUsed,
          recoveryStrategy: RecoveryStrategy.SKIP,
          degradedMode: this.degradedMode
        };
      
      case RecoveryStrategy.ABORT:
      default:
        logger.error(`Aborting due to critical error in operation: ${operationName}`);
        return {
          success: false,
          error,
          attemptsUsed,
          recoveryStrategy: RecoveryStrategy.ABORT,
          degradedMode: this.degradedMode
        };
    }
  }

  /**
   * Execute fallback mechanism
   */
  private async executeFallback<T>(
    error: CategorizedError,
    operationName: string,
    fallbackConfig?: FallbackConfig,
    attemptsUsed: number = 0
  ): Promise<RecoveryResult<T>> {
    if (!fallbackConfig?.enabled) {
      logger.warn(`No fallback configured for operation: ${operationName}`);
      return {
        success: false,
        error,
        attemptsUsed,
        recoveryStrategy: RecoveryStrategy.FALLBACK,
        degradedMode: this.degradedMode
      };
    }

    try {
      logger.info(`Executing fallback for operation: ${operationName}`);
      
      let result: T;
      if (fallbackConfig.fallbackFunction) {
        result = await fallbackConfig.fallbackFunction();
      } else if (fallbackConfig.fallbackValue !== undefined) {
        result = fallbackConfig.fallbackValue;
      } else {
        throw new Error('No fallback function or value provided');
      }

      if (fallbackConfig.degradedMode) {
        this.degradedMode = true;
        logger.warn(`Entering degraded mode due to fallback in operation: ${operationName}`);
      }

      return {
        success: true,
        result,
        attemptsUsed,
        recoveryStrategy: RecoveryStrategy.FALLBACK,
        degradedMode: this.degradedMode
      };

    } catch (fallbackError) {
      const categorizedFallbackError = this.categorizeError(fallbackError, {
        operationName,
        fallbackAttempt: true
      });

      logger.error(`Fallback failed for operation: ${operationName}`, {
        fallbackError: categorizedFallbackError.message
      });

      return {
        success: false,
        error: categorizedFallbackError,
        attemptsUsed,
        recoveryStrategy: RecoveryStrategy.FALLBACK,
        degradedMode: this.degradedMode
      };
    }
  }

  /**
   * Execute degraded mode
   */
  private async executeDegradedMode<T>(
    error: CategorizedError,
    operationName: string,
    fallbackConfig?: FallbackConfig,
    attemptsUsed: number = 0
  ): Promise<RecoveryResult<T>> {
    this.degradedMode = true;
    logger.warn(`Entering degraded mode for operation: ${operationName}`);

    // Try fallback in degraded mode
    if (fallbackConfig?.enabled) {
      const fallbackResult = await this.executeFallback<T>(error, operationName, {
        ...fallbackConfig,
        degradedMode: true
      }, attemptsUsed);

      return {
        ...fallbackResult,
        recoveryStrategy: RecoveryStrategy.DEGRADE,
        degradedMode: true,
      };
    }

    return {
      success: false,
      error,
      attemptsUsed,
      recoveryStrategy: RecoveryStrategy.DEGRADE,
      degradedMode: true
    };
  }

  /**
   * Check if error should be retried
   */
  private shouldRetry(error: CategorizedError): boolean {
    if (!error.retryable) {
      return false;
    }

    if (!this.retryConfig.retryableErrors.includes(error.category)) {
      return false;
    }

    // Check if we've seen too many similar errors recently
    const recentSimilarErrors = this.errorHistory
      .filter(e => e.category === error.category && 
                   Date.now() - new Date(e.timestamp).getTime() < 60000) // Last minute
      .length;

    if (recentSimilarErrors > 10) {
      logger.warn(`Too many similar errors recently, skipping retry for category: ${error.category}`);
      return false;
    }

    return true;
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   */
  private calculateRetryDelay(attemptNumber: number): number {
    const exponentialDelay = Math.min(
      this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attemptNumber),
      this.retryConfig.maxDelay
    );

    if (!this.retryConfig.jitter) {
      return exponentialDelay;
    }

    // Add jitter (±25% of the delay)
    const jitterRange = exponentialDelay * 0.25;
    const jitter = (Math.random() - 0.5) * 2 * jitterRange;
    
    return Math.max(0, exponentialDelay + jitter);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Error detection methods

  private isTokenError(message: string, name: string): boolean {
    const tokenPatterns = [
      /token.*invalid/i,
      /token.*expired/i,
      /unauthorized/i,
      /authentication.*failed/i,
      /invalid.*credentials/i,
      /access.*denied/i
    ];
    return tokenPatterns.some(pattern => pattern.test(message)) || name === 'AuthenticationError';
  }

  private isNetworkError(message: string, name: string): boolean {
    const networkPatterns = [
      /network.*error/i,
      /connection.*refused/i,
      /connection.*reset/i,
      /connection.*timeout/i,
      /dns.*error/i,
      /host.*unreachable/i,
      /econnrefused/i,
      /enotfound/i,
      /etimedout/i
    ];
    return networkPatterns.some(pattern => pattern.test(message)) || 
           ['NetworkError', 'TypeError'].includes(name);
  }

  private isTimeoutError(message: string, name: string): boolean {
    const timeoutPatterns = [
      /timeout/i,
      /timed.*out/i,
      /request.*timeout/i,
      /operation.*timeout/i
    ];
    return timeoutPatterns.some(pattern => pattern.test(message)) || 
           name === 'TimeoutError' || 
           name === 'AbortError';
  }

  private isApiError(message: string, name: string, context?: Record<string, any>): boolean {
    const apiPatterns = [
      /api.*error/i,
      /http.*error/i,
      /status.*[45]\d\d/i,
      /bad.*request/i,
      /server.*error/i,
      /service.*unavailable/i
    ];
    
    const hasApiContext = context && (
      context.statusCode || 
      context.responseStatus || 
      context.apiCall
    );

    return apiPatterns.some(pattern => pattern.test(message)) || 
           hasApiContext ||
           name === 'HTTPError';
  }

  private isDatabaseError(message: string, name: string): boolean {
    const dbPatterns = [
      /database.*error/i,
      /sql.*error/i,
      /constraint.*violation/i,
      /foreign.*key/i,
      /unique.*constraint/i,
      /table.*not.*found/i,
      /column.*not.*found/i
    ];
    return dbPatterns.some(pattern => pattern.test(message)) || 
           name === 'DatabaseError' || 
           name === 'SQLError';
  }

  private isValidationError(message: string, name: string): boolean {
    const validationPatterns = [
      /validation.*error/i,
      /invalid.*input/i,
      /invalid.*format/i,
      /required.*field/i,
      /missing.*parameter/i,
      /out.*of.*range/i
    ];
    return validationPatterns.some(pattern => pattern.test(message)) || 
           name === 'ValidationError';
  }

  private isConfigurationError(message: string, name: string): boolean {
    const configPatterns = [
      /configuration.*error/i,
      /config.*missing/i,
      /environment.*variable/i,
      /missing.*required.*config/i,
      /invalid.*configuration/i
    ];
    return configPatterns.some(pattern => pattern.test(message)) || 
           name === 'ConfigurationError';
  }

  private getApiErrorSeverity(message: string, context?: Record<string, any>): ErrorSeverity {
    const statusCode = context?.statusCode || context?.responseStatus;
    
    if (statusCode >= 500) return ErrorSeverity.HIGH;
    if (statusCode >= 400) return ErrorSeverity.MEDIUM;
    
    if (message.includes('rate limit')) return ErrorSeverity.MEDIUM;
    if (message.includes('quota exceeded')) return ErrorSeverity.HIGH;
    
    return ErrorSeverity.MEDIUM;
  }

  private getApiRecoveryStrategy(message: string, context?: Record<string, any>): RecoveryStrategy {
    const statusCode = context?.statusCode || context?.responseStatus;
    
    if (statusCode === 429) return RecoveryStrategy.RETRY; // Rate limit
    if (statusCode >= 500) return RecoveryStrategy.RETRY; // Server error
    if (statusCode === 404) return RecoveryStrategy.SKIP; // Not found
    if (statusCode === 401 || statusCode === 403) return RecoveryStrategy.ABORT; // Auth error
    
    return RecoveryStrategy.FALLBACK;
  }

  private isApiErrorRetryable(message: string, context?: Record<string, any>): boolean {
    const statusCode = context?.statusCode || context?.responseStatus;
    
    // Retryable status codes
    const retryableStatusCodes = [429, 500, 502, 503, 504];
    if (statusCode && retryableStatusCodes.includes(statusCode)) {
      return true;
    }
    
    // Non-retryable status codes
    const nonRetryableStatusCodes = [400, 401, 403, 404, 422];
    if (statusCode && nonRetryableStatusCodes.includes(statusCode)) {
      return false;
    }
    
    return true; // Default to retryable for unknown API errors
  }

  /**
   * Get error statistics
   */
  public getErrorStatistics(): {
    totalErrors: number;
    errorsByCategory: Record<ErrorCategory, number>;
    errorsBySeverity: Record<ErrorSeverity, number>;
    recentErrors: CategorizedError[];
    degradedMode: boolean;
  } {
    const errorsByCategory = {} as Record<ErrorCategory, number>;
    const errorsBySeverity = {} as Record<ErrorSeverity, number>;

    // Initialize counters
    Object.values(ErrorCategory).forEach(category => {
      errorsByCategory[category] = 0;
    });
    Object.values(ErrorSeverity).forEach(severity => {
      errorsBySeverity[severity] = 0;
    });

    // Count errors
    this.errorHistory.forEach(error => {
      errorsByCategory[error.category]++;
      errorsBySeverity[error.severity]++;
    });

    // Get recent errors (last 10 minutes)
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    const recentErrors = this.errorHistory.filter(
      error => new Date(error.timestamp).getTime() > tenMinutesAgo
    );

    return {
      totalErrors: this.errorHistory.length,
      errorsByCategory,
      errorsBySeverity,
      recentErrors,
      degradedMode: this.degradedMode
    };
  }

  /**
   * Clear error history
   */
  public clearErrorHistory(): void {
    this.errorHistory = [];
    logger.info('Error history cleared');
  }

  /**
   * Reset degraded mode
   */
  public resetDegradedMode(): void {
    this.degradedMode = false;
    logger.info('Degraded mode reset');
  }

  /**
   * Check if system is in degraded mode
   */
  public isDegradedMode(): boolean {
    return this.degradedMode;
  }

  /**
   * Update retry configuration
   */
  public updateRetryConfig(newConfig: Partial<RetryConfig>): void {
    this.retryConfig = { ...this.retryConfig, ...newConfig };
    logger.info('Retry configuration updated', this.retryConfig);
  }
}

/**
 * Export singleton instance
 */
export const errorHandler = ErrorHandler.getInstance();