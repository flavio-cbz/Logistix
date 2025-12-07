import { BaseService } from "../base-service";
import { databaseService } from "@/lib/services/database/db";

interface GlobalStats {
    totalProduits: number;
    produitsVendus: number;
    produitsEnStock: number;
    beneficesTotaux: number;
    chiffreAffaires: number;
    valeurStock: number;
    beneficeMoyen: number;
    tempsVenteMoyen: number;
}

interface CategoryStats {
    categorie: string;
    nombreProduits: number;
    vendus: number;
    benefices: number;
    beneficeMoyen: number;
    tauxVente: number;
}

interface RentabiliteAnalysis {
    trancheRentabilite: string;
    nombreProduits: number;
    beneficesTrancheSum: number;
}

interface EvolutionVente {
    mois: string;
    ventesCount: number;
    beneficesMois: number;
    beneficeMoyen: number;
    chiffreAffairesMois: number;
}

interface TopProduitRentable {
    id: string;
    nom: string;
    categorie: string;
    prixAchat: number;
    prixVente: number;
    benefices: number;
    rentabilitePercent: number;
    dateVente: string;
}

interface PriceAnalysis {
    categorie: string;
    prixMin: number;
    prixMax: number;
    prixMoyen: number;
    nombreVentes: number;
}

export class ProductStatsService extends BaseService {
    constructor() {
        super("ProductStatsService");
    }

    /**
     * Récupère les statistiques détaillées des produits
     */
    async getProductStats(userId: string) {
        return this.executeOperation("getProductStats", async () => {
            const globalStats = await this.getGlobalStats(userId);
            const topCategories = await this.getTopCategories(userId);
            const rentabiliteAnalysis = await this.getRentabiliteAnalysis(userId);
            const evolutionVentes = await this.getEvolutionVentes(userId);
            const topProduits = await this.getTopProduitsRentables(userId);
            const priceAnalysis = await this.getPriceAnalysis(userId);

            return {
                global: globalStats || {},
                categories: {
                    top: topCategories || [],
                    priceAnalysis: priceAnalysis || [],
                },
                rentabilite: rentabiliteAnalysis || [],
                evolution: evolutionVentes || [],
                topProduits: topProduits || [],
                insights: {
                    tauxVenteGlobal: globalStats
                        ? Math.round((globalStats.produitsVendus / globalStats.totalProduits) * 100)
                        : 0,
                    rentabiliteMoyenne:
                        globalStats && globalStats.chiffreAffaires > 0
                            ? Math.round((globalStats.beneficesTotaux / globalStats.chiffreAffaires) * 100)
                            : 0,
                    categorieTopPerformante: topCategories[0]?.categorie || "Aucune",
                    tempsVenteMoyen: globalStats?.tempsVenteMoyen
                        ? Math.round(globalStats.tempsVenteMoyen)
                        : 0,
                },
                generatedAt: new Date().toISOString(),
            };
        }, { userId });
    }

    private async getGlobalStats(userId: string): Promise<GlobalStats | null> {
        return databaseService.queryOne<GlobalStats>(
            `SELECT 
        COUNT(*) as totalProduits,
        COUNT(CASE WHEN vendu = '1' THEN 1 END) as produitsVendus,
        COUNT(CASE WHEN vendu = '0' THEN 1 END) as produitsEnStock,
        SUM(CASE WHEN vendu = '1' THEN (selling_price - price - COALESCE(cout_livraison, 0)) ELSE 0 END) as beneficesTotaux,
        SUM(CASE WHEN vendu = '1' THEN selling_price ELSE 0 END) as chiffreAffaires,
        SUM(CASE WHEN vendu = '0' THEN price ELSE 0 END) as valeurStock,
        AVG(CASE WHEN vendu = '1' THEN (selling_price - price - COALESCE(cout_livraison, 0)) ELSE NULL END) as beneficeMoyen,
        AVG(CASE WHEN vendu = '1' THEN (julianday(sold_at) - julianday(created_at)) ELSE NULL END) as tempsVenteMoyen
      FROM products WHERE user_id = ?`,
            [userId],
            "get-produits-global-stats"
        );
    }

