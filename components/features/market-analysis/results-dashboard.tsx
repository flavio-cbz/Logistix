"use client";

import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2 } from "lucide-react";
import type { ResultsDashboardProps } from "@/types/vinted-market-analysis";

// Import des nouveaux widgets
import KeyMetricsWidget from "./widgets/key-metrics-widget";
import PriceAnalysisWidget from "./widgets/price-analysis-widget";
import ProductInfoWidget from "./widgets/product-info-widget";
import NextStepsWidget from "./widgets/next-steps-widget";

import AiReportWidget from "./widgets/ai-report-widget";
import DistributionWidget from "./widgets/distribution-widget";
// Import des graphiques existants
import MarketAnalysisChart from "./market-analysis-chart";
import MarketTrends from "./market-trends";
import SalesVolumeChart from "./sales-volume-chart";
import { useMarketAnalysisStore } from "@/lib/store";

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function ResultsDashboard({
  analysis,
  onRefresh,
  isRefreshing = false,
}: ResultsDashboardProps) {
  const { historicalData } = useMarketAnalysisStore();

  return (
    <div className="space-y-6">
      {/* En-tête avec titre et bouton refresh */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Résultats de l'analyse</h3>
            <p className="text-sm text-muted-foreground">
              Analysé le {formatDate(analysis.analysisDate)}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh!}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Actualiser
          </Button>
        </div>
      </div>

      {/* Grille de widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne principale (plus large) */}
        <div className="lg:col-span-2 space-y-6">
          <KeyMetricsWidget analysis={analysis} />
          <MarketAnalysisChart
            currentAnalysis={analysis}
            historicalData={historicalData}
          />
          <div className="grid md:grid-cols-2 gap-6">
            <MarketTrends currentAnalysis={analysis} />
            <SalesVolumeChart analysis={analysis} />
            <DistributionWidget
              title="Distribution par Marque"
              data={analysis.brandDistribution || {}}
            />
            <DistributionWidget
              title="Distribution par Modèle"
              data={analysis.modelDistribution || {}}
            />
          </div>
        </div>

        {/* Colonne latérale */}
        <AiReportWidget analysis={analysis} />
        <div className="space-y-6">
          <PriceAnalysisWidget analysis={analysis} />
          <ProductInfoWidget analysis={analysis} />
          <NextStepsWidget analysis={analysis} />
        </div>
      </div>
    </div>
  );
}
