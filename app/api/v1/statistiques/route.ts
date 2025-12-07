import { serviceContainer } from "@/lib/services/container";
import { NextRequest } from "next/server";
import { createSuccessResponse, createErrorResponse, createAuthErrorResponse } from "@/lib/utils/api-response";
import { statsSearchParamsSchema } from "@/lib/schemas/stats";

/**
 * GET /api/v1/statistiques
 * Récupère des statistiques avancées et analyses complètes
 */
export async function GET(request: NextRequest) {
  try {
    // Validation de l'authentification
    const user = await serviceContainer.getAuthService().getSessionUser();
    if (!user) {
      return createAuthErrorResponse("Non authentifié");
    }

    // Récupération et validation des paramètres
    const searchParams = {
      period: request.nextUrl.searchParams.get('period') || undefined,
      groupBy: request.nextUrl.searchParams.get('groupBy') || undefined,
    };

    const params = statsSearchParamsSchema.parse(searchParams);

    // Appel du service
    const statisticsService = serviceContainer.getStatisticsService();
    const stats = await statisticsService.getAdvancedStats(user.id, params);

    return createSuccessResponse(stats);

  } catch (error) {
    return createErrorResponse(error);
  }
}
