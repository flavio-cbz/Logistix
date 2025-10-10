/**
 * Custom error types for the application
 */

export abstract class CustomError extends Error {
  abstract statusCode: number;
  code?: string;
  details?: any;
  abstract serialize(): { message: string; field?: string; details?: any };

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, CustomError.prototype);
  }
}

export class RequestValidationError extends CustomError {
  statusCode = 400;
  override details?: any;

  constructor(public override message: string, details?: any) {
    super(message);
    this.details = details;
    Object.setPrototypeOf(this, RequestValidationError.prototype);
  }

  serialize() {
    return {
      message: this.message,
      details: this.details,
    };
  }
}

export class AuthenticationError extends CustomError {
  statusCode = 401;
  override code = "AUTH_FAILED";
  override details?: any;

  constructor(public override message: string = "Authentication failed", details?: any) {
    super(message);
    this.details = details;
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }

  serialize() {
    return {
      message: this.message,
      details: this.details,
    };
  }
}

export class AuthorizationError extends CustomError {
  statusCode = 403;
  override code = "ACCESS_DENIED";
  override details?: any;

  constructor(public override message: string = "Access denied", details?: any) {
    super(message);
    this.details = details;
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }

  serialize() {
    return {
      message: this.message,
      details: this.details,
    };
  }
}

export class BusinessLogicError extends CustomError {
  statusCode = 422;
  override details?: any;

  constructor(message: string, details?: any) {
    super(message);
    this.details = details;
    Object.setPrototypeOf(this, BusinessLogicError.prototype);
  }

  serialize() {
    return {
      message: this.message,
      details: this.details,
    };
  }
}

export class NotFoundError extends CustomError {
  statusCode = 404;

  constructor(message: string = "Resource not found") {
    super(message);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }

  serialize() {
    return {
      message: this.message,
    };
  }
}

export class InternalServerError extends CustomError {
  statusCode = 500;

  constructor(message: string = "Internal server error") {
    super(message);
    Object.setPrototypeOf(this, InternalServerError.prototype);
  }

  serialize() {
    return {
      message: this.message,
    };
  }
}

// Legacy alias for backward compatibility
export const ValidationError = RequestValidationError;