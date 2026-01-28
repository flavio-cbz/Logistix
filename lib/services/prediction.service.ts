import { BaseService } from "./base-service";
import { databaseService } from "@/lib/database";

interface ProductPrediction {
    productId: string;
    productName: string;
    brand: string | null;
    category: string | null;
    daysInStock: number;
    estimatedDaysToSell: number | null;
    riskLevel: "low" | "medium" | "high" | "critical";
    suggestedAction: string;
}

interface SlowMovingProduct {
    id: string;
    name: string;
    brand: string | null;
    category: string | null;
    price: number;
    daysInStock: number;
    listedAt: string | null;
}

interface CategoryVelocity {
    category: string;
    avgDaysToSell: number;
    salesCount: number;
}

interface BrandVelocity {
    brand: string;
    avgDaysToSell: number;
    salesCount: number;
}

export class PredictionService extends BaseService {
    constructor() {
        super("PredictionService");
    }

    /**
     * Get average days to sell by category (based on historical data)
     */
    async getCategoryVelocity(userId: string): Promise<CategoryVelocity[]> {
        return this.executeOperation("getCategoryVelocity", async () => {
            return databaseService.query<CategoryVelocity>(
                `SELECT 
          COALESCE(category, 'Non catégorisé') as category,
          AVG(julianday(sold_at) - julianday(COALESCE(listed_at, created_at))) as avgDaysToSell,
          COUNT(*) as salesCount
        FROM products
        WHERE user_id = ? 
          AND vendu = '1' 
          AND sold_at IS NOT NULL
          AND (listed_at IS NOT NULL OR created_at IS NOT NULL)
        GROUP BY COALESCE(category, 'Non catégorisé')
        HAVING COUNT(*) >= 2
        ORDER BY avgDaysToSell ASC`,
                [userId],
                "get-category-velocity"
            );
        }, { userId });
    }

    /**
     * Get average days to sell by brand (based on historical data)
     */
    async getBrandVelocity(userId: string): Promise<BrandVelocity[]> {
        return this.executeOperation("getBrandVelocity", async () => {
            return databaseService.query<BrandVelocity>(
                `SELECT 
          COALESCE(brand, 'Sans marque') as brand,
          AVG(julianday(sold_at) - julianday(COALESCE(listed_at, created_at))) as avgDaysToSell,
          COUNT(*) as salesCount
        FROM products
        WHERE user_id = ? 
          AND vendu = '1' 
          AND sold_at IS NOT NULL
          AND (listed_at IS NOT NULL OR created_at IS NOT NULL)
        GROUP BY COALESCE(brand, 'Sans marque')
        HAVING COUNT(*) >= 2
        ORDER BY avgDaysToSell ASC`,
                [userId],
                "get-brand-velocity"
            );
        }, { userId });
    }

    /**
     * Get products that have been in stock longer than average for their category/brand
     */
    async getSlowMovingProducts(userId: string): Promise<SlowMovingProduct[]> {
        return this.executeOperation("getSlowMovingProducts", async () => {
            return databaseService.query<SlowMovingProduct>(
                `WITH CategoryAvg AS (
          SELECT 
            COALESCE(category, 'Non catégorisé') as category,
            AVG(julianday(sold_at) - julianday(COALESCE(listed_at, created_at))) as avgDays
          FROM products
          WHERE user_id = ? AND vendu = '1' AND sold_at IS NOT NULL
          GROUP BY COALESCE(category, 'Non catégorisé')
        ),
        OverallAvg AS (
          SELECT AVG(julianday(sold_at) - julianday(COALESCE(listed_at, created_at))) as globalAvg
          FROM products
          WHERE user_id = ? AND vendu = '1' AND sold_at IS NOT NULL
        )
        SELECT 
          p.id,
          p.name,
          p.brand,
          p.category,
          p.price,
          CAST(julianday('now') - julianday(COALESCE(p.listed_at, p.created_at)) AS INTEGER) as daysInStock,
          p.listed_at as listedAt
        FROM products p
        LEFT JOIN CategoryAvg ca ON COALESCE(p.category, 'Non catégorisé') = ca.category
        CROSS JOIN OverallAvg oa
        WHERE p.user_id = ?
          AND p.vendu = '0'
          AND (julianday('now') - julianday(COALESCE(p.listed_at, p.created_at))) > COALESCE(ca.avgDays, oa.globalAvg, 30)
        ORDER BY daysInStock DESC
        LIMIT 20`,
                [userId, userId, userId],
                "get-slow-moving-products"
            );
        }, { userId });
    }

