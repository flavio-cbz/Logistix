import { z } from "zod";
import { runMarketAnalysisInference } from "./inference-client";
import { VintedAnalysisResult } from "../vinted-market-analysis";
import { AdvancedMetrics } from "@/lib/analytics/advanced-analytics-engine";
import { marketAnalysisConfig } from "./market-analysis-config";
import { AIAnalysisError } from "./ai-errors";

// Schémas pour les insights de marché
const PricingRecommendationSchema = z.object({

  optimalPriceRange: z.object({
    min: z.number(),
    max: z.number(),
  }),
  currentPricePosition: z.enum(['underpriced', 'optimal', 'overpriced']),
  strategy: z.string(),
  expectedImpact: z.object({
    volumeChange: z.number(), // pourcentage
    revenueChange: z.number(), // pourcentage
  }),
  confidence: z.number().min(0).max(1),
  justification: z.string(),
});

const MarketOpportunitySchema = z.object({
  type: z.enum(['price_gap', 'demand_spike', 'competitor_weakness', 'seasonal_trend']),
  title: z.string(),
  description: z.string(),
  potentialValue: z.number(), // en euros
  effort: z.enum(['low', 'medium', 'high']),
  timeframe: z.enum(['immediate', 'short_term', 'long_term']),
  confidence: z.number().min(0).max(1),
priority: z.enum(['low', 'medium', 'high', 'critical']),
  actionSteps: z.array(z.string()),
});

const CompetitivePositionSchema = z.object({
  position: z.enum(['leader', 'challenger', 'follower', 'niche']),
  marketShare: z.object({
    estimated: z.number(),
    confidence: z.number().min(0).max(1),
  }),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  threats: z.array(z.string()),
  opportunities: z.array(z.string()),
  competitorAnalysis: z.array(z.object({
    name: z.string(),
    priceRange: z.object({ min: z.number(), max: z.number() }),
    volume: z.number(),
    differentiators: z.array(z.string()),
  })),
});

const MarketInsightsSchema = z.object({
  pricingRecommendations: z.array(PricingRecommendationSchema),
  marketOpportunities: z.array(MarketOpportunitySchema),
  competitivePosition: CompetitivePositionSchema,
  marketTrends: z.array(z.object({
    trend: z.string(),
    direction: z.enum(['up', 'down', 'stable']),
    strength: z.number().min(0).max(1),
    timeframe: z.string(),
    impact: z.enum(['low', 'medium', 'high']),
  })),
  riskFactors: z.array(z.object({
    risk: z.string(),
    probability: z.number().min(0).max(1),
    impact: z.enum(['low', 'medium', 'high']),
    mitigation: z.string(),
  })),
  confidence: z.number().min(0).max(1),
  lastUpdated: z.string(),
});

// Types exportés
export type PricingRecommendation = z.infer<typeof PricingRecommendationSchema>;
export type MarketOpportunity = z.infer<typeof MarketOpportunitySchema>;
export type CompetitivePosition = z.infer<typeof CompetitivePositionSchema>;
export type MarketInsights = z.infer<typeof MarketInsightsSchema>;

// Template de prompt pour les insights de marché
const MARKET_INSIGHTS_PROMPT_TEMPLATE = `
Tu es un expert en analyse de marché et stratégie commerciale. Analyse les données suivantes et génère des insights actionnables.

Données d'analyse de marché:
{market_data}

Métriques statistiques avancées:
{advanced_metrics}

Configuration d'analyse:
- Objectifs: {objectives}
- Tolérance au risque: {risk_tolerance}
- Horizon temporel: {timeframe}

Génère une analyse complète incluant:
1. Recommandations de prix optimales avec justification
2. Opportunités de marché identifiées avec potentiel de valeur
3. Position concurrentielle et analyse SWOT
4. Tendances de marché et leur impact
5. Facteurs de risque et stratégies de mitigation

Réponds uniquement avec un objet JSON valide au format suivant:
{
  "pricingRecommendations": [
    {
      "optimalPriceRange": {"min": 85, "max": 95},
      "currentPricePosition": "underpriced|optimal|overpriced",
      "strategy": "Description de la stratégie de prix recommandée",
      "expectedImpact": {"volumeChange": 10, "revenueChange": 15},
      "confidence": 0.85,
      "justification": "Explication détaillée de la recommandation"
    }
  ],
  "marketOpportunities": [
    {
      "type": "price_gap|demand_spike|competitor_weakness|seasonal_trend",
      "title": "Titre court de l'opportunité",
      "description": "Description détaillée",
      "potentialValue": 1500,
      "effort": "low|medium|high",
      "timeframe": "immediate|short_term|long_term",
      "confidence": 0.75,
      "actionSteps": ["Étape 1", "Étape 2"]
    }
  ],
  "competitivePosition": {
    "position": "leader|challenger|follower|niche",
    "marketShare": {"estimated": 0.15, "confidence": 0.7},
    "strengths": ["Force 1", "Force 2"],
    "weaknesses": ["Faiblesse 1"],
    "threats": ["Menace 1"],
    "opportunities": ["Opportunité 1"],
    "competitorAnalysis": [
      {
        "name": "Concurrent A",
        "priceRange": {"min": 80, "max": 120},
        "volume": 50,
        "differentiators": ["Différenciateur 1"]
      }
    ]
  },
  "marketTrends": [
    {
      "trend": "Augmentation de la demande saisonnière",
      "direction": "up|down|stable",
      "strength": 0.8,
      "timeframe": "3 mois",
      "impact": "high|medium|low"
    }
  ],
  "riskFactors": [
    {
      "risk": "Volatilité des prix",
      "probability": 0.6,
      "impact": "medium|high|low",
      "mitigation": "Stratégie de mitigation"
    }
  ],
  "confidence": 0.8,
  "lastUpdated": "{timestamp}"
}
`;

