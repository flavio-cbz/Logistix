import { z } from "zod";
import { runMarketAnalysisInference } from "./inference-client";
import { VintedAnalysisResult, MarketAnalysisHistoryItem } from "@/types/vinted-market-analysis";
import { AdvancedMetrics } from "@/lib/analytics/advanced-analytics-engine";
import { marketAnalysisConfig } from "./market-analysis-config";
import { AIAnalysisError } from "./ai-errors";

// Schémas pour les prédictions de tendances
const TrendDirectionSchema = z.enum(['up', 'down', 'stable']);
const TimeframeSchema = z.enum(['1week', '1month', '3months']);
const ConfidenceSchema = z.number().min(0).max(1);

const TrendPredictionSchema = z.object({
  metric: z.enum(['price', 'volume', 'demand']),
  direction: TrendDirectionSchema,
  magnitude: z.number(), // Pourcentage de changement attendu
  confidence: ConfidenceSchema,
  factors: z.array(z.string()), // Facteurs influençant cette prédiction
  timeframe: TimeframeSchema,
});

const ScenarioSchema = z.object({
  name: z.string(),
  probability: z.number().min(0).max(1),
  description: z.string(),
  impact: z.string(),
  conditions: z.array(z.string()), // Conditions pour que ce scénario se réalise
  predictions: z.array(TrendPredictionSchema),
});

const TrendAnalysisSchema = z.object({
  timeframe: TimeframeSchema,
  predictions: z.array(TrendPredictionSchema),
  scenarios: z.array(ScenarioSchema),
  historicalContext: z.object({
    dataPoints: z.number(),
    timeSpan: z.string(),
    reliability: ConfidenceSchema,
  }),
  marketConditions: z.object({
    volatility: z.enum(['low', 'medium', 'high']),
    trend: z.enum(['bullish', 'bearish', 'neutral']),
    seasonality: z.object({
      detected: z.boolean(),
      pattern: z.string().optional(),
      strength: ConfidenceSchema.optional(),
    }),
  }),
  confidence: ConfidenceSchema,
  lastUpdated: z.string(),
});

// Types exportés
export type TrendDirection = z.infer<typeof TrendDirectionSchema>;
export type TrendPrediction = z.infer<typeof TrendPredictionSchema>;
export type MarketScenario = z.infer<typeof ScenarioSchema>;
export type TrendAnalysis = z.infer<typeof TrendAnalysisSchema>;

// Template de prompt pour l'analyse des tendances
const TREND_PREDICTION_PROMPT_TEMPLATE = `
Tu es un expert en analyse prédictive et en tendances de marché. Analyse les données historiques suivantes et génère des prédictions de tendances précises.

Données actuelles:
{current_data}

Données historiques:
{historical_data}

Métriques avancées:
{advanced_metrics}

Paramètres d'analyse:
- Horizon temporel: {timeframe}
- Niveau de confiance minimum: {min_confidence}
- Inclure les scénarios: {include_scenarios}

Analyse les patterns suivants:
1. Tendances de prix (évolution, volatilité, cycles)
2. Tendances de volume (demande, saisonnalité)
3. Facteurs externes (concurrence, économie, saisons)
4. Corrélations entre métriques

Génère des prédictions pour les horizons temporels demandés et crée des scénarios alternatifs basés sur différentes conditions de marché.

Réponds uniquement avec un objet JSON valide au format suivant:
{
  "timeframe": "1week|1month|3months",
  "predictions": [
    {
      "metric": "price|volume|demand",
      "direction": "up|down|stable",
      "magnitude": 15.5,
      "confidence": 0.85,
      "factors": ["Facteur 1", "Facteur 2"],
      "timeframe": "1week|1month|3months"
    }
  ],
  "scenarios": [
    {
      "name": "Scénario optimiste",
      "probability": 0.3,
      "description": "Description du scénario",
      "impact": "Impact attendu",
      "conditions": ["Condition 1", "Condition 2"],
      "predictions": [...]
    }
  ],
  "historicalContext": {
    "dataPoints": 50,
    "timeSpan": "6 mois",
    "reliability": 0.8
  },
  "marketConditions": {
    "volatility": "low|medium|high",
    "trend": "bullish|bearish|neutral",
    "seasonality": {
      "detected": true,
      "pattern": "Pattern saisonnier détecté",
      "strength": 0.7
    }
  },
  "confidence": 0.75,
  "lastUpdated": "{timestamp}"
}
`;

