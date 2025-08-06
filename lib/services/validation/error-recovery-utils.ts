/**
 * Error Recovery Utilities
 * Utility functions and decorators for easy integration of error handling
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { ErrorHandler, FallbackConfig, RecoveryResult, ErrorCategory } from './error-handler';
// Simple logger disabled
// import { getLogger } from '@/lib/utils/simple-logger.js';

// Simple logger disabled
const logger = { 
  trace: console.log, 
  error: console.error, 
  warn: console.warn,
  debug: console.log,
  info: console.log
};

/**
 * Decorator for automatic error handling and recovery
 */
export function withErrorRecovery(
  operationName?: string,
  fallbackConfig?: FallbackConfig
) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const methodName = operationName || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      const errorHandler = ErrorHandler.getInstance();
      
      const operation = () => originalMethod.apply(this, args);
      const context = {
        className: target.constructor.name,
        methodName: propertyKey,
        arguments: args.length
      };

      const result = await errorHandler.executeWithRecovery(
        operation,
        methodName,
        context,
        fallbackConfig
      );

      if (!result.success) {
        throw result.error?.originalError || new Error(`Operation failed: ${methodName}`);
      }

      return result.result;
    };

    return descriptor;
  };
}

/**
 * Utility function for wrapping async operations with error recovery
 */
export async function executeWithRecovery<T>(
  operation: () => Promise<T>,
  operationName: string,
  fallbackConfig?: FallbackConfig,
  context?: Record<string, any>
): Promise<T> {
  const errorHandler = ErrorHandler.getInstance();
  
  const result = await errorHandler.executeWithRecovery(
    operation,
    operationName,
    context,
    fallbackConfig
  );

  if (!result.success) {
    throw result.error?.originalError || new Error(`Operation failed: ${operationName}`);
  }

  return result.result;
}

/**
 * Utility function for safe execution with optional fallback
 */
export async function safeExecute<T>(
  operation: () => Promise<T>,
  operationName: string,
  fallbackValue?: T,
  context?: Record<string, any>
): Promise<T | undefined> {
  const errorHandler = ErrorHandler.getInstance();
  
  const fallbackConfig: FallbackConfig = {
    enabled: fallbackValue !== undefined,
    fallbackValue,
    degradedMode: false
  };

  const result = await errorHandler.executeWithRecovery(
    operation,
    operationName,
    context,
    fallbackConfig
  );

  return result.success ? result.result : fallbackValue;
}

/**
 * Utility for API calls with automatic retry and fallback
 */
export async function apiCallWithRecovery<T>(
  apiCall: () => Promise<T>,
  endpoint: string,
  fallbackConfig?: FallbackConfig
): Promise<RecoveryResult<T>> {
  const errorHandler = ErrorHandler.getInstance();
  
  const operation = async () => {
    try {
      return await apiCall();
    } catch (error) {
      // Enhance error with API context
      if (error instanceof Error) {
        const response = (error as any).response;
        if (response) {
          (error as any).statusCode = response.status;
          (error as any).responseData = response.data;
        }
      }
      throw error;
    }
  };

  return await errorHandler.executeWithRecovery(
    operation,
    `API Call: ${endpoint}`,
    { endpoint, apiCall: true },
    fallbackConfig
  );
}

/**
 * Utility for database operations with recovery
 */
export async function databaseOperationWithRecovery<T>(
  dbOperation: () => Promise<T>,
  operationName: string,
  fallbackConfig?: FallbackConfig
): Promise<RecoveryResult<T>> {
  const errorHandler = ErrorHandler.getInstance();
  
  return await errorHandler.executeWithRecovery(
    dbOperation,
    `DB Operation: ${operationName}`,
    { database: true, operation: operationName },
    fallbackConfig
  );
}

/**
 * Batch operation with partial failure handling
 */
export async function batchOperationWithRecovery<T, R>(
  items: T[],
  operation: (item: T, index: number) => Promise<R>,
  operationName: string,
  options: {
    continueOnFailure?: boolean;
    maxFailures?: number;
    fallbackValue?: R;
  } = {}
): Promise<{
  results: (R | undefined)[];
  failures: { index: number; item: T; error: any }[];
  successCount: number;
  failureCount: number;
}> {
  const {
    continueOnFailure = true,
    maxFailures = Infinity,
    fallbackValue
  } = options;

  const results: (R | undefined)[] = [];
  const failures: { index: number; item: T; error: any }[] = [];
  let failureCount = 0;

  logger.info(`Starting batch operation: ${operationName}`, {
    itemCount: items.length,
    continueOnFailure,
    maxFailures
  });

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    
    try {
      const result = await safeExecute(
        () => operation(item, i),
        `${operationName}[${i}]`,
        fallbackValue,
        { batchOperation: true, itemIndex: i }
      );
      
      results.push(result);
      
    } catch (error) {
      failureCount++;
      failures.push({ index: i, item, error });
      results.push(fallbackValue);
      
      logger.warn(`Batch operation item ${i} failed: ${operationName}`, {
        error: error instanceof Error ? error.message : String(error)
      });

      if (!continueOnFailure || failureCount >= maxFailures) {
        logger.error(`Batch operation aborted: ${operationName}`, {
          failureCount,
          maxFailures,
          continueOnFailure
        });
        break;
      }
    }
  }

  const successCount = results.length - failureCount;
  
  logger.info(`Batch operation completed: ${operationName}`, {
    successCount,
    failureCount,
    totalItems: items.length
  });

  return {
    results,
    failures,
    successCount,
    failureCount
  };
}

/**
 * Circuit breaker pattern implementation
 */
