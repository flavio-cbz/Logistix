
import { BaseService } from "../base-service";
import { databaseService } from "@/lib/database";
import { products, parcels } from "@/lib/database/schema";
import { eq, and, sql, count, lt, asc, desc } from "drizzle-orm";
import { sqlFormulas } from "./sql-formulas";
import { ProductRepository } from "@/lib/repositories/product-repository";
import { ParcelRepository } from "@/lib/repositories/parcel-repository";

interface PerformanceJour {
    date: string;
    ventes: number;
    commandes: number;
    benefices: number;
}

export class DashboardStatsService extends BaseService {
    private productRepository: ProductRepository;
    private parcelRepository: ParcelRepository;

    constructor() {
        super("DashboardStatsService");
        this.productRepository = new ProductRepository(databaseService);
        this.parcelRepository = new ParcelRepository(databaseService);
    }

    /**
     * Récupère les données pour le dashboard principal
     */
    async getDashboardStats(userId: string) {
        return this.executeOperation("getDashboardStats", async () => {
            return await databaseService.executeQuery(async (db) => {
                // Paralléliser toutes les requêtes indépendantes avec Promise.all
                const [
                    ventesData,
                    colisData,
                    produitsTotal,
                    performanceJournaliere,
                    topProduits,
                    statsParcelles,
                    rotationStock
                ] = await Promise.all([
                    // Total des ventes et bénéfices (via Repository)
                    this.productRepository.getSalesData(userId),

                    // Nombre de colis/parcelles
                    db.select({ nombreColis: count() })
                        .from(parcels)
                        .where(and(eq(parcels.userId, userId), eq(parcels.isActive, 1)))
                        .get(),

                    // Nombre total de produits
                    db.select({ total: count() })
                        .from(products)
                        .where(eq(products.userId, userId))
                        .get(),

                    // Performance journalière (via Repository)
                    this.productRepository.getDailyPerformance(userId),

                    // Top produits (via Repository)
                    this.productRepository.getTopProducts(userId, 5),

                    // Stats parcelles (via Repository)
                    this.parcelRepository.getParcelDashboardStats(userId),

                    // Rotation des stocks (via Repository)
                    this.productRepository.getStockRotation(userId)
                ]);

                // Calcul du taux de conversion
                const tauxConversion = produitsTotal?.total
                    ? ((ventesData?.produitsVendus || 0) / produitsTotal.total) * 100
                    : 0;

                // Calcul du panier moyen
                const panierMoyen = ventesData?.produitsVendus
                    ? (ventesData.ventesTotales || 0) / ventesData.produitsVendus
                    : 0;

                // Clients actifs
                const clientsActifs = (ventesData?.produitsVendus || 0) > 0 ? 1 : 0;

                // Alertes - delegate to AlertService
                const alertService = (await import("../container")).serviceContainer.getAlertService();
                const alertes = await alertService.generateAlerts(
                    userId,
                    performanceJournaliere.map(p => ({
                        jour: p.date,
                        totalVentes: p.ventes,
                        totalBenefices: p.benefices,
                        nbProduits: p.commandes
                    }))
                );

                // Calculate trends (today vs yesterday)
                const trends = this.calculateTrends(performanceJournaliere);

                return {
                    ventesTotales: Math.round((ventesData?.ventesTotales || 0) * 100) / 100,
                    produitsVendus: ventesData?.produitsVendus || 0,
                    beneficesTotaux: Math.round((ventesData?.beneficesTotaux || 0) * 100) / 100,
                    nombreColis: colisData?.nombreColis || 0,
                    tauxConversion: Math.round(tauxConversion * 100) / 100,
                    panierMoyen: Math.round(panierMoyen * 100) / 100,
                    clientsActifs,
                    trends,
                    statsParcelles: statsParcelles.map(p => ({
                        parcelleId: p.parcelleId || '',
                        numero: p.numero || 'N/A',
                        nom: p.nom || 'Sans nom',
                        nbProduits: p.nbProduits || 0,
                        nbVendus: p.nbVendus || 0,
                        tauxVente: p.nbProduits > 0 ? Math.round((p.nbVendus / p.nbProduits) * 10000) / 100 : 0,
                        poidsTotal: Math.round((p.poidsTotal || 0) * 100) / 100,
                        coutTotal: Math.round((p.coutTotal || 0) * 100) / 100,
                        chiffreAffaires: Math.round((p.chiffreAffaires || 0) * 100) / 100,
                        benefices: Math.round((p.benefices || 0) * 100) / 100,
                        ROI: p.coutTotal > 0 ? Math.round((p.benefices / p.coutTotal) * 10000) / 100 : 0,
                    })),
                    rotationStock: rotationStock ? {
                        stockTotal: rotationStock.stockTotal || 0,
                        stockEnLigne: rotationStock.stockEnLigne || 0,
                        stockBrouillon: rotationStock.stockBrouillon || 0,
                        valeurStockTotal: Math.round((rotationStock.valeurStockTotal || 0) * 100) / 100,
                        valeurStockEnLigne: Math.round((rotationStock.valeurStockEnLigne || 0) * 100) / 100,
                        ageStockMoyen: Math.round((rotationStock.ageStockMoyen || 0) * 10) / 10,
                        tauxRotation: rotationStock.stockTotal > 0
                            ? Math.round(((ventesData?.produitsVendus || 0) / rotationStock.stockTotal) * 10000) / 100
                            : 0,
                    } : null,
                    performanceJournaliere: performanceJournaliere.map(p => ({
                        date: p.date,
                        ventes: Math.round((p.ventes || 0) * 100) / 100,
                        commandes: p.commandes || 0,
                        benefices: Math.round((p.benefices || 0) * 100) / 100
                    })),
                    topProduits: topProduits.map(p => ({
                        nom: p.nom,
                        ventesRevenue: Math.round((p.ventesRevenue || 0) * 100) / 100,
                        ventesCount: p.ventesCount || 0,
                        benefices: Math.round((p.benefices || 0) * 100) / 100,
                        stock: p.stock || 0
                    })),
                    alertes,
                    lastUpdate: new Date().toISOString()
                };
            });
        }, { userId });
    }