// Interface pour les paramètres de prédiction
export interface PredictionParameters {
  timeframes: Array<'1week' | '1month' | '3months'>;
  includeScenarios: boolean;
  minConfidence: number;
  focusMetrics: Array<'price' | 'volume' | 'demand'>;
  scenarioTypes: Array<'optimistic' | 'pessimistic' | 'realistic'>;
}

// Service principal de prédiction de tendances
export class TrendPredictorService {
  private static instance: TrendPredictorService;

  public static getInstance(): TrendPredictorService {
    if (!TrendPredictorService.instance) {
      TrendPredictorService.instance = new TrendPredictorService();
    }
    return TrendPredictorService.instance;
  }

  /**
   * Génère des prédictions de tendances complètes
   */
  async predictTrends(
    currentData: VintedAnalysisResult,
    historicalData: MarketAnalysisHistoryItem[],
    advancedMetrics?: AdvancedMetrics,
    parameters?: Partial<PredictionParameters>
  ): Promise<TrendAnalysis> {
    const config = marketAnalysisConfig.getConfig();
    
    // Vérifier si les prédictions sont activées
    if (!config.predictions.enabled) {
      throw new AIAnalysisError(
        'Les prédictions de tendances sont désactivées',
        'FEATURE_DISABLED' as any,
        { retryable: false, fallbackAvailable: true }
      );
    }

    // Valider la qualité des données historiques
    const dataQuality = this.validateHistoricalData(historicalData);
    if (!dataQuality.valid) {
      throw new AIAnalysisError(
        `Données historiques insuffisantes: ${dataQuality.issues.join(', ')}`,
        'INSUFFICIENT_HISTORICAL_DATA' as any,
        { retryable: false, fallbackAvailable: true, context: dataQuality }
      );
    }

    const params = this.getDefaultParameters(parameters);
    
    try {
      const prompt = this.buildPrompt(currentData, historicalData, advancedMetrics, params);
      
      const response = await runMarketAnalysisInference({
        prompt,
        analysisType: 'trends',
        temperature: 0.1, // Très conservateur pour les prédictions
        max_tokens: 1500,
        context: {
          marketData: currentData,
          historicalData,
          userPreferences: advancedMetrics,
        },
      });

      const trendAnalysis = this.parseTrendResponse(response.choices[0].text);
      
      // Filtrer selon la configuration
      return this.filterPredictionsByConfig(trendAnalysis, config);
      
    } catch (error) {
      if (error instanceof AIAnalysisError) {
        throw error;
      }
      
      throw new AIAnalysisError(
        `Erreur lors de la prédiction des tendances: ${error.message}`,
        'INFERENCE_FAILED' as any,
        { retryable: true, fallbackAvailable: true, cause: error }
      );
    }
  }

  /**
   * Génère des prédictions pour un horizon temporel spécifique
   */
  async predictForTimeframe(
    currentData: VintedAnalysisResult,
    historicalData: MarketAnalysisHistoryItem[],
    timeframe: '1week' | '1month' | '3months',
    advancedMetrics?: AdvancedMetrics
  ): Promise<TrendPrediction[]> {
    const fullAnalysis = await this.predictTrends(
      currentData,
      historicalData,
      advancedMetrics,
      { timeframes: [timeframe], includeScenarios: false }
    );

    return fullAnalysis.predictions.filter(p => p.timeframe === timeframe);
  }

