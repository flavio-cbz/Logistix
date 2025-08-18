import { useMarketAnalysisStore } from "@/lib/store";
import { useEffect, useState } from "react";

export function useMarketAnalysisData() {
  const { historicalData, setHistoricalData, pagination, setPagination } = useMarketAnalysisStore();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadHistoricalData = async (page = 1) => {
    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/v1/market-analysis?page=${page}&limit=10`);
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des données historiques');
      }
      const data = await response.json();
      
      const transformedAnalyses = data.analyses.map((analysis: any) => ({
        id: analysis.id || `temp-${Date.now()}-${Math.random()}`,
        productName: analysis.productName || 'Produit inconnu',
        salesVolume: analysis.result?.salesVolume || 0,
        avgPrice: analysis.result?.avgPrice || 0,
        createdAt: analysis.createdAt || new Date().toISOString(),
        status: analysis.status || 'pending',
        error: analysis.error,
      }));

      setHistoricalData(page === 1 ? transformedAnalyses : [...historicalData, ...transformedAnalyses]);
      setPagination({
        page: data.page,
        totalPages: data.totalPages,
        hasMore: data.page < data.totalPages,
      });
    } catch (error) {
      console.error('Erreur lors du chargement des données historiques:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    // Charger les données initiales si elles ne sont pas déjà là
    if (historicalData.length === 0) {
      loadHistoricalData();
    }
  }, []); // Ne s'exécute qu'au montage

  const onRefresh = (page?: number) => {
    loadHistoricalData(page ?? 1); // Recharge la page indiquée ou la première page par défaut
  };

  return { onRefresh, isRefreshing };
}