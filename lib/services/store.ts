import { create } from "zustand";
import { VintedAnalysisResult, MarketAnalysisHistoryItem, MarketAnalysisRequest } from "@/types/vinted-market-analysis";

interface MarketAnalysisStore {
  currentAnalysis: VintedAnalysisResult | null;
  historicalData: MarketAnalysisHistoryItem[];
  isLoading: boolean;
  error: string | null;
  tokenConfigured: boolean | null;
  pagination: {
    page: number;
    totalPages: number;
    hasMore: boolean;
  };
  setCurrentAnalysis: (analysis: VintedAnalysisResult | null) => void;
  setHistoricalData: (data: MarketAnalysisHistoryItem[]) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setTokenConfigured: (configured: boolean | null) => void;
  setPagination: (pagination: MarketAnalysisStore["pagination"]) => void;
  reset: () => void;
}

export const useMarketAnalysisStore = create<MarketAnalysisStore>((set) => ({
  currentAnalysis: null,
  historicalData: [],
  isLoading: false,
  error: null,
  tokenConfigured: null,
  pagination: {
    page: 1,
    totalPages: 1,
    hasMore: false,
  },
  setCurrentAnalysis: (analysis) => set({ currentAnalysis: analysis }),
  setHistoricalData: (data) => set({ historicalData: data }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  setTokenConfigured: (configured) => set({ tokenConfigured: configured }),
  setPagination: (pagination) => set({ pagination }),
  reset: () =>
    set({
      currentAnalysis: null,
      historicalData: [],
      isLoading: false,
      error: null,
      tokenConfigured: null,
      pagination: { page: 1, totalPages: 1, hasMore: false },
    }),
}));

// Re-export the main store for backward compatibility
export { useStore } from "@/lib/services/admin/store";