    private calculateTrends(performanceJournaliere: PerformanceJour[]) {
        if (performanceJournaliere.length < 2) {
            return { revenue: 0, orders: 0, profit: 0, conversion: 0 };
        }

        const today = performanceJournaliere[performanceJournaliere.length - 1];
        const yesterday = performanceJournaliere[performanceJournaliere.length - 2];

        const calcTrend = (current: number, previous: number) => {
            if (!previous || previous === 0) return current > 0 ? 100 : 0;
            return Math.round(((current - previous) / previous) * 10000) / 100;
        };

        return {
            revenue: calcTrend(today?.ventes || 0, yesterday?.ventes || 0),
            orders: calcTrend(today?.commandes || 0, yesterday?.commandes || 0),
            profit: calcTrend(today?.benefices || 0, yesterday?.benefices || 0),
            conversion: performanceJournaliere.length >= 4
                ? this.calculateConversionTrend(performanceJournaliere)
                : 0
        };
    }

    private calculateConversionTrend(performanceJournaliere: PerformanceJour[]) {
        const recent = performanceJournaliere.slice(-2);
        const previous = performanceJournaliere.slice(-4, -2);

        const recentAvg = recent.reduce((sum, day) => sum + (day.commandes || 0), 0) / recent.length;
        const previousAvg = previous.reduce((sum, day) => sum + (day.commandes || 0), 0) / previous.length;

        if (previousAvg === 0) return recentAvg > 0 ? 100 : 0;
        return Math.round(((recentAvg - previousAvg) / previousAvg) * 10000) / 100;
    }

    // =========================================================================
    // Profitability Dashboard Methods
    // =========================================================================

    /**
     * Get profit breakdown by month (last 12 months)
     */
    async getProfitByMonth(userId: string): Promise<Array<{
        month: string;
        revenue: number;
        costs: number;
        profit: number;
        margin: number;
        salesCount: number;
    }>> {
        return this.executeOperation("getProfitByMonth", async () => {
            return await databaseService.executeQuery(async (db) => {
                const results = await db.select({
                    month: sql<string>`strftime('%Y-%m', ${products.soldAt})`,
                    revenue: sqlFormulas.sumChiffreAffaires,
                    costs: sql<number>`COALESCE(SUM(${sqlFormulas.coutTotal}), 0)`,
                    profit: sqlFormulas.sumBenefices,
                    salesCount: count()
                })
                    .from(products)
                    .leftJoin(parcels, eq(products.parcelId, parcels.id))
                    .where(and(
                        eq(products.userId, userId),
                        eq(products.vendu, '1'),
                        sql`${products.soldAt} IS NOT NULL`,
                        sql`${products.soldAt} >= date('now', '-12 months')`
                    ))
                    .groupBy(sql`strftime('%Y-%m', ${products.soldAt})`)
                    .orderBy(asc(sql`strftime('%Y-%m', ${products.soldAt})`))
                    .all();

                return results.map(r => ({
                    ...r,
                    margin: r.revenue > 0 ? Math.round((r.profit / r.revenue) * 10000) / 100 : 0
                }));
            });
        }, { userId });
    }

