import { z } from "zod";
import { runMarketAnalysisInference } from "./inference-client";
import type { VintedAnalysisResult, MarketAnalysisHistoryItem } from "@/types/vinted-market-analysis";
import type { AdvancedMetrics } from "@/lib/analytics/advanced-analytics-engine";
import { marketAnalysisConfig } from "./market-analysis-config";
import { AIAnalysisError } from "./ai-errors";
import { getErrorMessage, toError } from '@/lib/utils/error-utils';

/**
 * Schémas stricts de validation Zod pour sécuriser et typer les réponses IA
 */
const TrendDirectionSchema = z.enum(['up', 'down', 'stable']);
const TimeframeSchema = z.enum(['1week', '1month', '3months']);
const ConfidenceSchema = z.number().min(0).max(1);

const TrendPredictionSchema = z.object({
  metric: z.enum(['price', 'volume', 'demand']),
  direction: TrendDirectionSchema,
  magnitude: z.number(), // Pourcentage de changement attendu (peut être négatif pour une baisse)
  confidence: ConfidenceSchema,
  factors: z.array(z.string()),
  timeframe: TimeframeSchema,
});

const ScenarioSchema = z.object({
  name: z.string(),
  probability: z.number().min(0).max(1),
  description: z.string(),
  impact: z.string(),
  conditions: z.array(z.string()),
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
export type Timeframe = z.infer<typeof TimeframeSchema>;

/**
 * Constantes et utilitaires internes
 */
const EPSILON = 1e-9;
const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));
const isFiniteNumber = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
const average = (values: number[]): number => {
  const valid = values.filter(isFiniteNumber);
  return valid.length ? valid.reduce((s, n) => s + n, 0) / valid.length : 0;
};
const safeRelativeChange = (current: number, previous: number): number => {
  if (!isFiniteNumber(current) || !isFiniteNumber(previous) || Math.abs(previous) < EPSILON) return 0;
  return (current - previous) / previous;
};
const isValidDateString = (s: string): boolean => !Number.isNaN(Date.parse(s));

/**
 * Template de prompt pour l'analyse des tendances
 */
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

/**
 * Paramètres de prédiction
 */
export interface PredictionParameters {
  timeframes: Array<'1week' | '1month' | '3months'>;
  includeScenarios: boolean;
  minConfidence: number;
  focusMetrics: Array<'price' | 'volume' | 'demand'>;
  scenarioTypes: Array<'optimistic' | 'pessimistic' | 'realistic'>;
}

/**
 * Service principal de prédiction de tendances
 */
export class TrendPredictorService {
  private static instance: TrendPredictorService | undefined;
  private constructor() {}

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

