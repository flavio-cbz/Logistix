<<<<<<< HEAD

import { BaseService } from "../base-service";
import { databaseService } from "@/lib/database";
import { products, parcels } from "@/lib/database/schema";
import { eq, and, sql, desc, count, gte } from "drizzle-orm";
import { sqlFormulas } from "./sql-formulas";
import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "@/lib/database/schema";

type DrizzleDB = BetterSQLite3Database<typeof schema>;

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
            return await databaseService.executeQuery(async (db) => {
                const globalStats = await this.getGlobalStats(db, userId);
                const topCategories = await this.getTopCategories(db, userId);
                const rentabiliteAnalysis = await this.getRentabiliteAnalysis(db, userId);
                const evolutionVentes = await this.getEvolutionVentes(db, userId);
                const topProduits = await this.getTopProduitsRentables(db, userId);
                const priceAnalysis = await this.getPriceAnalysis(db, userId);

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
            });
        }, { userId });
    }

    private async getGlobalStats(db: DrizzleDB, userId: string): Promise<GlobalStats | undefined> {
        return db.select({
            totalProduits: count(),
            produitsVendus: sqlFormulas.countVendus,
            produitsEnStock: sql<number>`SUM(CASE WHEN ${products.vendu} = '0' THEN 1 ELSE 0 END)`,
            beneficesTotaux: sqlFormulas.sumBeneficesVendus,
            chiffreAffaires: sqlFormulas.sumChiffreAffairesVendus,
            valeurStock: sql<number>`SUM(CASE WHEN ${products.vendu} = '0' THEN ${products.price} ELSE 0 END)`,
            beneficeMoyen: sql<number>`AVG(CASE WHEN ${products.vendu} = '1' THEN (${products.sellingPrice} - ${products.price} - COALESCE(${products.coutLivraison}, ${parcels.pricePerGram} * ${products.poids}, 0)) ELSE NULL END)`,
            tempsVenteMoyen: sql<number>`AVG(CASE WHEN ${products.vendu} = '1' THEN (julianday(${products.soldAt}) - julianday(${products.createdAt})) ELSE NULL END)`
        })
            .from(products)
            .leftJoin(parcels, eq(products.parcelId, parcels.id))
            .where(eq(products.userId, userId))
            .get();
    }

    private async getTopCategories(db: DrizzleDB, userId: string): Promise<CategoryStats[]> {
        return db.select({
            categorie: products.category,
            nombreProduits: count(),
            vendus: sqlFormulas.countVendus,
            benefices: sqlFormulas.sumBeneficesVendus,
            beneficeMoyen: sql<number>`AVG(CASE WHEN ${products.vendu} = '1' THEN (${products.sellingPrice} - ${products.price} - COALESCE(${products.coutLivraison}, ${parcels.pricePerGram} * ${products.poids}, 0)) ELSE NULL END)`,
            tauxVente: sql<number>`(CAST(SUM(CASE WHEN ${products.vendu} = '1' THEN 1 ELSE 0 END) AS REAL) * 100.0 / COUNT(*))`
        })
            .from(products)
            .leftJoin(parcels, eq(products.parcelId, parcels.id))
            .where(eq(products.userId, userId))
            .groupBy(products.category)
            .orderBy(desc(sqlFormulas.sumBeneficesVendus))
            .all()
            // Map result to ensure correct types if needed, though Drizzle types should match
            .map(row => ({
                categorie: row.categorie || 'Non catégorisé',
                nombreProduits: row.nombreProduits,
                vendus: row.vendus,
                benefices: row.benefices,
                beneficeMoyen: row.beneficeMoyen || 0,
                tauxVente: row.tauxVente || 0
            }));
    }

    private async getRentabiliteAnalysis(db: DrizzleDB, userId: string): Promise<RentabiliteAnalysis[]> {
        // Construct the profitability percentage formula
        // ((selling - price - shipping) * 100.0 / price)
        const profitPercentSql = sql`(${sqlFormulas.benefice} * 100.0 / ${products.price})`;

        const trancheCase = sql<string>`CASE
          WHEN ${profitPercentSql} >= 100 THEN 'Excellente (>100%)'
          WHEN ${profitPercentSql} >= 50 THEN 'Bonne (50-100%)'
          WHEN ${profitPercentSql} >= 20 THEN 'Correcte (20-50%)'
          ELSE 'Faible (<20%)'
        END`;

        return db.select({
            trancheRentabilite: trancheCase,
            nombreProduits: count(),
            beneficesTrancheSum: sqlFormulas.sumBenefices
        })
            .from(products)
            .leftJoin(parcels, eq(products.parcelId, parcels.id))
            .where(and(
                eq(products.userId, userId),
                eq(products.vendu, '1'),
                sql`${products.price} > 0`
            ))
            .groupBy(trancheCase)
            .orderBy(desc(sqlFormulas.sumBenefices))
            .all();
    }

    private async getEvolutionVentes(db: DrizzleDB, userId: string): Promise<EvolutionVente[]> {
        const monthSql = sql<string>`strftime('%Y-%m', ${products.soldAt})`;

        return db.select({
            mois: monthSql,
            ventesCount: count(),
            beneficesMois: sqlFormulas.sumBenefices,
            beneficeMoyen: sql<number>`AVG(${sqlFormulas.benefice})`,
            chiffreAffairesMois: sqlFormulas.sumChiffreAffaires
        })
            .from(products)
            .leftJoin(parcels, eq(products.parcelId, parcels.id))
            .where(and(
                eq(products.userId, userId),
                eq(products.vendu, '1'),
                sql`${products.soldAt} IS NOT NULL`
            ))
            .groupBy(monthSql)
            .orderBy(desc(monthSql))
            .limit(12)
            .all();
    }

    private async getTopProduitsRentables(db: DrizzleDB, userId: string): Promise<TopProduitRentable[]> {
        const profitPercentSql = sql<number>`(${sqlFormulas.benefice} * 100.0 / ${products.price})`;

        return db.select({
            id: products.id,
            nom: products.name,
            categorie: products.category,
            prixAchat: products.price,
            prixVente: products.sellingPrice,
            benefices: sqlFormulas.benefice,
            rentabilitePercent: profitPercentSql,
            dateVente: products.soldAt
        })
            .from(products)
            .leftJoin(parcels, eq(products.parcelId, parcels.id))
            .where(and(
                eq(products.userId, userId),
                eq(products.vendu, '1')
            ))
            .orderBy(desc(sqlFormulas.benefice))
            .limit(10)
            .all()
            .map(p => ({
                id: p.id,
                nom: p.nom,
                categorie: p.categorie || 'Non catégorisé',
                prixAchat: p.prixAchat,
                prixVente: p.prixVente || 0,
                benefices: p.benefices,
                rentabilitePercent: p.rentabilitePercent || 0,
                dateVente: p.dateVente || ''
            }));
    }

    private async getPriceAnalysis(db: DrizzleDB, userId: string): Promise<PriceAnalysis[]> {
        return db.select({
            categorie: products.category,
            prixMin: sql<number>`MIN(${products.sellingPrice})`,
            prixMax: sql<number>`MAX(${products.sellingPrice})`,
            prixMoyen: sql<number>`AVG(${products.sellingPrice})`,
            nombreVentes: count()
        })
            .from(products)
            .where(and(
                eq(products.userId, userId),
                eq(products.vendu, '1')
            ))
            .groupBy(products.category)
            .having(gte(count(), 2))
            .orderBy(desc(sql`AVG(${products.sellingPrice})`))
            .all()
            .map(row => ({
                categorie: row.categorie || 'Non catégorisé',
                prixMin: row.prixMin || 0,
                prixMax: row.prixMax || 0,
                prixMoyen: row.prixMoyen || 0,
                nombreVentes: row.nombreVentes
            }));
    }

    /**
     * Get Vinted-specific statistics
     */
    async getVintedStats(userId: string) {
        return this.executeOperation("getVintedStats", async () => {
            return await databaseService.executeQuery(async (db) => {
                const { isNotNull } = await import("drizzle-orm");

                // Get all products with Vinted stats
                const linkedProducts = await db.select()
                    .from(products)
                    .where(and(
                        eq(products.userId, userId),
                        isNotNull(products.externalId)
                    ));

                // Filter products that have vintedStats
                const productsWithStats = linkedProducts.filter(p => p.vintedStats);

                // Aggregate stats
                let totalViews = 0;
                let totalFavourites = 0;
                let totalInterestRate = 0;

                const articlesWithStats = productsWithStats.map(product => {
                    // Safe cast as we filtered productsWithStats
                    const stats = product.vintedStats as {
                        viewCount: number;
                        favouriteCount: number;
                        interestRate: number;
                    };

                    totalViews += stats.viewCount || 0;
                    totalFavourites += stats.favouriteCount || 0;
                    totalInterestRate += stats.interestRate || 0;

                    return {
                        id: product.id,
                        name: product.name,
                        viewCount: stats.viewCount || 0,
                        favouriteCount: stats.favouriteCount || 0,
                        interestRate: stats.interestRate || 0,
                        url: product.url
                    };
                });

                // Sort by views for top articles
                const topArticles = [...articlesWithStats]
                    .sort((a, b) => b.viewCount - a.viewCount)
                    .slice(0, 5);

                // Find articles to optimize (high views, low favorites = potential price issue)
                const articlesToOptimize = articlesWithStats
                    .filter(a => a.viewCount > 10 && a.interestRate < 5)
                    .map(a => ({
                        ...a,
                        issue: a.interestRate < 2
                            ? 'Peu d\'intérêt - vérifier le prix'
                            : 'Taux d\'intérêt faible'
                    }))
                    .slice(0, 3);

                const avgInterestRate = productsWithStats.length > 0
                    ? totalInterestRate / productsWithStats.length
                    : 0;

                return {
                    totalViews,
                    totalFavourites,
                    linkedProducts: linkedProducts.length,
                    avgInterestRate,
                    topArticles,
                    articlesToOptimize
                };
            });
        }, { userId });
    }
}

