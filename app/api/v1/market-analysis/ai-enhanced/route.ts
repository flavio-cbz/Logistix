import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getSessionUser } from "@/lib/services/auth";
import { db } from "@/lib/services/database/drizzle-client";
import { marketAnalyses } from "@/lib/services/database/drizzle-schema";
import { eq } from "drizzle-orm";
import { ApiError, createApiErrorResponse } from "@/lib/utils/validation";
import { logger } from "@/lib/utils/logging/logger";
import { 
  vintedMarketAnalysisService, 
  VintedApiError,
  VintedValidationError 
} from "@/lib/services/vinted-market-analysis";
import { vintedApiMonitor } from "@/lib/services/performance-monitor";
import { cacheManager } from "@/lib/services/cache-manager";
import {
  MarketAnalysisRequestSchema,
  type EnhancedVintedAnalysisResult
} from "@/types/vinted-market-analysis";
import { vintedSessions } from "@/lib/services/database/drizzle-schema";
import { vintedCredentialService } from "@/lib/services/auth/vinted-credential-service";
import { z } from "zod";

// Schema for AI enhancement options
const AIEnhancementOptionsSchema = z.object({
  includeAIInsights: z.boolean().default(true),
  includeRecommendations: z.boolean().default(true),
  includeAnomalyDetection: z.boolean().default(false),
  includeTrendPrediction: z.boolean().default(false),
  includeEnhancedCharts: z.boolean().default(false),
});

const AIEnhancedMarketAnalysisRequestSchema = MarketAnalysisRequestSchema.extend({
  aiOptions: AIEnhancementOptionsSchema.optional(),
});

