import { VintedAnalysisResult } from "../vinted-market-analysis";
import AdvancedAnalyticsEngine, { AdvancedMetrics } from "@/lib/analytics/advanced-analytics-engine";
import { generateEnhancedReport, EnhancedReport } from "./report-generator";
import { marketInsightsService, MarketInsights, UserPreferences } from "./market-insights";
import { normalizeTitle } from "./title-normalizer";
import { isAnomaly } from "./anomaly-detector";
import { marketAnalysisConfig } from "./market-analysis-config";
import { AIAnalysisError } from "./ai-errors";

// Types pour l'orchestrateur d'analyse IA
export interface AIAnalysisOptions {
  userPreferences?: UserPreferences;
  includeAdvancedMetrics?: boolean;
  includeReports?: boolean;
  includeInsights?: boolean;
  enableDataEnrichment?: boolean;
}

export interface EnhancedAnalysisResult extends VintedAnalysisResult {
  // Données enrichies par l'IA
  aiEnhancedItems?: EnrichedItem[];
  
  // Métriques avancées
  advancedMetrics?: AdvancedMetrics;
  
  // Rapports IA
  aiReport?: EnhancedReport;
  
  // Insights de marché
  marketInsights?: MarketInsights;
  
  // Métadonnées de traitement
  processingMetadata: {
    totalProcessingTime: number;
    aiProcessingTime: number;
    servicesUsed: string[];
    confidence: number;
    dataQuality: {
      score: number;
      issues: string[];
    };
    costs: {
      totalTokens: number;
      estimatedCost: number;
    };
    lastProcessed: string;
  };
}

export interface EnrichedItem {
  originalItem: any;
  normalizedData: {
    brand: string | null;
    model: string | null;
    year: number | null;
    attributes: string[];
  };
  relevanceScore: number;
  isRelevant: boolean;
  anomalies: string[];
  confidence: number;
}

export interface AnalysisProgress {
  stage: 'initialization' | 'data_enrichment' | 'metrics_calculation' | 'report_generation' | 'insights_generation' | 'finalization';
  progress: number; // 0-100
  message: string;
  estimatedTimeRemaining?: number;
}

// Orchestrateur principal d'analyse IA
export class AIAnalysisEngine {
  private static instance: AIAnalysisEngine;
  private advancedAnalyticsEngine: InstanceType<typeof AdvancedAnalyticsEngine>;
  private progressCallback?: (progress: AnalysisProgress) => void;

  private constructor() {
    this.advancedAnalyticsEngine = new AdvancedAnalyticsEngine();
  }

  public static getInstance(): AIAnalysisEngine {
    if (!AIAnalysisEngine.instance) {
      AIAnalysisEngine.instance = new AIAnalysisEngine();
    }
    return AIAnalysisEngine.instance;
  }

