// Moteur de recommandations de prix pour l'analyse de marché Vinted

import { VintedAnalysisResult } from '@/types/vinted-market-analysis'
import { AdvancedMetrics } from './advanced-analytics-engine'

export type PricingStrategy = 'competitive' | 'premium' | 'value' | 'penetration'

export interface PriceRecommendation {
  strategy: PricingStrategy
  recommendedPrice: number
  confidence: number
  reasoning: string[]
  expectedSaleTime: number // en jours
  marketShare: number
  priceRange: {
    min: number
    max: number
    optimal: number
  }
  competitivePosition: {
    percentile: number
    vsAverage: number
    vsMedian: number
  }
  riskAssessment: {
    level: 'low' | 'medium' | 'high'
    factors: string[]
  }
}

export interface RecommendationContext {
  userGoals: {
    priority: 'speed' | 'profit' | 'market_share'
    timeframe: 'immediate' | 'short_term' | 'long_term'
    riskTolerance: 'conservative' | 'moderate' | 'aggressive'
  }
  itemCondition: 'new' | 'excellent' | 'good' | 'fair' | 'poor'
  seasonality: 'peak' | 'normal' | 'low'
  inventory: {
    quantity: number
    urgency: 'low' | 'medium' | 'high'
  }
}

export class PriceRecommendationEngine {
  
  /**
   * Génère des recommandations de prix basées sur l'analyse de marché
   */
  generateRecommendations(
    analysisData: VintedAnalysisResult,
    metrics: AdvancedMetrics,
    context?: Partial<RecommendationContext>
  ): PriceRecommendation[] {
    const defaultContext: RecommendationContext = {
      userGoals: {
        priority: 'profit',
        timeframe: 'short_term',
        riskTolerance: 'moderate'
      },
      itemCondition: 'good',
      seasonality: 'normal',
      inventory: {
        quantity: 1,
        urgency: 'medium'
      }
    }

    const fullContext = { ...defaultContext, ...context }
    const recommendations: PriceRecommendation[] = []

    // Stratégie compétitive
    recommendations.push(this.generateCompetitiveStrategy(analysisData, metrics, fullContext))
    
    // Stratégie premium
    recommendations.push(this.generatePremiumStrategy(analysisData, metrics, fullContext))
    
    // Stratégie value
    recommendations.push(this.generateValueStrategy(analysisData, metrics, fullContext))
    
    // Stratégie de pénétration
    recommendations.push(this.generatePenetrationStrategy(analysisData, metrics, fullContext))

    // Trier par confiance et pertinence
    return recommendations
      .sort((a, b) => this.calculateRecommendationScore(b, fullContext) - this.calculateRecommendationScore(a, fullContext))
  }

  /**
   * Stratégie compétitive - Prix aligné sur la concurrence
   */
  private generateCompetitiveStrategy(
    analysisData: VintedAnalysisResult,
    metrics: AdvancedMetrics,
    context: RecommendationContext
  ): PriceRecommendation {
    const median = metrics.descriptiveStats.median
    const q1 = metrics.descriptiveStats.quartiles[0]
    const q3 = metrics.descriptiveStats.quartiles[2]
    
    // Prix recommandé autour de la médiane avec ajustements
    let basePrice = median
    
    // Ajustements selon le contexte
    basePrice = this.applyContextAdjustments(basePrice, context)
    
    const priceRange = {
      min: q1,
      max: q3,
      optimal: basePrice
    }

    const confidence = this.calculateConfidence(basePrice, metrics, 'competitive')
    const expectedSaleTime = this.estimateSaleTime(basePrice, metrics, context)
    const marketShare = this.estimateMarketShare(basePrice, metrics)

    return {
      strategy: 'competitive',
      recommendedPrice: Math.round(basePrice * 100) / 100,
      confidence,
      reasoning: this.generateCompetitiveReasoning(basePrice, metrics, context),
      expectedSaleTime,
      marketShare,
      priceRange,
      competitivePosition: {
        percentile: this.calculatePercentile(basePrice, metrics),
        vsAverage: (basePrice - metrics.descriptiveStats.mean) / metrics.descriptiveStats.mean,
        vsMedian: (basePrice - median) / median
      },
      riskAssessment: this.assessRisk(basePrice, metrics, context, 'competitive')
    }
  }

