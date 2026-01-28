<<<<<<< HEAD

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
=======
import { BaseService } from "../base-service";
import { databaseService } from "@/lib/database";

interface DashboardVentesData {
    ventesTotales: number;
    beneficesTotaux: number;
    produitsVendus: number;
}

interface PerformanceJour {
    date: string;
    ventes: number;
    commandes: number;
    benefices: number;
}

interface TopProduit {
    nom: string;
    ventesRevenue: number;
    ventesCount: number;
    benefices: number;
    stock: number;
}

interface StatsParcelle {
    parcelleId: string;
    numero: string;
    nom: string;
    nbProduits: number;
    nbVendus: number;
    poidsTotal: number;
    coutTotal: number;
    chiffreAffaires: number;
    benefices: number;
}

interface RotationStock {
    stockTotal: number;
    stockEnLigne: number;
    stockBrouillon: number;
    valeurStockTotal: number;
    valeurStockEnLigne: number;
    ageStockMoyen: number;
}

interface Alerte {
    id: string;
    type: 'stock' | 'performance' | 'livraison' | 'finance';
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    message: string;
    timestamp: string;
}

export class DashboardStatsService extends BaseService {
    constructor() {
        super("DashboardStatsService");
    }

    /**
     * Récupère les données pour le dashboard principal
     */
    async getDashboardStats(userId: string) {
        return this.executeOperation("getDashboardStats", async () => {
            // Total des ventes et bénéfices
            const ventesData = await this.getVentesData(userId);

            // Nombre de colis/parcelles
            const colisData = await databaseService.queryOne<{ nombreColis: number }>(
                "SELECT COUNT(*) as nombreColis FROM parcels WHERE user_id = ? AND is_active = 1",
                [userId],
                "get-nombre-colis"
            );

            // Nombre total de produits
            const produitsTotal = await databaseService.queryOne<{ total: number }>(
                "SELECT COUNT(*) as total FROM products WHERE user_id = ?",
                [userId],
                "get-produits-total"
            );

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

            // Performance journalière
            const performanceJournaliere = await this.getPerformanceJournaliere(userId);

            // Top produits
            const topProduits = await this.getTopProduits(userId);

            // Alertes
            const alertes = await this.generateAlertes(userId, performanceJournaliere);

            // Stats parcelles
            const statsParcelles = await this.getStatsParcelles(userId);

            // Rotation des stocks
            const rotationStock = await this.getRotationStock(userId);

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
                    parcelleId: p.parcelleId,
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



    private async getVentesData(userId: string): Promise<DashboardVentesData | null> {
        return databaseService.queryOne<DashboardVentesData>(
            `SELECT 
        COALESCE(SUM(p.selling_price), 0) as ventesTotales,
        COALESCE(SUM(p.selling_price - p.price - COALESCE(p.cout_livraison, parc.price_per_gram * p.poids, 0)), 0) as beneficesTotaux,
        COUNT(*) as produitsVendus
      FROM products p
      LEFT JOIN parcels parc ON p.parcel_id = parc.id
      WHERE p.user_id = ? AND p.vendu = '1'`,
            [userId],
            "get-ventes-totales"
        );
    }

    private async getPerformanceJournaliere(userId: string): Promise<PerformanceJour[]> {
        return databaseService.query<PerformanceJour>(
            `SELECT 
        DATE(p.sold_at) as date,
        COALESCE(SUM(p.selling_price), 0) as ventes,
        COUNT(*) as commandes,
        COALESCE(SUM(p.selling_price - p.price - COALESCE(p.cout_livraison, parc.price_per_gram * p.poids, 0)), 0) as benefices
      FROM products p
      LEFT JOIN parcels parc ON p.parcel_id = parc.id
      WHERE p.user_id = ? 
        AND p.vendu = '1' 
        AND p.sold_at >= DATE('now', '-7 days')
      GROUP BY DATE(p.sold_at)
      ORDER BY date ASC`,
            [userId],
            "get-performance-journaliere"
        );
    }

    private async getTopProduits(userId: string): Promise<TopProduit[]> {
        return databaseService.query<TopProduit>(
            `SELECT 
        p.name as nom,
        COALESCE(SUM(p.selling_price), 0) as ventesRevenue,
        COUNT(*) as ventesCount,
        COALESCE(SUM(p.selling_price - p.price - COALESCE(p.cout_livraison, parc.price_per_gram * p.poids, 0)), 0) as benefices,
        COUNT(*) as stock
      FROM products p
      LEFT JOIN parcels parc ON p.parcel_id = parc.id
      WHERE p.user_id = ? AND p.vendu = '1'
      GROUP BY p.name
      ORDER BY ventesRevenue DESC
      LIMIT 5`,
            [userId],
            "get-top-produits"
        );
    }

    private async getStatsParcelles(userId: string): Promise<StatsParcelle[]> {
        return databaseService.query<StatsParcelle>(
            `SELECT 
        parc.id as parcelleId,
        parc.superbuy_id as numero,
        parc.name as nom,
        COUNT(p.id) as nbProduits,
        SUM(CASE WHEN p.vendu = '1' THEN 1 ELSE 0 END) as nbVendus,
        COALESCE(SUM(p.poids), 0) as poidsTotal,
        COALESCE(SUM(p.price + COALESCE(p.cout_livraison, parc.price_per_gram * p.poids, 0)), 0) as coutTotal,
        COALESCE(SUM(CASE WHEN p.vendu = '1' THEN p.selling_price ELSE 0 END), 0) as chiffreAffaires,
        COALESCE(SUM(CASE WHEN p.vendu = '1' THEN (p.selling_price - p.price - COALESCE(p.cout_livraison, parc.price_per_gram * p.poids, 0)) ELSE 0 END), 0) as benefices
      FROM parcels parc
      LEFT JOIN products p ON parc.id = p.parcel_id
      WHERE parc.user_id = ? AND parc.is_active = 1
      GROUP BY parc.id, parc.superbuy_id, parc.name
      ORDER BY benefices DESC`,
            [userId],
            "get-stats-parcelles"
        );
    }

    private async getRotationStock(userId: string): Promise<RotationStock | null> {
        return databaseService.queryOne<RotationStock>(
            `SELECT 
        COUNT(*) as stockTotal,
        SUM(CASE WHEN listed_at IS NOT NULL AND listed_at != '' THEN 1 ELSE 0 END) as stockEnLigne,
        SUM(CASE WHEN listed_at IS NULL OR listed_at = '' THEN 1 ELSE 0 END) as stockBrouillon,
        COALESCE(SUM(price + COALESCE(cout_livraison, 0)), 0) as valeurStockTotal,
        COALESCE(SUM(CASE WHEN listed_at IS NOT NULL AND listed_at != '' THEN price + COALESCE(cout_livraison, 0) ELSE 0 END), 0) as valeurStockEnLigne,
        COALESCE(AVG(julianday('now') - julianday(created_at)), 0) as ageStockMoyen
      FROM products
      WHERE user_id = ? AND vendu = '0'`,
            [userId],
            "get-rotation-stock"
        );
    }

    private async generateAlertes(userId: string, performanceJournaliere: PerformanceJour[]): Promise<Alerte[]> {
        const alertes: Alerte[] = [];

        // Alerte stock faible
        const stockFaible = await databaseService.queryOne<{ count: number }>(
            `SELECT COUNT(*) as count FROM (
        SELECT name 
        FROM products 
        WHERE user_id = ? 
          AND vendu = '0' 
        GROUP BY name 
        HAVING COUNT(*) < 5
      )`,
            [userId],
            "get-stock-faible"
        );

        if (stockFaible && stockFaible.count > 0) {
            alertes.push({
                id: 'stock-faible',
                type: 'stock',
                severity: 'high',
                title: 'Stock faible',
                message: `${stockFaible.count} produit(s) ont un stock inférieur à 5 unités`,
                timestamp: new Date().toISOString()
            });
        }

        // Alerte performance
        if (performanceJournaliere.length >= 2) {
            const dernierJour = performanceJournaliere[performanceJournaliere.length - 1];
            const avantDernierJour = performanceJournaliere[performanceJournaliere.length - 2];

            if (dernierJour && avantDernierJour) {
                const evolution = avantDernierJour.ventes > 0
                    ? ((dernierJour.ventes - avantDernierJour.ventes) / avantDernierJour.ventes) * 100
                    : 0;

                if (evolution > 10) {
                    alertes.push({
                        id: 'performance-hausse',
                        type: 'performance',
                        severity: 'medium',
                        title: 'Performances en hausse',
                        message: `Les ventes ont augmenté de ${evolution.toFixed(1)}% aujourd'hui`,
                        timestamp: new Date().toISOString()
                    });
                } else if (evolution < -10) {
                    alertes.push({
                        id: 'performance-baisse',
                        type: 'performance',
                        severity: 'high',
                        title: 'Performances en baisse',
                        message: `Les ventes ont baissé de ${Math.abs(evolution).toFixed(1)}% aujourd'hui`,
                        timestamp: new Date().toISOString()
                    });
                }
            }
        }

        // Alerte bénéfices négatifs
        const beneficesNegatifs = await databaseService.queryOne<{ count: number }>(
            `SELECT COUNT(*) as count 
      FROM products p
      LEFT JOIN parcels parc ON p.parcel_id = parc.id
      WHERE p.user_id = ? 
        AND p.vendu = '1' 
        AND (p.selling_price - p.price - COALESCE(p.cout_livraison, parc.price_per_gram * p.poids, 0)) < 0`,
            [userId],
            "get-benefices-negatifs"
        );

        if (beneficesNegatifs && beneficesNegatifs.count > 0) {
            alertes.push({
                id: 'benefices-negatifs',
                type: 'finance',
                severity: 'critical',
                title: 'Bénéfices négatifs',
                message: `${beneficesNegatifs.count} produit(s) vendu(s) à perte`,
                timestamp: new Date().toISOString()
            });
        }

        return alertes;
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
            const results = await databaseService.query<{
                month: string;
                revenue: number;
                costs: number;
                profit: number;
                salesCount: number;
            }>(
                `SELECT 
                    strftime('%Y-%m', p.sold_at) as month,
                    COALESCE(SUM(p.selling_price), 0) as revenue,
                    COALESCE(SUM(p.price + COALESCE(p.cout_livraison, parc.price_per_gram * p.poids, 0)), 0) as costs,
                    COALESCE(SUM(p.selling_price - p.price - COALESCE(p.cout_livraison, parc.price_per_gram * p.poids, 0)), 0) as profit,
                    COUNT(*) as salesCount
                FROM products p
                LEFT JOIN parcels parc ON p.parcel_id = parc.id
                WHERE p.user_id = ? 
                    AND p.vendu = '1' 
                    AND p.sold_at IS NOT NULL
                    AND p.sold_at >= date('now', '-12 months')
                GROUP BY strftime('%Y-%m', p.sold_at)
                ORDER BY month ASC`,
                [userId],
                "get-profit-by-month"
            );

            return results.map(r => ({
                ...r,
                margin: r.revenue > 0 ? Math.round((r.profit / r.revenue) * 10000) / 100 : 0
            }));
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
            const results = await databaseService.query<{
                category: string;
                revenue: number;
                costs: number;
                profit: number;
                salesCount: number;
            }>(
                `SELECT 
                    COALESCE(p.category, 'Non catégorisé') as category,
                    COALESCE(SUM(p.selling_price), 0) as revenue,
                    COALESCE(SUM(p.price + COALESCE(p.cout_livraison, parc.price_per_gram * p.poids, 0)), 0) as costs,
                    COALESCE(SUM(p.selling_price - p.price - COALESCE(p.cout_livraison, parc.price_per_gram * p.poids, 0)), 0) as profit,
                    COUNT(*) as salesCount
                FROM products p
                LEFT JOIN parcels parc ON p.parcel_id = parc.id
                WHERE p.user_id = ? AND p.vendu = '1'
                GROUP BY COALESCE(p.category, 'Non catégorisé')
                ORDER BY profit DESC
                LIMIT 10`,
                [userId],
                "get-profit-by-category"
            );

            return results.map(r => ({
                ...r,
                margin: r.revenue > 0 ? Math.round((r.profit / r.revenue) * 10000) / 100 : 0
            }));
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
            const results = await databaseService.query<{
                brand: string;
                revenue: number;
                costs: number;
                profit: number;
                salesCount: number;
            }>(
                `SELECT 
                    COALESCE(p.brand, 'Sans marque') as brand,
                    COALESCE(SUM(p.selling_price), 0) as revenue,
                    COALESCE(SUM(p.price + COALESCE(p.cout_livraison, parc.price_per_gram * p.poids, 0)), 0) as costs,
                    COALESCE(SUM(p.selling_price - p.price - COALESCE(p.cout_livraison, parc.price_per_gram * p.poids, 0)), 0) as profit,
                    COUNT(*) as salesCount
                FROM products p
                LEFT JOIN parcels parc ON p.parcel_id = parc.id
                WHERE p.user_id = ? AND p.vendu = '1'
                GROUP BY COALESCE(p.brand, 'Sans marque')
                ORDER BY profit DESC
                LIMIT 10`,
                [userId],
                "get-profit-by-brand"
            );

            return results.map(r => ({
                ...r,
                margin: r.revenue > 0 ? Math.round((r.profit / r.revenue) * 10000) / 100 : 0
            }));
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
            const results = await databaseService.query<{
                id: string;
                name: string;
                brand: string | null;
                category: string | null;
                purchasePrice: number;
                shippingCost: number;
                sellingPrice: number;
                profit: number;
                soldAt: string | null;
            }>(
                `SELECT 
                    p.id,
                    p.name,
                    p.brand,
                    p.category,
                    p.price as purchasePrice,
                    COALESCE(p.cout_livraison, parc.price_per_gram * p.poids, 0) as shippingCost,
                    p.selling_price as sellingPrice,
                    (p.selling_price - p.price - COALESCE(p.cout_livraison, parc.price_per_gram * p.poids, 0)) as profit,
                    p.sold_at as soldAt
                FROM products p
                LEFT JOIN parcels parc ON p.parcel_id = parc.id
                WHERE p.user_id = ? AND p.vendu = '1' AND p.selling_price IS NOT NULL
                ORDER BY profit DESC
                LIMIT ?`,
                [userId, limit],
                "get-top-profitable-products"
            );

            return results.map(r => ({
                ...r,
                margin: r.sellingPrice > 0 ? Math.round((r.profit / r.sellingPrice) * 10000) / 100 : 0
            }));
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
            return databaseService.query<{
                id: string;
                name: string;
                brand: string | null;
                purchasePrice: number;
                shippingCost: number;
                sellingPrice: number;
                loss: number;
                soldAt: string | null;
            }>(
                `SELECT 
                    p.id,
                    p.name,
                    p.brand,
                    p.price as purchasePrice,
                    COALESCE(p.cout_livraison, parc.price_per_gram * p.poids, 0) as shippingCost,
                    p.selling_price as sellingPrice,
                    ABS(p.selling_price - p.price - COALESCE(p.cout_livraison, parc.price_per_gram * p.poids, 0)) as loss,
                    p.sold_at as soldAt
                FROM products p
                LEFT JOIN parcels parc ON p.parcel_id = parc.id
                WHERE p.user_id = ? 
                    AND p.vendu = '1' 
                    AND p.selling_price IS NOT NULL
                    AND (p.selling_price - p.price - COALESCE(p.cout_livraison, parc.price_per_gram * p.poids, 0)) < 0
                ORDER BY loss DESC`,
                [userId],
                "get-loss-products"
            );
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
            // Get overall totals
            const totals = await databaseService.queryOne<{
                totalRevenue: number;
                totalCosts: number;
                totalProfit: number;
                totalSales: number;
                profitableSales: number;
                lossingSales: number;
            }>(
                `SELECT 
                    COALESCE(SUM(p.selling_price), 0) as totalRevenue,
                    COALESCE(SUM(p.price + COALESCE(p.cout_livraison, parc.price_per_gram * p.poids, 0)), 0) as totalCosts,
                    COALESCE(SUM(p.selling_price - p.price - COALESCE(p.cout_livraison, parc.price_per_gram * p.poids, 0)), 0) as totalProfit,
                    COUNT(*) as totalSales,
                    SUM(CASE WHEN (p.selling_price - p.price - COALESCE(p.cout_livraison, parc.price_per_gram * p.poids, 0)) >= 0 THEN 1 ELSE 0 END) as profitableSales,
                    SUM(CASE WHEN (p.selling_price - p.price - COALESCE(p.cout_livraison, parc.price_per_gram * p.poids, 0)) < 0 THEN 1 ELSE 0 END) as lossingSales
                FROM products p
                LEFT JOIN parcels parc ON p.parcel_id = parc.id
                WHERE p.user_id = ? AND p.vendu = '1' AND p.selling_price IS NOT NULL`,
                [userId],
                "get-profitability-totals"
            );

            // Get best month
            const bestMonth = await databaseService.queryOne<{ month: string; profit: number }>(
                `SELECT 
                    strftime('%Y-%m', p.sold_at) as month,
                    SUM(p.selling_price - p.price - COALESCE(p.cout_livraison, parc.price_per_gram * p.poids, 0)) as profit
                FROM products p
                LEFT JOIN parcels parc ON p.parcel_id = parc.id
                WHERE p.user_id = ? AND p.vendu = '1' AND p.sold_at IS NOT NULL
                GROUP BY strftime('%Y-%m', p.sold_at)
                ORDER BY profit DESC
                LIMIT 1`,
                [userId],
                "get-best-month"
            );

            // Get best category
            const bestCategory = await databaseService.queryOne<{ category: string; profit: number }>(
                `SELECT 
                    COALESCE(p.category, 'Non catégorisé') as category,
                    SUM(p.selling_price - p.price - COALESCE(p.cout_livraison, parc.price_per_gram * p.poids, 0)) as profit
                FROM products p
                LEFT JOIN parcels parc ON p.parcel_id = parc.id
                WHERE p.user_id = ? AND p.vendu = '1'
                GROUP BY category
                ORDER BY profit DESC
                LIMIT 1`,
                [userId],
                "get-best-category"
            );

            // Get best brand
            const bestBrand = await databaseService.queryOne<{ brand: string; profit: number }>(
                `SELECT 
                    COALESCE(p.brand, 'Sans marque') as brand,
                    SUM(p.selling_price - p.price - COALESCE(p.cout_livraison, parc.price_per_gram * p.poids, 0)) as profit
                FROM products p
                LEFT JOIN parcels parc ON p.parcel_id = parc.id
                WHERE p.user_id = ? AND p.vendu = '1'
                GROUP BY brand
                ORDER BY profit DESC
                LIMIT 1`,
                [userId],
                "get-best-brand"
            );

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
        }, { userId });
    }
}

// Export singleton instance
export const dashboardStatsService = new DashboardStatsService();
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
