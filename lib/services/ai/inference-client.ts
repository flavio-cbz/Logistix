import { getErrorMessage, toError } from "../../utils/error-utils";
import {
  AIAnalysisError,
  InferenceError,
  createErrorFromResponse,
  AIErrorCode,
} from "./ai-errors"; // Import AIErrorCode
import {
  aiMetricsCollector,
  AIPerformanceMetrics,
  AICostMetrics,
} from "./ai-metrics-collector";
import { v4 as uuidv4 } from "uuid";
import { autoPerf } from "@/lib/services/auto-performance-integration";

interface InferenceRequest {
  prompt: string;
  max_tokens?: number;
  temperature?: number;
  // Ajoutez d'autres paramètres compatibles avec l'API OpenAI au besoin
}

interface InferenceResponse {
  // Définissez la structure de la réponse attendue de votre API
  // Par exemple, pour une complétion de texte :
  choices: {
    text: string;
    index: number;
    logprobs: any;
    finish_reason: string;
  }[];
}

// Nouvelles interfaces pour l'analyse de marché
interface MarketAnalysisInferenceRequest extends InferenceRequest {
  analysisType: "insights" | "recommendations" | "trends" | "anomalies";
  context?: {
    marketData?: unknown; // Changed from any to unknown
    userPreferences?: unknown; // Changed from any to unknown
    historicalData?: unknown; // Changed from any to unknown
    advancedMetrics?: unknown; // Changed from any to unknown
    opportunities?: unknown; // Changed from any to unknown
    userId?: string;
    provider?: string;
    modelVersion?: string;
  };
}

interface MarketAnalysisInferenceResponse extends InferenceResponse {
  metadata?: {
    processingTime: number;
    confidence: number;
    tokensUsed: number;
    cost?: number;
    requestId?: string;
  };
}

export async function runInference(
  payload: InferenceRequest,
): Promise<InferenceResponse> {
  const requestId = uuidv4();
  const startTime = Date.now();

  let errorType: string | undefined;
  let tokensUsed = 0;
  let estimatedCost = 0;
  let confidence: number | undefined;

  try {
    const response = await autoPerf.autoFetch("/api/v1/ai/inference", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),

    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      errorType = `HTTP_${response.status}`;
      throw createErrorFromResponse(errorBody, {
        payload,
        statusCode: response.status,
      });
    }

    const result = await response.json();
    const endTime = Date.now();
    const processingTime = endTime - startTime;

    // Extraire les métriques de la réponse
    tokensUsed = result.usage?.total_tokens || 0;
    estimatedCost = estimateCost(tokensUsed);
    confidence = calculateConfidence(result, payload);

    // Ajouter les métadonnées de performance
    if (result && typeof result === "object") {
      result.metadata = {
        processingTime,
        confidence,
        tokensUsed,
        cost: estimatedCost,
        requestId,
      };
    }

    // Enregistrer les métriques de performance
    const performanceMetrics: AIPerformanceMetrics = {
      requestId,
      analysisType: "insights", // Valeur par défaut, sera surchargée dans runMarketAnalysisInference
      startTime,
      endTime,
      processingTime,
      tokensUsed,
      estimatedCost,
      success: true,
      confidence,
      cacheHit: false, // Sera mis à jour par les services qui utilisent le cache
      provider: "openai", // Valeur par défaut
      modelVersion: "gpt-4-turbo", // Valeur par défaut
      timestamp: Date.now(), // Added timestamp
    };

    aiMetricsCollector.recordPerformanceMetrics(performanceMetrics);

    // Enregistrer les métriques de coût
    const costMetrics: AICostMetrics = {
      timestamp: Date.now(),
      analysisType: "insights",
      tokensUsed,
      estimatedCost,
      provider: "openai",
      modelVersion: "gpt-4-turbo",
      requestId,
    };

    aiMetricsCollector.recordCostMetrics(costMetrics);

    return result;
  } catch (error) {
    const endTime = Date.now();
    const processingTime = endTime - startTime;

    // Déterminer le type d'erreur
    if ((error as any).name === "AbortError") {
      errorType = "TIMEOUT";
    } else if (error instanceof AIAnalysisError) {
      errorType = error.code;
    } else {
      errorType = "UNKNOWN_ERROR";
    }

    // Enregistrer les métriques d'échec
    const performanceMetrics: AIPerformanceMetrics = {
      requestId,
      analysisType: "insights",
      startTime,
      endTime,
      processingTime,
      tokensUsed,
      estimatedCost,
      success: false,
      errorType,
      cacheHit: false,
      provider: "openai",
      modelVersion: "gpt-4-turbo",
      timestamp: Date.now(), // Added timestamp
    };

    aiMetricsCollector.recordPerformanceMetrics(performanceMetrics);

    if ((error as any).name === "AbortError") {
      throw new AIAnalysisError(
        `Timeout après ${processingTime}ms`,
        AIErrorCode.ANALYSIS_TIMEOUT, // Used AIErrorCode enum
        {
          retryable: true,
          fallbackAvailable: true,
          context: { processingTime, payload, requestId },
        },
      );
    }

    if (error instanceof AIAnalysisError) {
      throw error;
    }

    throw new InferenceError(`Erreur d'inférence: ${getErrorMessage(error)}`, {
      cause: toError(error),
      context: { processingTime, payload, requestId },
    });
  }
}