  /**
   * Stratégie premium - Prix élevé pour maximiser la marge
   */
  private generatePremiumStrategy(
    analysisData: VintedAnalysisResult,
    metrics: AdvancedMetrics,
    context: RecommendationContext
  ): PriceRecommendation {
    const q3 = metrics.descriptiveStats.quartiles[2]
    const p90 = metrics.priceDistribution.percentiles[90] || q3 * 1.2
    
    // Prix premium entre Q3 et P90
    let basePrice = q3 + (p90 - q3) * 0.6
    
    // Ajustements selon le contexte
    basePrice = this.applyContextAdjustments(basePrice, context)
    
    const priceRange = {
      min: q3,
      max: p90,
      optimal: basePrice
    }

    const confidence = this.calculateConfidence(basePrice, metrics, 'premium')
    const expectedSaleTime = this.estimateSaleTime(basePrice, metrics, context)
    const marketShare = this.estimateMarketShare(basePrice, metrics)

    return {
      strategy: 'premium',
      recommendedPrice: Math.round(basePrice * 100) / 100,
      confidence,
      reasoning: this.generatePremiumReasoning(basePrice, metrics, context),
      expectedSaleTime,
      marketShare,
      priceRange,
      competitivePosition: {
        percentile: this.calculatePercentile(basePrice, metrics),
        vsAverage: (basePrice - metrics.descriptiveStats.mean) / metrics.descriptiveStats.mean,
        vsMedian: (basePrice - metrics.descriptiveStats.median) / metrics.descriptiveStats.median
      },
      riskAssessment: this.assessRisk(basePrice, metrics, context, 'premium')
    }
  }

  /**
   * Stratégie value - Bon rapport qualité-prix
   */
  private generateValueStrategy(
    analysisData: VintedAnalysisResult,
    metrics: AdvancedMetrics,
    context: RecommendationContext
  ): PriceRecommendation {
    const q1 = metrics.descriptiveStats.quartiles[0]
    const median = metrics.descriptiveStats.median
    
    // Prix value entre Q1 et médiane
    let basePrice = q1 + (median - q1) * 0.7
    
    // Ajustements selon le contexte
    basePrice = this.applyContextAdjustments(basePrice, context)
    
    const priceRange = {
      min: q1,
      max: median,
      optimal: basePrice
    }

    const confidence = this.calculateConfidence(basePrice, metrics, 'value')
    const expectedSaleTime = this.estimateSaleTime(basePrice, metrics, context)
    const marketShare = this.estimateMarketShare(basePrice, metrics)

    return {
      strategy: 'value',
      recommendedPrice: Math.round(basePrice * 100) / 100,
      confidence,
      reasoning: this.generateValueReasoning(basePrice, metrics, context),
      expectedSaleTime,
      marketShare,
      priceRange,
      competitivePosition: {
        percentile: this.calculatePercentile(basePrice, metrics),
        vsAverage: (basePrice - metrics.descriptiveStats.mean) / metrics.descriptiveStats.mean,
        vsMedian: (basePrice - metrics.descriptiveStats.median) / metrics.descriptiveStats.median
      },
      riskAssessment: this.assessRisk(basePrice, metrics, context, 'value')
    }
  }