    /**
     * Get profit breakdown by category
     */
    async getProfitByCategory(userId: string): Promise<Array<{
        category: string;
        revenue: number;
        costs: number;
        profit: number;
        margin: number;
        salesCount: number;
    }>> {
        return this.executeOperation("getProfitByCategory", async () => {
            return await databaseService.executeQuery(async (db) => {
                const results = await db.select({
                    category: sql<string>`COALESCE(${products.category}, 'Non catégorisé')`,
                    revenue: sqlFormulas.sumChiffreAffaires,
                    costs: sql<number>`COALESCE(SUM(${sqlFormulas.coutTotal}), 0)`,
                    profit: sqlFormulas.sumBenefices,
                    salesCount: count()
                })
                    .from(products)
                    .leftJoin(parcels, eq(products.parcelId, parcels.id))
                    .where(and(eq(products.userId, userId), eq(products.vendu, '1')))
                    .groupBy(sql`COALESCE(${products.category}, 'Non catégorisé')`)
                    .orderBy(desc(sqlFormulas.sumBenefices))
                    .limit(10)
                    .all();

                return results.map(r => ({
                    ...r,
                    margin: r.revenue > 0 ? Math.round((r.profit / r.revenue) * 10000) / 100 : 0
                }));
            });
        }, { userId });
    }

    /**
     * Get profit breakdown by brand
     */
    async getProfitByBrand(userId: string): Promise<Array<{
        brand: string;
        revenue: number;
        costs: number;
        profit: number;
        margin: number;
        salesCount: number;
    }>> {
        return this.executeOperation("getProfitByBrand", async () => {
            return await databaseService.executeQuery(async (db) => {
                const results = await db.select({
                    brand: sql<string>`COALESCE(${products.brand}, 'Sans marque')`,
                    revenue: sqlFormulas.sumChiffreAffaires,
                    costs: sql<number>`COALESCE(SUM(${sqlFormulas.coutTotal}), 0)`,
                    profit: sqlFormulas.sumBenefices,
                    salesCount: count()
                })
                    .from(products)
                    .leftJoin(parcels, eq(products.parcelId, parcels.id))
                    .where(and(eq(products.userId, userId), eq(products.vendu, '1')))
                    .groupBy(sql`COALESCE(${products.brand}, 'Sans marque')`)
                    .orderBy(desc(sqlFormulas.sumBenefices))
                    .limit(10)
                    .all();

                return results.map(r => ({
                    ...r,
                    margin: r.revenue > 0 ? Math.round((r.profit / r.revenue) * 10000) / 100 : 0
                }));
            });
        }, { userId });
    }

    /**
     * Get top profitable products with detailed breakdown
     */
    async getTopProfitableProducts(userId: string, limit: number = 10): Promise<Array<{
        id: string;
        name: string;
        brand: string | null;
        category: string | null;
        purchasePrice: number;
        shippingCost: number;
        sellingPrice: number;
        profit: number;
        margin: number;
        soldAt: string | null;
    }>> {
        return this.executeOperation("getTopProfitableProducts", async () => {
            return await databaseService.executeQuery(async (db) => {
                const results = await db.select({
                    id: products.id,
                    name: products.name,
                    brand: products.brand,
                    category: products.category,
                    purchasePrice: products.price,
                    shippingCost: sqlFormulas.coutLivraison,
                    sellingPrice: products.sellingPrice,
                    profit: sqlFormulas.benefice,
                    soldAt: products.soldAt
                })
                    .from(products)
                    .leftJoin(parcels, eq(products.parcelId, parcels.id))
                    .where(and(
                        eq(products.userId, userId),
                        eq(products.vendu, '1'),
                        sql`${products.sellingPrice} IS NOT NULL`
                    ))
                    .orderBy(desc(sqlFormulas.benefice))
                    .limit(limit)
                    .all();

                return results.map(r => ({
                    ...r,
                    sellingPrice: r.sellingPrice || 0,
                    margin: (r.sellingPrice || 0) > 0 ? Math.round((r.profit / (r.sellingPrice || 1)) * 10000) / 100 : 0
                }));
            });
        }, { userId, limit });
    }

    /**
     * Get products sold at a loss
     */
    async getLossProducts(userId: string): Promise<Array<{
        id: string;
        name: string;
        brand: string | null;
        purchasePrice: number;
        shippingCost: number;
        sellingPrice: number;
        loss: number;
        soldAt: string | null;
    }>> {
        return this.executeOperation("getLossProducts", async () => {
            return await databaseService.executeQuery(async (db) => {
                return db.select({
                    id: products.id,
                    name: products.name,
                    brand: products.brand,
                    purchasePrice: products.price,
                    shippingCost: sqlFormulas.coutLivraison,
                    sellingPrice: products.sellingPrice,
                    loss: sql<number>`ABS(${sqlFormulas.benefice})`,
                    soldAt: products.soldAt
                })
                    .from(products)
                    .leftJoin(parcels, eq(products.parcelId, parcels.id))
                    .where(and(
                        eq(products.userId, userId),
                        eq(products.vendu, '1'),
                        sql`${products.sellingPrice} IS NOT NULL`,
                        lt(sqlFormulas.benefice, 0)
                    ))
                    .orderBy(desc(sql<number>`ABS(${sqlFormulas.benefice})`))
                    .all()
                    // Fix potential null sellingPrice in return type if needed
                    .map(p => ({
                        ...p,
                        sellingPrice: p.sellingPrice || 0
                    }));
            });
        }, { userId });
    }

