import { logger } from '@/lib/utils/logging/logger';
import { aiMetricsCollector, AIAggregatedMetrics } from './ai-metrics-collector';
import { marketAnalysisConfig } from './market-analysis-config';

/**
 * Interface pour les recommandations d'optimisation des coûts
 */
export interface CostOptimizationRecommendation {
  type: 'cache_optimization' | 'model_selection' | 'request_batching' | 'usage_pattern' | 'budget_adjustment';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  potentialSavings: number; // en euros
  implementationEffort: 'low' | 'medium' | 'high';
  actionSteps: string[];
  estimatedImpact: string;
}

/**
 * Interface pour l'analyse des coûts
 */
export interface CostAnalysis {
  currentPeriodCost: number;
  previousPeriodCost: number;
  costTrend: 'increasing' | 'decreasing' | 'stable';
  costPerRequest: number;
  costPerToken: number;
  mostExpensiveAnalysisType: string;
  costBreakdown: {
    byProvider: Record<string, number>;
    byAnalysisType: Record<string, number>;
    byTimeOfDay: Record<string, number>;
  };
  projectedMonthlyCost: number;
  budgetUtilization: number;
}

/**
 * Service d'optimisation des coûts IA
 */
export class AICostOptimizer {
  private static instance: AICostOptimizer;

  public static getInstance(): AICostOptimizer {
    if (!AICostOptimizer.instance) {
      AICostOptimizer.instance = new AICostOptimizer();
    }
    return AICostOptimizer.instance;
  }

  /**
   * Analyse les coûts actuels et génère des recommandations d'optimisation
   */
  generateOptimizationRecommendations(
    timeframe: 'day' | 'week' | 'month' = 'week'
  ): CostOptimizationRecommendation[] {
    try {
      const metrics = aiMetricsCollector.getAggregatedMetrics(timeframe);
      const analysis = this.analyzeCosts(metrics);
      const recommendations: CostOptimizationRecommendation[] = [];

      // Recommandation d'optimisation du cache
      if (metrics.cacheHitRate < 0.7) {
        recommendations.push({
          type: 'cache_optimization',
          priority: 'high',
          title: 'Améliorer l\'efficacité du cache',
          description: `Le taux de succès du cache est de ${(metrics.cacheHitRate * 100).toFixed(1)}%. Une amélioration pourrait réduire significativement les coûts.`,
          potentialSavings: this.calculateCacheSavings(metrics),
          implementationEffort: 'medium',
          actionSteps: [
            'Augmenter la durée de vie du cache pour les analyses stables',
            'Implémenter un cache prédictif pour les requêtes fréquentes',
            'Optimiser les clés de cache pour une meilleure réutilisation',
          ],
          estimatedImpact: `Réduction potentielle de ${this.calculateCacheSavings(metrics).toFixed(2)}€ par ${timeframe}`,
        });
      }

      // Recommandation de sélection de modèle
      if (analysis.costPerRequest > 0.1) {
        recommendations.push({
          type: 'model_selection',
          priority: 'medium',
          title: 'Optimiser la sélection des modèles IA',
          description: `Le coût moyen par requête (${analysis.costPerRequest.toFixed(3)}€) suggère l'utilisation de modèles plus coûteux que nécessaire.`,
          potentialSavings: this.calculateModelOptimizationSavings(metrics),
          implementationEffort: 'low',
          actionSteps: [
            'Utiliser des modèles moins coûteux pour les analyses simples',
            'Implémenter une sélection automatique de modèle basée sur la complexité',
            'Tester des modèles alternatifs avec un bon rapport qualité/prix',
          ],
          estimatedImpact: `Réduction potentielle de 20-30% des coûts`,
        });
      }

      // Recommandation de traitement par lots
      if (metrics.totalRequests > 100 && this.detectBatchingOpportunity(metrics)) {
        recommendations.push({
          type: 'request_batching',
          priority: 'medium',
          title: 'Implémenter le traitement par lots',
          description: 'Des patterns de requêtes similaires ont été détectés. Le traitement par lots pourrait réduire les coûts.',
          potentialSavings: this.calculateBatchingSavings(metrics),
          implementationEffort: 'high',
          actionSteps: [
            'Identifier les requêtes similaires pouvant être groupées',
            'Implémenter un système de file d\'attente pour le traitement par lots',
            'Optimiser les prompts pour traiter plusieurs éléments simultanément',
          ],
          estimatedImpact: `Réduction potentielle de 15-25% des coûts`,
        });
      }

      // Recommandation d'ajustement du budget
      if (analysis.budgetUtilization > 0.8) {
        recommendations.push({
          type: 'budget_adjustment',
          priority: 'high',
          title: 'Ajuster le budget ou optimiser l\'utilisation',
          description: `Utilisation du budget à ${(analysis.budgetUtilization * 100).toFixed(1)}%. Action requise pour éviter les dépassements.`,
          potentialSavings: 0,
          implementationEffort: 'low',
          actionSteps: [
            'Réviser les limites de coût par analyse',
            'Implémenter des alertes préventives',
            'Considérer l\'augmentation du budget si justifiée par la valeur',
          ],
          estimatedImpact: 'Éviter les dépassements de budget et les interruptions de service',
        });
      }

      // Recommandation d'optimisation des patterns d'usage
      const usagePatterns = this.analyzeUsagePatterns(metrics);
      if (usagePatterns.hasInefficiencies) {
        recommendations.push({
          type: 'usage_pattern',
          priority: 'low',
          title: 'Optimiser les patterns d\'utilisation',
          description: 'Des inefficacités dans les patterns d\'utilisation ont été détectées.',
          potentialSavings: this.calculateUsagePatternSavings(metrics),
          implementationEffort: 'medium',
          actionSteps: [
            'Analyser les pics d\'utilisation et lisser la charge',
            'Implémenter des limites de débit intelligentes',
            'Optimiser les horaires de traitement des analyses non urgentes',
          ],
          estimatedImpact: `Réduction potentielle de 10-15% des coûts`,
        });
      }

      // Trier par priorité et impact potentiel
      recommendations.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return b.potentialSavings - a.potentialSavings;
      });

