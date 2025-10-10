import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/services/auth/auth";
import { databaseService } from "@/lib/services/database/db";
import { validateBody } from "@/lib/middleware/validation-middleware";
import { marketAnalysisCompareSchema } from "@/lib/schemas";
import { createErrorResponse } from "@/lib/utils/api-response";

// POST /api/v1/market-analysis/compare - Comparaison d'analyses de marché
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return createErrorResponse(new Error("Non authentifié"));
    }

    // Validation du body avec Zod
    const bodyValidation = await validateBody(request, marketAnalysisCompareSchema);
    if (!bodyValidation.success) {
      return bodyValidation.response;
    }

    const { analysisIds } = bodyValidation.data;

    // Récupération des analyses à comparer
    const placeholders = analysisIds.map(() => "?").join(",");
    const analyses = await databaseService.query(
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
        createdAt
      FROM market_analyses 
      WHERE id IN (${placeholders}) AND userId = ?
      ORDER BY createdAt DESC
    `,
      [...analysisIds, user.id],
      "get-analyses-to-compare",
    );

    if (analyses.length < 2) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INSUFFICIENT_DATA",
            message: "Analyses insuffisantes trouvées pour la comparaison",
          },
        },
        { status: 404 },
      );
    }

    // Calcul des métriques de comparaison
    const comparison = {
      totalAnalyses: analyses.length,
      metrics: {
        averagePrice: {
          values: analyses.map((a) => ({
            id: a.id,
            name: a.productName,
            value: a.averagePrice,
          })),
          highest: analyses.reduce((max, a) =>
            a.averagePrice > max.averagePrice ? a : max,
          ),
          lowest: analyses.reduce((min, a) =>
            a.averagePrice < min.averagePrice ? a : min,
          ),
          average:
            analyses.reduce((sum, a) => sum + a.averagePrice, 0) /
            analyses.length,
        },
        profitabilityScore: {
          values: analyses.map((a) => ({
            id: a.id,
            name: a.productName,
            value: a.profitabilityScore,
          })),
          highest: analyses.reduce((max, a) =>
            a.profitabilityScore > max.profitabilityScore ? a : max,
          ),
          lowest: analyses.reduce((min, a) =>
            a.profitabilityScore < min.profitabilityScore ? a : min,
          ),
          average:
            analyses.reduce((sum, a) => sum + a.profitabilityScore, 0) /
            analyses.length,
        },
        marketScore: {
          values: analyses.map((a) => ({
            id: a.id,
            name: a.productName,
            value: a.marketScore,
          })),
          highest: analyses.reduce((max, a) =>
            a.marketScore > max.marketScore ? a : max,
          ),
          lowest: analyses.reduce((min, a) =>
            a.marketScore < min.marketScore ? a : min,
          ),
          average:
            analyses.reduce((sum, a) => sum + a.marketScore, 0) /
            analyses.length,
        },
        competitionLevel: {
          values: analyses.map((a) => ({
            id: a.id,
            name: a.productName,
            value: a.competitionLevel,
          })),
          distribution: analyses.reduce(
            (acc, a) => {
              acc[a.competitionLevel] = (acc[a.competitionLevel] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>,
          ),
        },
      },
      recommendations: [] as string[],
    };

    // Génération de recommandations
    const bestProfitability = comparison.metrics.profitabilityScore.highest;
    const bestMarketScore = comparison.metrics.marketScore.highest;
    const lowestCompetition = analyses.reduce((min, a) =>
      a.competitionLevel < min.competitionLevel ? a : min,
    );

    comparison.recommendations.push(
      `${bestProfitability.productName} présente la meilleure rentabilité (${bestProfitability.profitabilityScore}/100)`,
      `${bestMarketScore.productName} a le meilleur score de marché (${bestMarketScore.marketScore}/100)`,
      `${lowestCompetition.productName} fait face à la concurrence la plus faible`,
    );

    // Enregistrement de la comparaison
    const comparisonId = `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await databaseService.execute(
      `
      INSERT INTO market_comparisons (
        id, userId, analysisIds, comparisonData, createdAt
      ) VALUES (?, ?, ?, ?, ?)
    `,
      [
        comparisonId,
        user.id,
        JSON.stringify(analysisIds),
        JSON.stringify(comparison),
        new Date().toISOString(),
      ],
      "save-market-comparison",
    );

    return NextResponse.json({
      success: true,
      data: {
        comparisonId,
        comparison,
        analyses: analyses.map((a) => ({
          id: a.id,
          productName: a.productName,
          category: a.category,
          averagePrice: a.averagePrice,
          profitabilityScore: a.profitabilityScore,
          marketScore: a.marketScore,
        })),
      },
    });
  } catch (error) {
    console.error("Erreur lors de la comparaison des analyses:", error);
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
