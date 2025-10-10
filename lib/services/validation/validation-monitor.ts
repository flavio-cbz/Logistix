import { getLogger } from "@/lib/utils/logging/simple-logger";

const logger = getLogger("ValidationMonitor");

/**
 * Represents the status of a validation.
 */
export type ValidationStatus =
  | "PENDING"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

/**
 * Defines the performance metrics for a validation.
 */
export interface ValidationMetrics {
  startTime: number;
  endTime?: number;
  durationSeconds?: number;
  apiCalls: number;
  successfulApiCalls: number;
  failedApiCalls: number;
}

/**
 * Represents a critical error that occurred during validation.
 */
export interface ValidationError {
  message: string;
  timestamp: string;
  details?: Record<string, unknown>; // Utilisation de unknown pour un typage plus sûr
}

/**
 * Encapsulates the complete monitoring state for a validation session.
 */
export interface MonitoringState {
  status: ValidationStatus;
  progress: number;
  metrics: ValidationMetrics;
  errors: ValidationError[];
  alerts: string[];
}

/**
 * The ValidationMonitor service centralizes monitoring, metrics collection,
 * and alerting for the Vinted validation process.
 */
export class ValidationMonitor {
  private state: MonitoringState;

  constructor() {
    this.state = this.getInitialState();
    logger.info("ValidationMonitor initialized.");
  }

  /**
   * Resets the monitor to its initial state for a new validation run.
   */
  public reset(): void {
    this.state = this.getInitialState();
    logger.info("ValidationMonitor has been reset.");
  }

  /**
   * Returns the current monitoring state.
   */
  public getState(): MonitoringState {
    return { ...this.state };
  }

  /**
   * Starts the monitoring process for a new validation.
   */
  public start(): void {
    this.state.status = "RUNNING";
    this.state.metrics.startTime = Date.now();
    logger.info("Validation monitoring started.");
  }

  /**
   * Completes the validation monitoring, calculating final metrics.
   */
  public complete(): void {
    if (this.state.status === "RUNNING") {
      this.state.status = "COMPLETED";
      this.state.progress = 100;
      this.finalizeMetrics();
      logger.info(
        `Validation monitoring completed. Duration: ${this.state.metrics.durationSeconds ?? 0}s`,
      );
    }
  }

  /**
   * Marks the validation as failed and logs the error.
   * @param errorMessage - The primary error message.
   * @param details - Additional context for the error.
   */
  public fail(errorMessage: string, details?: Record<string, unknown>): void {
    this.state.status = "FAILED";
    this.finalizeMetrics();
    this.logError(errorMessage, details);
    this.triggerAlert(`Validation failed: ${errorMessage}`);
    logger.error(`Validation failed: ${errorMessage}`, details);
  }

  /**
   * Updates the progress of the validation.
   * @param progress - The new progress percentage (0-100).
   */
  public updateProgress(progress: number): void {
    if (progress >= 0 && progress <= 100) {
      this.state.progress = progress;
    } else {
      logger.warn(
        `Invalid progress value: ${progress}. Progress must be between 0 and 100.`,
      );
    }
  }

  /**
   * Records a successful API call.
   */
  public recordSuccessfulApiCall(): void {
    this.state.metrics.apiCalls++;
    this.state.metrics.successfulApiCalls++;
  }

  /**
   * Records a failed API call.
   */
  public recordFailedApiCall(): void {
    this.state.metrics.apiCalls++;
    this.state.metrics.failedApiCalls++;
  }

  /**
   * Logs a critical error and adds it to the state.
   * @param message - The error message.
   * @param details - Optional details about the error.
   */
  public logError(message: string, details?: Record<string, unknown>): void {
    const error: ValidationError = {
      message,
      details: details || {},
      timestamp: new Date().toISOString(),
    };
    this.state.errors.push(error);
    logger.error(`Logged error: ${message}`, details);
  }

  /**
   * Triggers an alert for critical issues.
   * In a real system, this would integrate with services like PagerDuty, Slack, or email.
   * For this implementation, we'll log it and add it to the state.
   * @param message - The alert message.
   */
  public triggerAlert(message: string): void {
    logger.warn(`ALERT: ${message}`);
    this.state.alerts.push(message);
  }

  /**
   * Provides the initial state for the monitor.
   */
  private getInitialState(): MonitoringState {
    return {
      status: "PENDING",
      progress: 0,
      metrics: {
        startTime: 0,
        apiCalls: 0,
        successfulApiCalls: 0,
        failedApiCalls: 0,
      },
      errors: [],
      alerts: [],
    };
  }

  /**
   * Calculates the duration of the validation.
   */
  private finalizeMetrics(): void {
    this.state.metrics.endTime = Date.now();
    this.state.metrics.durationSeconds =
      (this.state.metrics.endTime - this.state.metrics.startTime) / 1000;
  }
}

export const validationMonitor = new ValidationMonitor();