    private async getTopCategories(userId: string): Promise<CategoryStats[]> {
        return databaseService.query<CategoryStats>(
            `SELECT 
        category as categorie,
        COUNT(*) as nombreProduits,
        COUNT(CASE WHEN vendu = '1' THEN 1 END) as vendus,
        SUM(CASE WHEN vendu = '1' THEN (selling_price - price - COALESCE(cout_livraison, 0)) ELSE 0 END) as benefices,
        AVG(CASE WHEN vendu = '1' THEN (selling_price - price - COALESCE(cout_livraison, 0)) ELSE NULL END) as beneficeMoyen,
        (COUNT(CASE WHEN vendu = '1' THEN 1 END) * 100.0 / COUNT(*)) as tauxVente
      FROM products 
      WHERE user_id = ?
      GROUP BY category
      ORDER BY benefices DESC`,
            [userId],
            "get-top-categories-produits"
        );
    }

    private async getRentabiliteAnalysis(userId: string): Promise<RentabiliteAnalysis[]> {
        return databaseService.query<RentabiliteAnalysis>(
            `SELECT 
        CASE 
          WHEN ((selling_price - price - COALESCE(cout_livraison, 0)) * 100.0 / price) >= 100 THEN 'Excellente (>100%)'
          WHEN ((selling_price - price - COALESCE(cout_livraison, 0)) * 100.0 / price) >= 50 THEN 'Bonne (50-100%)'
          WHEN ((selling_price - price - COALESCE(cout_livraison, 0)) * 100.0 / price) >= 20 THEN 'Correcte (20-50%)'
          ELSE 'Faible (<20%)'
        END as trancheRentabilite,
        COUNT(*) as nombreProduits,
        SUM(selling_price - price - COALESCE(cout_livraison, 0)) as beneficesTrancheSum
      FROM products 
      WHERE user_id = ? AND vendu = '1' AND price > 0
      GROUP BY trancheRentabilite
      ORDER BY beneficesTrancheSum DESC`,
            [userId],
            "get-rentabilite-analysis"
        );
    }

    private async getEvolutionVentes(userId: string): Promise<EvolutionVente[]> {
        return databaseService.query<EvolutionVente>(
            `SELECT 
        strftime('%Y-%m', sold_at) as mois,
        COUNT(*) as ventesCount,
        SUM(selling_price - price - COALESCE(cout_livraison, 0)) as beneficesMois,
        AVG(selling_price - price - COALESCE(cout_livraison, 0)) as beneficeMoyen,
        SUM(selling_price) as chiffreAffairesMois
      FROM products 
      WHERE user_id = ? AND vendu = '1' AND sold_at IS NOT NULL
      GROUP BY strftime('%Y-%m', sold_at)
      ORDER BY mois DESC
      LIMIT 12`,
            [userId],
            "get-evolution-ventes"
        );
    }

    private async getTopProduitsRentables(userId: string): Promise<TopProduitRentable[]> {
        return databaseService.query<TopProduitRentable>(
            `SELECT 
        id, name as nom, category as categorie, price as prixAchat, selling_price as prixVente, 
        (selling_price - price - COALESCE(cout_livraison, 0)) as benefices,
        ((selling_price - price - COALESCE(cout_livraison, 0)) * 100.0 / price) as rentabilitePercent,
        date_vente as dateVente
      FROM products 
      WHERE user_id = ? AND vendu = '1'
      ORDER BY benefices DESC
      LIMIT 10`,
            [userId],
            "get-top-produits-rentables"
        );
    }

    private async getPriceAnalysis(userId: string): Promise<PriceAnalysis[]> {
        return databaseService.query<PriceAnalysis>(
            `SELECT 
        category as categorie,
        MIN(selling_price) as prixMin,
        MAX(selling_price) as prixMax,
        AVG(selling_price) as prixMoyen,
        COUNT(*) as nombreVentes
      FROM products 
      WHERE user_id = ? AND vendu = '1'
      GROUP BY category
      HAVING nombreVentes >= 2
      ORDER BY prixMoyen DESC`,
            [userId],
            "get-price-analysis"
        );
    }
}

// Export singleton instance
export const productStatsService = new ProductStatsService();
