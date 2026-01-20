import { NextRequest } from "next/server";
import { dashboardStatsService } from "@/lib/services/statistics/dashboard-stats.service";
import { serviceContainer } from "@/lib/services/container";
import { createErrorResponse, createSuccessResponse } from "@/lib/utils/api-response";

export async function GET(_request: NextRequest) {
    try {
        const authService = serviceContainer.getAuthService();
        const user = await authService.requireAuth();

        // Fetch all profitability data in parallel
        const [
            summary,
            byMonth,
            byCategory,
            byBrand,
            topProducts,
            lossProducts,
        ] = await Promise.all([
            dashboardStatsService.getProfitabilitySummary(user.id),
            dashboardStatsService.getProfitByMonth(user.id),
            dashboardStatsService.getProfitByCategory(user.id),
            dashboardStatsService.getProfitByBrand(user.id),
            dashboardStatsService.getTopProfitableProducts(user.id, 10),
            dashboardStatsService.getLossProducts(user.id),
        ]);

        return createSuccessResponse({
            summary,
            byMonth,
            byCategory,
            byBrand,
            topProducts,
            lossProducts,
        });
    } catch (error: unknown) {
        return createErrorResponse(error);
    }
}
