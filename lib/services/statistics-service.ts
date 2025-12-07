/**
 * Statistics Service - Facade
 * 
 * This is a facade that delegates to specialized statistics services.
 * It maintains backward compatibility while the codebase migrates to direct service usage.
 * 
 * @deprecated Use individual services from '@/lib/services/statistics' instead:
 * - dashboardStatsService for dashboard data
 * - productStatsService for product statistics
 * - advancedStatsService for /statistiques page data
 */

import { BaseService } from "./base-service";
import { dashboardStatsService } from "./statistics/dashboard-stats.service";
import { productStatsService } from "./statistics/product-stats.service";
import { advancedStatsService } from "./statistics/advanced-stats.service";
import { StatsSearchParams } from "@/lib/schemas/stats";

export class StatisticsService extends BaseService {
    constructor() {
        super("StatisticsService");
    }

    /**
     * @deprecated Use advancedStatsService.getAdvancedStats() directly
     */
    async getAdvancedStats(userId: string, params: StatsSearchParams) {
        return advancedStatsService.getAdvancedStats(userId, params);
    }

    /**
     * @deprecated Use dashboardStatsService.getDashboardStats() directly
     */
    async getDashboardStats(userId: string) {
        return dashboardStatsService.getDashboardStats(userId);
    }

    /**
     * @deprecated Use productStatsService.getProductStats() directly
     */
    async getProductStats(userId: string) {
        return productStatsService.getProductStats(userId);
    }
}

// Re-export individual services for gradual migration
export { dashboardStatsService, productStatsService, advancedStatsService };

// Export for backward compatibility
export const statisticsService = new StatisticsService();
