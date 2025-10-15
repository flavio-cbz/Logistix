import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/utils/logging/logger";

/**
 * Types pour la gestion d'erreurs standardisée
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  statusCode: number;
}

export interface ApiResponse<T = any> {
  ok: boolean;
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  metadata?: {
    timestamp: string;
    requestId: string;
    version: string;
  };
}

/**
 * Classes d'erreurs personnalisées
 */
export class ValidationError extends Error {
  public readonly code = 'VALIDATION_ERROR';
  public readonly statusCode = 400;
  public readonly details: Record<string, any>;

  constructor(message: string, details: Record<string, any> = {}) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

export class AuthenticationError extends Error {
  public readonly code = 'AUTHENTICATION_ERROR';
  public readonly statusCode = 401;

  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  public readonly code = 'AUTHORIZATION_ERROR';
  public readonly statusCode = 403;

  constructor(message: string = 'Insufficient permissions') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends Error {
  public readonly code = 'NOT_FOUND_ERROR';
  public readonly statusCode = 404;

  constructor(resource: string) {
    super(`${resource} not found`);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  public readonly code = 'CONFLICT_ERROR';
  public readonly statusCode = 409;

  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class DatabaseError extends Error {
  public readonly code = 'DATABASE_ERROR';
  public readonly statusCode = 500;
  public readonly details: Record<string, any>;

  constructor(message: string, details: Record<string, any> = {}) {
    super(message);
    this.name = 'DatabaseError';
    this.details = details;
  }
}

export class ExternalServiceError extends Error {
  public readonly code = 'EXTERNAL_SERVICE_ERROR';
  public readonly statusCode = 502;
  public readonly service: string;

  constructor(service: string, message: string) {
    super(`${service}: ${message}`);
    this.name = 'ExternalServiceError';
    this.service = service;
  }
}

/**
 * Middleware de gestion d'erreurs centralisé
 */
export function createErrorHandler() {
  return function handleError(error: unknown): NextResponse {
    const requestId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    // Log de l'erreur
    logger.error('API Error occurred', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      requestId,
      timestamp,
    });

    // Erreurs personnalisées
    if (error instanceof ValidationError) {
      return NextResponse.json(
        createErrorResponse(error.code, error.message, error.details, requestId),
        { status: error.statusCode }
      );
    }

    if (error instanceof AuthenticationError) {
      return NextResponse.json(
        createErrorResponse(error.code, error.message, undefined, requestId),
        { status: error.statusCode }
      );
    }

    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        createErrorResponse(error.code, error.message, undefined, requestId),
        { status: error.statusCode }
      );
    }

    if (error instanceof NotFoundError) {
      return NextResponse.json(
        createErrorResponse(error.code, error.message, undefined, requestId),
        { status: error.statusCode }
      );
    }

    if (error instanceof ConflictError) {
      return NextResponse.json(
        createErrorResponse(error.code, error.message, undefined, requestId),
        { status: error.statusCode }
      );
    }

    if (error instanceof DatabaseError) {
      return NextResponse.json(
        createErrorResponse(error.code, error.message, error.details, requestId),
        { status: error.statusCode }
      );
    }

    if (error instanceof ExternalServiceError) {
      return NextResponse.json(
        createErrorResponse(error.code, error.message, { service: error.service }, requestId),
        { status: error.statusCode }
      );
    }

    // Erreurs Zod de validation
    if (error instanceof z.ZodError) {
      const details = {
        issues: error.issues.map(issue => ({
          path: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
        })),
      };

      return NextResponse.json(
        createErrorResponse('VALIDATION_ERROR', 'Invalid request data', details, requestId),
        { status: 400 }
      );
    }

    // Erreur générique
    return NextResponse.json(
      createErrorResponse(
        'INTERNAL_SERVER_ERROR',
        'An unexpected error occurred',
        undefined,
        requestId
      ),
      { status: 500 }
    );
  };
}

/**
 * Crée une réponse d'erreur standardisée
 */
export function createErrorResponse(
  code: string,
  message: string,
  details?: Record<string, any>,
  requestId?: string
): ApiResponse {
  return {
    ok: false,
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: requestId || crypto.randomUUID(),
      version: 'v1',
    },
  };
}

