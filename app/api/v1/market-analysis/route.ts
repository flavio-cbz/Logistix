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
  type VintedAnalysisResult,
  type EnhancedVintedAnalysisResult
} from "@/types/vinted-market-analysis";
import { vintedSessions } from "@/lib/services/database/drizzle-schema";
import { vintedCredentialService } from "@/lib/services/auth/vinted-credential-service";

// POST /api/v1/market-analysis : Lancer une analyse de marché (synchrone)
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

    let requestBody: unknown;
    try {
      requestBody = await req.json();
      logger.info("Received market analysis request body:", { body: requestBody });
    } catch (e) {
      logger.error("Invalid JSON in request body:", e);
      return NextResponse.json(
        createApiErrorResponse(new ApiError("Corps de requête JSON invalide", 400, "INVALID_JSON")),
        { status: 400 }
      );
    }

    const validationResult = MarketAnalysisRequestSchema.safeParse(requestBody);
    if (!validationResult.success) {
      const errors = Object.entries(validationResult.error.flatten().fieldErrors).flatMap(([field, messages]) => 
        (messages || []).map(message => ({ field, message, code: 'INVALID_INPUT' }))
      );
      logger.error("Validation failed for market analysis request:", { errors, requestBody });
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
      itemStates 
    } = validationResult.data;

    // Extract AI enhancement options from query parameters
    const url = new URL(req.url);
    const aiOptions = {
      includeAIInsights: url.searchParams.get('includeAIInsights') === 'true',
      includeRecommendations: url.searchParams.get('includeRecommendations') === 'true',
      includeAnomalyDetection: url.searchParams.get('includeAnomalyDetection') === 'true',
      includeTrendPrediction: url.searchParams.get('includeTrendPrediction') === 'true',
      includeEnhancedCharts: url.searchParams.get('includeEnhancedCharts') === 'true',
    };

    const useAIEnhancement = Object.values(aiOptions).some(option => option === true);

    // Valider que le catalogId est fourni (maintenant obligatoire)
    if (!catalogId) {
      logger.error("Missing catalogId in market analysis request:", { requestBody });
      return NextResponse.json(
        createApiErrorResponse(new ApiError("L'ID de catalogue est requis", 400, "MISSING_CATALOG_ID")),
        { status: 400 }
      );
    }

    const finalCatalogId = catalogId;

    // Fonction de recherche récursive pour trouver une catégorie par ID
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
    
    // Vérifier que le catalogue existe avec le nouveau service hiérarchique
    // Récupérer toutes les catégories dynamiques depuis la nouvelle API
    const res = await fetch("http://localhost:3000/api/v1/vinted/categories");
    const { categories } = await res.json();
    const category = findCategoryById(categories, finalCatalogId);
    if (!category) {
      logger.error("Invalid catalogId in market analysis request:", { catalogId });
      return NextResponse.json(
        createApiErrorResponse(new ApiError(`Catégorie avec l'ID ${finalCatalogId} non trouvée`, 400, "INVALID_CATALOG_ID")),
        { status: 400 }
      );
    }
    
    // Utiliser le nom de la catégorie si categoryName n'est pas fourni
    const categoryName = inputCategoryName || category.title;

    // Placeholder pour d'autres paramètres avancés
    // advancedParams: { ... } transmis par le frontend, à intégrer dans le schéma et la logique plus tard

    // Récupérer et déchiffrer le cookie de session Vinted pour l'utilisateur
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
      logger.error(`Failed to decrypt Vinted session cookie for user ${user.id}:`, error);
      return NextResponse.json(
        createApiErrorResponse(new ApiError("Impossible de déchiffrer le cookie de session Vinted", 500, "VINTED_SESSION_DECRYPTION_FAILED")),
        { status: 500 }
      );
    }
    
    const now = new Date();

    // Créer l'enregistrement en base
    await db.insert(marketAnalyses).values({
      id,
      userId: user.id,
      status: "pending",
      productName,
      catalogId: finalCatalogId,
      categoryName,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      input: { productName, catalogId: finalCatalogId, categoryName, brandId, maxProducts, advancedParams, itemStates },
    });

    try {
      // Vérifier le cache avant l'analyse
      const cacheKey = {
        productName,
        catalogId: finalCatalogId,
        userId: user.id,
      };

      // Adjust cache key to include AI options if AI enhancement is requested
      const enhancedCacheKey = useAIEnhancement 
        ? { ...cacheKey, aiOptions: JSON.stringify(aiOptions) }
        : cacheKey;

      let analysisResult: VintedAnalysisResult | EnhancedVintedAnalysisResult | null = await cacheManager.get(enhancedCacheKey);
      
      if (!analysisResult) {
        // Effectuer l'analyse avec monitoring de performance
        if (useAIEnhancement) {
          // Use AI-enhanced analysis
          logger.info(`[API] Performing AI-enhanced analysis for ${id} with options:`, aiOptions);
          analysisResult = await vintedApiMonitor.monitorApiCall(
            'ai-enhanced-market-analysis',
            () => vintedMarketAnalysisService.analyzeProductWithAI({
              productName,
              catalogId: finalCatalogId,
              categoryName,
              brandId: brandId ?? 0,
              token: sessionCookie,
              maxProducts: maxProducts ?? 100,
              advancedParams: advancedParams ?? {},
              itemStates: Array.isArray(itemStates) ? itemStates.map(Number) : []
            }, aiOptions),
            {
              productName,
              catalogId: finalCatalogId,
              brandId: brandId ?? 0,
              userId: user.id,
              aiOptions,
            }
          );
        } else {
          // Use standard analysis
          analysisResult = await vintedApiMonitor.monitorApiCall(
            'market-analysis',
            () => vintedMarketAnalysisService.analyzeProduct({
              productName,
              catalogId: finalCatalogId,
              categoryName,
              brandId: brandId ?? 0,
              token: sessionCookie,
              maxProducts: maxProducts ?? 100,
              advancedParams: advancedParams ?? {},
              itemStates: Array.isArray(itemStates) ? itemStates.map(Number) : []
            }),
            {
              productName,
              catalogId: finalCatalogId,
              brandId: brandId ?? 0,
              userId: user.id,
            }
          );
        }

        if (!analysisResult) {
            throw new Error("L'analyse n'a retourné aucun résultat.");
        }

        // Stocker en cache
        await cacheManager.set(enhancedCacheKey, analysisResult, id);
      } else {
        logger.info(`[API] Résultat récupéré depuis le cache pour l'analyse ${id}`);
      }

      // --- Correction : Ne sauvegarder que si analysisResult est défini et du bon type ---
      if (!analysisResult || typeof analysisResult !== "object" || !("rawItems" in analysisResult)) {
        logger.error(`[API] Analyse ${id} invalide ou en erreur, non enregistrée en base.`);
        await db.update(marketAnalyses).set({
          status: "failed",
          error: "Résultat d'analyse invalide ou incomplet",
          updatedAt: new Date().toISOString(),
        }).where(eq(marketAnalyses.id, id));
        return NextResponse.json(
          createApiErrorResponse(new ApiError("L'analyse a échoué et n'a pas été enregistrée.", 400, "ANALYSIS_FAILED")),
          { status: 400 }
        );
      }
      // ----------------------------------------------------------------

      // Mettre à jour avec les résultats
      await db.update(marketAnalyses).set({
        status: "completed",
        result: analysisResult,
        rawData: analysisResult.rawItems,
        updatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h cache
      }).where(eq(marketAnalyses.id, id));

      // Prepare response with base analysis data
      const baseResponse = {
        id,
        salesVolume: analysisResult.salesVolume,
        avgPrice: analysisResult.avgPrice,
        priceRange: analysisResult.priceRange,
        brandInfo: analysisResult.brandInfo,
        analysisDate: analysisResult.analysisDate,
        brandSuggestionMissing: !analysisResult.brandInfo || !analysisResult.brandInfo.id,
      };

      // Add AI enhancement data if available
      if (useAIEnhancement && 'processingMetadata' in analysisResult) {
        const enhancedResult = analysisResult as EnhancedVintedAnalysisResult;
        
        const aiEnhancedResponse = {
          ...baseResponse,
          // AI processing metadata
          processingMetadata: enhancedResult.processingMetadata,
          dataQuality: enhancedResult.dataQuality,
          
          // AI insights and recommendations (if requested and available)
          ...(aiOptions.includeAIInsights && enhancedResult.aiInsights && {
            aiInsights: {
              summary: enhancedResult.aiInsights.summary,
              keyFindings: enhancedResult.aiInsights.keyFindings,
              marketContext: enhancedResult.aiInsights.marketContext,
              priceAnalysis: enhancedResult.aiInsights.priceAnalysis,
              confidence: enhancedResult.aiInsights.confidence,
            }
          }),
          
          ...(aiOptions.includeRecommendations && enhancedResult.aiRecommendations && {
            aiRecommendations: {
              pricing: enhancedResult.aiRecommendations.pricing,
              opportunities: enhancedResult.aiRecommendations.opportunities.slice(0, 3), // Limit for API response
              risks: enhancedResult.aiRecommendations.risks,
              actionPlan: enhancedResult.aiRecommendations.actionPlan,
              confidence: enhancedResult.aiRecommendations.confidence,
            }
          }),
          
          ...(aiOptions.includeAnomalyDetection && enhancedResult.anomalies && {
            anomalies: enhancedResult.anomalies.slice(0, 5) // Limit for API response
          }),
          
          ...(aiOptions.includeTrendPrediction && enhancedResult.trendPredictions && {
            trendPredictions: {
              timeframe: enhancedResult.trendPredictions.timeframe,
              predictions: enhancedResult.trendPredictions.predictions,
              scenarios: enhancedResult.trendPredictions.scenarios,
            }
          }),
          
          ...(aiOptions.includeEnhancedCharts && enhancedResult.enhancedCharts && {
            enhancedCharts: enhancedResult.enhancedCharts.map(chart => ({
              id: chart.id,
              type: chart.type,
              aiAnnotations: chart.aiAnnotations,
              // Note: chartData would be processed separately for visualization
            }))
          }),
        };

        logger.info(`[API] Returning AI-enhanced analysis for ${id} with confidence: ${enhancedResult.processingMetadata.confidence}`);
        return NextResponse.json(aiEnhancedResponse, { status: 200 });
      }

      // Return standard response
      return NextResponse.json(baseResponse, { status: 200 });

    } catch (error: any) {
      logger.error(`[API] Erreur lors de l'analyse ${id}:`, error);
      
      // Déterminer le type d'erreur et le message approprié
      let errorMessage = "Erreur lors de l'analyse";
      let errorCode = "ANALYSIS_ERROR";
      let statusCode = 500;
      let context = {};

      if (error instanceof VintedApiError) {
        errorMessage = error.message;
        statusCode = error.status || 502;
        context = error.context || {};

        if (error.status === 401) {
          errorCode = "VINTED_TOKEN_EXPIRED";
          errorMessage = "Votre token Vinted est invalide ou a expiré.";
        } else if (error.status === 404) {
            errorCode = "NO_ITEMS_FOUND";
        } else {
          errorCode = "VINTED_API_ERROR";
        }
      } else if (error instanceof VintedValidationError) {
        errorMessage = error.message;
        errorCode = "VINTED_VALIDATION_ERROR";
        statusCode = 400;
      } else if (error.name === 'AIAnalysisError') {
        // Handle AI-specific errors
        errorMessage = `Erreur d'analyse IA: ${error.message}`;
        errorCode = "AI_ANALYSIS_ERROR";
        statusCode = 503; // Service temporarily unavailable
        context = {
          aiError: true,
          retryable: error.retryable || false,
          fallbackAvailable: error.fallbackAvailable || false,
          ...error.context
        };
        
        // Log AI errors with more detail
        logger.error(`[API] AI Analysis Error for ${id}:`, {
          error: error.message,
          code: error.code,
          retryable: error.retryable,
          fallbackAvailable: error.fallbackAvailable,
          context: error.context
        });
      }

      // Mettre à jour le statut en base
      await db.update(marketAnalyses).set({
        status: "failed",
        error: errorMessage,
        updatedAt: new Date().toISOString(),
      }).where(eq(marketAnalyses.id, id));

      // On construit une réponse d'erreur qui inclut le code spécifique et le contexte
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
    logger.error(`[API] Erreur générale lors du traitement de l'analyse ${id}:`, error);
    
    if (user) {
      try {
        await db.update(marketAnalyses).set({
          status: "failed",
          error: error.message || "Erreur inconnue",
          updatedAt: new Date().toISOString(),
        }).where(eq(marketAnalyses.id, id));
      } catch (dbError) {
        logger.error(`[API] Erreur lors de la mise à jour de la base:`, dbError);
      }
    }

    if (error instanceof ApiError) {
      return NextResponse.json(createApiErrorResponse(error), { status: error.statusCode });
    }
    
    return NextResponse.json(
      createApiErrorResponse(new ApiError("Erreur interne du serveur", 500, "INTERNAL_ERROR")),
      { status: 500 }
    );
  }
}

// ... (le reste du fichier inchangé)