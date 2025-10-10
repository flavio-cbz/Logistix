// Types d'erreur spécialisés pour les opérations IA avancées

export enum AIErrorCode {
  // Erreurs d'inférence
  INFERENCE_FAILED = "INFERENCE_FAILED",
  INVALID_RESPONSE = "INVALID_RESPONSE",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",

  // Erreurs de données
  INSUFFICIENT_DATA = "INSUFFICIENT_DATA",
  INVALID_DATA_FORMAT = "INVALID_DATA_FORMAT",
  DATA_QUALITY_TOO_LOW = "DATA_QUALITY_TOO_LOW",

  // Erreurs d'analyse
  ANALYSIS_FAILED = "ANALYSIS_FAILED",
  REPORT_GENERATION_FAILED = "REPORT_GENERATION_FAILED",
  INSIGHTS_GENERATION_FAILED = "INSIGHTS_GENERATION_FAILED",
  ANALYSIS_TIMEOUT = "ANALYSIS_TIMEOUT",
  CONFIDENCE_TOO_LOW = "CONFIDENCE_TOO_LOW",
  CONFLICTING_INSIGHTS = "CONFLICTING_INSIGHTS",

  // Erreurs de configuration
  FEATURE_DISABLED = "FEATURE_DISABLED",
  INVALID_AI_CONFIG = "INVALID_AI_CONFIG",
  UNSUPPORTED_ANALYSIS_TYPE = "UNSUPPORTED_ANALYSIS_TYPE",

  // Erreurs de coût
  COST_LIMIT_EXCEEDED = "COST_LIMIT_EXCEEDED",
  QUOTA_EXCEEDED = "QUOTA_EXCEEDED",
}

export class AIAnalysisError extends Error {
  public readonly code: AIErrorCode;
  public readonly retryable: boolean;
  public readonly fallbackAvailable: boolean;
  public readonly context?: any;
  public readonly timestamp: Date;
  // Propriété explicitement déclarée pour éviter des erreurs TS lors de l'affectation

  constructor(
    _message: string,
    code: AIErrorCode,
    options: {
      retryable?: boolean;
      fallbackAvailable?: boolean;
      context?: any;
      cause?: Error;
    } = {},
  ) {
    super(_message);
    this.name = "AIAnalysisError";
    this.code = code;
    this.retryable = options.retryable ?? false;
    this.fallbackAvailable = options.fallbackAvailable ?? false;
    this.context = options.context;
    this.timestamp = new Date();

    // Affectation sûre de la cause
    if (options.cause) {
      this.cause = options.cause;
    }
  }

  toJSON() {
    return {
      name: this.name,
      _message: this.message,
      code: this.code,
      retryable: this.retryable,
      fallbackAvailable: this.fallbackAvailable,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
      cause:
        this.cause instanceof Error
          ? { message: this.cause.message, stack: this.cause.stack }
          : undefined,
    };
  }
}

export class InferenceError extends AIAnalysisError {
  constructor(_message: string, options?: { cause?: Error; context?: any }) {
    super(_message, AIErrorCode.INFERENCE_FAILED, {
      retryable: true,
      fallbackAvailable: true,
      ...options,
    });
  }
}

export class DataQualityError extends AIAnalysisError {
  constructor(_message: string, context?: any) {
    super(_message, AIErrorCode.DATA_QUALITY_TOO_LOW, {
      retryable: false,
      fallbackAvailable: true,
      context,
    });
  }
}

export class AnalysisTimeoutError extends AIAnalysisError {
  constructor(_message: string, context?: any) {
    super(_message, AIErrorCode.ANALYSIS_TIMEOUT, {
      retryable: true,
      fallbackAvailable: true,
      context,
    });
  }
}

export class CostLimitError extends AIAnalysisError {
  constructor(_message: string, context?: any) {
    super(_message, AIErrorCode.COST_LIMIT_EXCEEDED, {
      retryable: false,
      fallbackAvailable: true,
      context,
    });
  }
}

// Utilitaires pour la gestion d'erreur
export function isRetryableError(error: Error): boolean {
  if (error instanceof AIAnalysisError) {
    return error.retryable;
  }

  // Accès protégé à message (possible objet non standard)
  const msg = (error as any)?.message ?? "";
  // Erreurs réseau généralement retryables
  if (
    typeof msg === "string" &&
    (msg.includes("fetch") ||
      msg.includes("network") ||
      msg.includes("timeout"))
  ) {
    return true;
  }

  return false;
}

export function hasFallbackAvailable(error: Error): boolean {
  if (error instanceof AIAnalysisError) {
    return error.fallbackAvailable;
  }

  return true; // Par défaut, on assume qu'un fallback est disponible
}

/**
 * Crée une AIAnalysisError depuis une réponse d'API/SDK.
 * - Prend en charge des objets 'response' partiels ou non conformes sans throw.
 */
export function createErrorFromResponse(
  response: unknown,
  context?: any,
): AIAnalysisError {
  const err = (response as any)?.error;
  const code =
    typeof err?.code === "string" ? err.code.toLowerCase() : undefined;
  const message =
    err?.message ??
    (typeof response === "string" ? response : undefined) ??
    "Erreur d'inférence inconnue";

  if (code === "rate_limit_exceeded" || code === "rate_limit") {
    return new AIAnalysisError(
      "Limite de taux dépassée",
      AIErrorCode.RATE_LIMIT_EXCEEDED,
      { retryable: true, fallbackAvailable: true, context, cause: err?.cause },
    );
  }

  if (code === "insufficient_quota" || code === "quota_exceeded") {
    return new AIAnalysisError(
      "Quota insuffisant",
      AIErrorCode.QUOTA_EXCEEDED,
      { retryable: false, fallbackAvailable: true, context, cause: err?.cause },
    );
  }

  return new InferenceError(String(message), { context, cause: err?.cause });
}
