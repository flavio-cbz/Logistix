import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/services/auth/auth";
import { databaseService } from "@/lib/services/database/db";
import { productsStatsQuerySchema } from "@/lib/schemas";
import { validateQuery } from "@/lib/middleware/validation-middleware";
import { createSuccessResponse, createErrorResponse } from "@/lib/utils/api-response";

// GET /api/v1/produits/stats - Statistiques des produits
export async function GET(request: NextRequest) {
  try {
    // Validation de l'authentification
    const user = await getSessionUser();
    if (!user) {
      return createErrorResponse(new Error("Non authentifié"));
    }

    // Validation des paramètres de requête
    const validationResult = validateQuery(request, productsStatsQuerySchema);
    if (!validationResult.success) {
      return validationResult.response;
    }
    
    // Statistiques générales
    const globalStats = await databaseService.queryOne(
      `
      SELECT 
        COUNT(*) as totalProduits,
        COUNT(CASE WHEN vendu = 1 THEN 1 END) as produitsVendus,
        COUNT(CASE WHEN vendu = 0 THEN 1 END) as produitsEnStock,
        SUM(CASE WHEN vendu = 1 THEN benefices ELSE 0 END) as beneficesTotaux,
        SUM(CASE WHEN vendu = 1 THEN prixVente ELSE 0 END) as chiffreAffaires,
        SUM(CASE WHEN vendu = 0 THEN prixAchat ELSE 0 END) as valeurStock,
        AVG(CASE WHEN vendu = 1 THEN benefices ELSE NULL END) as beneficeMoyen,
        AVG(CASE WHEN vendu = 1 THEN (julianday(dateVente) - julianday(dateAchat)) ELSE NULL END) as tempsVenteMoyen
      FROM products WHERE userId = ?
    `,
      [user.id],
      "get-produits-global-stats",
    );

    // Top catégories
    const topCategories = await databaseService.query(
      `
      SELECT 
        categorie,
        COUNT(*) as nombreProduits,
        COUNT(CASE WHEN vendu = 1 THEN 1 END) as vendus,
        SUM(CASE WHEN vendu = 1 THEN benefices ELSE 0 END) as benefices,
        AVG(CASE WHEN vendu = 1 THEN benefices ELSE NULL END) as beneficeMoyen,
        (COUNT(CASE WHEN vendu = 1 THEN 1 END) * 100.0 / COUNT(*)) as tauxVente
      FROM products 
      WHERE userId = ?
      GROUP BY categorie
      ORDER BY benefices DESC
    `,
      [user.id],
      "get-top-categories-produits",
    );

    // Analyse de rentabilité
    const rentabiliteAnalysis = await databaseService.query(
      `
      SELECT 
        CASE 
          WHEN (benefices * 100.0 / prixAchat) >= 100 THEN 'Excellente (>100%)'
          WHEN (benefices * 100.0 / prixAchat) >= 50 THEN 'Bonne (50-100%)'
          WHEN (benefices * 100.0 / prixAchat) >= 20 THEN 'Correcte (20-50%)'
          ELSE 'Faible (<20%)'
        END as trancheRentabilite,
        COUNT(*) as nombreProduits,
        SUM(benefices) as beneficesTrancheSum
      FROM products 
      WHERE userId = ? AND vendu = 1 AND prixAchat > 0
      GROUP BY trancheRentabilite
      ORDER BY beneficesTrancheSum DESC
    `,
      [user.id],
      "get-rentabilite-analysis",
    );

    // Évolution des ventes
    const evolutionVentes = await databaseService.query(
      `
      SELECT 
        strftime('%Y-%m', dateVente) as mois,
        COUNT(*) as ventesCount,
        SUM(benefices) as beneficesMois,
        AVG(benefices) as beneficeMoyen,
        SUM(prixVente) as chiffreAffairesMois
      FROM products 
      WHERE userId = ? AND vendu = 1 AND dateVente IS NOT NULL
      GROUP BY strftime('%Y-%m', dateVente)
      ORDER BY mois DESC
      LIMIT 12
    `,
      [user.id],
      "get-evolution-ventes",
    );

    // Produits les plus rentables
    const topProduits = await databaseService.query(
      `
      SELECT 
        id, nom, categorie, prixAchat, prixVente, benefices,
        (benefices * 100.0 / prixAchat) as rentabilitePercent,
        dateVente
      FROM products 
      WHERE userId = ? AND vendu = 1
      ORDER BY benefices DESC
      LIMIT 10
    `,
      [user.id],
      "get-top-produits-rentables",
    );

    // Analyse des prix
    const priceAnalysis = await databaseService.query(
      `
      SELECT 
        categorie,
        MIN(prixVente) as prixMin,
        MAX(prixVente) as prixMax,
        AVG(prixVente) as prixMoyen,
        COUNT(*) as nombreVentes
      FROM products 
      WHERE userId = ? AND vendu = 1
      GROUP BY categorie
      HAVING nombreVentes >= 2
      ORDER BY prixMoyen DESC
    `,
      [user.id],
      "get-price-analysis",
    );

    return createSuccessResponse({
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
          ? Math.round(
              (globalStats.produitsVendus / globalStats.totalProduits) * 100,
            )
          : 0,
        rentabiliteMoyenne:
          globalStats && globalStats.chiffreAffaires > 0
            ? Math.round(
                (globalStats.beneficesTotaux / globalStats.chiffreAffaires) *
                  100,
              )
            : 0,
        categorieTopPerformante: topCategories[0]?.categorie || "Aucune",
        tempsVenteMoyen: globalStats?.tempsVenteMoyen
          ? Math.round(globalStats.tempsVenteMoyen)
          : 0,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Erreur statistiques produits:", error);
    return createErrorResponse(error instanceof Error ? error : new Error("Erreur interne du serveur"));
  }
}