  /**
   * Analyse complète avec orchestration de tous les services IA
   */
  async analyzeWithAI(
    analysisResult: VintedAnalysisResult,
    options: AIAnalysisOptions = {},
    progressCallback?: (progress: AnalysisProgress) => void
  ): Promise<EnhancedAnalysisResult> {
    const startTime = Date.now();
    this.progressCallback = progressCallback;
    
    try {
      this.reportProgress('initialization', 0, 'Initialisation de l\'analyse IA...');
      
      // Validation de la configuration
      const config = marketAnalysisConfig.getConfig();
      this.validateAnalysisOptions(options, config);
      
      // Validation de la qualité des données
      const dataQuality = this.assessDataQuality(analysisResult);
      if (dataQuality.score < 0.3) {
        throw new AIAnalysisError(
          'Qualité des données insuffisante pour l\'analyse IA',
          'DATA_QUALITY_TOO_LOW' as any,
          { context: dataQuality }
        );
      }

      const servicesUsed: string[] = [];
      let totalTokens = 0;
      let estimatedCost = 0;
      let aiProcessingTime = 0;

      // Étape 1: Enrichissement des données (optionnel)
      let enrichedItems: EnrichedItem[] = [];
      if (options.enableDataEnrichment !== false && analysisResult.rawItems?.length > 0) {
        this.reportProgress('data_enrichment', 20, 'Enrichissement des données avec l\'IA...');
        const enrichmentResult = await this.enrichDataWithAI(analysisResult.rawItems);
        enrichedItems = enrichmentResult.items;
        totalTokens += enrichmentResult.tokensUsed;
        estimatedCost += enrichmentResult.cost;
        aiProcessingTime += enrichmentResult.processingTime;
        servicesUsed.push('data_enrichment');
      }

      // Étape 2: Calcul des métriques avancées
      let advancedMetrics: AdvancedMetrics | undefined;
      if (options.includeAdvancedMetrics !== false) {
        this.reportProgress('metrics_calculation', 40, 'Calcul des métriques avancées...');
        advancedMetrics = this.advancedAnalyticsEngine.calculateAdvancedMetrics(analysisResult);
        servicesUsed.push('advanced_metrics');
      }

      // Étape 3: Génération du rapport IA
      let aiReport: EnhancedReport | undefined;
      if (options.includeReports !== false) {
        this.reportProgress('report_generation', 60, 'Génération du rapport IA...');
        const reportResult = await this.generateAIReport(analysisResult, advancedMetrics);
        aiReport = reportResult.report;
        totalTokens += reportResult.tokensUsed;
        estimatedCost += reportResult.cost;
        aiProcessingTime += reportResult.processingTime;
        servicesUsed.push('ai_report');
      }

      // Étape 4: Génération des insights de marché
      let marketInsights: MarketInsights | undefined;
      if (options.includeInsights !== false) {
        this.reportProgress('insights_generation', 80, 'Génération des insights de marché...');
        const insightsResult = await this.generateMarketInsights(
          analysisResult,
          advancedMetrics,
          options.userPreferences
        );
        marketInsights = insightsResult.insights;
        totalTokens += insightsResult.tokensUsed;
        estimatedCost += insightsResult.cost;
        aiProcessingTime += insightsResult.processingTime;
        servicesUsed.push('market_insights');
      }

      // Étape 5: Finalisation
      this.reportProgress('finalization', 95, 'Finalisation de l\'analyse...');
      
      const totalProcessingTime = Date.now() - startTime;
      const overallConfidence = this.calculateOverallConfidence([
        aiReport?.keyInsights.reduce((sum, insight) => sum + insight.confidence, 0) / (aiReport?.keyInsights.length || 1) || 0,
        marketInsights?.confidence || 0,
        dataQuality.score,
      ]);

      const enhancedResult: EnhancedAnalysisResult = {
        ...analysisResult,
        aiEnhancedItems: enrichedItems.length > 0 ? enrichedItems : undefined,
        advancedMetrics,
        aiReport,
        marketInsights,
        processingMetadata: {
          totalProcessingTime,
          aiProcessingTime,
          servicesUsed,
          confidence: overallConfidence,
          dataQuality,
          costs: {
            totalTokens,
            estimatedCost,
          },
          lastProcessed: new Date().toISOString(),
        },
      };

      this.reportProgress('finalization', 100, 'Analyse terminée avec succès');
      
      return enhancedResult;

    } catch (error) {
      if (error instanceof AIAnalysisError) {
        throw error;
      }
      
      throw new AIAnalysisError(
        `Erreur lors de l'analyse IA: ${error.message}`,
        'ANALYSIS_FAILED' as any,
        { retryable: true, fallbackAvailable: true, cause: error }
      );
    }
  }

