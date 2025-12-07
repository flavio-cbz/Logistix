<<<<<<< HEAD
import { getLogger } from "@/lib/utils/logging/logger";

const logger = getLogger("RetryManager");

/**
 * Interface pour les options de retry.
 */
interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  backoffFactor?: number;
  retryableErrors?: (new (...args: any[]) => Error)[]; // Changed from any to unknown
  onRetry?: (attempt: number, error: unknown, delay: number) => void; // Changed error to unknown
  onSuccess?: (attempt: number, result: unknown) => void; // Changed result to unknown
  onFinalFailure?: (attempt: number, error: unknown) => void; // Changed error to unknown
}

/**
 * Gestionnaire de retry pour les opérations asynchrones.
 * Permet de retenter une opération en cas d'échec avec un backoff exponentiel.
 */
export class RetryManager {
  private static instance: RetryManager;

  private constructor() {
    // Private constructor to enforce singleton pattern
  }

  public static getInstance(): RetryManager {
    if (!RetryManager.instance) {
      RetryManager.instance = new RetryManager();
    }
    return RetryManager.instance;
  }

  /**
   * Exécute une opération avec une logique de retry.
   * @param operation La fonction asynchrone à exécuter.
   * @param options Les options de retry.
   * @returns La promesse du résultat de l'opération sous forme de RetryResult.
   */
  public async execute<T, A extends unknown[] = unknown[]>(
    operation: (...args: A) => Promise<T>,
    options?: RetryOptions,
    ...args: A
  ): Promise<RetryResult<T>> {
    const maxAttempts = options?.maxAttempts ?? 3;
    const delayMs = options?.delayMs ?? 1000;
    const backoffFactor = options?.backoffFactor ?? 2;
    const retryableErrors = options?.retryableErrors ?? [];
    const startTime = Date.now();

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await operation(...args);
        options?.onSuccess?.(attempt, result);
        return {
          success: true,
          result,
          attempts: attempt,
          totalTime: Date.now() - startTime,
          error: undefined,
        };
      } catch (error: unknown) {
        const isRetryable = retryableErrors.some(
          (ErrorType) => error instanceof ErrorType,
        );
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        if (attempt < maxAttempts && isRetryable) {
          const currentDelay = delayMs * Math.pow(backoffFactor, attempt - 1);
          logger.warn(
            `Attempt ${attempt} failed: ${errorMessage}. Retrying in ${currentDelay}ms...`,
          );
          options?.onRetry?.(attempt, error, currentDelay);
          await new Promise((resolve) => setTimeout(resolve, currentDelay));
        } else {
          logger.error(
            `Operation failed after ${attempt} attempts: ${errorMessage}`,
            { error },
          );
          options?.onFinalFailure?.(attempt, error);
          return {
            success: false,
            result: undefined,
            attempts: attempt,
            totalTime: Date.now() - startTime,
            error,
          };
        }
      }
    }
    // Should theoretically not be reached, but good for type safety
    return {
      success: false,
      result: undefined,
      attempts: maxAttempts,
      totalTime: Date.now() - startTime,
      error: new Error("RetryManager failed to execute operation."),
    };
  }

  /**
   * Alias pour execute (pour compatibilité avec le code existant).
   */
  public async executeWithRetry<T, A extends unknown[] = unknown[]>(
    operation: (...args: A) => Promise<T>,
    options?: RetryOptions,
    ...args: A
  ): Promise<RetryResult<T>> {
    return this.execute<T, A>(operation, options, ...args);
  }

  /**
   * Obtient la configuration actuelle du RetryManager.
   */
  public getConfig(): any {
    return {
      maxAttempts: 3,
      delayMs: 1000,
      backoffFactor: 2,
      retryableErrors: [],
    };
  }

  /**
   * Helper: calcule un délai de base conseillé à partir des timeouts auto (ex: DB)
   */
  public async getSuggestedBaseDelayMs(): Promise<number> {
    try {
      // TODO: Use autoTimeout service when implemented
      // const { autoTimeout } = await import("@/lib/services/auto-timeout");
      // const t = await autoTimeout.getTimeoutFor(kind);
      const t = 5000; // Default 5 seconds timeout
      // Base delay: 1/5 du timeout de l’opération ciblée
      return Math.max(200, Math.floor(t / 5));
    } catch {
      return 1000;
    }
  }

  /**
   * Crée une version "retryable" d'une fonction donnée.
   * @param fn La fonction à rendre retryable.
   * @param options Les options de retry par défaut pour cette fonction.
   * @returns Une nouvelle fonction qui inclut la logique de retry et renvoie un RetryResult.
   */
  public createRetryableFunction<T, A extends unknown[] = unknown[]>(
    fn: (...args: A) => Promise<T>,
    defaultOptions?: RetryOptions,
  ): (...args: A) => Promise<RetryResult<T>> {
    return (...args: A) => this.execute<T, A>(fn, defaultOptions, ...args);
  }
}