  /**
   * Génère des scénarios de marché alternatifs
   */
  async generateMarketScenarios(
    currentData: VintedAnalysisResult,
    historicalData: MarketAnalysisHistoryItem[],
    advancedMetrics?: AdvancedMetrics
  ): Promise<MarketScenario[]> {
    const scenarioPrompt = `
    Basé sur les données de marché suivantes, génère 3 scénarios alternatifs (optimiste, réaliste, pessimiste) 
    pour l'évolution du marché dans les 3 prochains mois.
    
    Données actuelles: ${JSON.stringify({
      avgPrice: currentData.avgPrice,
      salesVolume: currentData.salesVolume,
      priceRange: currentData.priceRange,
    })}
    
    Tendances historiques: ${this.summarizeHistoricalTrends(historicalData)}
    
    Réponds avec un tableau JSON de scénarios.
    `;

    try {
      const response = await runMarketAnalysisInference({
        prompt: scenarioPrompt,
        analysisType: 'trends',
        temperature: 0.2,
        max_tokens: 1000,
      });

      const scenarios = JSON.parse(response.choices[0].text);
      return scenarios.map((scenario: any) => ScenarioSchema.parse(scenario));
      
    } catch (error) {
      // Fallback vers scénarios basiques
      return this.generateBasicScenarios(currentData, historicalData);
    }
  }

  /**
   * Analyse la volatilité du marché
   */
  async analyzeMarketVolatility(
    historicalData: MarketAnalysisHistoryItem[]
  ): Promise<{
    level: 'low' | 'medium' | 'high';
    trend: 'increasing' | 'decreasing' | 'stable';
    factors: string[];
    confidence: number;
  }> {
    if (historicalData.length < 5) {
      return {
        level: 'medium',
        trend: 'stable',
        factors: ['Données insuffisantes pour l\'analyse'],
        confidence: 0.3,
      };
    }

    // Calculer la volatilité des prix
    const prices = historicalData.map(item => item.avgPrice);
    const priceChanges = prices.slice(1).map((price, i) => 
      Math.abs((price - prices[i]) / prices[i])
    );
    
    const avgVolatility = priceChanges.reduce((sum, change) => sum + change, 0) / priceChanges.length;
    
    // Calculer la volatilité des volumes
    const volumes = historicalData.map(item => item.salesVolume);
    const volumeChanges = volumes.slice(1).map((volume, i) => 
      Math.abs((volume - volumes[i]) / volumes[i])
    );
    
    const avgVolumeVolatility = volumeChanges.reduce((sum, change) => sum + change, 0) / volumeChanges.length;
    
    // Déterminer le niveau de volatilité
    const combinedVolatility = (avgVolatility + avgVolumeVolatility) / 2;
    let level: 'low' | 'medium' | 'high';
    
    if (combinedVolatility < 0.1) level = 'low';
    else if (combinedVolatility < 0.25) level = 'medium';
    else level = 'high';
    
    // Analyser la tendance de volatilité
    const recentVolatility = priceChanges.slice(-3).reduce((sum, change) => sum + change, 0) / 3;
    const earlierVolatility = priceChanges.slice(0, 3).reduce((sum, change) => sum + change, 0) / 3;
    
    let trend: 'increasing' | 'decreasing' | 'stable';
    if (recentVolatility > earlierVolatility * 1.2) trend = 'increasing';
    else if (recentVolatility < earlierVolatility * 0.8) trend = 'decreasing';
    else trend = 'stable';

    return {
      level,
      trend,
      factors: this.identifyVolatilityFactors(historicalData),
      confidence: Math.min(0.9, historicalData.length / 20), // Plus de données = plus de confiance
    };
  }