// POST /api/v1/market-analysis/ai-enhanced : Lancer une analyse de marché avec IA
export async function POST(req: NextRequest) {
  const id = uuidv4();
  let user;

  try {
    user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        createApiErrorResponse(new ApiError("Authentification requise", 401, "AUTH_REQUIRED")),
        { status: 401 }
      );
    }

    // Check if user has AI configuration
    if (!user.aiConfig) {
      return NextResponse.json(
        createApiErrorResponse(new ApiError("Configuration IA requise pour cette fonctionnalité", 403, "AI_CONFIG_REQUIRED")),
        { status: 403 }
      );
    }

    let requestBody: unknown;
    try {
      requestBody = await req.json();
      logger.info("Received AI-enhanced market analysis request:", { body: requestBody });
    } catch (e) {
      logger.error("Invalid JSON in request body:", { error: e });
      return NextResponse.json(
        createApiErrorResponse(new ApiError("Corps de requête JSON invalide", 400, "INVALID_JSON")),
        { status: 400 }
      );
    }

    const validationResult = AIEnhancedMarketAnalysisRequestSchema.safeParse(requestBody);
    if (!validationResult.success) {
      const errors = Object.entries(validationResult.error.flatten().fieldErrors).flatMap(([field, messages]) => 
        (messages || []).map(message => ({ field, message, code: 'INVALID_INPUT' }))
      );
      logger.error("Validation failed for AI-enhanced market analysis request:", { errors, requestBody });
      return NextResponse.json(
        createApiErrorResponse(new ApiError("Données d'entrée invalides", 400, "VALIDATION_ERROR", errors)),
        { status: 400 }
      );
    }

    const { 
      productName, 
      catalogId, 
      categoryName: inputCategoryName, 
      brandId, 
      maxProducts, 
      advancedParams, 
      itemStates,
      aiOptions = {}
    } = validationResult.data;

    // Apply default AI options
    const finalAIOptions = AIEnhancementOptionsSchema.parse(aiOptions);

    // Validate catalogId
    if (!catalogId) {
      logger.error("Missing catalogId in AI-enhanced market analysis request:", { requestBody });
      return NextResponse.json(
        createApiErrorResponse(new ApiError("L'ID de catalogue est requis", 400, "MISSING_CATALOG_ID")),
        { status: 400 }
      );
    }

    // Verify catalog exists
    const res = await fetch("http://localhost:3000/api/v1/vinted/categories");
    const { categories } = await res.json();
    
    const findCategoryById = (categories: any[], id: number): any | null => {
      for (const category of categories) {
        if (category.id === id) return category;
        if (category.catalogs) {
          const found = findCategoryById(category.catalogs, id);
          if (found) return found;
        }
      }
      return null;
    };
    
    const category = findCategoryById(categories, catalogId);
    if (!category) {
      logger.error("Invalid catalogId in AI-enhanced market analysis request:", { catalogId });
      return NextResponse.json(
        createApiErrorResponse(new ApiError(`Catégorie avec l'ID ${catalogId} non trouvée`, 400, "INVALID_CATALOG_ID")),
        { status: 400 }
      );
    }
    
    const categoryName = inputCategoryName || category.title;

    // Get Vinted session
    const vintedSession = await db.query.vintedSessions.findFirst({
      where: eq(vintedSessions.userId, user.id),
    });

    if (!vintedSession?.sessionCookie) {
      logger.error(`No Vinted session cookie found for user ${user.id}`);
      return NextResponse.json(
        createApiErrorResponse(new ApiError("Cookie de session Vinted non configuré pour cet utilisateur", 400, "VINTED_SESSION_NOT_CONFIGURED")),
        { status: 400 }
      );
    }

    let sessionCookie: string;
    try {
      sessionCookie = await vintedCredentialService.decrypt(vintedSession.sessionCookie);
    } catch (error) {
      logger.error(`Failed to decrypt Vinted session cookie for user ${user.id}:`, { error });
      return NextResponse.json(
        createApiErrorResponse(new ApiError("Impossible de déchiffrer le cookie de session Vinted", 500, "VINTED_SESSION_DECRYPTION_FAILED")),
        { status: 500 }
      );
    }
    
    const now = new Date();

    // Create database record
    await db.insert(marketAnalyses).values({
      id,
      userId: user.id,
      status: "pending",
      productName,
      catalogId,
      categoryName,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      input: { 
        productName, 
        catalogId, 
        categoryName, 
        brandId, 
        maxProducts, 
        advancedParams, 
        itemStates,
        aiOptions: finalAIOptions
      },
    });

    try {
      // Check cache with AI options
      const cacheKey = {
        productName,
        catalogId,
        userId: user.id,
        aiOptions: JSON.stringify(finalAIOptions),
      };

      let analysisResult: EnhancedVintedAnalysisResult | null = await cacheManager.get(cacheKey);
      
      if (!analysisResult) {
        // Perform AI-enhanced analysis with monitoring
        logger.info(`[API] Performing AI-enhanced analysis for ${id} with options:`, finalAIOptions);
        
        analysisResult = await vintedApiMonitor.monitorApiCall(
          'ai-enhanced-market-analysis',
          () => vintedMarketAnalysisService.analyzeProductWithAI({
            productName,
            catalogId,
            categoryName,
            brandId: brandId ?? 0,
            token: sessionCookie,
            maxProducts: maxProducts ?? 100,
            advancedParams: advancedParams ?? {},
            itemStates: Array.isArray(itemStates) ? itemStates.map(Number) : []
          }, finalAIOptions),
          {
            productName,
            catalogId,
            brandId: brandId ?? 0,
            userId: user.id,
            aiOptions: finalAIOptions,
          }
        );

        if (!analysisResult) {
          throw new Error("L'analyse IA n'a retourné aucun résultat.");
        }

        // Store in cache
        await cacheManager.set(cacheKey, analysisResult, id);
      } else {
        logger.info(`[API] AI-enhanced result retrieved from cache for analysis ${id}`);
      }

      // Validate result structure
      if (!analysisResult || typeof analysisResult !== "object" || !("rawItems" in analysisResult)) {
        logger.error(`[API] Invalid AI-enhanced analysis ${id}, not saved to database.`);
        await db.update(marketAnalyses).set({
          status: "failed",
          error: "Résultat d'analyse IA invalide ou incomplet",
          updatedAt: new Date().toISOString(),
        }).where(eq(marketAnalyses.id, id));
        return NextResponse.json(
          createApiErrorResponse(new ApiError("L'analyse IA a échoué et n'a pas été enregistrée.", 400, "AI_ANALYSIS_FAILED")),
          { status: 400 }
        );
      }

      // Update with results
      await db.update(marketAnalyses).set({
        status: "completed",
        result: analysisResult,
        rawData: analysisResult.rawItems,
        updatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h cache
      }).where(eq(marketAnalyses.id, id));

      // Prepare comprehensive AI-enhanced response
      const response = {
        id,
        // Base analysis data
        salesVolume: analysisResult.salesVolume,
        avgPrice: analysisResult.avgPrice,
        priceRange: analysisResult.priceRange,
        brandInfo: analysisResult.brandInfo,
        analysisDate: analysisResult.analysisDate,
        brandSuggestionMissing: !analysisResult.brandInfo || !analysisResult.brandInfo.id,
        
        // AI processing metadata
        processingMetadata: analysisResult.processingMetadata,
        dataQuality: analysisResult.dataQuality,
        
        // AI insights (if requested and available)
        ...(finalAIOptions.includeAIInsights && analysisResult.aiInsights && {
          aiInsights: {
            summary: analysisResult.aiInsights.summary,
            keyFindings: analysisResult.aiInsights.keyFindings,
            marketContext: analysisResult.aiInsights.marketContext,
            priceAnalysis: analysisResult.aiInsights.priceAnalysis,
            confidence: analysisResult.aiInsights.confidence,
            generatedAt: analysisResult.aiInsights.generatedAt,
          }
        }),
        
        // AI recommendations (if requested and available)
        ...(finalAIOptions.includeRecommendations && analysisResult.aiRecommendations && {
          aiRecommendations: {
            pricing: analysisResult.aiRecommendations.pricing,
            marketing: analysisResult.aiRecommendations.marketing,
            opportunities: analysisResult.aiRecommendations.opportunities,
            risks: analysisResult.aiRecommendations.risks,
            actionPlan: analysisResult.aiRecommendations.actionPlan,
            confidence: analysisResult.aiRecommendations.confidence,
            lastUpdated: analysisResult.aiRecommendations.lastUpdated,
          }
        }),
        
        // Anomaly detection (if requested and available)
        ...(finalAIOptions.includeAnomalyDetection && analysisResult.anomalies && {
          anomalies: analysisResult.anomalies
        }),
        
        // Trend predictions (if requested and available)
        ...(finalAIOptions.includeTrendPrediction && analysisResult.trendPredictions && {
          trendPredictions: analysisResult.trendPredictions
        }),
        
        // Enhanced charts (if requested and available)
        ...(finalAIOptions.includeEnhancedCharts && analysisResult.enhancedCharts && {
          enhancedCharts: analysisResult.enhancedCharts
        }),
      };

      logger.info(`[API] Returning AI-enhanced analysis for ${id} with confidence: ${analysisResult.processingMetadata.confidence}`);
      return NextResponse.json(response, { status: 200 });

    } catch (error: any) {
      logger.error(`[API] Error during AI-enhanced analysis ${id}:`, error);
      
      // Determine error type and appropriate message
      let errorMessage = "Erreur lors de l'analyse IA";
      let errorCode = "AI_ANALYSIS_ERROR";
      let statusCode = 500;
      let context = {};

      if (error instanceof VintedApiError) {
        errorMessage = `Erreur Vinted lors de l'analyse IA: ${error.message}`;
        statusCode = error.status || 502;
        context = error.context || {};
        errorCode = "VINTED_API_ERROR_IN_AI_ANALYSIS";
      } else if (error instanceof VintedValidationError) {
        errorMessage = `Erreur de validation lors de l'analyse IA: ${error.message}`;
        errorCode = "VINTED_VALIDATION_ERROR_IN_AI_ANALYSIS";
        statusCode = 400;
      } else if (error.name === 'AIAnalysisError') {
        errorMessage = `Erreur d'analyse IA: ${error.message}`;
        errorCode = error.code || "AI_ANALYSIS_ERROR";
        statusCode = 503; // Service temporarily unavailable
        context = {
          aiError: true,
          retryable: error.retryable || false,
          fallbackAvailable: error.fallbackAvailable || false,
          ...error.context
        };
      } else if (error.message?.includes('timeout') || error.message?.includes('Timeout')) {
        errorMessage = "L'analyse IA a pris trop de temps";
        errorCode = "AI_ANALYSIS_TIMEOUT";
        statusCode = 504;
        context = { timeout: true, retryable: true };
      }

      // Update status in database
      await db.update(marketAnalyses).set({
        status: "failed",
        error: errorMessage,
        updatedAt: new Date().toISOString(),
      }).where(eq(marketAnalyses.id, id));

      // Return structured error response
      const errorPayload = {
        error: {
          message: errorMessage,
          code: errorCode,
          context: context,
        },
      };
      return NextResponse.json(errorPayload, { status: statusCode });
    }

  } catch (error: any) {
    logger.error(`[API] General error during AI-enhanced analysis processing ${id}:`, error);
    
    if (user) {
      try {
        await db.update(marketAnalyses).set({
          status: "failed",
          error: error.message || "Erreur inconnue lors de l'analyse IA",
          updatedAt: new Date().toISOString(),
        }).where(eq(marketAnalyses.id, id));
      } catch (dbError) {
        logger.error(`[API] Error updating database:`, { error: dbError });
      }
    }

    if (error instanceof ApiError) {
      return NextResponse.json(createApiErrorResponse(error), { status: error.statusCode });
    }
    
    return NextResponse.json(
      createApiErrorResponse(new ApiError("Erreur interne du serveur lors de l'analyse IA", 500, "AI_INTERNAL_ERROR")),
      { status: 500 }
    );
  }
}

// GET /api/v1/market-analysis/ai-enhanced : Get AI enhancement capabilities
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        createApiErrorResponse(new ApiError("Authentification requise", 401, "AUTH_REQUIRED")),
        { status: 401 }
      );
    }

    // Check AI configuration
    const hasAIConfig = !!user.aiConfig;
    
    return NextResponse.json({
      aiEnhancementAvailable: hasAIConfig,
      supportedFeatures: {
        aiInsights: hasAIConfig,
        recommendations: hasAIConfig,
        anomalyDetection: hasAIConfig,
        trendPrediction: hasAIConfig,
        enhancedCharts: hasAIConfig,
      },
      defaultOptions: AIEnhancementOptionsSchema.parse({}),
      ...(hasAIConfig && {
        aiProvider: user.aiConfig?.model || 'unknown',
        estimatedProcessingTime: '10-30 seconds',
      })
    }, { status: 200 });

  } catch (error: any) {
    logger.error("[API] Error checking AI enhancement capabilities:", error);
    return NextResponse.json(
      createApiErrorResponse(new ApiError("Erreur lors de la vérification des capacités IA", 500, "AI_CAPABILITIES_ERROR")),
      { status: 500 }
    );
  }
}