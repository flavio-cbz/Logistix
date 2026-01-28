/**
 * Statistics Service - Facade
 *
 * This is a facade that delegates to specialized statistics services.
 * It maintains backward compatibility while the codebase migrates to direct service usage.
 *
 * @deprecated Use individual services from '@/lib/services/statistics' instead:
 * - serviceContainer.getDashboardStatsService() for dashboard data
 * - serviceContainer.getProductStatsService() for product statistics
 * - advancedStatsService for /statistiques page data
 */

import { BaseService } from "./base-service";
import { serviceContainer } from "./container";
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
     * @deprecated Use serviceContainer.getDashboardStatsService().getDashboardStats() directly
     */
    async getDashboardStats(userId: string) {
        return serviceContainer.getDashboardStatsService().getDashboardStats(userId);
    }

    /**
     * @deprecated Use productStatsService.getProductStats() directly
     */
    async getProductStats(userId: string) {
        return productStatsService.getProductStats(userId);
    }
}

// Re-export individual services for gradual migration
export { productStatsService, advancedStatsService };

// Export for backward compatibility
export const statisticsService = new StatisticsService();
