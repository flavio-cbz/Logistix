import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getSessionUser } from "@/lib/services/auth";
import { db } from "@/lib/services/database/drizzle-client";
import { marketAnalyses } from "@/lib/services/database/drizzle-schema";
import { eq, sql, desc, and, like } from "drizzle-orm";
import { ApiError, createApiErrorResponse } from "@/lib/utils/validation";
import { logger } from "@/lib/utils/logging/logger";
import { 
  vintedMarketAnalysisService, 
  VintedApiError,
  VintedValidationError 
} from "@/lib/services/vinted-market-analysis";
import { vintedCatalogHierarchyService } from "@/lib/services/vinted-catalog-hierarchy";
import { vintedApiMonitor } from "@/lib/services/performance-monitor";
import { cacheManager } from "@/lib/services/cache-manager";
import {
  MarketAnalysisRequestSchema,
  VintedAnalysisResultSchema,
  type MarketAnalysisRequest,
  type VintedAnalysisResult
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

    const { productName, catalogId, categoryName: inputCategoryName } = validationResult.data;

    // Valider que le catalogId est fourni (maintenant obligatoire)
    if (!catalogId) {
      logger.error("Missing catalogId in market analysis request:", { requestBody });
      return NextResponse.json(
        createApiErrorResponse(new ApiError("L'ID de catalogue est requis", 400, "MISSING_CATALOG_ID")),
        { status: 400 }
      );
    }

    const finalCatalogId = catalogId;

    // Vérifier que le catalogue existe avec le nouveau service hiérarchique
    const category = vintedCatalogHierarchyService.findCategoryById(finalCatalogId);
    if (!category) {
      logger.error("Invalid catalogId in market analysis request:", { catalogId });
      return NextResponse.json(
        createApiErrorResponse(new ApiError(`Catégorie avec l'ID ${finalCatalogId} non trouvée`, 400, "INVALID_CATALOG_ID")),
        { status: 400 }
      );
    }

    // Vérifier que c'est une catégorie niveau 3 valide pour l'analyse
    if (category.level !== 3 || !(category as any).isValidForAnalysis) {
      logger.error("Invalid category level for analysis:", { category });
      return NextResponse.json(
        createApiErrorResponse(new ApiError(`La catégorie doit être de niveau 3 pour l'analyse de marché`, 400, "INVALID_CATEGORY_LEVEL")),
        { status: 400 }
      );
    }

    // Utiliser le nom de la catégorie si categoryName n'est pas fourni
    const categoryName = inputCategoryName || category.name;

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
      input: { productName, catalogId: finalCatalogId, categoryName },
    });

    try {
      // Vérifier le cache avant l'analyse
      const cacheKey = {
        productName,
        catalogId: finalCatalogId,
        userId: user.id,
      };

      let analysisResult: VintedAnalysisResult | null = await cacheManager.get(cacheKey);
      
      if (!analysisResult) {
        // Effectuer l'analyse avec monitoring de performance
        analysisResult = await vintedApiMonitor.monitorApiCall(
          'market-analysis',
          () => vintedMarketAnalysisService.analyzeProduct({
            productName,
            catalogId: finalCatalogId,
            token: sessionCookie
          }),
          {
            productName,
            catalogId: finalCatalogId,
            userId: user.id,
          }
        );

        if (!analysisResult) {
            throw new Error("L'analyse n'a retourné aucun résultat.");
        }

        // Stocker en cache
        await cacheManager.set(cacheKey, analysisResult, id);
      } else {
        logger.info(`[API] Résultat récupéré depuis le cache pour l'analyse ${id}`);
      }

      // Mettre à jour avec les résultats
      await db.update(marketAnalyses).set({
        status: "completed",
        result: analysisResult,
        rawData: analysisResult.rawItems,
        updatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h cache
      }).where(eq(marketAnalyses.id, id));

      // Retourner les résultats simplifiés pour l'API
      return NextResponse.json({
        id,
        salesVolume: analysisResult.salesVolume,
        avgPrice: analysisResult.avgPrice,
        priceRange: analysisResult.priceRange,
        brandInfo: analysisResult.brandInfo,
        analysisDate: analysisResult.analysisDate,
        brandSuggestionMissing: !analysisResult.brandInfo || !analysisResult.brandInfo.id,
      }, { status: 200 });

    } catch (error: any) {
      logger.error(`[API] Erreur lors de l'analyse ${id}:`, error);
      
      // Déterminer le type d'erreur et le message approprié
      let errorMessage = "Erreur lors de l'analyse";
      let errorCode = "ANALYSIS_ERROR";
      let statusCode = 500;

      if (error instanceof VintedApiError) {
        errorMessage = error.message;
        // Si l'erreur est une 401, on utilise un code d'erreur spécifique
        if (error.status === 401) {
          errorCode = "VINTED_TOKEN_EXPIRED";
          errorMessage = "Votre token Vinted est invalide ou a expiré.";
        } else {
          errorCode = "VINTED_API_ERROR";
        }
        statusCode = error.status || 502;
      } else if (error instanceof VintedValidationError) {
        errorMessage = error.message;
        errorCode = "VINTED_VALIDATION_ERROR";
        statusCode = 400;
      }

      // Mettre à jour le statut en base
      await db.update(marketAnalyses).set({
        status: "failed",
        error: errorMessage,
        updatedAt: new Date().toISOString(),
      }).where(eq(marketAnalyses.id, id));

      // On construit une réponse d'erreur qui inclut le code spécifique
      const errorPayload = {
        error: {
          message: errorMessage,
          code: errorCode,
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

// GET /api/v1/market-analysis : Liste paginée des analyses de l'utilisateur
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json(
        createApiErrorResponse(new ApiError("Authentification requise", 401, "AUTH_REQUIRED")),
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit
    const productNameFilter = searchParams.get('productName');
    const statusFilter = searchParams.get('status') as 'pending' | 'completed' | 'failed' | null;

    // Construire les conditions de filtrage
    let whereConditions = eq(marketAnalyses.userId, user.id);
    
    if (productNameFilter) {
      whereConditions = and(
        whereConditions,
        like(marketAnalyses.productName, `%${productNameFilter}%`)
      ) as any;
    }
    
    if (statusFilter) {
      whereConditions = and(
        whereConditions,
        eq(marketAnalyses.status, statusFilter)
      ) as any;
    }

    const tasks = await db.query.marketAnalyses.findMany({
        where: whereConditions,
        orderBy: (marketAnalyses, { desc }) => [desc(marketAnalyses.createdAt)],
        limit: limit,
        offset: offset,
        columns: {
            id: true,
            productName: true,
            catalogId: true,
            categoryName: true,
            status: true,
            error: true,
            createdAt: true,
            updatedAt: true,
            result: true,
        },
    });

    const totalResult = await db.select({ count: sql`count(*)` }).from(marketAnalyses).where(whereConditions);
    const total = Number(totalResult[0]?.count || 0);
    
    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      page,
      limit,
      total,
      totalPages,
      analyses: tasks,
    })

  } catch (error: any) {
    logger.error("Erreur inattendue dans GET /api/v1/market-analysis:", error)
    return NextResponse.json(
      createApiErrorResponse(new ApiError("Erreur interne du serveur", 500, "INTERNAL_ERROR")),
      { status: 500 }
    )
  }
}

// DELETE /api/v1/market-analysis?id=xxx : Supprimer une analyse de l'utilisateur
export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        createApiErrorResponse(new ApiError("Authentification requise", 401, "AUTH_REQUIRED")),
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        createApiErrorResponse(new ApiError("ID d'analyse requis", 400, "MISSING_ID")),
        { status: 400 }
      );
    }

    // Vérifier que l'analyse appartient à l'utilisateur
    const analysis = await db.query.marketAnalyses.findFirst({
      where: and(eq(marketAnalyses.id, id), eq(marketAnalyses.userId, user.id)),
    });

    if (!analysis) {
      return NextResponse.json(
        createApiErrorResponse(new ApiError("Analyse non trouvée ou accès refusé", 404, "NOT_FOUND")),
        { status: 404 }
      );
    }

    await db.delete(marketAnalyses).where(eq(marketAnalyses.id, id));

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    logger.error("Erreur lors de la suppression d'une analyse:", error);
    return NextResponse.json(
      createApiErrorResponse(new ApiError("Erreur interne du serveur", 500, "INTERNAL_ERROR")),
      { status: 500 }
    );
  }
}