      logger.info('[AICostOptimizer] Generated optimization recommendations', {
        recommendationCount: recommendations.length,
        totalPotentialSavings: recommendations.reduce((sum, r) => sum + r.potentialSavings, 0),
        timeframe,
      });

      return recommendations;
    } catch (error) {
      logger.error('[AICostOptimizer] Error generating optimization recommendations', {
        error: error.message,
        timeframe,
      });
      return [];
    }
  }

  /**
   * Analyse détaillée des coûts
   */
  analyzeCosts(metrics: AIAggregatedMetrics): CostAnalysis {
    const config = marketAnalysisConfig.getConfig();
    const currentMonthlyCost = aiMetricsCollector.getCurrentMonthlyCost();
    
    // Calculer le coût de la période précédente pour comparaison
    const previousPeriodMetrics = this.getPreviousPeriodMetrics(metrics);
    
    // Déterminer la tendance des coûts
    const costTrend = this.determineCostTrend(metrics.totalCost, previousPeriodMetrics?.totalCost || 0);
    
    // Calculer les métriques de coût
    const costPerRequest = metrics.totalRequests > 0 ? metrics.totalCost / metrics.totalRequests : 0;
    const costPerToken = metrics.totalTokensUsed > 0 ? metrics.totalCost / metrics.totalTokensUsed : 0;
    
    // Identifier le type d'analyse le plus coûteux
    const mostExpensiveAnalysisType = this.findMostExpensiveAnalysisType(metrics);
    
    // Projeter le coût mensuel basé sur la tendance actuelle
    const projectedMonthlyCost = this.projectMonthlyCost(metrics);
    
    // Calculer l'utilisation du budget
    const budgetUtilization = currentMonthlyCost / config.costLimits.maxMonthlyBudget;

    return {
      currentPeriodCost: metrics.totalCost,
      previousPeriodCost: previousPeriodMetrics?.totalCost || 0,
      costTrend,
      costPerRequest,
      costPerToken,
      mostExpensiveAnalysisType,
      costBreakdown: {
        byProvider: metrics.costByProvider,
        byAnalysisType: this.calculateCostByAnalysisType(metrics),
        byTimeOfDay: this.calculateCostByTimeOfDay(metrics),
      },
      projectedMonthlyCost,
      budgetUtilization,
    };
  }

  /**
   * Calcule les économies potentielles d'optimisation du cache
   */
  private calculateCacheSavings(metrics: AIAggregatedMetrics): number {
    const currentCacheHitRate = metrics.cacheHitRate;
    const targetCacheHitRate = 0.8; // Objectif de 80%
    const improvementPotential = Math.max(0, targetCacheHitRate - currentCacheHitRate);
    
    // Estimer les économies basées sur les requêtes qui pourraient être mises en cache
    const potentialCachedRequests = metrics.totalRequests * improvementPotential;
    const avgCostPerRequest = metrics.totalRequests > 0 ? metrics.totalCost / metrics.totalRequests : 0;
    
    return potentialCachedRequests * avgCostPerRequest;
  }

  /**
   * Calcule les économies potentielles d'optimisation des modèles
   */
  private calculateModelOptimizationSavings(metrics: AIAggregatedMetrics): number {
    // Estimer qu'on peut réduire les coûts de 25% en moyenne avec une meilleure sélection de modèles
    return metrics.totalCost * 0.25;
  }

  /**
   * Calcule les économies potentielles du traitement par lots
   */
  private calculateBatchingSavings(metrics: AIAggregatedMetrics): number {
    // Estimer qu'on peut réduire les coûts de 20% avec le traitement par lots
    return metrics.totalCost * 0.20;
  }

  /**
   * Calcule les économies potentielles d'optimisation des patterns d'usage
   */
  private calculateUsagePatternSavings(metrics: AIAggregatedMetrics): number {
    // Estimer qu'on peut réduire les coûts de 12% avec de meilleurs patterns d'usage
    return metrics.totalCost * 0.12;
  }

  /**
   * Détecte les opportunités de traitement par lots
   */
  private detectBatchingOpportunity(metrics: AIAggregatedMetrics): boolean {
    // Logique simplifiée : si on a beaucoup de requêtes du même type
    const maxRequestsForType = Math.max(...Object.values(metrics.requestsByType));
    const totalRequests = metrics.totalRequests;
    
    return maxRequestsForType / totalRequests > 0.6; // Plus de 60% du même type
  }

  /**
   * Analyse les patterns d'utilisation
   */
  private analyzeUsagePatterns(metrics: AIAggregatedMetrics): { hasInefficiencies: boolean } {
    // Logique simplifiée : détecter les inefficacités basées sur les métriques
    const errorRate = metrics.totalRequests > 0 ? metrics.failedRequests / metrics.totalRequests : 0;
    const lowCacheHitRate = metrics.cacheHitRate < 0.5;
    
    return {
      hasInefficiencies: errorRate > 0.1 || lowCacheHitRate,
    };
  }

  /**
   * Obtient les métriques de la période précédente
   */
  private getPreviousPeriodMetrics(currentMetrics: AIAggregatedMetrics): AIAggregatedMetrics | null {
    // Pour l'instant, retourner null - dans une implémentation complète,
    // on récupérerait les métriques de la période précédente depuis le stockage
    return null;
  }

  /**
   * Détermine la tendance des coûts
   */
  private determineCostTrend(currentCost: number, previousCost: number): 'increasing' | 'decreasing' | 'stable' {
    if (previousCost === 0) return 'stable';
    
    const changePercent = (currentCost - previousCost) / previousCost;
    
    if (changePercent > 0.1) return 'increasing';
    if (changePercent < -0.1) return 'decreasing';
    return 'stable';
  }

  /**
   * Trouve le type d'analyse le plus coûteux
   */
  private findMostExpensiveAnalysisType(metrics: AIAggregatedMetrics): string {
    const requestsByType = metrics.requestsByType;
    const avgCostPerRequest = metrics.totalRequests > 0 ? metrics.totalCost / metrics.totalRequests : 0;
    
    // Logique simplifiée : le type avec le plus de requêtes est considéré comme le plus coûteux
    let maxType = '';
    let maxCount = 0;
    
    for (const [type, count] of Object.entries(requestsByType)) {
      if (count > maxCount) {
        maxCount = count;
        maxType = type;
      }
    }
    
    return maxType || 'unknown';
  }

  /**
   * Projette le coût mensuel
   */
  private projectMonthlyCost(metrics: AIAggregatedMetrics): number {
    // Projection simple basée sur le coût actuel et la période
    const daysInPeriod = this.getDaysInTimeframe(metrics.timeframe);
    const dailyCost = metrics.totalCost / daysInPeriod;
    
    return dailyCost * 30; // Projection sur 30 jours
  }

  /**
   * Calcule le coût par type d'analyse
   */
  private calculateCostByAnalysisType(metrics: AIAggregatedMetrics): Record<string, number> {
    const avgCostPerRequest = metrics.totalRequests > 0 ? metrics.totalCost / metrics.totalRequests : 0;
    const costByType: Record<string, number> = {};
    
    for (const [type, count] of Object.entries(metrics.requestsByType)) {
      costByType[type] = count * avgCostPerRequest;
    }
    
    return costByType;
  }

  /**
   * Calcule le coût par heure de la journée
   */
  private calculateCostByTimeOfDay(metrics: AIAggregatedMetrics): Record<string, number> {
    // Pour l'instant, retourner une distribution uniforme
    // Dans une implémentation complète, on analyserait les timestamps des requêtes
    const hourlyDistribution: Record<string, number> = {};
    const costPerHour = metrics.totalCost / 24;
    
    for (let hour = 0; hour < 24; hour++) {
      hourlyDistribution[`${hour}h`] = costPerHour;
    }
    
    return hourlyDistribution;
  }

  /**
   * Obtient le nombre de jours dans une période
   */
  private getDaysInTimeframe(timeframe: 'hour' | 'day' | 'week' | 'month'): number {
    switch (timeframe) {
      case 'hour': return 1/24;
      case 'day': return 1;
      case 'week': return 7;
      case 'month': return 30;
      default: return 1;
    }
  }

  /**
   * Génère un rapport d'optimisation complet
   */
  generateOptimizationReport(timeframe: 'day' | 'week' | 'month' = 'week'): {
    analysis: CostAnalysis;
    recommendations: CostOptimizationRecommendation[];
    summary: {
      totalPotentialSavings: number;
      implementationPriority: string[];
      quickWins: CostOptimizationRecommendation[];
    };
  } {
    const metrics = aiMetricsCollector.getAggregatedMetrics(timeframe);
    const analysis = this.analyzeCosts(metrics);
    const recommendations = this.generateOptimizationRecommendations(timeframe);
    
    const totalPotentialSavings = recommendations.reduce((sum, r) => sum + r.potentialSavings, 0);
    const implementationPriority = recommendations
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const effortOrder = { low: 3, medium: 2, high: 1 };
        return (priorityOrder[b.priority] * effortOrder[b.implementationEffort]) - 
               (priorityOrder[a.priority] * effortOrder[a.implementationEffort]);
      })
      .map(r => r.title);
    
    const quickWins = recommendations.filter(r => 
      r.implementationEffort === 'low' && r.potentialSavings > 0
    );

    return {
      analysis,
      recommendations,
      summary: {
        totalPotentialSavings,
        implementationPriority,
        quickWins,
      },
    };
  }
}

// Instance singleton
export const aiCostOptimizer = AICostOptimizer.getInstance();