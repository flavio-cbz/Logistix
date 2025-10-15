/**
 * @fileoverview Error message extraction utility
 * @description Provides a simple function to extract error messages from various error types
 * @version 1.0.0
 * @since 2025-01-09
 * @author Development Team
 */

/**
 * Extracts a human-readable error message from various error types
 * @param error - The error to extract message from
 * @returns A string representation of the error message
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

    if (typeof errorObj['message'] === "string") {
      return errorObj['message'];
    }

    if (typeof errorObj['error'] === "string") {
      return errorObj['error'];
    }

    if (typeof errorObj['description'] === "string") {
      return errorObj['description'];
    }

    // Pour les objets avec toString personnalisé
    const str = String(error);
    if (str !== "[object Object]") {
      return str;
    }
  }

  return "Erreur inconnue";
}