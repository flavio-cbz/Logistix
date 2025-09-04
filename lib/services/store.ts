import { create } from "zustand";
import type { VintedAnalysisResult, MarketAnalysisHistoryItem } from "@/types/vinted-market-analysis"; // Removed MarketAnalysisRequest as it's not used here

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
  setPagination: (pagination: { page: number; totalPages: number; hasMore: boolean }) => void;
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
  setCurrentAnalysis: (analysis: VintedAnalysisResult | null) => set({ currentAnalysis: analysis }),
  setHistoricalData: (data: MarketAnalysisHistoryItem[]) => set({ historicalData: data }),
  setIsLoading: (loading: boolean) => set({ isLoading: loading }),
  setError: (error: string | null) => set({ error: error }),
  setTokenConfigured: (configured: boolean | null) => set({ tokenConfigured: configured }),
  setPagination: (pagination: { page: number; totalPages: number; hasMore: boolean }) => set({ pagination: pagination }),
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