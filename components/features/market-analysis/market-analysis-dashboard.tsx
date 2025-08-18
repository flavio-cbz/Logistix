import React, { useState } from "react";
import { useMarketAnalysisStore } from "@/lib/store";
import HistoricalDataView from "./historical-data-view";
import { Button } from "@/components/ui/button";
import NewAnalysisModal from "./new-analysis-modal";
import { useMarketAnalysisData } from "@/lib/hooks/use-market-analysis-data";
import type { MarketAnalysisHistoryItem, VintedAnalysisResult } from "@/types/vinted-market-analysis";
import ComparativeAnalysisView from "./comparative-analysis-view";

export default function MarketAnalysisDashboard() {
  const { historicalData, isLoading, pagination, setCurrentAnalysis } = useMarketAnalysisStore();
  const { onRefresh } = useMarketAnalysisData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedForComparison, setSelectedForComparison] = useState<string[]>([]);
  const [comparisonResult, setComparisonResult] = useState<{ a: VintedAnalysisResult, b: VintedAnalysisResult } | null>(null);

  const handleToggleCompare = (analysisId: string) => {
    setSelectedForComparison(prev => {
      if (prev.includes(analysisId)) {
        return prev.filter(id => id !== analysisId);
      }
      if (prev.length < 2) {
        return [...prev, analysisId];
      }
      return [prev[1], analysisId]; // Garde les deux plus récents
    });
  };

  const handleCompare = async () => {
    if (selectedForComparison.length !== 2) return;
    // Pour cette démo, nous utilisons les données partielles de l'historique.
    // Idéalement, il faudrait fetch les analyses complètes.
    const analysisA = historicalData.find(h => h.id === selectedForComparison[0]);
    const analysisB = historicalData.find(h => h.id === selectedForComparison[1]);

    if (analysisA && analysisB) {
      const mockFullAnalysis = (h: MarketAnalysisHistoryItem): VintedAnalysisResult => ({
        avgPrice: h.avgPrice,
        salesVolume: h.salesVolume,
        priceRange: { min: h.avgPrice * 0.8, max: h.avgPrice * 1.2 },
        analysisDate: h.createdAt,
        catalogInfo: { id: 0, name: 'Unknown' },
        brandInfo: null,
        rawItems: []
      });
      setComparisonResult({ a: mockFullAnalysis(analysisA), b: mockFullAnalysis(analysisB) });
    }
  };

  const handleRowClick = (analysis: MarketAnalysisHistoryItem) => {
    if (analysis.status === 'completed') {
      const partialAnalysis = {
        avgPrice: analysis.avgPrice,
        salesVolume: analysis.salesVolume,
        priceRange: { min: analysis.avgPrice * 0.8, max: analysis.avgPrice * 1.2 },
        analysisDate: analysis.createdAt,
        catalogInfo: { id: 0, name: 'Unknown' },
        brandInfo: null,
        rawItems: []
      };
      setCurrentAnalysis(partialAnalysis);
    }
  };

  if (comparisonResult) {
    return (
      <div className="space-y-6">
        <Button onClick={() => setComparisonResult(null)}>Retour à l'historique</Button>
        <ComparativeAnalysisView analysisA={comparisonResult.a} analysisB={comparisonResult.b} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Historique des analyses</h2>
        <div className="flex gap-2">
          {selectedForComparison.length === 2 && (
            <Button onClick={handleCompare}>Comparer ({selectedForComparison.length})</Button>
          )}
          <Button onClick={() => setIsModalOpen(true)}>
            Nouvelle Analyse
          </Button>
        </div>
      </div>

      <HistoricalDataView
        analyses={historicalData}
        hasMore={pagination.hasMore}
        isLoading={isLoading}
        onLoadMore={() => onRefresh()}
        onReload={() => onRefresh()}
        onRowClick={handleRowClick}
        onToggleCompare={handleToggleCompare}
        selectedForComparison={selectedForComparison}
      />

      <NewAnalysisModal 
        open={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
}