  /**
   * Stratégie de pénétration - Prix bas pour gagner des parts de marché
   */
  private generatePenetrationStrategy(
    analysisData: VintedAnalysisResult,
    metrics: AdvancedMetrics,
    context: RecommendationContext
  ): PriceRecommendation {
    const q1 = metrics.descriptiveStats.quartiles[0]
    const p10 = metrics.priceDistribution.percentiles[10] || q1 * 0.8
    
    // Prix de pénétration entre P10 et Q1
    let basePrice = p10 + (q1 - p10) * 0.4
    
    // Ajustements selon le contexte
    basePrice = this.applyContextAdjustments(basePrice, context)
    
    const priceRange = {
      min: p10,
      max: q1,
      optimal: basePrice
    }

    const confidence = this.calculateConfidence(basePrice, metrics, 'penetration')
    const expectedSaleTime = this.estimateSaleTime(basePrice, metrics, context)
    const marketShare = this.estimateMarketShare(basePrice, metrics)

    return {
      strategy: 'penetration',
      recommendedPrice: Math.round(basePrice * 100) / 100,
      confidence,
      reasoning: this.generatePenetrationReasoning(basePrice, metrics, context),
      expectedSaleTime,
      marketShare,
      priceRange,
      competitivePosition: {
        percentile: this.calculatePercentile(basePrice, metrics),
        vsAverage: (basePrice - metrics.descriptiveStats.mean) / metrics.descriptiveStats.mean,
        vsMedian: (basePrice - metrics.descriptiveStats.median) / metrics.descriptiveStats.median
      },
      riskAssessment: this.assessRisk(basePrice, metrics, context, 'penetration')
    }
  }

  /**
   * Applique les ajustements contextuels au prix de base
   */
  private applyContextAdjustments(basePrice: number, context: RecommendationContext): number {
    let adjustedPrice = basePrice

    // Ajustement selon la condition de l'article
    const conditionMultipliers = {
      new: 1.15,
      excellent: 1.05,
      good: 1.0,
      fair: 0.9,
      poor: 0.75
    }
    adjustedPrice *= conditionMultipliers[context.itemCondition]

    // Ajustement saisonnier
    const seasonalityMultipliers = {
      peak: 1.1,
      normal: 1.0,
      low: 0.9
    }
    adjustedPrice *= seasonalityMultipliers[context.seasonality]

    // Ajustement selon l'urgence
    if (context.inventory.urgency === 'high') {
      adjustedPrice *= 0.95 // Réduction pour vente rapide
    } else if (context.inventory.urgency === 'low') {
      adjustedPrice *= 1.05 // Augmentation car pas pressé
    }

    return adjustedPrice
  }

  /**
   * Calcule la confiance dans une recommandation
   */
  private calculateConfidence(price: number, metrics: AdvancedMetrics, strategy: PricingStrategy): number {
    let confidence = 0.5 // Base

    // Confiance basée sur la qualité des données
    confidence += metrics.qualityScore.overall * 0.3

    // Confiance basée sur la taille de l'échantillon
    const sampleSizeScore = Math.min(1, metrics.qualityScore.sampleSize)
    confidence += sampleSizeScore * 0.2

    // Ajustement selon la stratégie
    const strategyConfidenceAdjustments = {
      competitive: 0.1, // Stratégie la plus sûre
      value: 0.05,
      premium: -0.05, // Plus risquée
      penetration: -0.1 // La plus risquée
    }
    confidence += strategyConfidenceAdjustments[strategy]

    // Confiance basée sur la position dans la distribution
    const percentile = this.calculatePercentile(price, metrics)
    if (percentile >= 0.25 && percentile <= 0.75) {
      confidence += 0.1 // Prix dans la zone "normale"
    }

    return Math.max(0, Math.min(1, confidence))
  }

  /**
   * Estime le temps de vente en jours
   */
  private estimateSaleTime(price: number, metrics: AdvancedMetrics, context: RecommendationContext): number {
    const percentile = this.calculatePercentile(price, metrics)
    
    // Temps de base selon le percentile (plus le prix est bas, plus c'est rapide)
    let baseDays = 7 + (percentile * 21) // Entre 7 et 28 jours
    
    // Ajustements contextuels
    if (context.itemCondition === 'new' || context.itemCondition === 'excellent') {
      baseDays *= 0.8
    } else if (context.itemCondition === 'poor') {
      baseDays *= 1.5
    }

    if (context.seasonality === 'peak') {
      baseDays *= 0.7
    } else if (context.seasonality === 'low') {
      baseDays *= 1.3
    }

    if (context.inventory.urgency === 'high') {
      baseDays *= 0.6 // Prix plus agressif = vente plus rapide
    }

    return Math.round(baseDays)
  }

