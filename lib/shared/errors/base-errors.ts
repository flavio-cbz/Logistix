// Base error hierarchy for backend refactor
// These errors are meant to be mapped to HTTP responses by an adapter layer.

export abstract class BaseError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details: Record<string, unknown> | undefined;

  constructor(message: string, code: string, statusCode: number, details?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export class DomainError extends BaseError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'DOMAIN_ERROR', 400, details);
  }
}

export class ValidationError extends BaseError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

export class NotFoundError extends BaseError {
  constructor(resource: string, details?: Record<string, unknown>) {
    super(`${resource} not found`, 'NOT_FOUND_ERROR', 404, details);
  }
}

export class ConflictError extends BaseError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CONFLICT_ERROR', 409, details);
  }
}

export class AuthenticationError extends BaseError {
  constructor(message: string = 'Authentication required', details?: Record<string, unknown>) {
    super(message, 'AUTHENTICATION_ERROR', 401, details);
  }
}

export class AuthorizationError extends BaseError {
  constructor(message: string = 'Insufficient permissions', details?: Record<string, unknown>) {
    super(message, 'AUTHORIZATION_ERROR', 403, details);
  }
}

export class RateLimitError extends BaseError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'RATE_LIMITED', 429, details);
  }
}

export class DatabaseError extends BaseError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'DATABASE_ERROR', 500, details);
  }
}

export class ExternalServiceError extends BaseError {
  public readonly service: string;

  constructor(service: string, message: string, details?: Record<string, unknown>) {
    super(`${service}: ${message}`, 'EXTERNAL_SERVICE_ERROR', 502, details);
    this.service = service;
  }
}

export class InfrastructureError extends BaseError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'INFRASTRUCTURE_ERROR', 500, details);
  }
}

// Aliases for backward compatibility if needed
export const AuthError = AuthenticationError;
export const PermissionError = AuthorizationError;

export function mapErrorToHttp(error: unknown): { status: number; body: Record<string, unknown> } {
  if (error instanceof BaseError) {
    return {
      status: error.statusCode,
      body: {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details
        }
      }
    };
  }

  return { status: 500, body: { success: false, error: { code: 'UNEXPECTED_ERROR', message: 'Erreur interne inattendue' } } };
}
