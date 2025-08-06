// Types pour l'analyse de marché Vinted

import { z } from 'zod';

// --- Schémas Zod pour validation ---
export const VintedSoldItemSchema = z.object({
  title: z.string(),
  price: z.object({
    amount: z.string(),
    currency: z.string().optional(),
  }),
  size_title: z.string().optional(),
  brand: z.object({
    id: z.number(),
    title: z.string(),
  }).optional(),
  created_at: z.string().optional(),
  sold_at: z.string().optional(),
});

export const VintedAnalysisResultSchema = z.object({
  salesVolume: z.number(),
  avgPrice: z.number(),
  priceRange: z.object({
    min: z.number(),
    max: z.number(),
  }),
  brandInfo: z.object({
    id: z.number(),
    name: z.string(),
  }).nullable(),
  catalogInfo: z.object({
    id: z.number(),
    name: z.string(),
  }),
  rawItems: z.array(VintedSoldItemSchema),
  analysisDate: z.string(),
});

export const MarketAnalysisRequestSchema = z.object({
  productName: z.string().min(3, "Le nom du produit doit contenir au moins 3 caractères"),
  catalogId: z.number().int().positive("L'ID de catalogue doit être un nombre positif"),
  categoryName: z.string().min(2, "Le nom de catégorie doit contenir au moins 2 caractères").optional(),
});

export const MarketAnalysisHistoryItemSchema = z.object({
  id: z.string(),
  productName: z.string(),
  salesVolume: z.number(),
  avgPrice: z.number(),
  createdAt: z.string(),
  status: z.enum(['completed', 'pending', 'failed']),
  error: z.string().optional(),
});

export const MarketAnalysisStateSchema = z.object({
  currentAnalysis: VintedAnalysisResultSchema.nullable(),
  historicalData: z.array(MarketAnalysisHistoryItemSchema),
  isLoading: z.boolean(),
  error: z.string().nullable(),
  pagination: z.object({
    page: z.number(),
    totalPages: z.number(),
    hasMore: z.boolean(),
  }),
});

// --- Types TypeScript ---
export type VintedSoldItem = z.infer<typeof VintedSoldItemSchema>;
export type VintedAnalysisResult = z.infer<typeof VintedAnalysisResultSchema>;
export type MarketAnalysisRequest = z.infer<typeof MarketAnalysisRequestSchema>;
export type MarketAnalysisState = z.infer<typeof MarketAnalysisStateSchema>;

// --- Types pour les composants ---
export interface AnalysisFormProps {
  onSubmit: (data: MarketAnalysisRequest) => Promise<void>;
  isLoading: boolean;
  error?: string | null;
}

export interface ResultsDashboardProps {
  analysis: VintedAnalysisResult;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export interface HistoricalDataViewProps {
  analyses: MarketAnalysisHistoryItem[];
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading?: boolean;
}

export interface MarketAnalysisHistoryItem {
  id: string;
  productName: string;
  salesVolume: number;
  avgPrice: number;
  createdAt: string;
  status: 'completed' | 'pending' | 'failed';
  error?: string;
}

// --- Types pour les erreurs ---
export interface UserError {
  message: string;
  code: string;
  suggestions: string[];
  retryable: boolean;
}

export interface ApiErrorResponse {
  error: {
    message: string;
    code: string;
    details?: any;
  };
  timestamp: string;
  path: string;
}

// --- Types pour la configuration des tokens ---
export interface TokenConfigurationRequest {
  token: string;
}

export interface TokenValidationResponse {
  valid: boolean;
  expiresAt?: string;
  message?: string;
}

// --- Types pour les métriques avancées ---
export interface AdvancedMetrics {
  priceDistribution: {
    ranges: Array<{
      min: number;
      max: number;
      count: number;
      percentage: number;
    }>;
  };
  sizeDistribution: Record<string, number>;
  brandDistribution: Record<string, number>;
  timeDistribution: {
    byMonth: Record<string, number>;
    byWeekday: Record<string, number>;
  };
  competitorAnalysis: {
    totalCompetitors: number;
    averageCompetitorPrice: number;
    pricePosition: 'below' | 'average' | 'above';
  };
}

// --- Types pour les tendances ---
export interface TrendData {
  date: string;
  price: number;
  volume: number;
  demand?: number;
}

export interface PredictionData {
  date: string;
  predictedPrice: number;
  predictedVolume: number;
  confidence: number;
}

// --- Types pour les filtres ---
export interface AnalysisFilters {
  productName?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: 'completed' | 'pending' | 'failed';
  minPrice?: number;
  maxPrice?: number;
}

// --- Types pour l'export ---
export interface ExportOptions {
  format: 'csv' | 'json' | 'xlsx';
  includeRawData: boolean;
  dateRange?: {
    from: string;
    to: string;
  };
}

// --- Types pour les notifications ---
export interface AnalysisNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
}