// Export singleton instance
export const productStatsService = new ProductStatsService();
=======
import { BaseService } from "../base-service";
import { databaseService } from "@/lib/database";

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
        COUNT(CASE WHEN p.vendu = '1' THEN 1 END) as produitsVendus,
        COUNT(CASE WHEN p.vendu = '0' THEN 1 END) as produitsEnStock,
        SUM(CASE WHEN p.vendu = '1' THEN (p.selling_price - p.price - COALESCE(p.cout_livraison, parc.price_per_gram * p.poids, 0)) ELSE 0 END) as beneficesTotaux,
        SUM(CASE WHEN p.vendu = '1' THEN p.selling_price ELSE 0 END) as chiffreAffaires,
        SUM(CASE WHEN p.vendu = '0' THEN p.price ELSE 0 END) as valeurStock,
        AVG(CASE WHEN p.vendu = '1' THEN (p.selling_price - p.price - COALESCE(p.cout_livraison, parc.price_per_gram * p.poids, 0)) ELSE NULL END) as beneficeMoyen,
        AVG(CASE WHEN p.vendu = '1' THEN (julianday(p.sold_at) - julianday(p.created_at)) ELSE NULL END) as tempsVenteMoyen
      FROM products p
      LEFT JOIN parcels parc ON p.parcel_id = parc.id
      WHERE p.user_id = ?`,
            [userId],
            "get-produits-global-stats"
        );
    }

    private async getTopCategories(userId: string): Promise<CategoryStats[]> {
        return databaseService.query<CategoryStats>(
            `SELECT 
        p.category as categorie,
        COUNT(*) as nombreProduits,
        COUNT(CASE WHEN p.vendu = '1' THEN 1 END) as vendus,
        SUM(CASE WHEN p.vendu = '1' THEN (p.selling_price - p.price - COALESCE(p.cout_livraison, parc.price_per_gram * p.poids, 0)) ELSE 0 END) as benefices,
        AVG(CASE WHEN p.vendu = '1' THEN (p.selling_price - p.price - COALESCE(p.cout_livraison, parc.price_per_gram * p.poids, 0)) ELSE NULL END) as beneficeMoyen,
        (COUNT(CASE WHEN p.vendu = '1' THEN 1 END) * 100.0 / COUNT(*)) as tauxVente
      FROM products p
      LEFT JOIN parcels parc ON p.parcel_id = parc.id
      WHERE p.user_id = ?
      GROUP BY p.category
      ORDER BY benefices DESC`,
            [userId],
            "get-top-categories-produits"
        );
    }

    private async getRentabiliteAnalysis(userId: string): Promise<RentabiliteAnalysis[]> {
        return databaseService.query<RentabiliteAnalysis>(
            `SELECT 
        CASE 
          WHEN ((p.selling_price - p.price - COALESCE(p.cout_livraison, parc.price_per_gram * p.poids, 0)) * 100.0 / p.price) >= 100 THEN 'Excellente (>100%)'
          WHEN ((p.selling_price - p.price - COALESCE(p.cout_livraison, parc.price_per_gram * p.poids, 0)) * 100.0 / p.price) >= 50 THEN 'Bonne (50-100%)'
          WHEN ((p.selling_price - p.price - COALESCE(p.cout_livraison, parc.price_per_gram * p.poids, 0)) * 100.0 / p.price) >= 20 THEN 'Correcte (20-50%)'
          ELSE 'Faible (<20%)'
        END as trancheRentabilite,
        COUNT(*) as nombreProduits,
        SUM(p.selling_price - p.price - COALESCE(p.cout_livraison, parc.price_per_gram * p.poids, 0)) as beneficesTrancheSum
      FROM products p
      LEFT JOIN parcels parc ON p.parcel_id = parc.id
      WHERE p.user_id = ? AND p.vendu = '1' AND p.price > 0
      GROUP BY trancheRentabilite
      ORDER BY beneficesTrancheSum DESC`,
            [userId],
            "get-rentabilite-analysis"
        );
    }

    private async getEvolutionVentes(userId: string): Promise<EvolutionVente[]> {
        return databaseService.query<EvolutionVente>(
            `SELECT 
        strftime('%Y-%m', p.sold_at) as mois,
        COUNT(*) as ventesCount,
        SUM(p.selling_price - p.price - COALESCE(p.cout_livraison, parc.price_per_gram * p.poids, 0)) as beneficesMois,
        AVG(p.selling_price - p.price - COALESCE(p.cout_livraison, parc.price_per_gram * p.poids, 0)) as beneficeMoyen,
        SUM(p.selling_price) as chiffreAffairesMois
      FROM products p
      LEFT JOIN parcels parc ON p.parcel_id = parc.id
      WHERE p.user_id = ? AND p.vendu = '1' AND p.sold_at IS NOT NULL
      GROUP BY strftime('%Y-%m', p.sold_at)
      ORDER BY mois DESC
      LIMIT 12`,
            [userId],
            "get-evolution-ventes"
        );
    }

    private async getTopProduitsRentables(userId: string): Promise<TopProduitRentable[]> {
        return databaseService.query<TopProduitRentable>(
            `SELECT 
        p.id, p.name as nom, p.category as categorie, p.price as prixAchat, p.selling_price as prixVente, 
        (p.selling_price - p.price - COALESCE(p.cout_livraison, parc.price_per_gram * p.poids, 0)) as benefices,
        ((p.selling_price - p.price - COALESCE(p.cout_livraison, parc.price_per_gram * p.poids, 0)) * 100.0 / p.price) as rentabilitePercent,
        p.sold_at as dateVente
      FROM products p
      LEFT JOIN parcels parc ON p.parcel_id = parc.id
      WHERE p.user_id = ? AND p.vendu = '1'
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
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
