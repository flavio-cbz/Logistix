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
    min: z.number().optional(),
    max: z.number().optional(),
  }),
  brandInfo: z.object({
    id: z.number(),
    name: z.string(),
  }).nullable(),
  catalogInfo: z.object({
    id: z.number(),
    name: z.string(),
  }),
  // Liste originale des items bruts (anciennement rawItems)
  rawItems: z.array(VintedSoldItemSchema),
  // Alias/compatibilité: certains modules utilisent `items` ou `enrichedItems`
  items: z.array(VintedSoldItemSchema).optional(),
  enrichedItems: z.array(z.any()).optional(),
  // Distributions et métriques avancées (optionnelles, parfois calculées séparément)
  brandDistribution: z.record(z.number()).optional(),
  modelDistribution: z.record(z.number()).optional(),
  advancedMetrics: z.any().optional(),
  analysisDate: z.string(),
});

export const MarketAnalysisRequestSchema = z.object({
  productName: z.string().min(3, "Le nom du produit doit contenir au moins 3 caractères"),
  catalogId: z.number().int().positive("L'ID de catalogue doit être un nombre positif"),
  categoryName: z.string().min(2, "Le nom de catégorie doit contenir au moins 2 caractères").optional(),
  brandId: z.number().int().positive("L'ID de la marque doit être un nombre positif").optional(),
  maxProducts: z.number().int().positive("Le nombre de produits doit être positif").optional(),
  advancedParams: z.record(z.any()).optional(), // Placeholder pour paramètres avancés
  itemStates: z.array(z.string()).optional(), // États des articles sélectionnés
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
// Use Partial<> for the exported type to be permissive with code that passes partial analysis
// objects (many modules construct 'patched' or simplified versions). Replace with stricter
// typing later if desired.
export type VintedAnalysisResult = z.infer<typeof VintedAnalysisResultSchema>;
export type MarketAnalysisRequest = z.infer<typeof MarketAnalysisRequestSchema>; // inclut itemStates
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
  // Rendre optionnelles et ajouter alias pour compatibilité avec le code existant
  sizeDistribution?: Record<string, number>;
  brandDistribution?: Record<string, number>;
  timeDistribution?: {
    byMonth?: Record<string, number>;
    byWeekday?: Record<string, number>;
  };
  // Certains modules utilisent 'competitorAnalysis' ou 'competitiveAnalysis'
  competitorAnalysis?: {
    totalCompetitors?: number;
    averageCompetitorPrice?: number;
    pricePosition?: 'below' | 'average' | 'above';
  };
  competitiveAnalysis?: {
    totalCompetitors?: number;
    averageCompetitorPrice?: number;
    pricePosition?: 'below' | 'average' | 'above';
  };
}

// Import advanced analytics types
export interface DescriptiveStats {
  mean: number;
  median: number;
  mode: number[];
  standardDeviation: number;
  variance: number;
  quartiles: [number, number, number];
  outliers: number[];
  skewness: number;
  kurtosis: number;
  range: { min: number; max: number };
  interquartileRange: number;
}

export interface PriceDistribution {
  histogram: Array<{
    range: [number, number];
    count: number;
    percentage: number;
    density: number;
  }>;
  density: Array<{
    price: number;
    density: number;
  }>;
  percentiles: Record<number, number>;
  cumulativeDistribution: Array<{
    price: number;
    cumulative: number;
  }>;
}

export interface SeasonalityData {
  detected: boolean;
  pattern: 'weekly' | 'monthly' | 'seasonal' | 'none';
  confidence: number;
  peaks: Array<{
    period: string;
    value: number;
    significance: number;
  }>;
  cycles: Array<{
    length: number;
    amplitude: number;
    phase: number;
  }>;
}

export interface CyclicalPattern {
  period: number;
  amplitude: number;
  phase: number;
  confidence: number;
  description: string;
}

export interface TrendData {
  direction: 'up' | 'down' | 'stable';
  strength: number;
  duration: number;
  slope: number;
  rSquared: number;
  changePoints: Array<{
    date: string;
    type: 'increase' | 'decrease' | 'volatility';
    magnitude: number;
    significance: number;
  }>;
}

export interface TemporalAnalysis {
  seasonality: SeasonalityData;
  trends: TrendData;
  cyclicalPatterns: CyclicalPattern[];
  volatility: {
    overall: number;
    periods: Array<{
      start: string;
      end: string;
      volatility: number;
    }>;
  };
}

export interface CompetitiveAnalysis {
  marketPosition: 'low' | 'average' | 'high';
  competitorDensity: number;
  priceGaps: Array<{
    min: number;
    max: number;
    opportunity: number;
    confidence: number;
  }>;
  marketShare: {
    estimated: number;
    confidence: number;
  };
  competitiveAdvantage: Array<{
    factor: string;
    advantage: number;
    description: string;
  }>;
}

export interface EnhancedAdvancedMetrics {
  descriptiveStats: DescriptiveStats;
  priceDistribution: PriceDistribution;
  temporalAnalysis: TemporalAnalysis;
  competitiveAnalysis: CompetitiveAnalysis;
  qualityScore: {
    overall: number;
    dataCompleteness: number;
    sampleSize: number;
    timeRange: number;
    variance: number;
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

// --- Types pour l'IA et l'analyse avancée ---

// Types pour les insights IA
export interface AIInsight {
  type: 'opportunity' | 'risk' | 'trend' | 'anomaly';
  title: string;
  description: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high';
  evidence: string[];
  priority?: 'high' | 'medium' | 'low';
}

export interface AIInsights {
  summary: string;
  keyFindings: AIInsight[];
  marketContext: {
    competitivePosition: string;
    marketConditions: string;
    seasonalFactors: string[];
  };
  priceAnalysis: {
    optimalPriceRange: { min: number; max: number };
    pricingStrategy: string;
    justification: string;
  };
  confidence: number;
  generatedAt: string;
}

// Types pour les recommandations IA
export interface PricingRecommendation {
  type: 'pricing';
  optimalPrice: number;
  priceRange: { min: number; max: number };
  strategy: string;
  justification: string;
  confidence: number;
  expectedImpact: string;
}

export interface MarketingRecommendation {
  type: 'marketing';
  strategy: string;
  channels: string[];
  targetAudience: string;
  expectedOutcome: string;
  confidence: number;
  timeline: string;
}

export interface OpportunityRecommendation {
  type: 'opportunity';
  opportunity: string;
  description: string;
  profitPotential: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  timeline: string;
  confidence: number;
  actionSteps: string[];
}

export interface RiskMitigation {
  type: 'risk';
  risk: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  mitigation: string;
  preventionSteps: string[];
  confidence: number;
}

export interface ActionItem {
  action: string;
  priority: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
  expectedImpact: string;
  timeline: string;
  dependencies?: string[];
  // Champs additionnels parfois utilisés dans le UI
  expectedOutcome?: string;
  strategy?: string;
  goals?: string[];
  metrics?: string[];
}

export interface ActionPlan {
  immediate: ActionItem[];
  shortTerm: ActionItem[];
  longTerm: ActionItem[];
  totalEstimatedEffort: string;
  expectedROI: string;
}

export interface AIRecommendations {
  pricing: PricingRecommendation[];
  marketing: MarketingRecommendation[];
  opportunities: OpportunityRecommendation[];
  risks: RiskMitigation[];
  actionPlan: ActionPlan;
  confidence: number;
  lastUpdated: string;
}

// Types pour les anomalies de marché
export interface AnomalyDetection {
  id: string;
  type: 'price' | 'volume' | 'timing' | 'quality';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedItems: string[];
  suggestedAction: string;
  confidence: number;
  detectedAt: string;
  evidence?: string[];
  impact?: 'low' | 'medium' | 'high';
}

// Types pour les prédictions de tendances
export interface TrendPrediction {
  timeframe: '1week' | '1month' | '3months';
  predictions: Array<{
    metric: 'price' | 'volume' | 'demand';
    direction: 'up' | 'down' | 'stable';
    magnitude: number;
    confidence: number;
    factors: string[];
  }>;
  scenarios: Array<{
    name: string;
    probability: number;
    description: string;
    impact: string;
  }>;
  generatedAt: string;
}

// Types pour les graphiques enrichis
export interface AIAnnotation {
  position: { x: number; y: number };
  type: 'insight' | 'recommendation' | 'warning' | 'opportunity';
  title: string;
  description: string;
  confidence: number;
}

export interface InteractiveElement {
  trigger: 'hover' | 'click';
  element: string;
  action: 'show-detail' | 'highlight-related' | 'show-recommendation';
  data: any;
}

export interface EnhancedChart {
  id: string;
  type: 'price-distribution' | 'trend-analysis' | 'competitive-position' | 'opportunity-map';
  chartData: any;
  aiAnnotations: AIAnnotation[];
  interactiveElements: InteractiveElement[];
  generatedAt: string;
}

// Métadonnées de traitement IA
export interface AIProcessingMetadata {
  aiProcessingTime: number;
  llmProvider: string;
  modelVersion: string;
  confidence: number;
  lastProcessed: string;
  tokensUsed?: number;
  estimatedCost?: number;
  fallbackUsed?: boolean;
}

// Extension du VintedAnalysisResult avec les données IA
export interface EnhancedVintedAnalysisResult extends VintedAnalysisResult {
  // Données IA optionnelles
  aiInsights?: AIInsights;
  aiRecommendations?: AIRecommendations;
  enhancedCharts?: EnhancedChart[];
  anomalies?: AnomalyDetection[];
  trendPredictions?: TrendPrediction;
  
  // Métadonnées de traitement
  processingMetadata: AIProcessingMetadata;
  
  // Indicateurs de qualité
  dataQuality?: {
    score: number;
    issues: string[];
    recommendations: string[];
  };
}

// Schémas Zod pour validation des nouvelles structures
export const AIInsightSchema = z.object({
  type: z.enum(['opportunity', 'risk', 'trend', 'anomaly']),
  title: z.string(),
  description: z.string(),
  confidence: z.number().min(0).max(1),
  impact: z.enum(['low', 'medium', 'high']),
  evidence: z.array(z.string()),
  priority: z.enum(['high', 'medium', 'low']).optional(),
});

export const AIInsightsSchema = z.object({
  summary: z.string(),
  keyFindings: z.array(AIInsightSchema),
  marketContext: z.object({
    competitivePosition: z.string(),
    marketConditions: z.string(),
    seasonalFactors: z.array(z.string()),
  }),
  priceAnalysis: z.object({
    optimalPriceRange: z.object({
      min: z.number(),
      max: z.number(),
    }),
    pricingStrategy: z.string(),
    justification: z.string(),
  }),
  confidence: z.number().min(0).max(1),
  generatedAt: z.string(),
});

export const AnomalyDetectionSchema = z.object({
  id: z.string(),
  type: z.enum(['price', 'volume', 'timing', 'quality']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  description: z.string(),
  affectedItems: z.array(z.string()),
  suggestedAction: z.string(),
  confidence: z.number().min(0).max(1),
  detectedAt: z.string(),
  evidence: z.array(z.string()).optional(),
  impact: z.enum(['low', 'medium', 'high']).optional(),
});

// Schémas Zod pour les recommandations IA
export const PricingRecommendationSchema = z.object({
  type: z.literal('pricing'),
  optimalPrice: z.number(),
  priceRange: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
  }),
  strategy: z.string(),
  justification: z.string(),
  confidence: z.number().min(0).max(1),
  expectedImpact: z.string(),
});

export const MarketingRecommendationSchema = z.object({
  type: z.literal('marketing'),
  strategy: z.string(),
  channels: z.array(z.string()),
  targetAudience: z.string(),
  expectedOutcome: z.string(),
  confidence: z.number().min(0).max(1),
  timeline: z.string(),
});

export const OpportunityRecommendationSchema = z.object({
  type: z.literal('opportunity'),
  opportunity: z.string(),
  description: z.string(),
  profitPotential: z.enum(['low', 'medium', 'high']),
  effort: z.enum(['low', 'medium', 'high']),
  timeline: z.string(),
  confidence: z.number().min(0).max(1),
  actionSteps: z.array(z.string()),
});

export const RiskMitigationSchema = z.object({
  type: z.literal('risk'),
  risk: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  mitigation: z.string(),
  preventionSteps: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

export const ActionItemSchema = z.object({
  action: z.string(),
  priority: z.enum(['high', 'medium', 'low']),
  effort: z.enum(['low', 'medium', 'high']),
  expectedImpact: z.string(),
  timeline: z.string(),
  dependencies: z.array(z.string()).optional(),
});

export const ActionPlanSchema = z.object({
  immediate: z.array(ActionItemSchema),
  shortTerm: z.array(ActionItemSchema),
  longTerm: z.array(ActionItemSchema),
  totalEstimatedEffort: z.string(),
  expectedROI: z.string(),
});

export const AIRecommendationsSchema = z.object({
  pricing: z.array(PricingRecommendationSchema),
  marketing: z.array(MarketingRecommendationSchema),
  opportunities: z.array(OpportunityRecommendationSchema),
  risks: z.array(RiskMitigationSchema),
  actionPlan: ActionPlanSchema,
  confidence: z.number().min(0).max(1),
  lastUpdated: z.string(),
});

// Schémas Zod pour les graphiques enrichis
export const AIAnnotationSchema = z.object({
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  type: z.enum(['insight', 'recommendation', 'warning', 'opportunity']),
  title: z.string(),
  description: z.string(),
  confidence: z.number().min(0).max(1),
});

export const InteractiveElementSchema = z.object({
  trigger: z.enum(['hover', 'click']),
  element: z.string(),
  action: z.enum(['show-detail', 'highlight-related', 'show-recommendation']),
  data: z.any(),
});

export const EnhancedChartSchema = z.object({
  id: z.string(),
  type: z.enum(['price-distribution', 'trend-analysis', 'competitive-position', 'opportunity-map']),
  chartData: z.any(),
  aiAnnotations: z.array(AIAnnotationSchema),
  interactiveElements: z.array(InteractiveElementSchema),
  generatedAt: z.string(),
});

// Schémas Zod pour les prédictions de tendances
export const TrendPredictionSchema = z.object({
  timeframe: z.enum(['1week', '1month', '3months']),
  predictions: z.array(z.object({
    metric: z.enum(['price', 'volume', 'demand']),
    direction: z.enum(['up', 'down', 'stable']),
    magnitude: z.number(),
    confidence: z.number().min(0).max(1),
    factors: z.array(z.string()),
  })),
  scenarios: z.array(z.object({
    name: z.string(),
    probability: z.number().min(0).max(1),
    description: z.string(),
    impact: z.string(),
  })),
  generatedAt: z.string(),
});

export const EnhancedVintedAnalysisResultSchema = VintedAnalysisResultSchema.extend({
  aiInsights: AIInsightsSchema.optional(),
  aiRecommendations: AIRecommendationsSchema.optional(),
  enhancedCharts: z.array(EnhancedChartSchema).optional(),
  anomalies: z.array(AnomalyDetectionSchema).optional(),
  trendPredictions: TrendPredictionSchema.optional(),
  processingMetadata: z.object({
    aiProcessingTime: z.number(),
    llmProvider: z.string(),
    modelVersion: z.string(),
    confidence: z.number().min(0).max(1),
    lastProcessed: z.string(),
    tokensUsed: z.number().optional(),
    estimatedCost: z.number().optional(),
    fallbackUsed: z.boolean().optional(),
  }),
  dataQuality: z.object({
    score: z.number().min(0).max(1),
    issues: z.array(z.string()),
    recommendations: z.array(z.string()),
  }).optional(),
});