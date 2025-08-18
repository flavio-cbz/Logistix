import { z } from "zod";
import { runMarketAnalysisInference } from "./inference-client";
import { AIAnalysisError, AIErrorCode } from "./ai-errors";
import { VintedAnalysisResult } from "@/types/vinted-market-analysis";
import { AdvancedMetrics } from "@/lib/analytics/advanced-analytics-engine";

// Schémas Zod pour la validation des recommandations de prix
const PricingRecommendationSchema = z.object({
  optimalPriceRange: z.object({
    min: z.number().positive(),
    max: z.number().positive(),
  }),
  recommendedPrice: z.number().positive(),
  pricingStrategy: z.enum(['competitive', 'premium', 'value', 'penetration']),
  justification: z.string().min(10),
  confidence: z.number().min(0).max(1),
  factors: z.array(z.object({
    factor: z.string(),
    impact: z.enum(['positive', 'negative', 'neutral']),
    weight: z.number().min(0).max(1),
    description: z.string(),
  })),
  marketPosition: z.enum(['below_market', 'at_market', 'above_market']),
  expectedOutcome: z.object({
    salesProbability: z.number().min(0).max(1),
    timeToSell: z.string(),
    profitMargin: z.number(),
  }),
});

const OpportunitySchema = z.object({
  id: z.string(),
  type: z.enum(['pricing', 'timing', 'positioning', 'market_gap']),
  title: z.string(),
  description: z.string(),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  profitPotential: z.number().min(0),
  effort: z.enum(['low', 'medium', 'high']),
  timeframe: z.enum(['immediate', 'short_term', 'medium_term', 'long_term']),
  actionItems: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  evidence: z.array(z.string()),
});

const ActionPlanSchema = z.object({
  immediate: z.array(z.object({
    action: z.string(),
    priority: z.enum(['high', 'medium', 'low']),
    effort: z.enum(['low', 'medium', 'high']),
    expectedImpact: z.string(),
    timeline: z.string(),
    dependencies: z.array(z.string()).optional(),
  })),
  shortTerm: z.array(z.object({
    action: z.string(),
    dependencies: z.array(z.string()),
    expectedOutcome: z.string(),
    timeline: z.string(),
    metrics: z.array(z.string()),
  })),
  longTerm: z.array(z.object({
    strategy: z.string(),
    goals: z.array(z.string()),
    metrics: z.array(z.string()),
    timeline: z.string(),
    resources: z.array(z.string()).optional(),
  })),
});

// Types TypeScript
export type PricingRecommendation = z.infer<typeof PricingRecommendationSchema>;
export type MarketOpportunity = z.infer<typeof OpportunitySchema>;
export type ActionPlan = z.infer<typeof ActionPlanSchema>;

export interface UserPreferences {
  objectives: Array<'profit' | 'volume' | 'speed' | 'market_share'>;
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  preferredInsightTypes: Array<'trends' | 'opportunities' | 'risks' | 'competitive'>;
  timeHorizon: 'immediate' | 'short_term' | 'medium_term' | 'long_term';
  budgetConstraints?: {
    maxInvestment: number;
    expectedROI: number;
  };
}

export interface RecommendationContext {
  analysisResult: VintedAnalysisResult;
  advancedMetrics: AdvancedMetrics;
  userPreferences?: UserPreferences;
  marketConditions?: {
    season: string;
    economicIndicators: Record<string, number>;
    competitorActivity: any[];
  };
}