  /**
   * Enrichit les données brutes avec l'IA
   */
  private async enrichDataWithAI(rawItems: any[]): Promise<{
    items: EnrichedItem[];
    tokensUsed: number;
    cost: number;
    processingTime: number;
  }> {
    const startTime = Date.now();
    let totalTokens = 0;
    let totalCost = 0;
    const enrichedItems: EnrichedItem[] = [];

    // Traitement par batch pour optimiser les performances
    const batchSize = 10;
    for (let i = 0; i < rawItems.length; i += batchSize) {
      const batch = rawItems.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (item) => {
        try {
          // Normalisation du titre
          const normalizedData = await normalizeTitle(item.title || '');
          
          // Détection d'anomalies
          const anomalyResult = await isAnomaly('produit de marché', item.title || '');
          
          const enrichedItem: EnrichedItem = {
            originalItem: item,
            normalizedData,
            relevanceScore: anomalyResult.is_relevant ? 0.8 : 0.3,
            isRelevant: anomalyResult.is_relevant,
            anomalies: anomalyResult.is_relevant ? [] : [anomalyResult.reason],
            confidence: 0.7, // Valeur par défaut
          };

          // Estimation des tokens utilisés (approximation)
          totalTokens += Math.ceil((item.title?.length || 0) / 4);
          totalCost += totalTokens * 0.00003; // Estimation du coût

          return enrichedItem;
        } catch (error) {
          // En cas d'erreur, retourner un item avec données minimales
          return {
            originalItem: item,
            normalizedData: { brand: null, model: null, year: null, attributes: [] },
            relevanceScore: 0.5,
            isRelevant: true,
            anomalies: [`Erreur d'enrichissement: ${error.message}`],
            confidence: 0.3,
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      enrichedItems.push(...batchResults);
    }

    return {
      items: enrichedItems,
      tokensUsed: totalTokens,
      cost: totalCost,
      processingTime: Date.now() - startTime,
    };
  }

  /**
   * Génère un rapport IA avec tracking des métriques
   */
  private async generateAIReport(
    analysisResult: VintedAnalysisResult,
    advancedMetrics?: AdvancedMetrics
  ): Promise<{
    report: EnhancedReport;
    tokensUsed: number;
    cost: number;
    processingTime: number;
  }> {
    const startTime = Date.now();
    
    try {
      const report = await generateEnhancedReport(analysisResult, advancedMetrics);
      
      // Estimation des métriques (en réalité, ces valeurs viendraient de l'API)
      const tokensUsed = 800;
      const cost = tokensUsed * 0.00003;
      
      return {
        report,
        tokensUsed,
        cost,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      throw new AIAnalysisError(
        `Erreur lors de la génération du rapport: ${error.message}`,
        'REPORT_GENERATION_FAILED' as any,
        { retryable: true, cause: error }
      );
    }
  }

  /**
   * Génère des insights de marché avec tracking des métriques
   */
  private async generateMarketInsights(
    analysisResult: VintedAnalysisResult,
    advancedMetrics?: AdvancedMetrics,
    userPreferences?: UserPreferences
  ): Promise<{
    insights: MarketInsights;
    tokensUsed: number;
    cost: number;
    processingTime: number;
  }> {
    const startTime = Date.now();
    
    try {
      const insights = await marketInsightsService.generateMarketInsights(
        analysisResult,
        advancedMetrics,
        userPreferences
      );
      
      // Estimation des métriques
      const tokensUsed = 1200;
      const cost = tokensUsed * 0.00003;
      
      return {
        insights,
        tokensUsed,
        cost,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      throw new AIAnalysisError(
        `Erreur lors de la génération des insights: ${error.message}`,
        'INSIGHTS_GENERATION_FAILED' as any,
        { retryable: true, cause: error }
      );
    }
  }

  /**
   * Évalue la qualité des données
   */
  private assessDataQuality(analysisResult: VintedAnalysisResult): { score: number; issues: string[] } {
    const issues: string[] = [];
    let score = 1.0;

    // Vérifier le volume de données
    const itemCount = analysisResult.rawItems?.length || analysisResult.salesVolume || 0;
    if (itemCount < 5) {
      issues.push('Volume de données très faible');
      score -= 0.4;
    } else if (itemCount < 15) {
      issues.push('Volume de données limité');
      score -= 0.2;
    }

    // Vérifier la complétude des données
    if (!analysisResult.avgPrice || analysisResult.avgPrice <= 0) {
      issues.push('Prix moyen manquant ou invalide');
      score -= 0.3;
    }

    if (!analysisResult.priceRange || analysisResult.priceRange.min >= analysisResult.priceRange.max) {
      issues.push('Gamme de prix invalide');
      score -= 0.2;
    }

    // Vérifier la fraîcheur des données
    const analysisDate = new Date(analysisResult.analysisDate);
    const daysSinceAnalysis = (Date.now() - analysisDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceAnalysis > 7) {
      issues.push('Données d\'analyse anciennes');
      score -= 0.1;
    }

    return {
      score: Math.max(0, score),
      issues,
    };
  }

  /**
   * Valide les options d'analyse
   */
  private validateAnalysisOptions(options: AIAnalysisOptions, config: any): void {
    if (options.includeInsights && !config.insights.enabled) {
      throw new AIAnalysisError(
        'Les insights sont demandés mais désactivés dans la configuration',
        'INVALID_CONFIGURATION' as any
      );
    }

    if (options.includeReports && !config.recommendations.enabled) {
      throw new AIAnalysisError(
        'Les rapports sont demandés mais désactivés dans la configuration',
        'INVALID_CONFIGURATION' as any
      );
    }
  }

  /**
   * Calcule la confiance globale
   */
  private calculateOverallConfidence(confidenceScores: number[]): number {
    const validScores = confidenceScores.filter(score => score > 0);
    if (validScores.length === 0) return 0.5;
    
    const average = validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
    
    // Ajuster selon le nombre de services utilisés (plus de services = plus de confiance)
    const serviceBonus = Math.min(0.1, validScores.length * 0.02);
    
    return Math.min(1, average + serviceBonus);
  }

  /**
   * Rapporte le progrès de l'analyse
   */
  private reportProgress(
    stage: AnalysisProgress['stage'],
    progress: number,
    message: string,
    estimatedTimeRemaining?: number
  ): void {
    if (this.progressCallback) {
      this.progressCallback({
        stage,
        progress,
        message,
        estimatedTimeRemaining,
      });
    }
  }

  /**
   * Analyse rapide sans tous les services (pour les cas où la performance est critique)
   */
  async quickAnalyze(analysisResult: VintedAnalysisResult): Promise<EnhancedAnalysisResult> {
    return this.analyzeWithAI(analysisResult, {
      includeAdvancedMetrics: true,
      includeReports: false,
      includeInsights: false,
      enableDataEnrichment: false,
    });
  }

  /**
   * Analyse complète avec tous les services
   */
  async fullAnalyze(
    analysisResult: VintedAnalysisResult,
    userPreferences?: UserPreferences,
    progressCallback?: (progress: AnalysisProgress) => void
  ): Promise<EnhancedAnalysisResult> {
    return this.analyzeWithAI(analysisResult, {
      userPreferences,
      includeAdvancedMetrics: true,
      includeReports: true,
      includeInsights: true,
      enableDataEnrichment: true,
    }, progressCallback);
  }
}

// Instance globale
export const aiAnalysisEngine = AIAnalysisEngine.getInstance();