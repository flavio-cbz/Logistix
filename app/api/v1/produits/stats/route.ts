import { serviceContainer } from "@/lib/services/container";
import { NextRequest } from "next/server";
import { productsStatsQuerySchema } from "@/lib/schemas";
import { validateQuery } from "@/lib/middleware/validation-middleware";
import { createSuccessResponse, createErrorResponse, createAuthErrorResponse } from "@/lib/utils/api-response";

// GET /api/v1/produits/stats - Statistiques des produits
export async function GET(request: NextRequest) {
  try {
    // Validation de l'authentification
    const user = await serviceContainer.getAuthService().getSessionUser();
    if (!user) {
      return createAuthErrorResponse("Non authentifié");
    }

    // Validation des paramètres de requête
    validateQuery(productsStatsQuerySchema, request);

    // Appel du service
    const statisticsService = serviceContainer.getStatisticsService();
    const stats = await statisticsService.getProductStats(user.id);

    return createSuccessResponse(stats);
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error : new Error("Erreur interne du serveur"));
  }
}
