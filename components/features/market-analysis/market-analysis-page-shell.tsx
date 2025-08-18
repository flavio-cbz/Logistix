import React, { useEffect } from "react";
import { useMarketAnalysisStore } from "@/lib/store";
import MarketAnalysisDashboard from "./market-analysis-dashboard";
import ResultsDashboard from "./results-dashboard";
import VintedConfigRequired from "@/app/(dashboard)/analyse-marche/components/vinted-config-required"; 
import { checkVintedTokenStatus } from "@/lib/services/market-analysis";
import { useMarketAnalysisData } from "@/lib/hooks/use-market-analysis-data";
import DashboardSkeleton from "./dashboard-skeleton"; // Import du squelette

export default function MarketAnalysisPageShell() {
  const { currentAnalysis, tokenConfigured } = useMarketAnalysisStore();
  const { onRefresh, isRefreshing } = useMarketAnalysisData();

  useEffect(() => {
    // Vérifier le statut du token au chargement du shell
    if (tokenConfigured === null) {
      checkVintedTokenStatus();
    }
  }, [tokenConfigured]);

  // Si le token n'est pas configuré, afficher l'écran de configuration
  if (tokenConfigured === false) {
    return <VintedConfigRequired />;
  }

  // Pendant la vérification ou le chargement initial, afficher le squelette
  if (tokenConfigured === null || (isRefreshing && !currentAnalysis)) {
    return <DashboardSkeleton />;
  }

  // Si aucune analyse en cours, afficher le dashboard (historique + bouton nouvelle analyse)
  if (!currentAnalysis) {
    return <MarketAnalysisDashboard />;
  }

  // Si une analyse est en cours, afficher la vue des résultats
  return (
    <ResultsDashboard
      analysis={currentAnalysis}
      onRefresh={onRefresh}
      isRefreshing={isRefreshing}
    />
  );
}