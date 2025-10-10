import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/services/auth/auth";
import { databaseService } from "@/lib/services/database/db";

// DELETE /api/v1/market-analysis/[id] - Suppression d'une analyse
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "Non authentifié" },
        },
        { status: 401 },
      );
    }

    const { id } = params;

    // Vérification que l'analyse existe et appartient à l'utilisateur
    const analysis = await databaseService.queryOne(
      `
      SELECT id, productName FROM market_analyses 
      WHERE id = ? AND userId = ?
    `,
      [id, user.id],
      "check-analysis-ownership",
    );

    if (!analysis) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Analyse non trouvée" },
        },
        { status: 404 },
      );
    }

    // Suppression en cascade des données liées
    await databaseService.transaction(async (db) => {
      // Suppression des vues de tendances
      (db as any).client
        .prepare("DELETE FROM trend_views WHERE analysisId = ?")
        .run(id);

      // Suppression des comparaisons contenant cette analyse
      const comparisons = (db as any).client
        .prepare(
          `
        SELECT id, analysisIds FROM market_comparisons 
        WHERE analysisIds LIKE ?
      `,
        )
        .all(`%"${id}"%`);

      for (const comp of comparisons) {
        try {
          const analysisIds = JSON.parse(comp.analysisIds);
          if (analysisIds.includes(id)) {
            (db as any).client
              .prepare("DELETE FROM market_comparisons WHERE id = ?")
              .run(comp.id);
          }
        } catch (e) {
          // Ignore les erreurs de parsing JSON
        }
      }

      // Suppression de l'analyse principale
      (db as any).client
        .prepare("DELETE FROM market_analyses WHERE id = ?")
        .run(id);
    }, "delete-analysis-cascade");

    return NextResponse.json({
      success: true,
      data: {
        message: `Analyse "${analysis.productName}" supprimée avec succès`,
        deletedAnalysisId: id,
      },
    });
  } catch (error) {
    console.error("Erreur lors de la suppression de l'analyse:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur interne du serveur",
        },
      },
      { status: 500 },
    );
  }
}

// GET /api/v1/market-analysis/[id] - Récupération d'une analyse spécifique
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "Non authentifié" },
        },
        { status: 401 },
      );
    }

    const { id } = params;

    // Récupération de l'analyse complète
    const analysis = await databaseService.queryOne(
      `
      SELECT 
        id,
        productName,
        category,
        averagePrice,
        minPrice,
        maxPrice,
        marketScore,
        competitionLevel,
        demandLevel,
        profitabilityScore,
        analysisData,
        status,
        progress,
        createdAt,
        updatedAt,
        completedAt
      FROM market_analyses 
      WHERE id = ? AND userId = ?
    `,
      [id, user.id],
      "get-single-analysis",
    );

    if (!analysis) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Analyse non trouvée" },
        },
        { status: 404 },
      );
    }

    // Récupération des données liées
    const relatedData = {
      comparisons: await databaseService.query(
        `
        SELECT id, comparisonData, createdAt 
        FROM market_comparisons 
        WHERE analysisIds LIKE ? AND userId = ?
        ORDER BY createdAt DESC
        LIMIT 5
      `,
        [`%"${id}"%`, user.id],
        "get-related-comparisons",
      ),

      trendViews: await databaseService.query(
        `
        SELECT viewedAt 
        FROM trend_views 
        WHERE analysisId = ? AND userId = ?
        ORDER BY viewedAt DESC
        LIMIT 10
      `,
        [id, user.id],
        "get-trend-views",
      ),
    };

    return NextResponse.json({
      success: true,
      data: {
        analysis,
        relatedData,
        metadata: {
          totalComparisons: relatedData.comparisons.length,
          totalTrendViews: relatedData.trendViews.length,
          lastViewed: relatedData.trendViews[0]?.viewedAt || null,
        },
      },
    });
  } catch (error) {
    console.error("Erreur lors de la récupération de l'analyse:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur interne du serveur",
        },
      },
      { status: 500 },
    );
  }
}
