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
}

// Export singleton instance
export const dashboardStatsService = new DashboardStatsService();