    /**
     * Get overall profitability summary
     */
    async getProfitabilitySummary(userId: string): Promise<{
        totalRevenue: number;
        totalCosts: number;
        totalProfit: number;
        averageMargin: number;
        totalSales: number;
        profitableSales: number;
        lossingSales: number;
        bestMonth: { month: string; profit: number } | null;
        bestCategory: { category: string; profit: number } | null;
        bestBrand: { brand: string; profit: number } | null;
    }> {
        return this.executeOperation("getProfitabilitySummary", async () => {
            return await databaseService.executeQuery(async (db) => {
                // Get overall totals
                const totals = await db.select({
                    totalRevenue: sqlFormulas.sumChiffreAffaires,
                    totalCosts: sql<number>`COALESCE(SUM(${sqlFormulas.coutTotal}), 0)`,
                    totalProfit: sqlFormulas.sumBenefices,
                    totalSales: count(),
                    profitableSales: sql<number>`SUM(CASE WHEN ${sqlFormulas.benefice} >= 0 THEN 1 ELSE 0 END)`,
                    lossingSales: sql<number>`SUM(CASE WHEN ${sqlFormulas.benefice} < 0 THEN 1 ELSE 0 END)`
                })
                    .from(products)
                    .leftJoin(parcels, eq(products.parcelId, parcels.id))
                    .where(and(
                        eq(products.userId, userId),
                        eq(products.vendu, '1'),
                        sql`${products.sellingPrice} IS NOT NULL`
                    ))
                    .get();

                // Get best month
                const bestMonth = await db.select({
                    month: sql<string>`strftime('%Y-%m', ${products.soldAt})`,
                    profit: sqlFormulas.sumBenefices
                })
                    .from(products)
                    .leftJoin(parcels, eq(products.parcelId, parcels.id))
                    .where(and(
                        eq(products.userId, userId),
                        eq(products.vendu, '1'),
                        sql`${products.soldAt} IS NOT NULL`
                    ))
                    .groupBy(sql`strftime('%Y-%m', ${products.soldAt})`)
                    .orderBy(desc(sqlFormulas.sumBenefices))
                    .limit(1)
                    .get();

                // Get best category
                const bestCategory = await db.select({
                    category: sql<string>`COALESCE(${products.category}, 'Non catégorisé')`,
                    profit: sqlFormulas.sumBenefices
                })
                    .from(products)
                    .leftJoin(parcels, eq(products.parcelId, parcels.id))
                    .where(and(eq(products.userId, userId), eq(products.vendu, '1')))
                    .groupBy(sql`COALESCE(${products.category}, 'Non catégorisé')`)
                    .orderBy(desc(sqlFormulas.sumBenefices))
                    .limit(1)
                    .get();

                // Get best brand
                const bestBrand = await db.select({
                    brand: sql<string>`COALESCE(${products.brand}, 'Sans marque')`,
                    profit: sqlFormulas.sumBenefices
                })
                    .from(products)
                    .leftJoin(parcels, eq(products.parcelId, parcels.id))
                    .where(and(eq(products.userId, userId), eq(products.vendu, '1')))
                    .groupBy(sql`COALESCE(${products.brand}, 'Sans marque')`)
                    .orderBy(desc(sqlFormulas.sumBenefices))
                    .limit(1)
                    .get();

                return {
                    totalRevenue: totals?.totalRevenue || 0,
                    totalCosts: totals?.totalCosts || 0,
                    totalProfit: totals?.totalProfit || 0,
                    averageMargin: totals?.totalRevenue ? Math.round((totals.totalProfit / totals.totalRevenue) * 10000) / 100 : 0,
                    totalSales: totals?.totalSales || 0,
                    profitableSales: totals?.profitableSales || 0,
                    lossingSales: totals?.lossingSales || 0,
                    bestMonth: bestMonth || null,
                    bestCategory: bestCategory || null,
                    bestBrand: bestBrand || null,
                };
            });
        }, { userId });
    }
}

// Export via container - NO singleton export
// Use: serviceContainer.getDashboardStatsService()
