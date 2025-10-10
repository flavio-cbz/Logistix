// Base error hierarchy for backend refactor
// These errors are meant to be mapped to HTTP responses by an adapter layer.

export abstract class BaseError extends Error {
  public readonly code: string;
  public readonly details?: unknown;
  constructor(message: string, code: string, details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export class DomainError extends BaseError {
  constructor(message: string, details?: unknown) {
    super(message, 'DOMAIN_ERROR', details);
  }
}
export class ValidationError extends BaseError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', details);
  }
}
export class NotFoundError extends BaseError {
  constructor(message: string, details?: unknown) {
    super(message, 'NOT_FOUND', details);
  }
}
export class ConflictError extends BaseError {
  constructor(message: string, details?: unknown) {
    super(message, 'CONFLICT', details);
  }
}
export class AuthError extends BaseError {
  constructor(message: string, details?: unknown) {
    super(message, 'AUTH_ERROR', details);
  }
}
export class PermissionError extends BaseError {
  constructor(message: string, details?: unknown) {
    super(message, 'PERMISSION_DENIED', details);
  }
}
export class RateLimitError extends BaseError {
  constructor(message: string, details?: unknown) {
    super(message, 'RATE_LIMITED', details);
  }
}
export class InfrastructureError extends BaseError {
  constructor(message: string, details?: unknown) {
    super(message, 'INFRASTRUCTURE_ERROR', details);
  }
}

export function mapErrorToHttp(error: unknown): { status: number; body: any } {
  if (error instanceof ValidationError) {
    return { status: 422, body: { success: false, error: { code: error.code, message: error.message, details: error.details } } };
  }
  if (error instanceof NotFoundError) {
    return { status: 404, body: { success: false, error: { code: error.code, message: error.message } } };
  }
  if (error instanceof ConflictError) {
    return { status: 409, body: { success: false, error: { code: error.code, message: error.message } } };
  }
  if (error instanceof AuthError) {
    return { status: 401, body: { success: false, error: { code: error.code, message: error.message } } };
  }
  if (error instanceof PermissionError) {
    return { status: 403, body: { success: false, error: { code: error.code, message: error.message } } };
  }
  if (error instanceof RateLimitError) {
    return { status: 429, body: { success: false, error: { code: error.code, message: error.message, details: error.details } } };
  }
  if (error instanceof DomainError) {
    return { status: 400, body: { success: false, error: { code: error.code, message: error.message } } };
  }
  if (error instanceof InfrastructureError) {
    return { status: 500, body: { success: false, error: { code: error.code, message: error.message } } };
  }
  return { status: 500, body: { success: false, error: { code: 'UNEXPECTED_ERROR', message: 'Erreur interne inattendue' } } };
}