export enum ErrorCategory {
  RETRYABLE_LOCK = "RETRYABLE_LOCK",
  RETRYABLE_IO = "RETRYABLE_IO",
  RETRYABLE_RESOURCE = "RETRYABLE_RESOURCE",
  CRITICAL = "CRITICAL",
  NON_RETRYABLE = "NON_RETRYABLE",
  // Added from error-handler.ts, to align with connection-pool.ts
  TOKEN_ERROR = "TOKEN_ERROR",
  API_ERROR = "API_ERROR",
  DATABASE_ERROR = "DATABASE_ERROR",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  NETWORK_ERROR = "NETWORK_ERROR",
  TIMEOUT_ERROR = "TIMEOUT_ERROR",
  SYSTEM_ERROR = "SYSTEM_ERROR",
  CONFIGURATION_ERROR = "CONFIGURATION_ERROR",
}

export interface RetryResult<T> {
  success: boolean;
  result?: T | undefined;
  error?: any;
  attempts: number;
  totalTime: number;
}

export class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";

  constructor(
    private failureThreshold: number,
    private recoveryTimeout: number,
    public operationName?: string, // Make optional
  ) {}

  canExecute(): boolean {
    if (this.state === "OPEN") {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = "HALF_OPEN";
      } else {
        return false;
      }
    }
    return true;
  }

  recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.failures >= this.failureThreshold) {
      this.state = "OPEN";
    }
  }

  recordSuccess(): void {
    if (this.state === "HALF_OPEN") {
      this.failures = 0;
      this.state = "CLOSED";
    }
  }

  getState(): { state: string; failures: number; lastFailureTime: number } {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
    };
  }
}
=======
import { getLogger } from "@/lib/utils/logging/logger";

const logger = getLogger("RetryManager");

/**
 * Interface pour les options de retry.
 */
interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  backoffFactor?: number;
  retryableErrors?: (new (...args: any[]) => Error)[]; // Changed from any to unknown
  onRetry?: (attempt: number, error: unknown, delay: number) => void; // Changed error to unknown
  onSuccess?: (attempt: number, result: unknown) => void; // Changed result to unknown
  onFinalFailure?: (attempt: number, error: unknown) => void; // Changed error to unknown
}

/**
 * Gestionnaire de retry pour les opérations asynchrones.
 * Permet de retenter une opération en cas d'échec avec un backoff exponentiel.
 */
export class RetryManager {
  private static instance: RetryManager;

  private constructor() {
    // Private constructor to enforce singleton pattern
  }

  public static getInstance(): RetryManager {
    if (!RetryManager.instance) {
      RetryManager.instance = new RetryManager();
    }
    return RetryManager.instance;
  }

