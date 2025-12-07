import { serviceContainer } from "@/lib/services/container";
import { NextRequest } from "next/server";
import { createSuccessResponse, createErrorResponse, createAuthErrorResponse } from "@/lib/utils/api-response";

/**
 * GET /api/v1/dashboard
 * Récupère toutes les données nécessaires pour le dashboard principal
 */
export async function GET(_request: NextRequest) {
  try {
    // Validation de l'authentification  
    const user = await serviceContainer.getAuthService().getSessionUser();
    if (!user) {
      return createAuthErrorResponse("Non authentifié");
    }

    // Appel du service
    const statisticsService = serviceContainer.getStatisticsService();
    const dashboardData = await statisticsService.getDashboardStats(user.id);

    return createSuccessResponse(dashboardData);

  } catch (error) {
    console.error("[DashboardAPI] Error fetching dashboard data:", error);
    return createErrorResponse(error);
  }
}
