import { create } from "zustand";

interface MarketAnalysisState {
  currentAnalysis: any | null;
  analysisHistory: any[];
  historicalData: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
  isLoading: boolean;
  error: string | null;
}

interface MarketAnalysisActions {
  setCurrentAnalysis: (analysis: any) => void;
  addToHistory: (analysis: any) => void;
  setHistoricalData: (data: any[]) => void;
  setPagination: (pagination: {
    page: number;
    limit: number;
    total: number;
  }) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

type MarketAnalysisStore = MarketAnalysisState & MarketAnalysisActions;

export const useMarketAnalysisStore = create<MarketAnalysisStore>((set) => ({
  // État initial
  currentAnalysis: null,
  analysisHistory: [],
  historicalData: [],
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
  },
  isLoading: false,
  error: null,

  // Actions
  setCurrentAnalysis: (analysis) => set({ currentAnalysis: analysis }),

  addToHistory: (analysis) =>
    set((state) => ({
      analysisHistory: [analysis, ...state.analysisHistory].slice(0, 10), // Garder les 10 dernières
    })),

  setHistoricalData: (data) => set({ historicalData: data }),

  setPagination: (pagination) => set({ pagination }),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  clearError: () => set({ error: null }),
}));
