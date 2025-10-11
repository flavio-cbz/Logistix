import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/services/auth/auth";
import { databaseService } from "@/lib/services/database/db";
import { validateParams } from "@/lib/middleware/validation-middleware";
import { marketAnalysisParamsSchema } from "@/lib/schemas";
import { createErrorResponse } from "@/lib/utils/api-response";

// GET /api/v1/market-analysis/[id]/trends - Récupération des tendances pour une analyse spécifique
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return createErrorResponse(new Error("Non authentifié"));
    }

    // Validation des paramètres
    const { id } = validateParams(marketAnalysisParamsSchema, params).data;

    // Récupération de l'analyse
    const analysis = await databaseService.queryOne(
      `
      SELECT 
        id,
        productName,
        category,
        analysisData,
        createdAt
      FROM market_analyses 
      WHERE id = ? AND userId = ?
    `,
      [id, user.id],
      "get-analysis-for-trends",
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

    // Génération des données de tendances (simulation)
    const now = new Date();
    const trends = {
      priceHistory: [] as Array<{
        date: string;
        averagePrice: number;
        minPrice: number;
        maxPrice: number;
      }>,
      demandHistory: [] as Array<{
        date: string;
        demandLevel: number;
        searchVolume: number;
        engagementRate: number;
      }>,
      competitionHistory: [] as Array<{
        date: string;
        competitionLevel: number;
        activeListings: number;
        averageSellingTime: number;
      }>,
      predictions: {
        nextWeek: {},
        nextMonth: {},
        nextQuarter: {},
      },
      seasonality: {
        monthly: {
          bestMonths: ["Décembre", "Janvier", "Juin"],
          worstMonths: ["Février", "Août", "Octobre"],
          averageVariation: "±15%",
        },
        weekly: {
          bestDays: ["Vendredi", "Samedi", "Dimanche"],
          worstDays: ["Mardi", "Mercredi"],
          averageVariation: "±8%",
        },
      },
      insights: [] as string[],
    };

    // Simulation des données historiques sur 6 mois
    for (let i = 0; i < 26; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i * 7);

      const basePrice = 50 + Math.random() * 100;
      const demand = Math.random() * 100;
      const competition = Math.random() * 100;

      const dateStr = date.toISOString().split("T")[0] || date.toISOString();

      trends.priceHistory.unshift({
        date: dateStr,
        averagePrice: Math.round(basePrice * 100) / 100,
        minPrice: Math.round(basePrice * 0.7 * 100) / 100,
        maxPrice: Math.round(basePrice * 1.3 * 100) / 100,
      });

      trends.demandHistory.unshift({
        date: dateStr,
        demandLevel: Math.round(demand),
        searchVolume: Math.round(demand * 10),
        engagementRate: Math.round(demand * 0.5),
      });

      trends.competitionHistory.unshift({
        date: dateStr,
        competitionLevel: Math.round(competition),
        activeListings: Math.round(competition * 5),
        averageSellingTime: Math.round(30 - competition * 0.2),
      });
    }

    // Prédictions basées sur les tendances
    const recentPrices = trends.priceHistory.slice(-4);
    const avgRecentPrice =
      recentPrices.reduce((sum, p) => sum + p.averagePrice, 0) /
      recentPrices.length;

    trends.predictions = {
      nextWeek: {
        priceRange: {
          min: Math.round(avgRecentPrice * 0.95 * 100) / 100,
          max: Math.round(avgRecentPrice * 1.05 * 100) / 100,
          confidence: 75,
        },
        demand: Math.round(Math.random() * 100),
        competition: Math.round(Math.random() * 100),
      },
      nextMonth: {
        priceRange: {
          min: Math.round(avgRecentPrice * 0.9 * 100) / 100,
          max: Math.round(avgRecentPrice * 1.1 * 100) / 100,
          confidence: 60,
        },
        demand: Math.round(Math.random() * 100),
        competition: Math.round(Math.random() * 100),
      },
      nextQuarter: {
        priceRange: {
          min: Math.round(avgRecentPrice * 0.8 * 100) / 100,
          max: Math.round(avgRecentPrice * 1.2 * 100) / 100,
          confidence: 40,
        },
        demand: Math.round(Math.random() * 100),
        competition: Math.round(Math.random() * 100),
      },
    };

    // Analyse de saisonnalité a déjà été définie ci-dessus

    // Insights automatiques
    const firstPrice = trends.priceHistory[0]?.averagePrice ?? 0;
    const lastPrice = trends.priceHistory[trends.priceHistory.length - 1]?.averagePrice ?? 0;
    const priceChange = lastPrice - firstPrice;
    const priceChangePercent = firstPrice !== 0 ? Math.round((priceChange / firstPrice) * 100) : 0;

    trends.insights = [
      `Prix moyen ${priceChange > 0 ? "en hausse" : "en baisse"} de ${Math.abs(priceChangePercent)}% sur 6 mois`,
      `Catégorie "${analysis.category}" montre une ${Math.random() > 0.5 ? "forte" : "faible"} volatilité`,
      `Meilleure période de vente: ${trends.seasonality.monthly.bestMonths[0]}`,
      `Concurrence ${Math.random() > 0.5 ? "croissante" : "décroissante"} dans cette catégorie`,
    ];

    // Enregistrement de la consultation des tendances
    await databaseService.execute(
      `
      INSERT INTO trend_views (
        id, userId, analysisId, viewedAt
      ) VALUES (?, ?, ?, ?)
    `,
      [
        `trend_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        user.id,
        id,
        new Date().toISOString(),
      ],
      "save-trend-view",
    );

    return NextResponse.json({
      success: true,
      data: {
        analysisId: id,
        productName: analysis.productName,
        category: analysis.category,
        trends,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des tendances:", error);
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
