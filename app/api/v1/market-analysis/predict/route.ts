import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/services/auth/auth";
import { databaseService } from "@/lib/services/database/db";
import { validateBody } from "@/lib/middleware/validation-middleware";
import { marketPredictionSchema } from "@/lib/schemas";
import { createErrorResponse } from "@/lib/utils/api-response";

// POST /api/v1/market-analysis/predict - Prédiction de prix
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return createErrorResponse(new Error("Non authentifié"));
    }

    // Validation du body avec Zod
    const {
      productName,
      category,
      condition,
      brand,
      size,
      color,
      description
    } = (await validateBody(marketPredictionSchema, request)).data;

    // Recherche d'analyses similaires pour la prédiction
    const similarAnalyses = await databaseService.query(
      `
      SELECT 
        averagePrice,
        minPrice,
        maxPrice,
        profitabilityScore,
        marketScore,
        demandLevel
      FROM market_analyses 
      WHERE category = ? AND userId = ?
      ORDER BY createdAt DESC
      LIMIT 10
    `,
      [category, user.id],
      "get-similar-analyses",
    );

    // Calcul de la prédiction basée sur les données historiques
    const prediction = {
      estimatedPrice: {
        min: 0,
        max: 0,
        recommended: 0,
        confidence: 0,
      },
      marketInsights: {
        demandLevel: "Moyen",
        competitionLevel: "Moyen",
        profitabilityScore: 50,
        marketScore: 50,
      },
      recommendations: [] as string[],
      factors: {
        category: 0.3,
        condition: 0.25,
        brand: 0.2,
        seasonality: 0.15,
        market: 0.1,
      },
      riskAssessment: {
        level: "Moyen",
        factors: [] as string[],
      },
    };

    if (similarAnalyses.length > 0) {
      // Calcul basé sur les données historiques
      const avgPrice =
        similarAnalyses.reduce((sum, a) => sum + a.averagePrice, 0) /
        similarAnalyses.length;
      const minPrice = Math.min(...similarAnalyses.map((a) => a.minPrice));
      const maxPrice = Math.max(...similarAnalyses.map((a) => a.maxPrice));

      // Ajustements selon les caractéristiques du produit
      let priceMultiplier = 1.0;

      // Ajustement selon l'état
      switch (condition?.toLowerCase()) {
        case "neuf":
        case "nouveau":
          priceMultiplier *= 1.2;
          break;
        case "très bon état":
          priceMultiplier *= 1.1;
          break;
        case "bon état":
          priceMultiplier *= 1.0;
          break;
        case "état correct":
          priceMultiplier *= 0.85;
          break;
        case "usé":
          priceMultiplier *= 0.7;
          break;
        default:
          priceMultiplier *= 0.9;
      }

      // Ajustement selon la marque (simulation)
      const premiumBrands = [
        "Louis Vuitton",
        "Chanel",
        "Hermès",
        "Gucci",
        "Prada",
      ];
      const goodBrands = ["Zara", "H&M", "Nike", "Adidas", "Levi's"];

      if (
        brand &&
        premiumBrands.some((b) => brand.toLowerCase().includes(b.toLowerCase()))
      ) {
        priceMultiplier *= 1.5;
      } else if (
        brand &&
        goodBrands.some((b) => brand.toLowerCase().includes(b.toLowerCase()))
      ) {
        priceMultiplier *= 1.2;
      }

      prediction.estimatedPrice = {
        min: Math.round(minPrice * priceMultiplier * 0.8 * 100) / 100,
        max: Math.round(maxPrice * priceMultiplier * 1.2 * 100) / 100,
        recommended: Math.round(avgPrice * priceMultiplier * 100) / 100,
        confidence: Math.min(95, 60 + similarAnalyses.length * 3),
      };

      prediction.marketInsights = {
        demandLevel:
          similarAnalyses.reduce((sum, a) => sum + a.demandLevel, 0) /
            similarAnalyses.length >
          70
            ? "Élevé"
            : "Moyen",
        competitionLevel: Math.random() > 0.5 ? "Élevé" : "Moyen",
        profitabilityScore: Math.round(
          similarAnalyses.reduce((sum, a) => sum + a.profitabilityScore, 0) /
            similarAnalyses.length,
        ),
        marketScore: Math.round(
          similarAnalyses.reduce((sum, a) => sum + a.marketScore, 0) /
            similarAnalyses.length,
        ),
      };
    } else {
      // Prédiction par défaut si pas de données historiques
      const basePrices: Record<string, number> = {
        vêtements: 25,
        chaussures: 40,
        accessoires: 15,
        sacs: 35,
        bijoux: 20,
        montres: 100,
        électronique: 80,
        maison: 30,
        default: 25,
      };

      const basePrice =
        basePrices[category.toLowerCase()] || basePrices['default'] || 25;

      prediction.estimatedPrice = {
        min: Math.round(basePrice * 0.5 * 100) / 100,
        max: Math.round(basePrice * 2.0 * 100) / 100,
        recommended: basePrice,
        confidence: 40,
      };
    }

    // Génération des recommandations
    prediction.recommendations = [
      `Prix recommandé: ${prediction.estimatedPrice.recommended}€`,
      `Fourchette optimale: ${prediction.estimatedPrice.min}€ - ${prediction.estimatedPrice.max}€`,
      condition
        ? `L'état "${condition}" affecte le prix de ±${Math.round((1 - 1) * 100)}%`
        : "Précisez l'état pour un prix plus précis",
      brand
        ? `La marque "${brand}" est un facteur important`
        : "La marque peut influencer le prix de ±30%",
    ];

    // Évaluation des risques
    const riskFactors = [];
    if (prediction.estimatedPrice.confidence < 60) {
      riskFactors.push("Données insuffisantes pour une prédiction précise");
    }
    if (prediction.marketInsights.competitionLevel === "Élevé") {
      riskFactors.push("Concurrence élevée dans cette catégorie");
    }
    if (!brand) {
      riskFactors.push("Marque non spécifiée peut affecter la vente");
    }

    prediction.riskAssessment = {
      level:
        riskFactors.length > 2
          ? "Élevé"
          : riskFactors.length > 0
            ? "Moyen"
            : "Faible",
      factors: riskFactors,
    };

    // Enregistrement de la prédiction
    const predictionId = `pred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await databaseService.execute(
      `
      INSERT INTO price_predictions (
        id, userId, productName, category, inputData, predictionData, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
      [
        predictionId,
        user.id,
        productName,
        category,
        JSON.stringify({ condition, brand, size, color, description }),
        JSON.stringify(prediction),
        new Date().toISOString(),
      ],
      "save-price-prediction",
    );

    return NextResponse.json({
      success: true,
      data: {
        predictionId,
        productName,
        category,
        prediction,
        generatedAt: new Date().toISOString(),
        basedOnAnalyses: similarAnalyses.length,
      },
    });
  } catch (error) {
    console.error("Erreur lors de la prédiction de prix:", error);
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