  /**
   * Estime la part de marché potentielle
   */
  private estimateMarketShare(price: number, metrics: AdvancedMetrics): number {
    const percentile = this.calculatePercentile(price, metrics)
    
    // Part de marché inversement proportionnelle au percentile de prix
    // Prix bas = plus de part de marché
    const baseShare = (1 - percentile) * 0.3 // Maximum 30%
    
    return Math.max(0.01, baseShare) // Minimum 1%
  }

  /**
   * Calcule le percentile d'un prix dans la distribution
   */
  private calculatePercentile(price: number, metrics: AdvancedMetrics): number {
    const histogram = metrics.priceDistribution.histogram
    let cumulativeCount = 0
    let totalCount = 0

    // Calculer le total
    histogram.forEach(bin => {
      totalCount += bin.count
    })

    // Trouver le percentile
    for (const bin of histogram) {
      if (price >= bin.range[0] && price <= bin.range[1]) {
        // Interpolation linéaire dans le bin
        const binPosition = (price - bin.range[0]) / (bin.range[1] - bin.range[0])
        cumulativeCount += bin.count * binPosition
        break
      } else if (price < bin.range[0]) {
        break
      } else {
        cumulativeCount += bin.count
      }
    }

    return totalCount > 0 ? cumulativeCount / totalCount : 0.5
  }

  /**
   * Évalue le risque d'une stratégie de prix
   */
  private assessRisk(
    price: number, 
    metrics: AdvancedMetrics, 
    context: RecommendationContext, 
    strategy: PricingStrategy
  ): { level: 'low' | 'medium' | 'high'; factors: string[] } {
    const factors: string[] = []
    let riskScore = 0

    const percentile = this.calculatePercentile(price, metrics)

    // Risque basé sur le percentile
    if (percentile > 0.8) {
      riskScore += 2
      factors.push('Prix dans le segment premium (risque de vente lente)')
    } else if (percentile < 0.2) {
      riskScore += 1
      factors.push('Prix très compétitif (risque de marge faible)')
    }

    // Risque basé sur la volatilité du marché
    if (metrics.temporalAnalysis.volatility.overall > 0.2) {
      riskScore += 1
      factors.push('Marché volatil (prix instables)')
    }

    // Risque basé sur la qualité des données
    if (metrics.qualityScore.overall < 0.6) {
      riskScore += 1
      factors.push('Données limitées (prédictions moins fiables)')
    }

    // Risque basé sur la stratégie
    const strategyRisks = {
      competitive: 0,
      value: 0,
      premium: 1,
      penetration: 1
    }
    riskScore += strategyRisks[strategy]

    if (strategy === 'premium') {
      factors.push('Stratégie premium (risque de positionnement)')
    } else if (strategy === 'penetration') {
      factors.push('Stratégie de pénétration (risque de rentabilité)')
    }

    // Risque contextuel
    if (context.itemCondition === 'poor') {
      riskScore += 1
      factors.push('État de l\'article défavorable')
    }

    if (context.seasonality === 'low') {
      riskScore += 1
      factors.push('Période de faible demande saisonnière')
    }

    // Déterminer le niveau de risque
    let level: 'low' | 'medium' | 'high'
    if (riskScore <= 1) {
      level = 'low'
    } else if (riskScore <= 3) {
      level = 'medium'
    } else {
      level = 'high'
    }

    return { level, factors }
  }

  /**
   * Calcule un score global pour classer les recommandations
   */
  private calculateRecommendationScore(recommendation: PriceRecommendation, context: RecommendationContext): number {
    let score = recommendation.confidence * 100

    // Bonus selon les priorités de l'utilisateur
    if (context.userGoals.priority === 'speed' && recommendation.expectedSaleTime < 14) {
      score += 20
    } else if (context.userGoals.priority === 'profit' && recommendation.strategy === 'premium') {
      score += 15
    } else if (context.userGoals.priority === 'market_share' && recommendation.marketShare > 0.15) {
      score += 15
    }

    // Pénalité pour risque élevé si tolérance faible
    if (context.userGoals.riskTolerance === 'conservative' && recommendation.riskAssessment.level === 'high') {
      score -= 30
    } else if (context.userGoals.riskTolerance === 'aggressive' && recommendation.riskAssessment.level === 'low') {
      score += 10
    }

    return score
  }

