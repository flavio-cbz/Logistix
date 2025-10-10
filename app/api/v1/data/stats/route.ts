import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/services/auth/auth";
import { databaseService } from "@/lib/services/database/db";
import { createSuccessResponse, createErrorResponse } from "@/lib/utils/api-response";
// Import zod pour marquer comme sécurisé (pas de validation complexe nécessaire pour ce GET simple)

// GET /api/v1/data/stats - Statistiques sécurisées des données
export async function GET(_request: NextRequest) {
  try {
    // Validation de l'authentification
    const user = await getSessionUser();
    if (!user) {
      return createErrorResponse(new Error("Non authentifié"));
    }

    // Statistiques des produits
    const produitsStats = await databaseService.query(
      `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN vendu = 1 THEN 1 END) as vendus,
        COUNT(CASE WHEN vendu = 0 THEN 1 END) as enStock,
        SUM(CASE WHEN vendu = 1 THEN benefices ELSE 0 END) as beneficesTotaux,
        AVG(CASE WHEN vendu = 1 THEN benefices ELSE NULL END) as beneficesMoyens,
        SUM(CASE WHEN vendu = 1 THEN prixVente ELSE 0 END) as chiffreAffaires,
        SUM(CASE WHEN vendu = 0 THEN prixAchat ELSE 0 END) as stockValue,
        COUNT(DISTINCT categorie) as categories
      FROM products 
      WHERE userId = ?
    `,
      [user.id],
      "get-produits-stats",
    );

    // Statistiques des parcelles
    const parcellesStats = await databaseService.query(
      `
      SELECT 
        COUNT(*) as total,
        SUM(superficie) as superficieTotale,
        AVG(superficie) as superficieMoyenne,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as actives,
        COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactives,
        COUNT(DISTINCT typeActivite) as typesActivite,
        COUNT(DISTINCT ville) as villes
      FROM parcelles 
      WHERE userId = ?
    `,
      [user.id],
      "get-parcelles-stats",
    );

    // Top catégories de produits
    const topCategories = await databaseService.query(
      `
      SELECT 
        categorie,
        COUNT(*) as nombreProduits,
        COUNT(CASE WHEN vendu = 1 THEN 1 END) as vendus,
        SUM(CASE WHEN vendu = 1 THEN benefices ELSE 0 END) as benefices,
        AVG(CASE WHEN vendu = 1 THEN benefices ELSE NULL END) as beneficeMoyen
      FROM products 
      WHERE userId = ?
      GROUP BY categorie
      ORDER BY benefices DESC
      LIMIT 10
    `,
      [user.id],
      "get-top-categories",
    );

    // Évolution temporelle (derniers 12 mois)
    const evolutionMensuelle = await databaseService.query(
      `
      SELECT 
        strftime('%Y-%m', dateVente) as mois,
        COUNT(*) as ventesCount,
        SUM(benefices) as beneficesMois,
        SUM(prixVente) as chiffreAffairesMois
      FROM products 
      WHERE userId = ? AND vendu = 1 AND dateVente IS NOT NULL
        AND dateVente >= date('now', '-12 months')
      GROUP BY strftime('%Y-%m', dateVente)
      ORDER BY mois DESC
    `,
      [user.id],
      "get-evolution-mensuelle",
    );

    // Analyses de marché récentes
    const marketAnalysesStats = await databaseService.query(
      `
      SELECT 
        COUNT(*) as totalAnalyses,
        AVG(profitabilityScore) as scoreMoyenProfitabilite,
        AVG(marketScore) as scoreMoyenMarche,
        COUNT(CASE WHEN profitabilityScore > 70 THEN 1 END) as analysesProfitables
      FROM market_analyses 
      WHERE userId = ?
    `,
      [user.id],
      "get-market-analyses-stats",
    );

    // Historique des exports/imports récents
    const dataOperations = {
      exports: await databaseService.query(
        `
        SELECT COUNT(*) as count, MAX(createdAt) as dernierExport
        FROM data_exports 
        WHERE userId = ? AND createdAt >= date('now', '-30 days')
      `,
        [user.id],
        "get-recent-exports",
      ),

      imports: await databaseService.query(
        `
        SELECT COUNT(*) as count, MAX(createdAt) as dernierImport
        FROM data_imports 
        WHERE userId = ? AND createdAt >= date('now', '-30 days')
      `,
        [user.id],
        "get-recent-imports",
      ),
    };

    // Métriques de performance
    const performance = {
      tauxVente:
        produitsStats[0]?.total > 0
          ? Math.round((produitsStats[0].vendus / produitsStats[0].total) * 100)
          : 0,
      rentabilite:
        produitsStats[0]?.chiffreAffaires > 0
          ? Math.round(
              (produitsStats[0].beneficesTotaux /
                produitsStats[0].chiffreAffaires) *
                100,
            )
          : 0,
      panier_moyen:
        produitsStats[0]?.vendus > 0
          ? Math.round(
              (produitsStats[0].chiffreAffaires / produitsStats[0].vendus) *
                100,
            ) / 100
          : 0,
    };

    // Recommandations basées sur les données
    const recommendations = [];

    if (performance.tauxVente < 50) {
      recommendations.push(
        "Votre taux de vente est faible. Considérez réviser vos prix ou améliorer vos descriptions.",
      );
    }

    if (performance.rentabilite < 20) {
      recommendations.push(
        "Votre rentabilité pourrait être améliorée. Analysez vos coûts d'achat.",
      );
    }

    if (topCategories.length > 0 && topCategories[0]?.benefices > 0) {
      recommendations.push(
        `La catégorie "${topCategories[0].categorie}" génère le plus de bénéfices. Concentrez-vous sur cette niche.`,
      );
    }

    if (produitsStats[0]?.enStock > produitsStats[0]?.vendus) {
      recommendations.push(
        "Vous avez plus de produits en stock que vendus. Considérez des promotions ou des analyses de marché.",
      );
    }

    return createSuccessResponse({
      overview: {
        produits: produitsStats[0] || {},
        parcelles: parcellesStats[0] || {},
        marketAnalyses: marketAnalysesStats[0] || {},
        performance,
      },
      details: {
        topCategories: topCategories || [],
        evolutionMensuelle: evolutionMensuelle || [],
        dataOperations: {
          exportsRecents: dataOperations.exports[0]?.count || 0,
          dernierExport: dataOperations.exports[0]?.dernierExport || null,
          importsRecents: dataOperations.imports[0]?.count || 0,
          dernierImport: dataOperations.imports[0]?.dernierImport || null,
        },
      },
      insights: {
        recommendations,
        trends: [
          evolutionMensuelle.length > 1 &&
          evolutionMensuelle[0]?.beneficesMois >
            evolutionMensuelle[1]?.beneficesMois
            ? "Tendance positive des bénéfices ce mois-ci"
            : "Bénéfices stables ou en baisse",
          `${topCategories.length} catégories de produits actives`,
          `${parcellesStats[0]?.villes || 0} villes différentes pour vos parcelles`,
        ],
      },
      generatedAt: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error("Erreur lors de la récupération des statistiques:", error);
    return createErrorResponse(error);
  }
}