// Interface pour les préférences utilisateur
export interface UserPreferences {
  objectives: Array<'profit' | 'volume' | 'market_share' | 'brand_building'>;
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  timeframe: 'short_term' | 'medium_term' | 'long_term';
  focusAreas: Array<'pricing' | 'competition' | 'trends' | 'opportunities'>;
}

// Service principal d'insights de marché
export class MarketInsightsService {
  private static instance: MarketInsightsService;

  public static getInstance(): MarketInsightsService {
    if (!MarketInsightsService.instance) {
      MarketInsightsService.instance = new MarketInsightsService();
    }
    return MarketInsightsService.instance;
  }

  /**
   * Génère des insights de marché complets
   */
  async generateMarketInsights(
    analysisResult: VintedAnalysisResult,
    advancedMetrics?: AdvancedMetrics,
    userPreferences?: UserPreferences
  ): Promise<MarketInsights> {
    const config = marketAnalysisConfig.getConfig();
    
    // Vérifier si les insights sont activés
    if (!config.insights.enabled) {
      throw new AIAnalysisError(
        'Les insights de marché sont désactivés',
        'FEATURE_DISABLED' as any,
        { retryable: false, fallbackAvailable: true }
      );
    }

    // Valider la qualité des données
    const dataQuality = marketAnalysisConfig.validateDataQuality(analysisResult.rawItems || []);
    if (!dataQuality.valid) {
      throw new AIAnalysisError(
        `Qualité des données insuffisante: ${dataQuality.issues.join(', ')}`,
        'DATA_QUALITY_TOO_LOW' as any,
        { retryable: false, fallbackAvailable: true, context: dataQuality }
      );
    }

    const preferences = this.getDefaultPreferences(userPreferences);
    
    try {
      const prompt = this.buildPrompt(analysisResult, advancedMetrics, preferences);
      
      const response = await runMarketAnalysisInference({
        prompt,
        analysisType: 'insights',
        temperature: 0.3,
        max_tokens: 2000,
        context: {
          marketData: analysisResult,
          historicalData: advancedMetrics,
          userPreferences: preferences,
        },
      });

      const insights = this.parseInsightsResponse(response.choices[0].text);
      
      // Filtrer selon la configuration
      return this.filterInsightsByConfig(insights, config);
      
    } catch (error) {
      if (error instanceof AIAnalysisError) {
        throw error;
      }
      
      throw new AIAnalysisError(
        `Erreur lors de la génération des insights: ${error.message}`,
        'INFERENCE_FAILED' as any,
        { retryable: true, fallbackAvailable: true, cause: error }
      );
    }
  }

  /**
   * Génère des recommandations de prix spécifiques
   */
  async generatePricingRecommendations(
    analysisResult: VintedAnalysisResult,
    advancedMetrics?: AdvancedMetrics
  ): Promise<PricingRecommendation[]> {
    const prompt = `
    Analyse les données de marché suivantes et génère des recommandations de prix optimales.
    
    Données: ${JSON.stringify({
      avgPrice: analysisResult.avgPrice,
      priceRange: analysisResult.priceRange,
      salesVolume: analysisResult.salesVolume,
      competitorData: advancedMetrics?.competitiveAnalysis,
    }, null, 2)}
    
    Réponds avec un tableau JSON de recommandations de prix.
    `;

    try {
      const response = await runMarketAnalysisInference({
        prompt,
        analysisType: 'recommendations',
        temperature: 0.2,
        max_tokens: 800,
      });

      const recommendations: unknown[] = JSON.parse(response.choices[0].text);
      return recommendations.map((rec): PricingRecommendation => PricingRecommendationSchema.parse(rec));
      
    } catch (error) {
      // Fallback vers recommandations basiques
      return this.generateBasicPricingRecommendations(analysisResult);
    }
  }

