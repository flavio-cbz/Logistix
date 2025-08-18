/**
 * Vinted Validation - Recovery Strategies
 * Implements robust recovery mechanisms like exponential backoff and fallbacks.
 */

// Simple logger disabled
// import { getLogger } from '@/lib/utils/simple-logger.js';
import { ApiError, AppError, TimeoutError, categorizeError, ErrorCategory } from './error-types';

import { getLogger } from '@/lib/utils/logging/simple-logger';

const logger = getLogger('RecoveryStrategies');

/**
 * Configuration for the retry mechanism.
 */
export interface RetryConfig {
  attempts: number;
  initialDelay: number; // in milliseconds
  maxDelay?: number;    // in milliseconds
  factor: number;       // exponential factor
  jitter: boolean;      // add randomness to delay
  shouldRetry: (error: Error) => boolean;
}

/**
 * Default retry configuration for API calls.
 * Retries on network errors, rate limits, and server errors.
 */
export const defaultApiRetryConfig: RetryConfig = {
  attempts: 4, // Total attempts = 1 initial + 3 retries
  initialDelay: 500,
  maxDelay: 5000,
  factor: 2,
  jitter: true,
  shouldRetry: (error: Error) => {
    const categorized = categorizeError(error);
    return [
      ErrorCategory.ApiConnection,
      ErrorCategory.ApiRateLimit,
      ErrorCategory.ApiServerError,
    ].includes(categorized.category);
  },
};

/**
 * Executes an async function with an exponential backoff retry strategy.
 *
 * @param fn The async function to execute.
 * @param config The retry configuration.
 * @returns The result of the async function.
 * @throws The last error if all attempts fail.
 */
export async function withExponentialBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig = defaultApiRetryConfig
): Promise<T> {
  let lastError: Error = new AppError('Retry mechanism failed without a specific error.');
  
  for (let i = 0; i < config.attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (!config.shouldRetry(lastError) || i === config.attempts - 1) {
        logger.error(`Final attempt failed. No more retries. Error: ${lastError.message}`);
        throw lastError;
      }

      let delay = config.initialDelay * Math.pow(config.factor, i);
      if (config.maxDelay) {
        delay = Math.min(delay, config.maxDelay);
      }
      if (config.jitter) {
        delay = delay * (1 + Math.random());
      }

      logger.warn(
        `Attempt ${i + 1}/${config.attempts} failed. Retrying in ${Math.round(delay)}ms. Error: ${lastError.message}`
      );
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError; // Should be unreachable, but satisfies TypeScript
}

/**
 * Wraps a promise with a timeout.
 * @param promise The promise to wrap.
 * @param timeout The timeout in milliseconds.
 * @param operationName A descriptive name for the operation being timed out.
 * @returns The result of the promise.
 * @throws {TimeoutError} if the promise does not resolve within the timeout.
 */
export async function withTimeout<T>(
    promise: Promise<T>,
    timeout: number,
    operationName: string = 'Unnamed operation'
): Promise<T> {
    let timeoutHandle: NodeJS.Timeout;

    const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
            reject(new TimeoutError(operationName, timeout));
        }, timeout);
    });

    try {
        return await Promise.race([promise, timeoutPromise]);
    } finally {
        clearTimeout(timeoutHandle);
    }
}

/**
 * Configuration for a fallback mechanism.
 */
export interface FallbackConfig<T> {
  fallback: () => T | Promise<T>;
  shouldFallback: (error: Error) => boolean;
}

/**
 * Executes a primary function and falls back to a secondary function on specific errors.
 *
 * @param primaryFn The main function to execute.
 * @param fallbackConfig The fallback configuration.
 * @returns The result of the primary function or the fallback function.
 */
export async function withFallback<T>(
  primaryFn: () => Promise<T>,
  fallbackConfig: FallbackConfig<T>
): Promise<T> {
  try {
    return await primaryFn();
  } catch (error) {
    const originalError = error instanceof Error ? error : new Error(String(error));
    if (fallbackConfig.shouldFallback(originalError)) {
      logger.warn(`Primary function failed. Executing fallback. Error: ${originalError.message}`);
      return await fallbackConfig.fallback();
    }
    throw originalError;
  }
}