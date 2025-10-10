/**
 * @fileoverview Centralized error handling system exports
 * @description Main entry point for the unified error handling system
 * @version 1.0.0
 * @since 2025-01-10
 */

// Core error classes
export {
  CleanupError,
  ValidationError,
  NotFoundError,
  AuthError,
  AuthorizationError,
  DatabaseError,
  BusinessLogicError,
  ConflictError,
  TooManyRequestsError,
  InfrastructureError,
  NetworkError,
  TimeoutError,
  ErrorFactory,
  isCleanupError,
  // Legacy compatibility aliases
  CustomError,
  BaseError,
  AuthenticationError,
  RequestValidationError,
} from './cleanup-error';

// Error context interface
export type { ErrorContext } from './cleanup-error';

// Error handler service
export {
  CentralizedErrorHandler,
  errorHandler,
  useErrorHandler,
  withErrorHandling,
} from '../services/error-handler';

// Error handler types
export type {
  UserError,
  RetryConfig,
  ErrorStats,
} from '../services/error-handler';

// Migration service
export {
  ErrorMigrationService,
  migrationService,
  ERROR_HANDLING_MIGRATION_CHECKLIST,
} from '../services/error-migration';

// Migration types
export type {
  MigrationStatus,
  MigrationChecklistItem,
  MigrationChecklistItemType,
} from '../services/error-migration';

// Default export
export { errorHandler as default } from '../services/error-handler';