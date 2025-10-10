/**
 * @fileoverview Advanced error handling and normalization utilities
 * @description Provides robust functions for error extraction, transformation, and analysis
 * in TypeScript with strict type safety. Handles various error types and edge cases.
 * @version 1.0.0
 * @since 2025-01-09
 * @author Development Team
 */

import { z } from "zod";
import { logger } from "@/lib/utils/logging/logger";

// =============================================================================
// TYPES ET INTERFACES
// =============================================================================

export interface ErrorContext {
  operation?: string | undefined;
  userId?: string | undefined;
  timestamp?: string | undefined;
  operationId?: string | undefined;
  component?: string | undefined;
  additionalData?: Record<string, unknown> | undefined;
}

export interface NormalizedError {
  message: string;
  name: string;
  stack: string | undefined;
  code: string | number | undefined;
  cause?: unknown;
  context: ErrorContext | undefined;
}

export interface ErrorDetails {
  message: string;
  type: string;
  stack: string | undefined;
  code: string | number | undefined;
  isOperational: boolean;
  severity: "low" | "medium" | "high" | "critical";
  context: ErrorContext | undefined;
}

// =============================================================================
// SCHÉMAS DE VALIDATION
// =============================================================================

const errorContextSchema = z.object({
  operation: z.string().optional(),
  userId: z.string().uuid().optional(),
  timestamp: z.string().optional(),
  operationId: z.string().optional(),
  component: z.string().optional(),
  additionalData: z.record(z.unknown()).optional(),
});

// =============================================================================
// FONCTIONS UTILITAIRES PRINCIPALES
// =============================================================================

/**
 * Safely extracts error message from any error type
 * 
 * @description Safely extracts a readable error message from various error types including
 * Error objects, strings, and unknown values. Provides fallback messages for edge cases.
 * @param {unknown} error - Error of any type to extract message from
 * @returns {string} Human-readable error message
 * @example
 * ```typescript
 * const message = getErrorMessage(new Error('Something failed'));
 * const message2 = getErrorMessage('String error');
 * ```
 * @since 1.0.0
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message || "Erreur sans message";
  }

  if (typeof error === "string") {
    return error || "Chaîne d'erreur vide";
  }

  if (error && typeof error === "object") {
    // Tentative d'extraction de propriétés communes d'erreur
    const errorObj = error as Record<string, unknown>;

    if (typeof errorObj.message === "string") {
      return errorObj.message;
    }

    if (typeof errorObj.error === "string") {
      return errorObj.error;
    }

    if (typeof errorObj.description === "string") {
      return errorObj.description;
    }

    // Sérialisation sécurisée comme fallback
    try {
      return JSON.stringify(error, null, 2);
    } catch (serializationError) {
      logger.warn("Échec de sérialisation d'une erreur complexe", {
        originalError: String(error),
        serializationError:
          serializationError instanceof Error
            ? serializationError.message
            : String(serializationError),
      });
      return `Objet d'erreur non sérialisable: ${Object.prototype.toString.call(error)}`;
    }
  }

  return String(error ?? "Erreur inconnue");
}

/**
 * Converts any value to an Error instance
 * 
 * @description Converts various error types (strings, objects, etc.) to proper Error instances
 * with optional context information. Preserves original Error objects and enhances them with context.
 * @param {unknown} error - Value to convert to Error
 * @param {ErrorContext} [context] - Optional context to add to the error
 * @returns {Error} Proper Error instance with message and context
 * @example
 * ```typescript
 * const error = toError('Something failed', { operation: 'createUser' });
 * ```
 * @since 1.0.0
 */
export function toError(error: unknown, context?: ErrorContext): Error {
  if (error instanceof Error) {
    // Ajouter le contexte si fourni
    if (context) {
      (error as any).context = context;
    }
    return error;
  }

  const message = getErrorMessage(error);
  const newError = new Error(message);

  // Préserver la cause originale
  (newError as any).cause = error;

  // Ajouter le contexte
  if (context) {
    (newError as any).context = context;
  }

  return newError;
}

/**
 * Normalise une erreur en objet standardisé avec toutes les informations pertinentes
 */
export function normalizeError(
  error: unknown,
  context?: ErrorContext,
): NormalizedError {
  const validatedContext = context ? validateErrorContext(context) : undefined;

  if (error instanceof Error) {
    return {
      message: error.message || "Erreur sans message",
      name: error.name || "Error",
      stack: error.stack,
      code: (error as any).code,
      cause: (error as any).cause,
      context: validatedContext || (error as any).context,
    };
  }
  return {
    message: getErrorMessage(error),
    name: "UnknownError",
    stack: undefined,
    code: undefined,
    cause: error,
    context: validatedContext,
  };
}

/**
 * Analyse une erreur et fournit des détails enrichis pour le logging et le debugging
 */