    /**
     * Predict days to sell for a specific product based on historical data
     */
    async predictDaysToSell(
        userId: string,
        productId: string
    ): Promise<ProductPrediction | null> {
        return this.executeOperation("predictDaysToSell", async () => {
            // Get the product
            const product = await databaseService.queryOne<{
                id: string;
                name: string;
                brand: string | null;
                category: string | null;
                createdAt: string;
                listedAt: string | null;
            }>(
                `SELECT id, name, brand, category, created_at as createdAt, listed_at as listedAt
         FROM products 
         WHERE id = ? AND user_id = ? AND vendu = '0'`,
                [productId, userId],
                "get-product-for-prediction"
            );

            if (!product) return null;

            // Calculate days in stock
            const startDate = product.listedAt || product.createdAt;
            const daysInStock = Math.floor(
                (Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
            );

            // Get average for this category
            const categoryAvg = await databaseService.queryOne<{ avgDays: number }>(
                `SELECT AVG(julianday(sold_at) - julianday(COALESCE(listed_at, created_at))) as avgDays
         FROM products
         WHERE user_id = ? AND vendu = '1' AND category = ? AND sold_at IS NOT NULL`,
                [userId, product.category],
                "get-category-avg"
            );

            // Get average for this brand
            const brandAvg = await databaseService.queryOne<{ avgDays: number }>(
                `SELECT AVG(julianday(sold_at) - julianday(COALESCE(listed_at, created_at))) as avgDays
         FROM products
         WHERE user_id = ? AND vendu = '1' AND brand = ? AND sold_at IS NOT NULL`,
                [userId, product.brand],
                "get-brand-avg"
            );

            // Get global average
            const globalAvg = await databaseService.queryOne<{ avgDays: number }>(
                `SELECT AVG(julianday(sold_at) - julianday(COALESCE(listed_at, created_at))) as avgDays
         FROM products
         WHERE user_id = ? AND vendu = '1' AND sold_at IS NOT NULL`,
                [userId],
                "get-global-avg"
            );

            // Calculate estimated days to sell (weighted average)
            let estimatedDaysToSell: number | null = null;
            const estimates: number[] = [];

            if (categoryAvg?.avgDays) estimates.push(categoryAvg.avgDays);
            if (brandAvg?.avgDays) estimates.push(brandAvg.avgDays);
            if (globalAvg?.avgDays) estimates.push(globalAvg.avgDays);

            if (estimates.length > 0) {
                estimatedDaysToSell = Math.round(
                    estimates.reduce((a, b) => a + b, 0) / estimates.length
                );
            }

            // Determine risk level
            let riskLevel: ProductPrediction["riskLevel"] = "low";
            let suggestedAction = "Continuer normalement";

            const benchmark = estimatedDaysToSell || 30;

            if (daysInStock > benchmark * 2) {
                riskLevel = "critical";
                suggestedAction = "Envisager une réduction de prix significative ou un bundle";
            } else if (daysInStock > benchmark * 1.5) {
                riskLevel = "high";
                suggestedAction = "Réduire le prix de 10-20% ou améliorer la description";
            } else if (daysInStock > benchmark) {
                riskLevel = "medium";
                suggestedAction = "Rafraîchir l'annonce et optimiser les photos";
            }

            return {
                productId: product.id,
                productName: product.name,
                brand: product.brand,
                category: product.category,
                daysInStock,
                estimatedDaysToSell,
                riskLevel,
                suggestedAction,
            };
        }, { userId, productId });
    }

    /**
     * Get predictions for all unsold products
     */
    async getAllPredictions(userId: string): Promise<ProductPrediction[]> {
        return this.executeOperation("getAllPredictions", async () => {
            // Get averages
            const categoryAverages = await this.getCategoryVelocity(userId);
            const brandAverages = await this.getBrandVelocity(userId);
            const globalAvg = await databaseService.queryOne<{ avgDays: number }>(
                `SELECT AVG(julianday(sold_at) - julianday(COALESCE(listed_at, created_at))) as avgDays
         FROM products
         WHERE user_id = ? AND vendu = '1' AND sold_at IS NOT NULL`,
                [userId],
                "get-global-avg-all"
            );

            // Get all unsold products
            const unsoldProducts = await databaseService.query<{
                id: string;
                name: string;
                brand: string | null;
                category: string | null;
                createdAt: string;
                listedAt: string | null;
            }>(
                `SELECT id, name, brand, category, created_at as createdAt, listed_at as listedAt
         FROM products 
         WHERE user_id = ? AND vendu = '0'
         ORDER BY created_at ASC`,
                [userId],
                "get-unsold-products"
            );

            const categoryMap = new Map(categoryAverages.map((c) => [c.category, c.avgDaysToSell]));
            const brandMap = new Map(brandAverages.map((b) => [b.brand, b.avgDaysToSell]));
            const defaultAvg = globalAvg?.avgDays || 30;

            return unsoldProducts.map((product) => {
                const startDate = product.listedAt || product.createdAt;
                const daysInStock = Math.floor(
                    (Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
                );

                // Weighted estimate
                const estimates: number[] = [];
                const catAvg = categoryMap.get(product.category || "Non catégorisé");
                const brdAvg = brandMap.get(product.brand || "Sans marque");

                if (catAvg) estimates.push(catAvg);
                if (brdAvg) estimates.push(brdAvg);
                estimates.push(defaultAvg);

                const estimatedDaysToSell = Math.round(
                    estimates.reduce((a, b) => a + b, 0) / estimates.length
                );

                // Risk level
                let riskLevel: ProductPrediction["riskLevel"] = "low";
                let suggestedAction = "Continuer normalement";

                if (daysInStock > estimatedDaysToSell * 2) {
                    riskLevel = "critical";
                    suggestedAction = "Réduction de prix ou bundle";
                } else if (daysInStock > estimatedDaysToSell * 1.5) {
                    riskLevel = "high";
                    suggestedAction = "Baisser le prix de 15%";
                } else if (daysInStock > estimatedDaysToSell) {
                    riskLevel = "medium";
                    suggestedAction = "Rafraîchir l'annonce";
                }

                return {
                    productId: product.id,
                    productName: product.name,
                    brand: product.brand,
                    category: product.category,
                    daysInStock,
                    estimatedDaysToSell,
                    riskLevel,
                    suggestedAction,
                };
            });
        }, { userId });
    }

    /**
     * Get summary of slow-moving inventory
     */
    async getSlowMovingSummary(userId: string): Promise<{
        total: number;
        critical: number;
        high: number;
        medium: number;
        estimatedStuckValue: number;
    }> {
        return this.executeOperation("getSlowMovingSummary", async () => {
            const predictions = await this.getAllPredictions(userId);

            let critical = 0;
            let high = 0;
            let medium = 0;

            predictions.forEach((p) => {
                if (p.riskLevel === "critical") critical++;
                else if (p.riskLevel === "high") high++;
                else if (p.riskLevel === "medium") medium++;
            });

            // Get value of at-risk products
            const slowProducts = predictions.filter(
                (p) => p.riskLevel !== "low"
            );
            let estimatedStuckValue = 0;

            if (slowProducts.length > 0) {
                const ids = slowProducts.map((p) => `'${p.productId}'`).join(",");
                const valueResult = await databaseService.queryOne<{ total: number }>(
                    `SELECT COALESCE(SUM(price + COALESCE(cout_livraison, 0)), 0) as total
           FROM products
           WHERE id IN (${ids})`,
                    [],
                    "get-stuck-value"
                );
                estimatedStuckValue = valueResult?.total || 0;
            }

            return {
                total: predictions.length,
                critical,
                high,
                medium,
                estimatedStuckValue,
            };
        }, { userId });
    }
}

// Export singleton instance
export const predictionService = new PredictionService();