  /**
   * Identifie les opportunités de marché
   */
  async identifyMarketOpportunities(
    analysisResult: VintedAnalysisResult,
    advancedMetrics?: AdvancedMetrics
  ): Promise<MarketOpportunity[]> {
    const opportunities: MarketOpportunity[] = [];

    // Analyser les gaps de prix
    if (advancedMetrics?.competitiveAnalysis?.priceGaps) {
      for (const gap of advancedMetrics.competitiveAnalysis.priceGaps) {
        if (gap.opportunity > 1.5) {
          opportunities.push({
            type: 'price_gap',
            title: `Gap de prix identifié`,
            description: `Opportunité de positionnement entre ${gap.min}€ et ${gap.max}€`,
            potentialValue: (gap.max - gap.min) * analysisResult.salesVolume * 0.1,
            effort: 'low',
            timeframe: 'immediate',
            confidence: gap.confidence,
            actionSteps: [
              'Analyser la demande dans cette gamme de prix',
              'Tester un positionnement prix dans ce segment',
              'Monitorer la réaction concurrentielle'
            ],
          });
        }
      }
    }

    // Analyser les tendances saisonnières
    if (advancedMetrics?.temporalAnalysis?.seasonality?.detected) {
      opportunities.push({
        type: 'seasonal_trend',
        title: 'Opportunité saisonnière détectée',
        description: `Pattern ${advancedMetrics.temporalAnalysis.seasonality.pattern} identifié`,
        potentialValue: analysisResult.avgPrice * analysisResult.salesVolume * 0.15,
        effort: 'medium',
        timeframe: 'short_term',
        confidence: advancedMetrics.temporalAnalysis.seasonality.confidence,
        actionSteps: [
          'Ajuster la stratégie selon le cycle saisonnier',
          'Optimiser le stock pour les pics de demande',
          'Adapter la communication marketing'
        ],
      });
    }

    return opportunities;
  }

  /**
   * Construit le prompt pour l'analyse complète
   */
  private buildPrompt(
    analysisResult: VintedAnalysisResult,
    advancedMetrics?: AdvancedMetrics,
    preferences?: UserPreferences
  ): string {
    const marketData = {
      ...analysisResult,
      rawItems: `${analysisResult.rawItems?.length || 0} articles analysés`,
      enrichedItems: undefined,
    };

    return MARKET_INSIGHTS_PROMPT_TEMPLATE
      .replace('{market_data}', JSON.stringify(marketData, null, 2))
      .replace('{advanced_metrics}', advancedMetrics ? JSON.stringify(advancedMetrics, null, 2) : 'Non disponibles')
      .replace('{objectives}', preferences?.objectives.join(', ') || 'profit, volume')
      .replace('{risk_tolerance}', preferences?.riskTolerance || 'moderate')
      .replace('{timeframe}', preferences?.timeframe || 'medium_term')
      .replace('{timestamp}', new Date().toISOString());
  }

  /**
   * Parse la réponse de l'IA et valide le format
   */
  private parseInsightsResponse(responseText: string): MarketInsights {
    const jsonString = responseText.match(/{[\s\S]*}/)?.[0];
    if (!jsonString) {
      throw new AIAnalysisError(
        'Réponse IA invalide: pas de JSON trouvé',
        'INVALID_RESPONSE' as any
      );
    }

    try {
      const parsed = JSON.parse(jsonString);
      return MarketInsightsSchema.parse(parsed);
    } catch (error) {
      throw new AIAnalysisError(
        `Erreur de parsing des insights: ${error.message}`,
        'INVALID_RESPONSE' as any,
        { cause: error }
      );
    }
  }

  /**
   * Filtre les insights selon la configuration
   */
  private filterInsightsByConfig(insights: MarketInsights, config: any): MarketInsights {
    return {
      ...insights,
      pricingRecommendations: insights.pricingRecommendations
        .filter(rec => rec.confidence >= config.insights.minConfidence)
        .slice(0, config.recommendations.maxRecommendations),
      marketOpportunities: insights.marketOpportunities
        .filter(opp => opp.confidence >= config.insights.minConfidence)
        .slice(0, config.insights.maxInsights),
    };
  }

  /**
   * Génère des recommandations de prix basiques en fallback
   */
  private generateBasicPricingRecommendations(
    analysisResult: VintedAnalysisResult
  ): PricingRecommendation[] {
    const currentPrice = analysisResult.avgPrice;
    const priceRange = analysisResult.priceRange;
    
    return [{
      optimalPriceRange: {
        min: Math.max(currentPrice * 0.95, priceRange.min),
        max: Math.min(currentPrice * 1.05, priceRange.max),
      },
      currentPricePosition: 'optimal',
      strategy: 'Maintenir le prix actuel avec ajustements mineurs',
      expectedImpact: {
        volumeChange: 0,
        revenueChange: 2,
      },
      confidence: 0.6,
      justification: 'Recommandation basique basée sur les données disponibles',
    }];
  }

  /**
   * Obtient les préférences par défaut
   */
  private getDefaultPreferences(userPreferences?: UserPreferences): UserPreferences {
    return {
      objectives: userPreferences?.objectives || ['profit', 'volume'],
      riskTolerance: userPreferences?.riskTolerance || 'moderate',
      timeframe: userPreferences?.timeframe || 'medium_term',
      focusAreas: userPreferences?.focusAreas || ['pricing', 'opportunities'],
    };
  }
}

// Instance globale
export const marketInsightsService = MarketInsightsService.getInstance();