import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/utils/logging/logger";
import {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  DatabaseError,
  ExternalServiceError,
} from "@/lib/shared/errors/base-errors";

/**
 * Types pour la gestion d'erreurs standardisée
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  statusCode: number;
}

<<<<<<< HEAD
export interface ApiResponse<T = unknown> {
=======
export interface ApiResponse<T = any> {
>>>>>>> ad32518644f2ab77a7c59429e3df905bfcc3ef94
  ok: boolean;
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  metadata?: {
    timestamp: string;
    requestId: string;
    version: string;
  };
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
  details?: Record<string, unknown>,
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
export function withErrorHandling<T extends unknown[]>(
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
    return;
  }
}

export function validateQueryParams<T>(schema: z.ZodSchema<T>) {
  return (request: NextRequest): T => {
    try {
      const { searchParams } = new URL(request.url);
      const params: Record<string, unknown> = {};

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
export function createApiHandler<TBody = unknown, TQuery = unknown>(options: {
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
      const authHeader = request.headers.get('Authorization');
      if (!authHeader) {
        throw new AuthenticationError('Authorization header required');
      }
      // TODO: Implement token validation
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