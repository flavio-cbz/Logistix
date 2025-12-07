<<<<<<< HEAD
=======
/**
 * @fileoverview Consolidated utilities index
 * @description Central export point for all shared utilities
 * @version 1.0.0
 * @since 2025-01-10
 */

// Formatting utilities
export {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatDate,
  formatWeight,
  capitalize,
  truncate,
  sleep,
  // Legacy compatibility
  formatEuro,
} from './formatting';

// Logging utilities
export {
  LogLevel,
  type Logger,
  type LogContext,
  type LogEntry,
  UnifiedLogger,
  createLogger,
  logger,
  securityLogger,
  performanceLogger,
  auditLogger,
  databaseLogger,
  apiLogger,
  authLogger,
  vintedLogger,
  PerformanceTimer,
  // Legacy compatibility
  ConsoleLogger,
  SimpleLogger,
  EdgeLogger,
  getLogger,
  edgeLogger,
  dbQueryLogger,
  apiRequestLogger,
  createRequestLogger,
} from './logging';

// Error handling utilities
export {
  type UserError,
  type RetryConfig,
  UnifiedErrorHandler,
  errorHandler,
  useErrorHandler,
  formatApiError,
  migrateErrorHandling,
  // Legacy compatibility
  ErrorHandler,
  ErrorMigrationHelper,
  createErrorHandler,
} from './error-handling';

// Utility function from original utils.ts
>>>>>>> ad32518644f2ab77a7c59429e3df905bfcc3ef94
import { type ClassValue, clsx } from "clsx";

import { twMerge } from "tailwind-merge";

/**
 * Utility function to merge class names
 * Combines clsx and tailwind-merge for optimal class handling
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export {
  formatEuro,
  formatPercentage,
  formatCurrency,
  formatNumber,
  formatDate,
  formatWeight,
  capitalize,
  truncate,
} from '../../utils/formatting';

export { sleep } from '../../utils/async-utils';