export class RecommendationEngine {
  /**
   * Génère des recommandations de prix optimales avec justifications IA
   */
  async generatePricingRecommendations(
    context: RecommendationContext
  ): Promise<PricingRecommendation> {
    try {
      const prompt = this.buildPricingPrompt(context);
      
      const response = await runMarketAnalysisInference({
        prompt,
        analysisType: 'recommendations',
        temperature: 0.2,
        context: {
          marketData: context.analysisResult,
          userPreferences: context.userPreferences,
        },
      });

      const rawRecommendation = this.extractPricingRecommendation(response.choices[0].text);
      
      // Validation avec Zod
      const validatedRecommendation = PricingRecommendationSchema.parse(rawRecommendation);
      
      return validatedRecommendation;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new AIAnalysisError(
          `Format de recommandation de prix invalide: ${error.message}`,
          AIErrorCode.INVALID_RESPONSE,
          { retryable: true, fallbackAvailable: true, context: { zodError: error.errors } }
        );
      }
      
      throw new AIAnalysisError(
        `Erreur lors de la génération des recommandations de prix: ${error.message}`,
        AIErrorCode.INFERENCE_FAILED,
        { retryable: true, fallbackAvailable: true, cause: error }
      );
    }
  }

  /**
   * Identifie les opportunités de marché avec priorisation par potentiel de profit
   */
  async identifyOpportunities(
    context: RecommendationContext
  ): Promise<MarketOpportunity[]> {
    try {
      const prompt = this.buildOpportunityPrompt(context);
      
      const response = await runMarketAnalysisInference({
        prompt,
        analysisType: 'recommendations',
        temperature: 0.3,
        context: {
          marketData: context.analysisResult,
          userPreferences: context.userPreferences,
        },
      });

      const rawOpportunities = this.extractOpportunities(response.choices[0].text);
      
      // Validation et tri par potentiel de profit
      const validatedOpportunities = rawOpportunities.map(opp => 
        OpportunitySchema.parse(opp)
      );

      // Priorisation avancée des opportunités
      const prioritizedOpportunities = this.prioritizeOpportunities(validatedOpportunities, context);
      
      return prioritizedOpportunities;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new AIAnalysisError(
          `Format d'opportunité invalide: ${error.message}`,
          AIErrorCode.INVALID_RESPONSE,
          { retryable: true, fallbackAvailable: true, context: { zodError: error.errors } }
        );
      }
      
      throw new AIAnalysisError(
        `Erreur lors de l'identification des opportunités: ${error.message}`,
        AIErrorCode.INFERENCE_FAILED,
        { retryable: true, fallbackAvailable: true, cause: error }
      );
    }
  }

  /**
   * Détecte les gaps de marché spécifiques
   */
  async detectMarketGaps(
    context: RecommendationContext
  ): Promise<MarketOpportunity[]> {
    const { analysisResult, advancedMetrics } = context;
    const gaps: MarketOpportunity[] = [];

    // Gap de prix - zones avec peu de concurrence
    const priceGaps = this.identifyPriceGaps(advancedMetrics.priceDistribution);
    gaps.push(...priceGaps);

    // Gap de taille - tailles sous-représentées
    const sizeGaps = this.identifySizeGaps(advancedMetrics.sizeDistribution, analysisResult);
    gaps.push(...sizeGaps);

    // Gap temporel - périodes de faible activité
    const temporalGaps = this.identifyTemporalGaps(advancedMetrics.timeDistribution);
    gaps.push(...temporalGaps);

    return gaps.sort((a, b) => b.profitPotential - a.profitPotential);
  }

  /**
   * Priorise les opportunités selon plusieurs critères
   */
  private prioritizeOpportunities(
    opportunities: MarketOpportunity[],
    context: RecommendationContext
  ): MarketOpportunity[] {
    return opportunities
      .map(opp => ({
        ...opp,
        score: this.calculateOpportunityScore(opp, context)
      }))
      .sort((a, b) => (b as any).score - (a as any).score)
      .map(({ score, ...opp }) => opp); // Remove score from final result
  }

  /**
   * Calcule un score composite pour chaque opportunité
   */
  private calculateOpportunityScore(
    opportunity: MarketOpportunity,
    context: RecommendationContext
  ): number {
    let score = 0;

    // Potentiel de profit (30% du score)
    score += (opportunity.profitPotential / 100) * 0.3;

    // Priorité (25% du score)
    const priorityWeights = { critical: 1, high: 0.8, medium: 0.5, low: 0.2 };
    score += priorityWeights[opportunity.priority] * 0.25;

    // Effort inversé (20% du score) - moins d'effort = meilleur score
    const effortWeights = { low: 1, medium: 0.6, high: 0.2 };
    score += effortWeights[opportunity.effort] * 0.2;

    // Confiance (10% du score)
    score += opportunity.confidence * 0.1;

    // Bonus pour alignement avec préférences utilisateur (15% du score)
    if (context.userPreferences) {
      const alignmentBonus = this.calculateAlignmentBonus(opportunity, context.userPreferences);
      score += alignmentBonus * 0.15;
    }

    return score;
  }

  /**
   * Calcule un bonus d'alignement avec les préférences utilisateur
   */
  private calculateAlignmentBonus(
    opportunity: MarketOpportunity,
    preferences: UserPreferences
  ): number {
    let bonus = 0;

    // Alignement avec les objectifs
    if (preferences.objectives.includes('profit') && opportunity.type === 'pricing') {
      bonus += 0.3;
    }
    if (preferences.objectives.includes('speed') && opportunity.timeframe === 'immediate') {
      bonus += 0.8; // Bonus très élevé pour la vitesse
    }
    if (preferences.objectives.includes('volume') && opportunity.type === 'market_gap') {
      bonus += 0.2;
    }

    // Alignement avec la tolérance au risque
    if (preferences.riskTolerance === 'conservative' && opportunity.effort === 'low') {
      bonus += 0.5; // Bonus très élevé pour les conservateurs
    }
    if (preferences.riskTolerance === 'aggressive' && opportunity.priority === 'high') {
      bonus += 0.2;
    }

    return Math.min(bonus, 1); // Cap à 1
  }

  /**
   * Identifie les gaps de prix dans la distribution
   */
  private identifyPriceGaps(priceDistribution: any): MarketOpportunity[] {
    const gaps: MarketOpportunity[] = [];
    const ranges = priceDistribution.ranges;

    for (let i = 0; i < ranges.length - 1; i++) {
      const current = ranges[i];
      const next = ranges[i + 1];
      
      // Gap significatif si moins de 5% du marché dans cette tranche
      if (current.percentage < 5 && next.max - current.min > 5) {
        gaps.push({
          id: `price-gap-${current.min}-${current.max}`,
          type: 'pricing',
          title: `Opportunité de prix ${current.min}€-${current.max}€`,
          description: `Faible concurrence dans cette tranche de prix (${current.percentage}% du marché)`,
          priority: current.percentage < 5 ? 'high' : 'medium',
          profitPotential: (current.max - current.min) * 2, // Estimation simple
          effort: 'low',
          timeframe: 'immediate',
          actionItems: [
            `Positionner des produits entre ${current.min}€ et ${current.max}€`,
            'Analyser la demande dans cette tranche',
            'Surveiller la réaction des concurrents'
          ],
          confidence: 0.7,
          evidence: [
            `Seulement ${current.percentage}% du marché dans cette tranche`,
            `Gap de ${next.max - current.min}€ avec la tranche suivante`
          ]
        });
      }
    }

    return gaps;
  }

  /**
   * Identifie les gaps de taille sous-représentées
   */
  private identifySizeGaps(sizeDistribution: Record<string, number>, analysisResult: VintedAnalysisResult): MarketOpportunity[] {
    const gaps: MarketOpportunity[] = [];
    const totalItems = Object.values(sizeDistribution).reduce((sum, count) => sum + count, 0);
    
    // Tailles populaires généralement (basé sur des données de marché)
    const popularSizes = ['38', '39', '40', '41', '42'];
    
    popularSizes.forEach(size => {
      const count = sizeDistribution[size] || 0;
      const percentage = (count / totalItems) * 100;
      
      // Si une taille populaire est sous-représentée (< 15%)
      if (percentage < 15) {
        gaps.push({
          id: `size-gap-${size}`,
          type: 'market_gap',
          title: `Opportunité taille ${size}`,
          description: `Taille ${size} sous-représentée (${percentage.toFixed(1)}% du marché)`,
          priority: percentage < 10 ? 'high' : 'medium',
          profitPotential: (20 - percentage) * 3, // Plus le gap est grand, plus le potentiel est élevé
          effort: 'medium',
          timeframe: 'short_term',
          actionItems: [
            `Sourcer plus de produits en taille ${size}`,
            'Analyser la demande spécifique pour cette taille',
            'Ajuster la stratégie d\'approvisionnement'
          ],
          confidence: 0.6,
          evidence: [
            `Taille ${size} représente seulement ${percentage.toFixed(1)}% du marché`,
            'Taille généralement populaire selon les standards du marché'
          ]
        });
      }
    });

    return gaps;
  }

  /**
   * Identifie les gaps temporels dans les ventes
   */
  private identifyTemporalGaps(timeDistribution: any): MarketOpportunity[] {
    const gaps: MarketOpportunity[] = [];
    
    // Analyse des jours de la semaine
    const weekdayData: Record<string, number> = timeDistribution?.byWeekday || {};
    const weekdayValues = Object.values(weekdayData).map(v => Number(v ?? 0));
    const totalWeekdays = weekdayValues.length || 1;
    const avgWeekdayVolume = weekdayValues.reduce((sum, vol) => sum + vol, 0) / totalWeekdays;
    
    Object.entries(weekdayData).forEach(([day, volume]) => {
      const volNum = Number(volume ?? 0);
      if (volNum < avgWeekdayVolume * 0.7) { // 30% en dessous de la moyenne
        gaps.push({
          id: `temporal-gap-${day.toLowerCase()}`,
          type: 'timing',
          title: `Opportunité ${day}`,
          description: `Faible activité le ${day} (${volNum} vs ${avgWeekdayVolume.toFixed(0)} en moyenne)`,
          priority: 'medium',
          profitPotential: (avgWeekdayVolume - volNum) * 0.5,
          effort: 'low',
          timeframe: 'immediate',
          actionItems: [
            `Programmer des publications le ${day}`,
            'Proposer des promotions spéciales',
            'Analyser les habitudes d\'achat ce jour-là'
          ],
          confidence: 0.5,
          evidence: [
            `Volume ${day}: ${volNum} (${((volNum/avgWeekdayVolume - 1) * 100).toFixed(1)}% vs moyenne)`,
            'Opportunité de capter plus d\'attention'
          ]
        });
      }
    });

    return gaps;
  }

  /**
   * Crée un plan d'action personnalisé avec chronologie et priorités
   */
  async createActionPlan(
    context: RecommendationContext,
    opportunities: MarketOpportunity[]
  ): Promise<ActionPlan> {
    try {
      const prompt = this.buildActionPlanPrompt(context, opportunities);
      
      const response = await runMarketAnalysisInference({
        prompt,
        analysisType: 'recommendations',
        temperature: 0.1,
        context: {
          marketData: context.analysisResult,
          userPreferences: context.userPreferences,
          opportunities,
        },
      });

      const rawActionPlan = this.extractActionPlan(response.choices[0].text);
      
      // Validation avec Zod
      const validatedActionPlan = ActionPlanSchema.parse(rawActionPlan);
      
      // Post-traitement pour personnalisation avancée
      const personalizedActionPlan = this.personalizeActionPlan(validatedActionPlan, context);
      
      return personalizedActionPlan;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new AIAnalysisError(
          `Format de plan d'action invalide: ${error.message}`,
          AIErrorCode.INVALID_RESPONSE,
          { retryable: true, fallbackAvailable: true, context: { zodError: error.errors } }
        );
      }
      
      throw new AIAnalysisError(
        `Erreur lors de la création du plan d'action: ${error.message}`,
        AIErrorCode.INFERENCE_FAILED,
        { retryable: true, fallbackAvailable: true, cause: error }
      );
    }
  }

  /**
   * Génère un plan d'action basé sur les préférences utilisateur sans IA
   */
  async generatePersonalizedActionPlan(
    context: RecommendationContext,
    opportunities: MarketOpportunity[]
  ): Promise<ActionPlan> {
    const preferences = context.userPreferences;
    if (!preferences) {
      // Plan d'action par défaut si pas de préférences
      return this.createDefaultActionPlan(opportunities);
    }

    const actionPlan: ActionPlan = {
      immediate: [],
      shortTerm: [],
      longTerm: []
    };

    // Filtrer et prioriser les opportunités selon les préférences
    const prioritizedOpportunities = this.prioritizeOpportunitiesForActionPlan(opportunities, preferences);

    // Générer les actions immédiates
    actionPlan.immediate = this.generateImmediateActions(prioritizedOpportunities, preferences);

    // Générer les actions court terme
    actionPlan.shortTerm = this.generateShortTermActions(prioritizedOpportunities, preferences);

    // Générer les stratégies long terme
    actionPlan.longTerm = this.generateLongTermStrategies(prioritizedOpportunities, preferences);

    // Valider les dépendances
    this.validateAndAdjustDependencies(actionPlan);

    return actionPlan;
  }

  /**
   * Personnalise un plan d'action selon les préférences utilisateur
   */
  private personalizeActionPlan(actionPlan: ActionPlan, context: RecommendationContext): ActionPlan {
    if (!context.userPreferences) {
      return actionPlan;
    }

    const preferences = context.userPreferences;
    
    // Ajuster les priorités selon les objectifs
    if (preferences.objectives.includes('speed')) {
      // Prioriser les actions rapides
      actionPlan.immediate = actionPlan.immediate
        .sort((a, b) => {
          const aSpeed = a.timeline.includes('hour') || a.timeline.includes('day') ? 1 : 0;
          const bSpeed = b.timeline.includes('hour') || b.timeline.includes('day') ? 1 : 0;
          return bSpeed - aSpeed;
        });
    }

    if (preferences.objectives.includes('profit')) {
      // Prioriser les actions à fort impact profit
      actionPlan.immediate = actionPlan.immediate
        .sort((a, b) => {
          const aProfit = a.expectedImpact.toLowerCase().includes('profit') ? 1 : 0;
          const bProfit = b.expectedImpact.toLowerCase().includes('profit') ? 1 : 0;
          return bProfit - aProfit;
        });
    }

    // Ajuster selon la tolérance au risque
    if (preferences.riskTolerance === 'conservative') {
      // Filtrer les actions à faible effort
      actionPlan.immediate = actionPlan.immediate.filter(action => action.effort === 'low');
      actionPlan.shortTerm = actionPlan.shortTerm.filter(action => 
        !action.expectedOutcome.toLowerCase().includes('risque')
      );
    }

    return actionPlan;
  }

  /**
   * Priorise les opportunités pour la génération du plan d'action
   */
  private prioritizeOpportunitiesForActionPlan(
    opportunities: MarketOpportunity[],
    preferences: UserPreferences
  ): MarketOpportunity[] {
    return opportunities
      .filter(opp => {
        // Filtrer selon l'horizon temporel préféré
        if (preferences.timeHorizon === 'immediate') {
          return opp.timeframe === 'immediate';
        }
        if (preferences.timeHorizon === 'short_term') {
          return ['immediate', 'short_term'].includes(opp.timeframe);
        }
        return true; // Inclure toutes les opportunités pour les autres horizons
      })
      .sort((a, b) => {
        // Tri selon les objectifs
        let scoreA = 0, scoreB = 0;
        
        if (preferences.objectives.includes('profit')) {
          scoreA += a.profitPotential * 0.4;
          scoreB += b.profitPotential * 0.4;
        }
        
        if (preferences.objectives.includes('speed')) {
          const timeframeWeights = { immediate: 1, short_term: 0.7, medium_term: 0.4, long_term: 0.1 };
          scoreA += timeframeWeights[a.timeframe] * 0.3;
          scoreB += timeframeWeights[b.timeframe] * 0.3;
        }
        
        const priorityWeights = { critical: 1, high: 0.8, medium: 0.5, low: 0.2 };
        scoreA += priorityWeights[a.priority] * 0.3;
        scoreB += priorityWeights[b.priority] * 0.3;
        
        return scoreB - scoreA;
      });
  }

  /**
   * Génère les actions immédiates
   */
  private generateImmediateActions(
    opportunities: MarketOpportunity[],
    preferences: UserPreferences
  ): ActionPlan['immediate'] {
    const immediateActions: ActionPlan['immediate'] = [];
    
    let filteredOpportunities = opportunities.filter(opp => opp.timeframe === 'immediate');
    
    // Filtrer selon la tolérance au risque
    if (preferences.riskTolerance === 'conservative') {
      filteredOpportunities = filteredOpportunities.filter(opp => opp.effort === 'low');
    }
    
    filteredOpportunities
      .slice(0, 5) // Limiter à 5 actions immédiates
      .forEach(opp => {
        opp.actionItems.forEach((item, index) => {
          immediateActions.push({
            action: item,
            priority: this.mapOpportunityPriorityToActionPriority(opp.priority),
            effort: opp.effort,
            expectedImpact: `Potentiel: ${opp.profitPotential}€ - ${opp.description}`,
            timeline: this.generateTimelineFromOpportunity(opp, 'immediate'),
            dependencies: index > 0 ? [opp.actionItems[index - 1]] : []
          });
        });
      });

    return immediateActions;
  }

  /**
   * Génère les actions court terme
   */
  private generateShortTermActions(
    opportunities: MarketOpportunity[],
    preferences: UserPreferences
  ): ActionPlan['shortTerm'] {
    const shortTermActions: ActionPlan['shortTerm'] = [];
    
    opportunities
      .filter(opp => ['short_term', 'medium_term'].includes(opp.timeframe))
      .slice(0, 8) // Limiter à 8 actions court terme
      .forEach(opp => {
        shortTermActions.push({
          action: `Implémenter: ${opp.title}`,
          dependencies: opp.actionItems.slice(0, 2), // Prendre les 2 premières actions comme dépendances
          expectedOutcome: `${opp.description} - ROI estimé: ${opp.profitPotential}€`,
          timeline: this.generateTimelineFromOpportunity(opp, 'short_term'),
          metrics: this.generateMetricsFromOpportunity(opp)
        });
      });

    return shortTermActions;
  }

  /**
   * Génère les stratégies long terme
   */
  private generateLongTermStrategies(
    opportunities: MarketOpportunity[],
    preferences: UserPreferences
  ): ActionPlan['longTerm'] {
    const longTermStrategies: ActionPlan['longTerm'] = [];
    
    // Grouper les opportunités par type pour créer des stratégies cohérentes
    const opportunitiesByType = opportunities.reduce((acc, opp) => {
      if (!acc[opp.type]) acc[opp.type] = [];
      acc[opp.type].push(opp);
      return acc;
    }, {} as Record<string, MarketOpportunity[]>);

    Object.entries(opportunitiesByType).forEach(([type, opps]) => {
      const totalPotential = opps.reduce((sum, opp) => sum + opp.profitPotential, 0);
      
      longTermStrategies.push({
        strategy: this.generateStrategyFromType(type, opps),
        goals: this.generateGoalsFromOpportunities(opps, preferences),
        metrics: this.generateLongTermMetrics(type, preferences),
        timeline: this.generateLongTermTimeline(preferences),
        resources: this.generateRequiredResources(opps, preferences)
      });
    });

    return longTermStrategies.slice(0, 3); // Limiter à 3 stratégies long terme
  }

  /**
   * Valide et ajuste les dépendances dans le plan d'action
   */
  private validateAndAdjustDependencies(actionPlan: ActionPlan): void {
    // Vérifier que les dépendances des actions court terme existent dans les actions immédiates
    actionPlan.shortTerm.forEach(action => {
      action.dependencies = action.dependencies.filter(dep => 
        actionPlan.immediate.some(immediateAction => 
          immediateAction.action.toLowerCase().includes(dep.toLowerCase())
        )
      );
    });

    // Ajouter des dépendances logiques manquantes
    actionPlan.shortTerm.forEach(action => {
      if (action.action.toLowerCase().includes('monitor') || action.action.toLowerCase().includes('analyser')) {
        // Les actions de monitoring dépendent généralement d'actions de mise en œuvre
        const implementationActions = actionPlan.immediate.filter(ia => 
          ia.action.toLowerCase().includes('adjust') || 
          ia.action.toLowerCase().includes('implement') ||
          ia.action.toLowerCase().includes('launch')
        );
        
        if (implementationActions.length > 0 && action.dependencies.length === 0) {
          action.dependencies.push(implementationActions[0].action);
        }
      }
    });
  }

  // Méthodes utilitaires pour la génération du plan d'action

  private mapOpportunityPriorityToActionPriority(priority: MarketOpportunity['priority']): 'high' | 'medium' | 'low' {
    const mapping = { critical: 'high' as const, high: 'high' as const, medium: 'medium' as const, low: 'low' as const };
    return mapping[priority];
  }

  private generateTimelineFromOpportunity(opportunity: MarketOpportunity, phase: string): string {
    const timeframes = {
      immediate: { immediate: '24-48h', short_term: '1-2 semaines', medium_term: '2-4 semaines', long_term: '1-2 mois' },
      short_term: { immediate: '1 semaine', short_term: '2-4 semaines', medium_term: '1-2 mois', long_term: '2-3 mois' }
    };
    
    return timeframes[phase as keyof typeof timeframes]?.[opportunity.timeframe] || '1-2 semaines';
  }

  private generateMetricsFromOpportunity(opportunity: MarketOpportunity): string[] {
    const baseMetrics = ['ROI', 'Temps de mise en œuvre'];
    
    switch (opportunity.type) {
      case 'pricing':
        return [...baseMetrics, 'Marge bénéficiaire', 'Volume de ventes', 'Position concurrentielle'];
      case 'timing':
        return [...baseMetrics, 'Taux de conversion', 'Engagement client', 'Saisonnalité'];
      case 'positioning':
        return [...baseMetrics, 'Part de marché', 'Reconnaissance de marque', 'Satisfaction client'];
      case 'market_gap':
        return [...baseMetrics, 'Pénétration de marché', 'Acquisition client', 'Croissance des ventes'];
      default:
        return baseMetrics;
    }
  }

  private generateStrategyFromType(type: string, opportunities: MarketOpportunity[]): string {
    const strategies = {
      pricing: 'Optimisation de la stratégie de prix pour maximiser la rentabilité',
      timing: 'Exploitation des opportunités temporelles pour augmenter les ventes',
      positioning: 'Amélioration du positionnement concurrentiel sur le marché',
      market_gap: 'Expansion dans les segments de marché sous-exploités'
    };
    
    return strategies[type as keyof typeof strategies] || 'Stratégie de croissance générale';
  }

  private generateGoalsFromOpportunities(opportunities: MarketOpportunity[], preferences: UserPreferences): string[] {
    const goals: string[] = [];
    const totalPotential = opportunities.reduce((sum, opp) => sum + opp.profitPotential, 0);
    
    if (preferences.objectives.includes('profit')) {
      goals.push(`Augmenter les revenus de ${totalPotential}€ sur 12 mois`);
    }
    
    if (preferences.objectives.includes('volume')) {
      goals.push('Augmenter le volume de ventes de 25-40%');
    }
    
    if (preferences.objectives.includes('market_share')) {
      goals.push('Gagner 5-10% de parts de marché supplémentaires');
    }
    
    goals.push('Améliorer la position concurrentielle');
    goals.push('Optimiser l\'efficacité opérationnelle');
    
    return goals.slice(0, 4); // Limiter à 4 objectifs
  }

  private generateLongTermMetrics(type: string, preferences: UserPreferences): string[] {
    const commonMetrics = ['ROI annuel', 'Croissance du chiffre d\'affaires', 'Part de marché'];
    
    const specificMetrics = {
      pricing: ['Marge bénéficiaire moyenne', 'Élasticité prix-demande'],
      timing: ['Saisonnalité des ventes', 'Taux de conversion par période'],
      positioning: ['Indice de satisfaction client', 'Reconnaissance de marque'],
      market_gap: ['Taux de pénétration', 'Coût d\'acquisition client']
    };
    
    return [...commonMetrics, ...(specificMetrics[type as keyof typeof specificMetrics] || [])].slice(0, 5);
  }

  private generateLongTermTimeline(preferences: UserPreferences): string {
    switch (preferences.timeHorizon) {
      case 'immediate':
      case 'short_term':
        return '6-9 mois';
      case 'medium_term':
        return '9-12 mois';
      case 'long_term':
        return '12-18 mois';
      default:
        return '12 mois';
    }
  }

  private generateRequiredResources(opportunities: MarketOpportunity[], preferences: UserPreferences): string[] {
    const resources: Set<string> = new Set();
    
    opportunities.forEach(opp => {
      switch (opp.effort) {
        case 'low':
          resources.add('Temps de gestion: 2-5h/semaine');
          break;
        case 'medium':
          resources.add('Équipe dédiée: 1-2 personnes');
          resources.add('Budget marketing: 500-2000€');
          break;
        case 'high':
          resources.add('Équipe projet: 3-5 personnes');
          resources.add('Budget d\'investissement: 2000-10000€');
          resources.add('Outils et technologies spécialisés');
          break;
      }
      
      if (opp.type === 'pricing') {
        resources.add('Outils d\'analyse de prix');
      }
      if (opp.type === 'market_gap') {
        resources.add('Recherche de marché');
        resources.add('Développement produit');
      }
    });
    
    return Array.from(resources).slice(0, 5); // Limiter à 5 ressources
  }

  private createDefaultActionPlan(opportunities: MarketOpportunity[]): ActionPlan {
    return {
      immediate: opportunities
        .filter(opp => opp.timeframe === 'immediate')
        .slice(0, 3)
        .map(opp => ({
          action: opp.actionItems[0] || opp.title,
          priority: this.mapOpportunityPriorityToActionPriority(opp.priority),
          effort: opp.effort,
          expectedImpact: opp.description,
          timeline: '24-48h'
        })),
      shortTerm: opportunities
        .filter(opp => opp.timeframe === 'short_term')
        .slice(0, 3)
        .map(opp => ({
          action: opp.title,
          dependencies: [],
          expectedOutcome: opp.description,
          timeline: '2-4 semaines',
          metrics: ['ROI', 'Efficacité']
        })),
      longTerm: [{
        strategy: 'Croissance générale du marché',
        goals: ['Augmenter les revenus', 'Améliorer la position concurrentielle'],
        metrics: ['Chiffre d\'affaires', 'Part de marché'],
        timeline: '6-12 mois'
      }]
    };
  }

  /**
   * Construit le prompt pour les recommandations de prix
   */
  private buildPricingPrompt(context: RecommendationContext): string {
    const { analysisResult, advancedMetrics, userPreferences } = context;
    
    const objectivesText = userPreferences?.objectives.join(', ') || 'profit, volume';
    const riskToleranceText = userPreferences?.riskTolerance || 'moderate';
    
    return `
Analysez les données de marché suivantes et générez des recommandations de prix optimales:

DONNÉES DE MARCHÉ:
- Produit: ${analysisResult.catalogInfo.name}
- Volume de ventes: ${analysisResult.salesVolume} articles
- Prix moyen actuel: ${analysisResult.avgPrice}€
- Fourchette de prix: ${analysisResult.priceRange.min}€ - ${analysisResult.priceRange.max}€
- Marque: ${analysisResult.brandInfo?.name || 'Non spécifiée'}

MÉTRIQUES AVANCÉES:
- Distribution des prix: ${JSON.stringify(advancedMetrics.priceDistribution)}
- Position concurrentielle: ${advancedMetrics.competitorAnalysis.pricePosition}
- Prix moyen des concurrents: ${advancedMetrics.competitorAnalysis.averageCompetitorPrice}€

PRÉFÉRENCES UTILISATEUR:
- Objectifs: ${objectivesText}
- Tolérance au risque: ${riskToleranceText}

Générez une recommandation de prix au format JSON suivant:
{
  "optimalPriceRange": {"min": number, "max": number},
  "recommendedPrice": number,
  "pricingStrategy": "competitive|premium|value|penetration",
  "justification": "string",
  "confidence": number,
  "factors": [
    {
      "factor": "string",
      "impact": "positive|negative|neutral",
      "weight": number,
      "description": "string"
    }
  ],
  "marketPosition": "below_market|at_market|above_market",
  "expectedOutcome": {
    "salesProbability": number,
    "timeToSell": "string",
    "profitMargin": number
  }
}

Assurez-vous que:
1. Le prix recommandé soit basé sur une analyse approfondie des données
2. La justification soit claire et actionnable
3. Les facteurs incluent au moins 3 éléments pertinents
4. La confiance reflète la qualité des données disponibles
`;
  }

  /**
   * Construit le prompt pour l'identification d'opportunités
   */
  private buildOpportunityPrompt(context: RecommendationContext): string {
    const { analysisResult, advancedMetrics, userPreferences } = context;
    
    return `
Analysez les données de marché et identifiez les opportunités avec leur potentiel de profit:

DONNÉES DE MARCHÉ:
- Produit: ${analysisResult.catalogInfo.name}
- Volume de ventes: ${analysisResult.salesVolume} articles
- Prix moyen: ${analysisResult.avgPrice}€
- Distribution des tailles: ${JSON.stringify(advancedMetrics.sizeDistribution)}
- Distribution temporelle: ${JSON.stringify(advancedMetrics.timeDistribution)}

ANALYSE CONCURRENTIELLE:
- Nombre de concurrents: ${advancedMetrics.competitorAnalysis.totalCompetitors}
- Position prix: ${advancedMetrics.competitorAnalysis.pricePosition}

Identifiez 3-5 opportunités au format JSON suivant:
[
  {
    "id": "string",
    "type": "pricing|timing|positioning|market_gap",
    "title": "string",
    "description": "string",
    "priority": "low|medium|high|critical",
    "profitPotential": number,
    "effort": "low|medium|high",
    "timeframe": "immediate|short_term|medium_term|long_term",
    "actionItems": ["string"],
    "confidence": number,
    "evidence": ["string"]
  }
]

Concentrez-vous sur:
1. Opportunités de prix basées sur les gaps du marché
2. Opportunités de timing selon les tendances saisonnières
3. Opportunités de positionnement par rapport aux concurrents
4. Gaps de marché non exploités
`;
  }

  /**
   * Construit le prompt pour le plan d'action
   */
  private buildActionPlanPrompt(
    context: RecommendationContext,
    opportunities: MarketOpportunity[]
  ): string {
    const opportunitiesText = opportunities.map(opp => 
      `- ${opp.title} (${opp.priority} priority, ${opp.profitPotential}€ potential)`
    ).join('\n');
    
    return `
Créez un plan d'action détaillé basé sur les opportunités identifiées:

OPPORTUNITÉS IDENTIFIÉES:
${opportunitiesText}

PRÉFÉRENCES UTILISATEUR:
- Objectifs: ${context.userPreferences?.objectives.join(', ') || 'profit, volume'}
- Horizon temporel: ${context.userPreferences?.timeHorizon || 'short_term'}

Générez un plan d'action au format JSON suivant:
{
  "immediate": [
    {
      "action": "string",
      "priority": "high|medium|low",
      "effort": "low|medium|high",
      "expectedImpact": "string",
      "timeline": "string",
      "dependencies": ["string"]
    }
  ],
  "shortTerm": [
    {
      "action": "string",
      "dependencies": ["string"],
      "expectedOutcome": "string",
      "timeline": "string",
      "metrics": ["string"]
    }
  ],
  "longTerm": [
    {
      "strategy": "string",
      "goals": ["string"],
      "metrics": ["string"],
      "timeline": "string",
      "resources": ["string"]
    }
  ]
}

Assurez-vous que:
1. Les actions immédiates peuvent être exécutées dans les 24-48h
2. Les actions court terme s'étalent sur 1-4 semaines
3. Les stratégies long terme couvrent 3-12 mois
4. Chaque action a des métriques de succès claires
`;
  }

  /**
   * Extrait les recommandations de prix de la réponse IA
   */
  private extractPricingRecommendation(response: string): Record<string, unknown> {
    try {
      // Recherche du JSON dans la réponse
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Aucun JSON trouvé dans la réponse');
      }
      
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      throw new AIAnalysisError(
        `Impossible d'extraire la recommandation de prix: ${error.message}`,
        AIErrorCode.INVALID_RESPONSE,
        { retryable: true, context: { response } }
      );
    }
  }

  /**
   * Extrait les opportunités de la réponse IA
   */
  private extractOpportunities(response: string): Record<string, unknown>[] {
    try {
      // Recherche du JSON array dans la réponse
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('Aucun JSON array trouvé dans la réponse');
      }
      
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      throw new AIAnalysisError(
        `Impossible d'extraire les opportunités: ${error.message}`,
        AIErrorCode.INVALID_RESPONSE,
        { retryable: true, context: { response } }
      );
    }
  }

  /**
   * Extrait le plan d'action de la réponse IA
   */
  private extractActionPlan(response: string): Record<string, unknown> {
    try {
      // Recherche du JSON dans la réponse
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Aucun JSON trouvé dans la réponse');
      }
      
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      throw new AIAnalysisError(
        `Impossible d'extraire le plan d'action: ${error.message}`,
        AIErrorCode.INVALID_RESPONSE,
        { retryable: true, context: { response } }
      );
    }
  }
}