    if (!config.predictions?.enabled) {
      throw new AIAnalysisError(
        'Les prédictions de tendances sont désactivées',
        'FEATURE_DISABLED' as any,
        { retryable: false, fallbackAvailable: true }
      );
    }

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
          marketData: {
            avgPrice: currentData.avgPrice,
            salesVolume: currentData.salesVolume,
            priceRange: currentData.priceRange,
          },
          historicalData: historicalData.map(h => ({ createdAt: h.createdAt, avgPrice: h.avgPrice, salesVolume: h.salesVolume })),
          advancedMetrics,
        },
      });

      const choiceText = Array.isArray((response as any)?.choices) && (response as any).choices[0]!?.text;
      if (!choiceText || typeof choiceText !== 'string') {
        throw new AIAnalysisError(
          'Réponse IA invalide: format choices/text absent',
          'INVALID_RESPONSE' as any,
          { retryable: true, fallbackAvailable: true, context: response }
        );
      }

      const trendAnalysis = this.parseTrendResponse(choiceText);
      return this.filterPredictionsByConfig(trendAnalysis, config);
    } catch (error) {
      if (error instanceof AIAnalysisError) {
        throw error;
      }
      throw new AIAnalysisError(
        `Erreur lors de la prédiction des tendances: ${getErrorMessage(error)}`,
        'INFERENCE_FAILED' as any,
        { retryable: true, fallbackAvailable: true, cause: toError(error) }
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
        context: {
          marketData: { avgPrice: currentData.avgPrice, salesVolume: currentData.salesVolume },
          historicalData: historicalData.map(h => ({ createdAt: h.createdAt, avgPrice: h.avgPrice, salesVolume: h.salesVolume })),
          advancedMetrics,
        }
      });

      const text = Array.isArray((response as any)?.choices) && (response as any).choices[0]!?.text || '[]';
      const sanitized = String(text).replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(sanitized);

      if (!Array.isArray(parsed)) throw new Error('Le JSON retourné n\'est pas un tableau');

      const scenarios = parsed.map((scenario: unknown) => ScenarioSchema.parse(scenario));
      scenarios.forEach(s => (s as any).probability = clamp((s as any).probability, 0, 1));
      return scenarios;
    } catch {
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

    const priceChanges = historicalData.slice(1).map((_item, i) => {
      const curr = Number(_item.avgPrice);
      const prev = Number(historicalData[i]!?.avgPrice);
      return Math.abs(safeRelativeChange(curr, prev));
    });
    const avgVolatility = average(priceChanges);

    const volumeChanges = historicalData.slice(1).map((_item, i) => {
      const curr = Number(_item.salesVolume);
      const prev = Number(historicalData[i]!?.salesVolume);
      return Math.abs(safeRelativeChange(curr, prev));
    });
    const avgVolumeVolatility = average(volumeChanges);

    const combinedVolatility = (avgVolatility + avgVolumeVolatility) / 2;
    let level: 'low' | 'medium' | 'high';
    if (combinedVolatility < 0.1) level = 'low';
    else if (combinedVolatility < 0.25) level = 'medium';
    else level = 'high';

    const lastN = priceChanges.slice(-3);
    const firstN = priceChanges.slice(0, Math.min(3, priceChanges.length));
    const recentVolatility = average(lastN);
    const earlierVolatility = average(firstN);

    let trend: 'increasing' | 'decreasing' | 'stable';
    if (recentVolatility > earlierVolatility * 1.2) trend = 'increasing';
    else if (recentVolatility < earlierVolatility * 0.8) trend = 'decreasing';
    else trend = 'stable';

    return {
      level,
      trend,
      factors: this.identifyVolatilityFactors(historicalData),
      confidence: Math.min(0.9, Math.max(0.1, historicalData.length / 20)),
    };
  }

  /**
   * Construit le prompt pour l'analyse des tendances
   */
  private buildPrompt(
    currentData: VintedAnalysisResult,
    historicalData: MarketAnalysisHistoryItem[],
    advancedMetrics: AdvancedMetrics | undefined,
    parameters: PredictionParameters
  ): string {
    const currentDataSummary = {
      avgPrice: currentData.avgPrice,
      salesVolume: currentData.salesVolume,
      priceRange: currentData.priceRange,
      analysisDate: currentData.analysisDate,
      itemCount: Array.isArray(currentData.rawItems) ? currentData.rawItems.length : 0,
    };

    const historicalSummary = historicalData.map(_item => ({
      date: _item.createdAt,
      avgPrice: _item.avgPrice,
      salesVolume: _item.salesVolume,
    }));

    const timeframes = Array.isArray(parameters.timeframes) && parameters.timeframes.length
      ? parameters.timeframes.join(', ')
      : '1month';
    const minConf = clamp(parameters.minConfidence, 0, 1);

    return TREND_PREDICTION_PROMPT_TEMPLATE
      .replace('{current_data}', JSON.stringify(currentDataSummary, null, 2))
      .replace('{historical_data}', JSON.stringify(historicalSummary, null, 2))
      .replace('{advanced_metrics}', advancedMetrics ? JSON.stringify(advancedMetrics, null, 2) : 'Non disponibles')
      .replace('{timeframe}', timeframes)
      .replace('{min_confidence}', minConf.toString())
      .replace('{include_scenarios}', String(!!parameters.includeScenarios))
      .replace('{timestamp}', new Date().toISOString());
  }

  /**
   * Parse la réponse de l'IA et valide le format via Zod
   */
  private parseTrendResponse(responseText: string): TrendAnalysis {
    const stripped = responseText.replace(/```json|```/g, '').trim();
    let jsonString = stripped;
    const firstBrace = stripped.indexOf('{');
    const lastBrace = stripped.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonString = stripped.slice(firstBrace, lastBrace + 1);
    }
    if (!jsonString || jsonString[0]! !== '{') {
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
        `Erreur de parsing des prédictions: ${getErrorMessage(error)}`,
        'INVALID_RESPONSE' as any,
        { cause: toError(error) }
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

    if (!Array.isArray(historicalData) || historicalData.length < 3) {
      issues.push(`Pas assez de données historiques: ${Array.isArray(historicalData) ? historicalData.length : 0} < 3`);
    }

    const sortedData = [...(historicalData || [])].sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    if (sortedData.some(d => !d.createdAt || !isValidDateString(d.createdAt))) {
      issues.push('Dates historiques invalides ou manquantes');
    }

    if (sortedData.length > 0) {
      const now = new Date();
      const oldestData = new Date(sortedData[0]!?.createdAt || now);
      const daysDiff = (now.getTime() - oldestData.getTime()) / (1000 * 60 * 60 * 24);

      if (daysDiff < 7) {
        issues.push('Période historique trop courte (< 7 jours)');
      }
    }

    const invalidItems = (historicalData || []).filter(_item =>
      !isFiniteNumber(_item.avgPrice) || _item.avgPrice <= 0 ||
      !isFiniteNumber(_item.salesVolume) || _item.salesVolume < 0
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
   * Filtre les prédictions selon la configuration active
   */
  private filterPredictionsByConfig(
    analysis: TrendAnalysis,
    config: Readonly<ReturnType<typeof marketAnalysisConfig.getConfig>>
  ): TrendAnalysis {
    const allowedTimeframes = new Set(config.predictions?.timeframes || ['1month']);
    const minConf = clamp(config.predictions?.minConfidence ?? 0.6, 0, 1);
    const includeScenarios = !!config.predictions?.includeScenarios;

    return {
      ...analysis,
      predictions: analysis.predictions
        .filter(pred => pred.confidence >= minConf)
        .filter(pred => allowedTimeframes.has(pred.timeframe)),
      scenarios: includeScenarios ? analysis.scenarios : [],
    };
  }

  /**
   * Génère des scénarios basiques en fallback
   */
  private generateBasicScenarios(
    _currentData: VintedAnalysisResult,
    _historicalData: MarketAnalysisHistoryItem[]
  ): MarketScenario[] {
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
   * Résume les tendances historiques (prix/volume)
   */
  private summarizeHistoricalTrends(historicalData: MarketAnalysisHistoryItem[]): string {
    if (!Array.isArray(historicalData) || historicalData.length < 2) {
      return 'Données historiques insuffisantes';
    }
    const sortedData = [...historicalData].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const first = sortedData[0]!;
    const last = sortedData[sortedData.length - 1]!;
    if (!first || !last) {
      return 'Données historiques insuffisantes';
    }
    const priceChangePct = safeRelativeChange(Number(last.avgPrice), Number(first.avgPrice)) * 100;
    const volumeChangePct = safeRelativeChange(Number(last.salesVolume), Number(first.salesVolume)) * 100;
    const formatPct = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
    return `Prix: ${formatPct(priceChangePct)}, Volume: ${formatPct(volumeChangePct)}`;
  }

  /**
   * Identifie les facteurs de volatilité
   */
  private identifyVolatilityFactors(historicalData: MarketAnalysisHistoryItem[]): string[] {
    const factors: string[] = [];
    if (!Array.isArray(historicalData) || historicalData.length < 2) {
      return ['Données insuffisantes'];
    }
    const priceChanges = historicalData.slice(1).map((_item, i) => {
      const curr = Number(_item.avgPrice);
      const prev = Number(historicalData[i]!!.avgPrice);
      return Math.abs(safeRelativeChange(curr, prev));
    });
    if (priceChanges.filter(c => isFiniteNumber(c) && c > 0.1).length > historicalData.length * 0.3) {
      factors.push('Fluctuations de prix fréquentes');
    }
    const volumes = historicalData.map(_item => Number(_item.salesVolume)).filter(isFiniteNumber);
    if (volumes.length >= 2) {
      const minVol = Math.min(...volumes);
      const maxVol = Math.max(...volumes);
      if (minVol <= EPSILON) {
        factors.push('Volumes très faibles ou nuls');
      } else {
        const volumeVariation = maxVol / Math.max(minVol, EPSILON);
        if (volumeVariation > 2) {
          factors.push('Variations importantes de volume');
        }
      }
    }
    const startMs = new Date(historicalData[0]!!.createdAt).getTime();
    const endMs = new Date(historicalData[historicalData.length - 1]!!.createdAt).getTime();
    const days = Math.abs(endMs - startMs) / (1000 * 60 * 60 * 24);
    if (days < 30) {
      factors.push('Période d\'observation courte');
    }
    if (factors.length === 0) {
      factors.push('Marché relativement stable');
    }
    return factors;
  }

  /**
   * Obtient les paramètres par défaut, fusionnés et normalisés
   */
  private getDefaultParameters(parameters?: Partial<PredictionParameters>): PredictionParameters {
    const config = marketAnalysisConfig.getConfig();
    const allowed: Timeframe[] = ['1week', '1month', '3months'];
    const timeframes =
      (parameters?.timeframes?.filter((t): t is Timeframe => allowed.includes(t as Timeframe)) ||
       config.predictions.timeframes?.filter((t: any): t is Timeframe => allowed.includes(t)) ||
       ['1month']);
    const includeScenarios = parameters?.includeScenarios ?? config.predictions.includeScenarios ?? true;
    const minConfidence = clamp(parameters?.minConfidence ?? config.predictions.minConfidence ?? 0.6, 0, 1);
    const focusMetrics = parameters?.focusMetrics || ['price', 'volume'];
    const scenarioTypes = parameters?.scenarioTypes || ['optimistic', 'realistic', 'pessimistic'];
    return {
      timeframes,
      includeScenarios,
      minConfidence,
      focusMetrics,
      scenarioTypes,
    };
  }
}

// Instance globale
export const trendPredictorService = TrendPredictorService.getInstance();