export function analyzeError(
  error: unknown,
  context?: ErrorContext,
): ErrorDetails {
  const normalized = normalizeError(error, context);

  // Détermination du type d'erreur
  let type = normalized.name;
  let isOperational = false;
  let severity: "low" | "medium" | "high" | "critical" = "medium";

  if (error instanceof Error) {
    // Classification basée sur le nom de l'erreur
    switch (normalized.name) {
      case "ValidationError":
      case "ZodError":
        type = "Validation";
        isOperational = true;
        severity = "low";
        break;

      case "TypeError":
      case "ReferenceError":
        type = "Programming";
        isOperational = false;
        severity = "high";
        break;

      case "DatabaseError":
      case "ConnectionError":
        type = "Infrastructure";
        isOperational = true;
        severity = "critical";
        break;

      case "AuthenticationError":
      case "AuthorizationError":
        type = "Security";
        isOperational = true;
        severity = "medium";
        break;

      case "NetworkError":
      case "TimeoutError":
        type = "Network";
        isOperational = true;
        severity = "medium";
        break;

      default:
        type = normalized.name;
        isOperational = (error as any).isOperational === true;
        break;
    }

    // Classification basée sur le code d'erreur
    if (normalized.code) {
      if (typeof normalized.code === "string") {
        if (normalized.code.includes("VALIDATION")) {
          severity = "low";
          isOperational = true;
        } else if (
          normalized.code.includes("DATABASE") ||
          normalized.code.includes("CONNECTION")
        ) {
          severity = "critical";
          isOperational = true;
        }
      }
    }
  }

  return {
    message: normalized.message,
    type,
    stack: normalized.stack,
    code: normalized.code,
    isOperational,
    severity,
    context: normalized.context,
  };
}

/**
 * Valide et normalise le contexte d'erreur
 */
export function validateErrorContext(context: ErrorContext): ErrorContext {
  try {
    return errorContextSchema.parse(context);
  } catch (validationError) {
    logger.warn("Contexte d'erreur invalide fourni", {
      invalidContext: context,
      validationError:
        validationError instanceof z.ZodError
          ? validationError.errors
          : String(validationError),
    });

    // Retourner un contexte minimal valide
    return {
      timestamp: new Date().toISOString(),
      additionalData: { originalContext: context },
    };
  }
}

/**
 * Crée un contexte d'erreur enrichi avec des informations automatiques
 */
export function createErrorContext(
  operation?: string,
  component?: string,
  additionalData?: Record<string, unknown>,
): ErrorContext {
  return {
    operation,
    component,
    timestamp: new Date().toISOString(),
    operationId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    additionalData,
  };
}

/**
 * Log une erreur avec tous les détails analysés
 */
export function logError(
  error: unknown,
  context?: ErrorContext,
  customMessage?: string,
): void {
  const details = analyzeError(error, context);
  const logMessage =
    customMessage || `Erreur ${details.type}: ${details.message}`;

  const logData = {
    error: {
      message: details.message,
      type: details.type,
      code: details.code,
      isOperational: details.isOperational,
      severity: details.severity,
      stack: details.stack,
    },
    context: details.context,
    timestamp: new Date().toISOString(),
  };

  // Choix du niveau de log basé sur la sévérité
  switch (details.severity) {
    case "low":
      logger.warn(logMessage, logData);
      break;
    case "medium":
      logger.error(logMessage, logData);
      break;
    case "high":
    case "critical":
      logger.error(logMessage, logData);
      break;
    default:
      logger.error(logMessage, logData);
  }
}

/**
 * Vérifie si une erreur est considérée comme opérationnelle (récupérable)
 */
export function isOperationalError(error: unknown): boolean {
  const details = analyzeError(error);
  return details.isOperational;
}

/**
 * Extrait le stack trace de manière sécurisée
 */
export function getErrorStack(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.stack;
  }

  if (error && typeof error === "object") {
    const errorObj = error as Record<string, unknown>;
    if (typeof errorObj.stack === "string") {
      return errorObj.stack;
    }
  }

  return undefined;
}

/**
 * Crée un résumé d'erreur concis pour l'affichage utilisateur
 */
export function createErrorSummary(
  error: unknown,
  includeStack = false,
): string {
  const details = analyzeError(error);

  let summary = `[${details.type}] ${details.message}`;

  if (details.code) {
    summary += ` (Code: ${details.code})`;
  }

  if (includeStack && details.stack) {
    summary += `\n\nStack Trace:\n${details.stack}`;
  }

  return summary;
}

/**
 * Vérifie si deux erreurs sont équivalentes
 */
export function areErrorsEquivalent(error1: unknown, error2: unknown): boolean {
  const details1 = analyzeError(error1);
  const details2 = analyzeError(error2);

  return (
    details1.message === details2.message &&
    details1.type === details2.type &&
    details1.code === details2.code
  );
}

// =============================================================================
// UTILITAIRES SPÉCIALISÉS
// =============================================================================

/**
 * Extrait les erreurs de validation Zod de manière structurée
 */
export function extractZodErrors(error: unknown): Array<{
  path: string;
  message: string;
  code: string;
}> {
  if (error instanceof z.ZodError) {
    return error.errors.map((err) => ({
      path: err.path.join(".") || "root",
      message: err.message,
      code: err.code,
    }));
  }

  return [];
}

/**
 * Crée un message d'erreur utilisateur convivial
 */
export function createUserFriendlyMessage(error: unknown): string {
  const details = analyzeError(error);

  switch (details.type) {
    case "Validation":
      return "Les données fournies ne sont pas valides. Veuillez vérifier vos informations.";
    case "Authentication":
      return "Authentification requise. Veuillez vous connecter.";
    case "Authorization":
      return "Vous n'avez pas l'autorisation d'effectuer cette action.";
    case "Network":
      return "Problème de connexion réseau. Veuillez réessayer.";
    case "Infrastructure":
      return "Problème technique temporaire. Nos équipes sont notifiées.";
    default:
      return "Une erreur inattendue s'est produite. Veuillez réessayer.";
  }
}