export class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private readonly failureThreshold: number = 5,
    private readonly recoveryTimeout: number = 60000, // 1 minute
    private readonly operationName: string = 'Unknown'
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'HALF_OPEN';
        logger.info(`Circuit breaker half-open: ${this.operationName}`);
      } else {
        throw new Error(`Circuit breaker is OPEN for operation: ${this.operationName}`);
      }
    }

    try {
      const result = await operation();
      
      if (this.state === 'HALF_OPEN') {
        this.reset();
        logger.info(`Circuit breaker closed after recovery: ${this.operationName}`);
      }
      
      return result;
      
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      logger.warn(`Circuit breaker opened: ${this.operationName}`, {
        failures: this.failures,
        threshold: this.failureThreshold
      });
    }
  }

  private reset(): void {
    this.failures = 0;
    this.state = 'CLOSED';
    this.lastFailureTime = 0;
  }

  getState(): { state: string; failures: number; lastFailureTime: number } {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime
    };
  }
}

/**
 * Rate limiter with error handling
 */
export class RateLimiter {
  private requests: number[] = [];

  constructor(
    private readonly maxRequests: number = 10,
    private readonly windowMs: number = 60000 // 1 minute
  ) {}

  async execute<T>(operation: () => Promise<T>, operationName: string): Promise<T> {
    const now = Date.now();
    
    // Clean old requests
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.windowMs - (now - oldestRequest);
      
      logger.warn(`Rate limit exceeded for operation: ${operationName}`, {
        waitTime,
        currentRequests: this.requests.length,
        maxRequests: this.maxRequests
      });
      
      throw new Error(`Rate limit exceeded. Wait ${waitTime}ms before retrying.`);
    }
    
    this.requests.push(now);
    return await operation();
  }

  getStatus(): { currentRequests: number; maxRequests: number; windowMs: number } {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    return {
      currentRequests: this.requests.length,
      maxRequests: this.maxRequests,
      windowMs: this.windowMs
    };
  }
}

/**
 * Timeout wrapper with error recovery
 */
export async function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  operationName: string,
  fallbackConfig?: FallbackConfig
): Promise<T> {
  const errorHandler = ErrorHandler.getInstance();
  
  const timeoutOperation = () => {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Operation timeout after ${timeoutMs}ms: ${operationName}`));
      }, timeoutMs);

      operation()
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  };

  const result = await errorHandler.executeWithRecovery(
    timeoutOperation,
    operationName,
    { timeout: timeoutMs },
    fallbackConfig
  );

  if (!result.success) {
    throw result.error?.originalError || new Error(`Timeout operation failed: ${operationName}`);
  }

  return result.result;
}

/**
 * Graceful degradation helper
 */
export class GracefulDegradation {
  private static instance: GracefulDegradation;
  private degradedFeatures: Set<string> = new Set();
  private featureFallbacks: Map<string, () => any> = new Map();

  public static getInstance(): GracefulDegradation {
    if (!GracefulDegradation.instance) {
      GracefulDegradation.instance = new GracefulDegradation();
    }
    return GracefulDegradation.instance;
  }

  /**
   * Register a feature with its fallback
   */
  registerFeature(featureName: string, fallback: () => any): void {
    this.featureFallbacks.set(featureName, fallback);
    logger.info(`Feature registered for graceful degradation: ${featureName}`);
  }

  /**
   * Degrade a feature
   */
  degradeFeature(featureName: string, reason?: string): void {
    this.degradedFeatures.add(featureName);
    logger.warn(`Feature degraded: ${featureName}`, { reason });
  }

  /**
   * Restore a feature
   */
  restoreFeature(featureName: string): void {
    this.degradedFeatures.delete(featureName);
    logger.info(`Feature restored: ${featureName}`);
  }

  /**
   * Check if a feature is degraded
   */
  isFeatureDegraded(featureName: string): boolean {
    return this.degradedFeatures.has(featureName);
  }

  /**
   * Execute feature with degradation support
   */
  async executeFeature<T>(
    featureName: string,
    primaryOperation: () => Promise<T>,
    fallbackOperation?: () => Promise<T>
  ): Promise<T> {
    if (this.degradedFeatures.has(featureName)) {
      logger.info(`Using degraded mode for feature: ${featureName}`);
      
      const fallback = fallbackOperation || this.featureFallbacks.get(featureName);
      if (fallback) {
        return await fallback();
      }
      
      throw new Error(`Feature ${featureName} is degraded and no fallback available`);
    }

    try {
      return await primaryOperation();
    } catch (error) {
      logger.warn(`Feature failed, attempting degradation: ${featureName}`, {
        error: error instanceof Error ? error.message : String(error)
      });
      
      this.degradeFeature(featureName, 'Primary operation failed');
      
      const fallback = fallbackOperation || this.featureFallbacks.get(featureName);
      if (fallback) {
        return await fallback();
      }
      
      throw error;
    }
  }

  /**
   * Get degradation status
   */
  getDegradationStatus(): {
    degradedFeatures: string[];
    totalFeatures: number;
    degradationPercentage: number;
  } {
    const degradedFeatures = Array.from(this.degradedFeatures);
    const totalFeatures = this.featureFallbacks.size;
    const degradationPercentage = totalFeatures > 0 ? 
      (degradedFeatures.length / totalFeatures) * 100 : 0;

    return {
      degradedFeatures,
      totalFeatures,
      degradationPercentage
    };
  }

  /**
   * Reset all degraded features
   */
  resetAllFeatures(): void {
    const count = this.degradedFeatures.size;
    this.degradedFeatures.clear();
    logger.info(`All degraded features restored`, { restoredCount: count });
  }
}

/**
 * Export singleton instances
 */
export const gracefulDegradation = GracefulDegradation.getInstance();