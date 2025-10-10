// Gestionnaire d'erreurs centralisé pour l'analyse de marché Vinted

import { logger } from "@/lib/utils/logging/logger";
import type { LogContext } from "@/lib/utils/logging/logger";
import {
  VintedApiError,
  VintedValidationError,
} from "@/lib/services/vinted-market-analysis";
import type { UserError } from "@/types/vinted-market-analysis";

export class ErrorHandler {
  /**
   * Formate une erreur pour l'affichage utilisateur
   */
  static formatUserFriendlyError(error: Error): UserError {
    if (error instanceof VintedApiError) {
      return this.handleVintedApiError(error);
    }

    if (error instanceof VintedValidationError) {
      return this.handleVintedValidationError(error);
    }

    // Erreurs réseau
    if (error.message.includes("fetch")) {
      return {
        message: "Problème de connexion. Vérifiez votre connexion internet.",
        code: "NETWORK_ERROR",
        suggestions: [
          "Vérifiez votre connexion internet",
          "Réessayez dans quelques instants",
          "Contactez le support si le problème persiste",
        ],
        retryable: true,
      };
    }

    // Erreur générique
    return {
      message: "Une erreur inattendue s'est produite",
      code: "UNKNOWN_ERROR",
      suggestions: [
        "Réessayez l'opération",
        "Actualisez la page",
        "Contactez le support si le problème persiste",
      ],
      retryable: true,
    };
  }

  /**
   * Gère les erreurs de l'API Vinted
   */
  private static handleVintedApiError(error: VintedApiError): UserError {
    const status = error.status;

    switch (status) {
      case 401:
        return {
          message: "Token d'authentification invalide ou expiré",
          code: "INVALID_TOKEN",
          suggestions: [
            "Vérifiez que votre token Vinted est correct",
            "Reconfigurez votre token dans les paramètres",
            "Assurez-vous d'être connecté à Vinted",
          ],
          retryable: false,
        };

      case 403:
        return {
          message: "Accès refusé par Vinted",
          code: "ACCESS_DENIED",
          suggestions: [
            "Votre compte Vinted n'a peut-être pas les permissions nécessaires",
            "Essayez avec un autre compte",
            "Contactez le support Vinted",
          ],
          retryable: false,
        };

      case 429:
        return {
          message: "Trop de requêtes envoyées à Vinted",
          code: "RATE_LIMITED",
          suggestions: [
            "Attendez quelques minutes avant de réessayer",
            "Réduisez la fréquence de vos analyses",
            "L'accès sera rétabli automatiquement",
          ],
          retryable: true,
        };

      case 500:
      case 502:
      case 503:
        return {
          message: "Problème temporaire avec les serveurs Vinted",
          code: "SERVER_ERROR",
          suggestions: [
            "Réessayez dans quelques minutes",
            "Le problème est côté Vinted",
            "Vérifiez le statut de Vinted sur leur site",
          ],
          retryable: true,
        };

      default:
        return {
          message: `Erreur API Vinted: ${error.message}`,
          code: "VINTED_API_ERROR",
          suggestions: [
            "Vérifiez votre token d'authentification",
            "Réessayez avec des paramètres différents",
            "Contactez le support si le problème persiste",
          ],
          retryable: true,
        };
    }
  }

  /**
   * Gère les erreurs de validation Vinted
   */
  private static handleVintedValidationError(
    error: VintedValidationError,
  ): UserError {
    if (error.message.includes("marque")) {
      return {
        message: "Aucune marque trouvée pour ce produit",
        code: "NO_BRAND_FOUND",
        suggestions: [
          "Essayez avec un nom de produit plus générique",
          "Vérifiez l'orthographe du nom du produit",
          "Utilisez des mots-clés plus courants",
        ],
        retryable: true,
      };
    }

    if (error.message.includes("catégorie")) {
      return {
        message: "Catégorie introuvable sur Vinted",
        code: "CATEGORY_NOT_FOUND",
        suggestions: [
          "Vérifiez le nom de la catégorie",
          "Utilisez l'ID de catalogue si vous le connaissez",
          "Consultez la liste des catégories Vinted",
        ],
        retryable: true,
      };
    }

    return {
      message: error.message,
      code: "VALIDATION_ERROR",
      suggestions: [
        "Vérifiez les données saisies",
        "Consultez la documentation",
        "Réessayez avec des paramètres différents",
      ],
      retryable: true,
    };
  }

  /**
   * Retry avec backoff exponentiel
   */
  static async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000,
    onRetry?: (attempt: number, error: Error) => void,
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt === maxRetries) {
          break;
        }

        // Ne pas retry pour certaines erreurs
        if (
          error instanceof VintedApiError &&
          [401, 403, 404].includes(error.status || 0)
        ) {
          break;
        }

        const delay = baseDelay * Math.pow(2, attempt);
        logger.warn(
          `[ErrorHandler] Tentative ${attempt + 1} échouée, retry dans ${delay}ms:`,
          {
            error: error instanceof Error ? error.message : String(error),
            attempt: attempt + 1,
            delay,
          } as LogContext,
        );

        if (onRetry) {
          onRetry(attempt + 1, error as Error);
        }

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  /**
   * Log une erreur avec contexte
   */
  static logError(error: Error, context: string, additionalData?: any) {
    logger.error(`[ErrorHandler] ${context}:`, {
      error: {
        name: error.name,
        _message: error.message,
        stack: error.stack,
      },
      context,
      additionalData,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Détermine si une erreur est temporaire et peut être retryée
   */
  static isRetryableError(error: Error): boolean {
    if (error instanceof VintedApiError) {
      const status = error.status;
      return status ? [429, 500, 502, 503, 504].includes(status) : true;
    }

    if (
      error.message.includes("timeout") ||
      error.message.includes("network")
    ) {
      return true;
    }

    return false;
  }

  /**
   * Génère un ID unique pour tracer les erreurs
   */
  static generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Utilitaires pour les composants React
export const useErrorHandler = () => {
  const handleError = (error: Error, context: string = "Unknown") => {
    const errorId = ErrorHandler.generateErrorId();
    ErrorHandler.logError(error, context, { errorId });

    const userError = ErrorHandler.formatUserFriendlyError(error);

    return {
      ...userError,
      errorId,
      timestamp: new Date().toISOString(),
    };
  };

  const retryOperation = async <T>(
    operation: () => Promise<T>,
    options: {
      maxRetries?: number;
      baseDelay?: number;
      onRetry?: (attempt: number, error: Error) => void;
    } = {},
  ): Promise<T> => {
    return ErrorHandler.retryWithBackoff(
      operation,
      options.maxRetries,
      options.baseDelay,
      options.onRetry,
    );
  };

  return {
    handleError,
    retryOperation,
    isRetryable: ErrorHandler.isRetryableError,
  };
};

/**
 * Formate une erreur pour les réponses API standardisées.
 * @param error Erreur à formater (Error, string, ou tout objet)
 * @param details Informations additionnelles optionnelles
 * @returns { error: string, code?: string, details?: any }
 */
export function formatApiError(
  error: unknown,
  details?: any,
): { error: string; code?: string; details?: any } {
  if (error instanceof Error) {
    // Si l'erreur a déjà un code, on le récupère
    // @ts-ignore
    const code = error.code || error.name;
    return {
      error: error.message,
      code,
      ...(details ? { details } : {}),
    };
  }
  if (typeof error === "string") {
    return { error, ...(details ? { details } : {}) };
  }
  // Pour les objets ou autres types
  return {
    error: "Erreur inconnue",
    details: error,
  };
}

export default ErrorHandler;
