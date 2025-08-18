// Configuration avancée pour l'analyse de marché IA

import { z } from 'zod';

// Schémas de validation pour la configuration
export const MarketAnalysisConfigSchema = z.object({
  // Configuration des insights
  insights: z.object({
    enabled: z.boolean().default(true),
    minConfidence: z.number().min(0).max(1).default(0.7),
    maxInsights: z.number().min(1).max(20).default(10),
    categories: z.array(z.enum(['opportunity', 'risk', 'trend', 'anomaly'])).default(['opportunity', 'risk', 'trend']),
  }).default({}),
  
  // Configuration des recommandations
  recommendations: z.object({
    enabled: z.boolean().default(true),
    maxRecommendations: z.number().min(1).max(10).default(5),
    includeActionPlan: z.boolean().default(true),
    priorityLevels: z.array(z.enum(['high', 'medium', 'low'])).default(['high', 'medium', 'low']),
  }).default({}),
  
  // Configuration des prédictions
  predictions: z.object({
    enabled: z.boolean().default(true),
    timeframes: z.array(z.enum(['1week', '1month', '3months'])).default(['1week', '1month']),
    includeScenarios: z.boolean().default(true),
    minConfidence: z.number().min(0).max(1).default(0.6),
  }).default({}),
  
  // Configuration de la qualité des données
  dataQuality: z.object({
    minSampleSize: z.number().min(1).default(10),
    maxAge: z.number().min(1).default(90), // jours
    requiredFields: z.array(z.string()).default(['price', 'title', 'date']),
  }).default({}),
  
  // Configuration des coûts
  costLimits: z.object({
    maxCostPerAnalysis: z.number().min(0).default(1.0), // en euros
    maxMonthlyBudget: z.number().min(0).default(100.0),
    alertThreshold: z.number().min(0).max(1).default(0.8), // 80% du budget
  }).default({}),
  
  // Configuration de performance
  performance: z.object({
    maxProcessingTime: z.number().min(1000).default(30000), // ms
    enableCaching: z.boolean().default(true),
    cacheExpiry: z.number().min(300).default(3600), // secondes
  }).default({}),
});

export type MarketAnalysisConfig = z.infer<typeof MarketAnalysisConfigSchema>;

// Configuration par défaut
export const DEFAULT_MARKET_ANALYSIS_CONFIG: MarketAnalysisConfig = {
  insights: {
    enabled: true,
    minConfidence: 0.7,
    maxInsights: 10,
    categories: ['opportunity', 'risk', 'trend'],
  },
  recommendations: {
    enabled: true,
    maxRecommendations: 5,
    includeActionPlan: true,
    priorityLevels: ['high', 'medium', 'low'],
  },
  predictions: {
    enabled: true,
    timeframes: ['1week', '1month'],
    includeScenarios: true,
    minConfidence: 0.6,
  },
  dataQuality: {
    minSampleSize: 10,
    maxAge: 90,
    requiredFields: ['price', 'title', 'date'],
  },
  costLimits: {
    maxCostPerAnalysis: 1.0,
    maxMonthlyBudget: 100.0,
    alertThreshold: 0.8,
  },
  performance: {
    maxProcessingTime: 30000,
    enableCaching: true,
    cacheExpiry: 3600,
  },
};

// Service de gestion de configuration
export class MarketAnalysisConfigService {
  private static instance: MarketAnalysisConfigService;
  private config: MarketAnalysisConfig;

  private constructor() {
    this.config = DEFAULT_MARKET_ANALYSIS_CONFIG;
  }

  public static getInstance(): MarketAnalysisConfigService {
    if (!MarketAnalysisConfigService.instance) {
      MarketAnalysisConfigService.instance = new MarketAnalysisConfigService();
    }
    return MarketAnalysisConfigService.instance;
  }

  public getConfig(): MarketAnalysisConfig {
    return { ...this.config };
  }

  public updateConfig(updates: Partial<MarketAnalysisConfig>): void {
    const newConfig = { ...this.config, ...updates };
    const validated = MarketAnalysisConfigSchema.parse(newConfig);
    this.config = validated;
  }

  public validateDataQuality(data: any[]): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    const { minSampleSize, maxAge, requiredFields } = this.config.dataQuality;

    // Vérifier la taille de l'échantillon
    if (data.length < minSampleSize) {
      issues.push(`Échantillon trop petit: ${data.length} < ${minSampleSize}`);
    }

    // Vérifier les champs requis
    if (data.length > 0) {
      const firstItem = data[0];
      for (const field of requiredFields) {
        if (!(field in firstItem) || firstItem[field] == null) {
          issues.push(`Champ requis manquant: ${field}`);
        }
      }
    }

    // Vérifier l'âge des données
    const now = new Date();
    const maxAgeMs = maxAge * 24 * 60 * 60 * 1000;
    const oldItems = data.filter(item => {
      const itemDate = new Date(item.date || item.created_at || item.sold_at);
      return (now.getTime() - itemDate.getTime()) > maxAgeMs;
    });

    if (oldItems.length > data.length * 0.5) {
      issues.push(`Trop de données anciennes: ${oldItems.length}/${data.length}`);
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  public shouldEnableFeature(feature: keyof MarketAnalysisConfig): boolean {
    const featureConfig = this.config[feature];
    return typeof featureConfig === 'object' && 'enabled' in featureConfig 
      ? featureConfig.enabled 
      : true;
  }

  public getCostLimit(type: 'analysis' | 'monthly'): number {
    return type === 'analysis' 
      ? this.config.costLimits.maxCostPerAnalysis
      : this.config.costLimits.maxMonthlyBudget;
  }

  public getPerformanceConfig() {
    return this.config.performance;
  }
}

// Instance globale
export const marketAnalysisConfig = MarketAnalysisConfigService.getInstance();