/**
 * Crée une réponse de succès standardisée
 */
export function createSuccessResponse<T>(
  data: T,
  requestId?: string
): ApiResponse<T> {
  return {
    ok: true,
    success: true,
    data,
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: requestId || crypto.randomUUID(),
      version: 'v1',
    },
  };
}

/**
 * Wrapper pour les handlers d'API avec gestion d'erreurs automatique
 */
export function withErrorHandling<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      const errorHandler = createErrorHandler();
      return errorHandler(error);
    }
  };
}

/**
 * Middleware de validation de schéma Zod
 */
export function validateRequestBody<T>(schema: z.ZodSchema<T>) {
  return async (request: NextRequest): Promise<T> => {
    try {
      const body = await request.json();
      return schema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid request body', {
          issues: error.issues.map(issue => ({
            path: issue.path.join('.'),
            message: issue.message,
            code: issue.code,
          })),
        });
      }
      throw new ValidationError('Failed to parse request body');
    }
  };
}

/**
 * Middleware de validation des paramètres de requête
 */
type ValidationIssue = {
  path: string;
  message: string;
  code: string;
};

function collectNonFiniteNumbers(
  value: unknown,
  path: Array<string | number>,
  issues: ValidationIssue[],
) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      issues.push({
        path: path.join('.'),
        message: 'Invalid numeric value',
        code: 'invalid_number',
      });
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      collectNonFiniteNumbers(item, [...path, index], issues);
    });
    return;
  }

  if (value && typeof value === 'object') {
    Object.entries(value as Record<string, unknown>).forEach(([key, item]) => {
      collectNonFiniteNumbers(item, [...path, key], issues);
    });
  }
}

export function validateQueryParams<T>(schema: z.ZodSchema<T>) {
  return (request: NextRequest): T => {
    try {
      const { searchParams } = new URL(request.url);
      const params: Record<string, any> = {};

      for (const [key, value] of searchParams.entries()) {
        params[key] = value;
      }

      const parsed = schema.parse(params);
      const issues: ValidationIssue[] = [];
      collectNonFiniteNumbers(parsed, [], issues);

      if (issues.length > 0) {
        throw new ValidationError('Invalid query parameters', { issues });
      }

      return parsed;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid query parameters', {
          issues: error.issues.map(issue => ({
            path: issue.path.join('.'),
            message: issue.message,
            code: issue.code,
          })),
        });
      }
      throw new ValidationError('Failed to parse query parameters');
    }
  };
}

/**
 * Utilitaire pour créer des handlers d'API standardisés
 */
export function createApiHandler<TBody = any, TQuery = any>(options: {
  bodySchema?: z.ZodSchema<TBody>;
  querySchema?: z.ZodSchema<TQuery>;
  requireAuth?: boolean;
  handler: (params: {
    request: NextRequest;
    body: TBody | undefined;
    query: TQuery | undefined;
    userId: string | undefined;
  }) => Promise<NextResponse>;
}) {
  return withErrorHandling(async (request: NextRequest) => {
    let body: TBody | undefined;
    let query: TQuery | undefined;

    // Validation du body si nécessaire
    if (options.bodySchema && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
      const validateBody = validateRequestBody(options.bodySchema);
      body = await validateBody(request);
    }

    // Validation des paramètres de requête si nécessaire
    if (options.querySchema) {
      const validateQuery = validateQueryParams(options.querySchema);
      query = validateQuery(request);
    }

    // Vérification d'authentification si nécessaire
    let userId: string | undefined;
    if (options.requireAuth) {
      // Ici, vous pouvez intégrer votre logique d'authentification
      // Par exemple, vérifier le token JWT dans les headers
      const authHeader = request.headers.get('Authorization');
      if (!authHeader) {
        throw new AuthenticationError('Authorization header required');
      }
      // Exemple de validation de token (à adapter selon votre implémentation)
      // userId = await validateToken(authHeader);
    }

    // Appel du handler principal
    return await options.handler({
      request,
      body,
      query,
      userId,
    });
  });
}