  /**
   * Exécute une opération avec une logique de retry.
   * @param operation La fonction asynchrone à exécuter.
   * @param options Les options de retry.
   * @returns La promesse du résultat de l'opération sous forme de RetryResult.
   */
  public async execute<T, A extends unknown[] = unknown[]>(
    operation: (...args: A) => Promise<T>,
    options?: RetryOptions,
    ...args: A
  ): Promise<RetryResult<T>> {
    const maxAttempts = options?.maxAttempts ?? 3;
    const delayMs = options?.delayMs ?? 1000;
    const backoffFactor = options?.backoffFactor ?? 2;
    const retryableErrors = options?.retryableErrors ?? [];
    const startTime = Date.now();

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await operation(...args);
        options?.onSuccess?.(attempt, result);
        return {
          success: true,
          result,
          attempts: attempt,
          totalTime: Date.now() - startTime,
          error: undefined,
        };
      } catch (error: unknown) {
        const isRetryable = retryableErrors.some(
          (ErrorType) => error instanceof ErrorType,
        );
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        if (attempt < maxAttempts && isRetryable) {
          const currentDelay = delayMs * Math.pow(backoffFactor, attempt - 1);
          logger.warn(
            `Attempt ${attempt} failed: ${errorMessage}. Retrying in ${currentDelay}ms...`,
          );
          options?.onRetry?.(attempt, error, currentDelay);
          await new Promise((resolve) => setTimeout(resolve, currentDelay));
        } else {
          logger.error(
            `Operation failed after ${attempt} attempts: ${errorMessage}`,
            { error },
          );
          options?.onFinalFailure?.(attempt, error);
          return {
            success: false,
            result: undefined,
            attempts: attempt,
            totalTime: Date.now() - startTime,
            error,
          };
        }
      }
    }
    // Should theoretically not be reached, but good for type safety
    return {
      success: false,
      result: undefined,
      attempts: maxAttempts,
      totalTime: Date.now() - startTime,
      error: new Error("RetryManager failed to execute operation."),
    };
  }

  /**
   * Alias pour execute (pour compatibilité avec le code existant).
   */
  public async executeWithRetry<T, A extends unknown[] = unknown[]>(
    operation: (...args: A) => Promise<T>,
    options?: RetryOptions,
    ...args: A
  ): Promise<RetryResult<T>> {
    return this.execute<T, A>(operation, options, ...args);
  }

  /**
   * Obtient la configuration actuelle du RetryManager.
   */
  public getConfig(): any {
    return {
      maxAttempts: 3,
      delayMs: 1000,
      backoffFactor: 2,
      retryableErrors: [],
    };
  }

  /**
   * Helper: calcule un délai de base conseillé à partir des timeouts auto (ex: DB)
   */
  public async getSuggestedBaseDelayMs(): Promise<number> {
    try {
      // TODO: Use autoTimeout service when implemented
      // const { autoTimeout } = await import("@/lib/services/auto-timeout");
      // const t = await autoTimeout.getTimeoutFor(kind);
      const t = 5000; // Default 5 seconds timeout
      // Base delay: 1/5 du timeout de l’opération ciblée
      return Math.max(200, Math.floor(t / 5));
    } catch {
      return 1000;
    }
  }

  /**
   * Crée une version "retryable" d'une fonction donnée.
   * @param fn La fonction à rendre retryable.
   * @param options Les options de retry par défaut pour cette fonction.
   * @returns Une nouvelle fonction qui inclut la logique de retry et renvoie un RetryResult.
   */
  public createRetryableFunction<T, A extends unknown[] = unknown[]>(
    fn: (...args: A) => Promise<T>,
    defaultOptions?: RetryOptions,
  ): (...args: A) => Promise<RetryResult<T>> {
    return (...args: A) => this.execute<T, A>(fn, defaultOptions, ...args);
  }
}

export enum ErrorCategory {
  RETRYABLE_LOCK = "RETRYABLE_LOCK",
  RETRYABLE_IO = "RETRYABLE_IO",
  RETRYABLE_RESOURCE = "RETRYABLE_RESOURCE",
  CRITICAL = "CRITICAL",
  NON_RETRYABLE = "NON_RETRYABLE",
  // Added from error-handler.ts, to align with connection-pool.ts
  TOKEN_ERROR = "TOKEN_ERROR",
  API_ERROR = "API_ERROR",
  DATABASE_ERROR = "DATABASE_ERROR",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  NETWORK_ERROR = "NETWORK_ERROR",
  TIMEOUT_ERROR = "TIMEOUT_ERROR",
  SYSTEM_ERROR = "SYSTEM_ERROR",
  CONFIGURATION_ERROR = "CONFIGURATION_ERROR",
}

export interface RetryResult<T> {
  success: boolean;
  result?: T | undefined;
  error?: any;
  attempts: number;
  totalTime: number;
}

export class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";

  constructor(
    private failureThreshold: number,
    private recoveryTimeout: number,
    public operationName?: string, // Make optional
  ) {}

  canExecute(): boolean {
    if (this.state === "OPEN") {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = "HALF_OPEN";
      } else {
        return false;
      }
    }
    return true;
  }

  recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.failures >= this.failureThreshold) {
      this.state = "OPEN";
    }
  }

  recordSuccess(): void {
    if (this.state === "HALF_OPEN") {
      this.failures = 0;
      this.state = "CLOSED";
    }
  }

  getState(): { state: string; failures: number; lastFailureTime: number } {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
    };
  }
}
>>>>>>> ad32518644f2ab77a7c59429e3df905bfcc3ef94