// Fonction pour calculer la confiance basée sur la réponse
function calculateConfidence(result: any, payload: InferenceRequest): number {
  let confidence = 0.8; // Base

  // Ajuster selon la température (plus basse = plus de confiance)
  if (payload.temperature !== undefined) {
    confidence += (0.5 - payload.temperature) * 0.4;
  }

  // Ajuster selon la longueur de la réponse
  const responseLength = result.choices?.[0]?.text?.length || 0;
  if (responseLength > 100) {
    confidence += 0.1;
  }

  // Ajuster selon le finish_reason
  if (result.choices?.[0]?.finish_reason === "stop") {
    confidence += 0.1;
  }

  return Math.max(0, Math.min(1, confidence));
}

// Fonction pour estimer le coût
function estimateCost(tokens: number): number {
  // Estimation basée sur les prix OpenAI GPT-4 (approximatif)
  const costPerToken = 0.00003; // $0.03 per 1K tokens
  return tokens * costPerToken;
}

// Nouvelle fonction spécialisée pour l'analyse de marché
export async function runMarketAnalysisInference(
  payload: MarketAnalysisInferenceRequest,
): Promise<MarketAnalysisInferenceResponse> {
  const requestId = uuidv4();
  const startTime = Date.now();

  const enhancedPayload = {
    ...payload,
    // Ajouter des paramètres optimisés pour l'analyse de marché
    temperature:
      payload.temperature || getOptimalTemperature(payload.analysisType),
    max_tokens: payload.max_tokens || getOptimalMaxTokens(payload.analysisType),
  };

  try {
    const result = (await runInference(
      enhancedPayload,
    )) as MarketAnalysisInferenceResponse;

    // Mettre à jour les métriques avec le type d'analyse correct
    if (result.metadata) {
      result.metadata.requestId = requestId;

      // Enregistrer des métriques spécifiques à l'analyse de marché
      const performanceMetrics: AIPerformanceMetrics = {
        requestId,
        analysisType: payload.analysisType,
        startTime,
        endTime: Date.now(),
        processingTime: result.metadata.processingTime,
        tokensUsed: result.metadata.tokensUsed,
        estimatedCost: result.metadata.cost || 0,
        success: true,
        confidence: result.metadata.confidence,
        cacheHit: false, // Sera mis à jour par les services qui utilisent le cache
        provider: getProviderFromContext(payload.context),
        modelVersion: getModelVersionFromContext(payload.context),
        timestamp: Date.now(), // Added timestamp
      };

      aiMetricsCollector.recordPerformanceMetrics(performanceMetrics);

      // Enregistrer les métriques de coût spécifiques
      const costMetrics: AICostMetrics = {
        timestamp: Date.now(),
        analysisType: payload.analysisType,
        tokensUsed: result.metadata.tokensUsed,
        estimatedCost: result.metadata.cost || 0,
        provider: getProviderFromContext(payload.context),
        modelVersion: getModelVersionFromContext(payload.context),
        requestId,
        userId: payload.context?.userId,
      };

      aiMetricsCollector.recordCostMetrics(costMetrics);
    }

    return result;
  } catch (error) {
    // Les métriques d'erreur sont déjà enregistrées dans runInference
    // Mais on peut ajouter des informations spécifiques à l'analyse de marché
    if (error instanceof AIAnalysisError && error.context) {
      error.context.analysisType = payload.analysisType;
      error.context.requestId = requestId;
    }

    throw error;
  }
}

// Fonctions utilitaires pour optimiser les paramètres selon le type d'analyse
function getOptimalTemperature(analysisType: string): number {
  switch (analysisType) {
    case "insights":
      return 0.3; // Plus créatif pour les insights
    case "recommendations":
      return 0.2; // Plus conservateur pour les recommandations
    case "trends":
      return 0.1; // Très conservateur pour les prédictions
    case "anomalies":
      return 0.1; // Très précis pour la détection d'anomalies
    default:
      return 0.2;
  }
}

function getOptimalMaxTokens(analysisType: string): number {
  switch (analysisType) {
    case "insights":
      return 800; // Plus d'espace pour les insights détaillés
    case "recommendations":
      return 600; // Recommandations structurées
    case "trends":
      return 400; // Prédictions concises
    case "anomalies":
      return 200; // Détection simple
    default:
      return 500;
  }
}

// Fonctions utilitaires pour extraire les informations de contexte
function getProviderFromContext(context?: Record<string, unknown>): string {
  // Changed context type
  return (
    (context?.['provider'] as string) || process.env["AI_PROVIDER"]! || "openai"
  );
}

function getModelVersionFromContext(context?: Record<string, unknown>): string {
  // Changed context type
  return (
    (context?.['modelVersion'] as string) ||
    process.env["AI_MODEL_VERSION"]! ||
    "gpt-4-turbo"
  );
}
