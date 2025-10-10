/**
 * Custom error hierarchy for LogistiX application
 */

export class CustomError extends Error {
  public readonly code: string;
  public readonly context: Record<string, any>;
  public readonly statusCode: number = 500;
  public readonly timestamp: string;
  public readonly field?: string;

  constructor(
    message: string,
    code?: string,
    context?: Record<string, any>,
    field?: string,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code ?? 'UNKNOWN_ERROR';
    this.context = context ?? {};
    if (field !== undefined) {
      this.field = field;
    }
    this.timestamp = new Date().toISOString();
    Object.setPrototypeOf(this, new.target.prototype);
  }

  public toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }

  public toUserMessage(): string {
    return this.message;
  }
}

export class BaseError extends CustomError {
  public override readonly statusCode: number = 500;
}

export class ValidationError extends CustomError {
  public override readonly statusCode: number = 400;

  constructor(
    message: string,
    field?: string,
    context?: Record<string, any>,
  ) {
    super(message, "VALIDATION_ERROR", context, field);
  }
}

export class NotFoundError extends CustomError {
  public override readonly statusCode: number = 404;

  constructor(
    resource: string,
    identifier?: string,
    context?: Record<string, any>,
  ) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(message, "NOT_FOUND", context);
  }
}

export class AuthError extends CustomError {
  public override readonly statusCode: number = 401;

  constructor(
    message: string,
    context?: Record<string, any>,
  ) {
    super(message, "AUTH_ERROR", context);
  }
}

export class AuthorizationError extends CustomError {
  public override readonly statusCode: number = 403;

  constructor(
    message: string,
    context?: Record<string, any>,
  ) {
    super(message, "AUTHORIZATION_ERROR", context);
  }
}

export class BusinessLogicError extends CustomError {
  public override readonly statusCode: number = 422;

  constructor(
    message: string,
    context?: Record<string, any>,
  ) {
    super(message, "BUSINESS_LOGIC_ERROR", context);
  }
}

export class DatabaseError extends CustomError {
  public override readonly statusCode: number = 500;
  public readonly operation?: string;

  constructor(
    message: string,
    operation?: string,
    context?: Record<string, any>,
  ) {
    super(message, "DATABASE_ERROR", { operation, ...context });
    if (operation !== undefined) {
      (this as any).operation = operation;
    }
  }
}

export class ConflictError extends CustomError {
  public override readonly statusCode: number = 409;

  constructor(
    message: string,
    context?: Record<string, any>,
  ) {
    super(message, "CONFLICT_ERROR", context);
  }
}

export class TooManyRequestsError extends CustomError {
  public override readonly statusCode: number = 429;

  constructor(
    message: string,
    context?: Record<string, any>,
  ) {
    super(message, "TOO_MANY_REQUESTS", context);
  }
}

export class InfrastructureError extends CustomError {
  public override readonly statusCode: number = 500;

  constructor(
    message: string,
    context?: Record<string, any>,
  ) {
    super(message, "INFRASTRUCTURE_ERROR", context);
  }
}

export const AuthenticationError = AuthError;
export const RequestValidationError = ValidationError;

/**
 * Type guard to check if an error is a CustomError
 */
export function isCustomError(error: unknown): error is CustomError {
  return error instanceof CustomError;
}