  /**
   * Génère les explications pour la stratégie compétitive
   */
  private generateCompetitiveReasoning(price: number, metrics: AdvancedMetrics, context: RecommendationContext): string[] {
    const reasoning: string[] = []
    const median = metrics.descriptiveStats.median
    const percentile = this.calculatePercentile(price, metrics)

    reasoning.push(`Prix aligné sur la médiane du marché (${median.toFixed(2)}€)`)
    reasoning.push(`Positionnement au ${(percentile * 100).toFixed(0)}e percentile`)
    
    if (context.itemCondition === 'excellent' || context.itemCondition === 'new') {
      reasoning.push('Ajustement positif pour l\'excellent état de l\'article')
    }
    
    if (context.seasonality === 'peak') {
      reasoning.push('Ajustement saisonnier favorable')
    }

    reasoning.push('Stratégie équilibrée entre vitesse de vente et rentabilité')
    
    return reasoning
  }

  /**
   * Génère les explications pour la stratégie premium
   */
  private generatePremiumReasoning(price: number, metrics: AdvancedMetrics, context: RecommendationContext): string[] {
    const reasoning: string[] = []
    const q3 = metrics.descriptiveStats.quartiles[2]

    reasoning.push(`Prix premium au-dessus du 3e quartile (${q3.toFixed(2)}€)`)
    reasoning.push('Maximise la marge bénéficiaire')
    
    if (context.itemCondition === 'new' || context.itemCondition === 'excellent') {
      reasoning.push('Justifié par l\'excellent état de l\'article')
    }
    
    if (metrics.competitiveAnalysis.priceGaps.length > 0) {
      reasoning.push('Exploite un gap de prix identifié sur le marché')
    }

    reasoning.push('Convient si vous n\'êtes pas pressé de vendre')
    
    return reasoning
  }

  /**
   * Génère les explications pour la stratégie value
   */
  private generateValueReasoning(price: number, metrics: AdvancedMetrics, context: RecommendationContext): string[] {
    const reasoning: string[] = []
    const q1 = metrics.descriptiveStats.quartiles[0]

    reasoning.push(`Prix attractif proche du 1er quartile (${q1.toFixed(2)}€)`)
    reasoning.push('Excellent rapport qualité-prix pour les acheteurs')
    reasoning.push('Favorise une vente rapide tout en préservant une marge')
    
    if (context.inventory.urgency === 'medium' || context.inventory.urgency === 'high') {
      reasoning.push('Adapté à votre besoin de vente dans les délais')
    }

    reasoning.push('Stratégie recommandée pour la plupart des situations')
    
    return reasoning
  }

  /**
   * Génère les explications pour la stratégie de pénétration
   */
  private generatePenetrationReasoning(price: number, metrics: AdvancedMetrics, context: RecommendationContext): string[] {
    const reasoning: string[] = []
    const p10 = metrics.priceDistribution.percentiles[10] || metrics.descriptiveStats.quartiles[0] * 0.8

    reasoning.push(`Prix très compétitif proche du 10e percentile (${p10.toFixed(2)}€)`)
    reasoning.push('Maximise les chances de vente rapide')
    reasoning.push('Idéal pour gagner des parts de marché')
    
    if (context.inventory.urgency === 'high') {
      reasoning.push('Parfaitement adapté à votre urgence de vente')
    }
    
    if (context.inventory.quantity > 1) {
      reasoning.push('Efficace pour écouler un stock important')
    }

    reasoning.push('Attention : marge réduite mais rotation élevée')
    
    return reasoning
  }
}

export default PriceRecommendationEngine