  /**
   * Construit le prompt pour l'analyse des tendances
   */
  private buildPrompt(
    currentData: VintedAnalysisResult,
    historicalData: MarketAnalysisHistoryItem[],
    advancedMetrics?: AdvancedMetrics,
    parameters?: PredictionParameters
  ): string {
    const currentDataSummary = {
      avgPrice: currentData.avgPrice,
      salesVolume: currentData.salesVolume,
      priceRange: currentData.priceRange,
      analysisDate: currentData.analysisDate,
      itemCount: currentData.rawItems?.length || 0,
    };

    const historicalSummary = historicalData.map(item => ({
      date: item.createdAt,
      avgPrice: item.avgPrice,
      salesVolume: item.salesVolume,
    }));

    return TREND_PREDICTION_PROMPT_TEMPLATE
      .replace('{current_data}', JSON.stringify(currentDataSummary, null, 2))
      .replace('{historical_data}', JSON.stringify(historicalSummary, null, 2))
      .replace('{advanced_metrics}', advancedMetrics ? JSON.stringify(advancedMetrics, null, 2) : 'Non disponibles')
      .replace('{timeframe}', parameters?.timeframes.join(', ') || '1month')
      .replace('{min_confidence}', (parameters?.minConfidence || 0.6).toString())
      .replace('{include_scenarios}', (parameters?.includeScenarios || true).toString())
      .replace('{timestamp}', new Date().toISOString());
  }

  /**
   * Parse la réponse de l'IA et valide le format
   */
  private parseTrendResponse(responseText: string): TrendAnalysis {
    const jsonString = responseText.match(/{[\s\S]*}/)?.[0];
    if (!jsonString) {
      throw new AIAnalysisError(
        'Réponse IA invalide: pas de JSON trouvé',
        'INVALID_RESPONSE' as any
      );
    }

    try {
      const parsed = JSON.parse(jsonString);
      return TrendAnalysisSchema.parse(parsed);
    } catch (error) {
      throw new AIAnalysisError(
        `Erreur de parsing des prédictions: ${error.message}`,
        'INVALID_RESPONSE' as any,
        { cause: error }
      );
    }
  }

  /**
   * Valide la qualité des données historiques
   */
  private validateHistoricalData(historicalData: MarketAnalysisHistoryItem[]): {
    valid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];
    
    if (historicalData.length < 3) {
      issues.push(`Pas assez de données historiques: ${historicalData.length} < 3`);
    }

    // Vérifier la continuité temporelle
    const sortedData = [...historicalData].sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    const now = new Date();
    const oldestData = new Date(sortedData[0]?.createdAt || now);
    const daysDiff = (now.getTime() - oldestData.getTime()) / (1000 * 60 * 60 * 24);

    if (daysDiff < 7) {
      issues.push('Période historique trop courte (< 7 jours)');
    }

    // Vérifier la cohérence des données
    const invalidItems = historicalData.filter(item => 
      !item.avgPrice || item.avgPrice <= 0 || 
      !item.salesVolume || item.salesVolume < 0
    );

