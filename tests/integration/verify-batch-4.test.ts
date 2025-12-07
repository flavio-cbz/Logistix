/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { serviceContainer } from "@/lib/services/container";
import { databaseService as db } from "@/lib/services/database/db";

describe('Batch 4 Verification (Integration)', () => {
    let userId: string;

    beforeAll(async () => {
        // Get a test user
        const user = await db.queryOne<{ id: string }>("SELECT id FROM users LIMIT 1");
        if (!user) {
            throw new Error("No user found in database. Cannot verify statistics.");
        }
        userId = user.id;
        console.log(`Using user ID: ${userId}`);
    });

    it('should retrieve dashboard stats successfully', async () => {
        const statsService = serviceContainer.getStatisticsService();
        const dashboardStats = await statsService.getDashboardStats(userId);

        expect(dashboardStats).toBeDefined();
        expect(dashboardStats.ventesTotales).toBeDefined();
        expect(dashboardStats.statsParcelles).toBeDefined();

        console.log("Dashboard Stats Result:", JSON.stringify(dashboardStats, null, 2).substring(0, 200) + "...");
    });

    it('should retrieve product stats successfully', async () => {
        const statsService = serviceContainer.getStatisticsService();
        const productStats = await statsService.getProductStats(userId);

        expect(productStats).toBeDefined();
        expect(productStats.global).toBeDefined();
        expect(productStats.insights).toBeDefined();

        console.log("Product Stats Result:", JSON.stringify(productStats, null, 2).substring(0, 200) + "...");
    });

    it('should retrieve advanced stats successfully', async () => {
        const statsService = serviceContainer.getStatisticsService();
        const advancedStats = await statsService.getAdvancedStats(userId, { period: '30d', groupBy: 'day' });

        expect(advancedStats).toBeDefined();
        expect(advancedStats.vueEnsemble).toBeDefined();
        expect(advancedStats.evolutionTemporelle).toBeDefined();

        console.log("Advanced Stats Result:", JSON.stringify(advancedStats, null, 2).substring(0, 200) + "...");
    });
});
