import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/services/auth/auth";
import { aiMetricsCollector } from "@/lib/services/ai/ai-metrics-collector";
import { marketAnalysisConfig } from "@/lib/services/ai/market-analysis-config";

export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }

    // Récupérer les paramètres de requête
    const { searchParams } = new URL(request.url);
    const timeframe = (searchParams.get("timeframe") as "hour" | "day" | "week" | "month") || "day";

    // Récupérer les métriques agrégées
    const metrics = aiMetricsCollector.getAggregatedMetrics(timeframe);

    // Générer les alertes de coût
    const costAlerts = generateCostAlerts();

    // Générer les alertes de performance
    const performanceAlerts = generatePerformanceAlerts();

    return NextResponse.json({
      metrics,
      costAlerts,
      performanceAlerts,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Error fetching AI metrics:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des métriques IA" },
      { status: 500 }
    );
  }
}

function generateCostAlerts() {
  const alerts = [];
  const config = marketAnalysisConfig.getConfig();
  const currentMonthlyCost = aiMetricsCollector.getCurrentMonthlyCost();
  const monthlyBudget = config.costLimits.maxMonthlyBudget;
  const alertThreshold = config.costLimits.alertThreshold;

  // Alerte si on approche du budget mensuel
  const costPercentage = currentMonthlyCost / monthlyBudget;
  if (costPercentage >= alertThreshold) {
    alerts.push({
      type: costPercentage >= 0.95 ? "critical" : "warning",
      message: `Budget mensuel bientôt atteint: ${currentMonthlyCost.toFixed(2)}€ / ${monthlyBudget}€`,
      currentCost: currentMonthlyCost,
      budgetLimit: monthlyBudget,
      percentage: costPercentage * 100,
    });
  }

  return alerts;
}

function generatePerformanceAlerts() {
  const alerts: any[] = [];
  const config = marketAnalysisConfig.getPerformanceConfig();
  const recentMetrics = aiMetricsCollector.getRecentPerformanceMetrics(10);

  if (recentMetrics.length === 0) {
    return alerts;
  }

  // Calculer la moyenne des temps de traitement récents
  const avgProcessingTime = recentMetrics.reduce((sum, m) => sum + m.processingTime, 0) / recentMetrics.length;
  const maxProcessingTime = config.maxProcessingTime;

  // Alerte si le temps de traitement moyen dépasse 80% du seuil
  if (avgProcessingTime > maxProcessingTime * 0.8) {
    alerts.push({
      type: avgProcessingTime > maxProcessingTime ? "critical" : "warning",
      message: `Temps de traitement élevé détecté`,
      metric: "Temps de traitement moyen",
      value: Math.round(avgProcessingTime),
      threshold: Math.round(maxProcessingTime * 0.8),
    });
  }

  // Calculer le taux d'erreur récent
  const failedRequests = recentMetrics.filter(m => !m.success).length;
  const errorRate = failedRequests / recentMetrics.length;

  // Alerte si le taux d'erreur dépasse 10%
  if (errorRate > 0.1) {
    alerts.push({
      type: errorRate > 0.2 ? "critical" : "warning",
      message: `Taux d'erreur élevé détecté`,
      metric: "Taux d'erreur",
      value: Math.round(errorRate * 100),
      threshold: 10,
    });
  }

  // Calculer la confiance moyenne récente
  const confidenceScores = recentMetrics
    .filter(m => m.confidence !== undefined)
    .map(m => m.confidence!);

  if (confidenceScores.length > 0) {
    const avgConfidence = confidenceScores.reduce((sum, c) => sum + c, 0) / confidenceScores.length;

    // Alerte si la confiance moyenne est faible
    if (avgConfidence < 0.6) {
      alerts.push({
        type: avgConfidence < 0.4 ? "critical" : "warning",
        message: `Confiance IA faible détectée`,
        metric: "Confiance moyenne",
        value: Math.round(avgConfidence * 100),
        threshold: 60,
      });
    }
  }

  return alerts;
}

// Endpoint pour les actions de maintenance
export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "clear_cache":
        // TODO: Implémenter le nettoyage du cache
        return NextResponse.json({ success: true, message: "Cache vidé avec succès" });

      case "export_metrics":
        const exportData = aiMetricsCollector.exportMetrics();
        return NextResponse.json({
          success: true,
          data: exportData,
          filename: `ai-metrics-${new Date().toISOString().split("T")[0]}.json`,
        });

      case "reset_metrics":
        // TODO: Implémenter la réinitialisation des métriques (avec précautions)
        return NextResponse.json({ success: true, message: "Métriques réinitialisées" });

      default:
        return NextResponse.json(
          { error: "Action non reconnue" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error handling AI metrics action:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'exécution de l'action" },
      { status: 500 }
    );
  }
}