    if (invalidItems.length > 0) {
      issues.push(`${invalidItems.length} éléments avec des données invalides`);
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * Filtre les prédictions selon la configuration
   */
  private filterPredictionsByConfig(analysis: TrendAnalysis, config: any): TrendAnalysis {
    return {
      ...analysis,
      predictions: analysis.predictions
        .filter(pred => pred.confidence >= config.predictions.minConfidence)
        .filter(pred => config.predictions.timeframes.includes(pred.timeframe)),
      scenarios: config.predictions.includeScenarios 
        ? analysis.scenarios 
        : [],
    };
  }

  /**
   * Génère des scénarios basiques en fallback
   */
  private generateBasicScenarios(
    currentData: VintedAnalysisResult,
    historicalData: MarketAnalysisHistoryItem[]
  ): MarketScenario[] {
    const avgPrice = currentData.avgPrice;
    const avgVolume = currentData.salesVolume;
    
    return [
      {
        name: 'Scénario optimiste',
        probability: 0.25,
        description: 'Croissance soutenue du marché',
        impact: 'Augmentation des prix et volumes',
        conditions: ['Demande forte', 'Concurrence stable'],
        predictions: [
          {
            metric: 'price',
            direction: 'up',
            magnitude: 15,
            confidence: 0.7,
            factors: ['Demande croissante'],
            timeframe: '1month',
          },
        ],
      },
      {
        name: 'Scénario réaliste',
        probability: 0.5,
        description: 'Évolution stable du marché',
        impact: 'Maintien des niveaux actuels',
        conditions: ['Conditions normales'],
        predictions: [
          {
            metric: 'price',
            direction: 'stable',
            magnitude: 2,
            confidence: 0.8,
            factors: ['Équilibre offre/demande'],
            timeframe: '1month',
          },
        ],
      },
      {
        name: 'Scénario pessimiste',
        probability: 0.25,
        description: 'Ralentissement du marché',
        impact: 'Baisse des prix et volumes',
        conditions: ['Concurrence accrue', 'Demande faible'],
        predictions: [
          {
            metric: 'price',
            direction: 'down',
            magnitude: -10,
            confidence: 0.6,
            factors: ['Pression concurrentielle'],
            timeframe: '1month',
          },
        ],
      },
    ];
  }

  /**
   * Résume les tendances historiques
   */
  private summarizeHistoricalTrends(historicalData: MarketAnalysisHistoryItem[]): string {
    if (historicalData.length < 2) {
      return 'Données historiques insuffisantes';
    }

    const sortedData = [...historicalData].sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    const firstPrice = sortedData[0].avgPrice;
    const lastPrice = sortedData[sortedData.length - 1].avgPrice;
    const priceChange = ((lastPrice - firstPrice) / firstPrice) * 100;

    const firstVolume = sortedData[0].salesVolume;
    const lastVolume = sortedData[sortedData.length - 1].salesVolume;
    const volumeChange = ((lastVolume - firstVolume) / firstVolume) * 100;

    return `Prix: ${priceChange > 0 ? '+' : ''}${priceChange.toFixed(1)}%, Volume: ${volumeChange > 0 ? '+' : ''}${volumeChange.toFixed(1)}%`;
  }

  /**
   * Identifie les facteurs de volatilité
   */
  private identifyVolatilityFactors(historicalData: MarketAnalysisHistoryItem[]): string[] {
    const factors: string[] = [];
    
    // Analyser la fréquence des changements
    const prices = historicalData.map(item => item.avgPrice);
    const significantChanges = prices.slice(1).filter((price, i) => 
      Math.abs((price - prices[i]) / prices[i]) > 0.1
    );

    if (significantChanges.length > historicalData.length * 0.3) {
      factors.push('Fluctuations de prix fréquentes');
    }

    // Analyser les volumes
    const volumes = historicalData.map(item => item.salesVolume);
    const volumeVariation = Math.max(...volumes) / Math.min(...volumes);
    
    if (volumeVariation > 2) {
      factors.push('Variations importantes de volume');
    }

    // Facteurs temporels
    const timeSpan = Math.abs(new Date(historicalData[historicalData.length - 1].createdAt).getTime() - 
                     new Date(historicalData[0].createdAt).getTime());
    const days = timeSpan / (1000 * 60 * 60 * 24);
    
    if (days < 30) {
      factors.push('Période d\'observation courte');
    }

    if (factors.length === 0) {
      factors.push('Marché relativement stable');
    }

    return factors;
  }

  /**
   * Obtient les paramètres par défaut
   */
  private getDefaultParameters(parameters?: Partial<PredictionParameters>): PredictionParameters {
    const config = marketAnalysisConfig.getConfig();
    
    return {
      timeframes: parameters?.timeframes || config.predictions.timeframes,
      includeScenarios: parameters?.includeScenarios ?? config.predictions.includeScenarios,
      minConfidence: parameters?.minConfidence || config.predictions.minConfidence,
      focusMetrics: parameters?.focusMetrics || ['price', 'volume'],
      scenarioTypes: parameters?.scenarioTypes || ['optimistic', 'realistic', 'pessimistic'],
    };
  }
}

// Instance globale
export const trendPredictorService = TrendPredictorService.getInstance();