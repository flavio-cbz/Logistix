import { logger } from '@/lib/utils/logging/universal-logger';
import { aiMetricsCollector, AIQualityMetrics } from './ai-metrics-collector';
import { marketAnalysisConfig } from './market-analysis-config';
import { VintedAnalysisResult } from '@/types/vinted-market-analysis';
import { AIInsights, AIRecommendations, TrendPrediction, AnomalyDetection } from '@/types/vinted-market-analysis';

/**
 * Service d'évaluation de la qualité des insights IA
 */
export class AIQualityAssessor {
  private static instance: AIQualityAssessor;

  public static getInstance(): AIQualityAssessor {
    if (!AIQualityAssessor.instance) {
      AIQualityAssessor.instance = new AIQualityAssessor();
    }
    return AIQualityAssessor.instance;
  }

  /**
   * Évalue la qualité des insights IA générés
   */
  assessInsightsQuality(
    requestId: string,
    analysisData: VintedAnalysisResult,
    insights: AIInsights
  ): void {
    try {
      const qualityMetrics = this.calculateInsightsQuality(requestId, analysisData, insights);
      aiMetricsCollector.recordQualityMetrics(qualityMetrics);
      
    } catch (error) {
      logger.error('[AIQuality] Error assessing insights quality', {
        error: error.message,
        requestId,
      });
    }
  }

  /**
   * Évalue la qualité des recommandations IA
   */
  assessRecommendationsQuality(
    requestId: string,
    analysisData: VintedAnalysisResult,
    recommendations: AIRecommendations
  ): void {
    try {
      const qualityMetrics = this.calculateRecommendationsQuality(requestId, analysisData, recommendations);
      aiMetricsCollector.recordQualityMetrics(qualityMetrics);
      
    } catch (error) {
      logger.error('[AIQuality] Error assessing recommendations quality', {
        error: error.message,
        requestId,
      });
    }
  }

  /**
   * Évalue la qualité des prédictions de tendances
   */
  assessTrendPredictionsQuality(
    requestId: string,
    analysisData: VintedAnalysisResult,
    predictions: TrendPrediction
  ): void {
    try {
      const qualityMetrics = this.calculateTrendPredictionsQuality(requestId, analysisData, predictions);
      aiMetricsCollector.recordQualityMetrics(qualityMetrics);
      
    } catch (error) {
      logger.error('[AIQuality] Error assessing trend predictions quality', {
        error: error.message,
        requestId,
      });
    }
  }

  /**
   * Évalue la qualité des détections d'anomalies
   */
  assessAnomalyDetectionQuality(
    requestId: string,
    analysisData: VintedAnalysisResult,
    anomalies: AnomalyDetection[]
  ): void {
    try {
      const qualityMetrics = this.calculateAnomalyDetectionQuality(requestId, analysisData, anomalies);
      aiMetricsCollector.recordQualityMetrics(qualityMetrics);
      
    } catch (error) {
      logger.error('[AIQuality] Error assessing anomaly detection quality', {
        error: error.message,
        requestId,
      });
    }
  }

  /**
   * Calcule les métriques de qualité pour les insights
   */
  private calculateInsightsQuality(
    requestId: string,
    analysisData: VintedAnalysisResult,
    insights: AIInsights
  ): AIQualityMetrics {
    const dataQualityScore = this.assessDataQuality(analysisData);
    const insightCount = insights.keyFindings?.length || 0;
    
    // Calculer la confiance moyenne des insights
    const confidenceScores = insights.keyFindings?.map(finding => finding.confidence) || [];
    const averageConfidence = confidenceScores.length > 0
      ? confidenceScores.reduce((sum, conf) => sum + conf, 0) / confidenceScores.length
      : 0;

    // Évaluer la complétude des insights
    const completenessScore = this.assessInsightsCompleteness(insights);

    // Évaluer la pertinence (basée sur la diversité des types d'insights)
    const relevanceScore = this.assessInsightsRelevance(insights);

    return {
      requestId,
      analysisType: 'insights',
      timestamp: Date.now(),
      insightCount,
      averageConfidence,
      relevanceScore,
      dataQualityScore,
      completenessScore,
    };
  }

  /**
   * Calcule les métriques de qualité pour les recommandations
   */
  private calculateRecommendationsQuality(
    requestId: string,
    analysisData: VintedAnalysisResult,
    recommendations: AIRecommendations
  ): AIQualityMetrics {
    const dataQualityScore = this.assessDataQuality(analysisData);
    
    // Compter tous les types de recommandations
    const pricingCount = recommendations.pricing?.length || 0;
    const marketingCount = recommendations.marketing?.length || 0;
    const opportunityCount = recommendations.opportunities?.length || 0;
    const insightCount = pricingCount + marketingCount + opportunityCount;

    // Calculer la confiance moyenne
    const allRecommendations = [
      ...(recommendations.pricing || []),
      ...(recommendations.marketing || []),
      ...(recommendations.opportunities || []),
    ];
    
    const confidenceScores = allRecommendations
      .map(rec => rec.confidence)
      .filter(conf => conf !== undefined) as number[];
    
    const averageConfidence = confidenceScores.length > 0
      ? confidenceScores.reduce((sum, conf) => sum + conf, 0) / confidenceScores.length
      : recommendations.confidence || 0;

    // Évaluer la complétude des recommandations
    const completenessScore = this.assessRecommendationsCompleteness(recommendations);

    // Évaluer la pertinence des recommandations
    const relevanceScore = this.assessRecommendationsRelevance(recommendations, analysisData);

    return {
      requestId,
      analysisType: 'recommendations',
      timestamp: Date.now(),
      insightCount,
      averageConfidence,
      relevanceScore,
      dataQualityScore,
      completenessScore,
    };
  }

  /**
   * Calcule les métriques de qualité pour les prédictions de tendances
   */
  private calculateTrendPredictionsQuality(
    requestId: string,
    analysisData: VintedAnalysisResult,
    predictions: TrendPrediction
  ): AIQualityMetrics {
    const dataQualityScore = this.assessDataQuality(analysisData);
    const insightCount = predictions.predictions?.length || 0;
    
    // Calculer la confiance moyenne des prédictions
    const confidenceScores = predictions.predictions?.map(pred => pred.confidence) || [];
    const averageConfidence = confidenceScores.length > 0
      ? confidenceScores.reduce((sum, conf) => sum + conf, 0) / confidenceScores.length
      : 0;

    // Évaluer la complétude des prédictions
    const completenessScore = this.assessTrendPredictionsCompleteness(predictions);

    // Évaluer la pertinence des prédictions
    const relevanceScore = this.assessTrendPredictionsRelevance(predictions);

    return {
      requestId,
      analysisType: 'trends',
      timestamp: Date.now(),
      insightCount,
      averageConfidence,
      relevanceScore,
      dataQualityScore,
      completenessScore,
    };
  }

  /**
   * Calcule les métriques de qualité pour la détection d'anomalies
   */
  private calculateAnomalyDetectionQuality(
    requestId: string,
    analysisData: VintedAnalysisResult,
    anomalies: AnomalyDetection[]
  ): AIQualityMetrics {
    const dataQualityScore = this.assessDataQuality(analysisData);
    const insightCount = anomalies.length;
    
    // Calculer la confiance moyenne des détections
    const confidenceScores = anomalies.map(anomaly => anomaly.confidence);
    const averageConfidence = confidenceScores.length > 0
      ? confidenceScores.reduce((sum, conf) => sum + conf, 0) / confidenceScores.length
      : 0;

    // Évaluer la complétude des détections
    const completenessScore = this.assessAnomalyDetectionCompleteness(anomalies);

    // Évaluer la pertinence des détections
    const relevanceScore = this.assessAnomalyDetectionRelevance(anomalies, analysisData);

    return {
      requestId,
      analysisType: 'anomalies',
      timestamp: Date.now(),
      insightCount,
      averageConfidence,
      relevanceScore,
      dataQualityScore,
      completenessScore,
    };
  }

  /**
   * Évalue la qualité des données d'entrée
   */
  private assessDataQuality(analysisData: VintedAnalysisResult): number {
    const config = marketAnalysisConfig.getConfig();
    const validation = marketAnalysisConfig.validateDataQuality(analysisData.items || []);
    
    if (validation.valid) {
      return 1.0;
    }

    // Calculer un score basé sur les problèmes détectés
    let score = 1.0;
    const issues = validation.issues;

    // Pénaliser selon le type de problème
    issues.forEach(issue => {
      if (issue.includes('Échantillon trop petit')) {
        score -= 0.3;
      } else if (issue.includes('Champ requis manquant')) {
        score -= 0.2;
      } else if (issue.includes('données anciennes')) {
        score -= 0.1;
      } else {
        score -= 0.1;
      }
    });

    return Math.max(0, score);
  }

  /**
   * Évalue la complétude des insights
   */
  private assessInsightsCompleteness(insights: AIInsights): number {
    let score = 0;
    let maxScore = 0;

    // Vérifier la présence des éléments essentiels
    if (insights.summary) {
      score += 0.2;
    }
    maxScore += 0.2;

    if (insights.keyFindings && insights.keyFindings.length > 0) {
      score += 0.3;
    }
    maxScore += 0.3;

    if (insights.marketContext) {
      score += 0.2;
    }
    maxScore += 0.2;

    if (insights.priceAnalysis) {
      score += 0.3;
    }
    maxScore += 0.3;

    return maxScore > 0 ? score / maxScore : 0;
  }

  /**
   * Évalue la pertinence des insights
   */
  private assessInsightsRelevance(insights: AIInsights): number {
    if (!insights.keyFindings || insights.keyFindings.length === 0) {
      return 0;
    }

    // Vérifier la diversité des types d'insights
    const types = new Set(insights.keyFindings.map(finding => finding.type));
    const typeScore = Math.min(types.size / 4, 1); // Maximum 4 types

    // Vérifier la distribution des niveaux d'impact
    const impacts = insights.keyFindings.map(finding => finding.impact);
    const impactDistribution = {
      high: impacts.filter(i => i === 'high').length,
      medium: impacts.filter(i => i === 'medium').length,
      low: impacts.filter(i => i === 'low').length,
    };

    // Préférer un mélange équilibré
    const totalFindings = insights.keyFindings.length;
    const balanceScore = 1 - Math.abs(0.5 - (impactDistribution.high / totalFindings));

    return (typeScore + balanceScore) / 2;
  }

  /**
   * Évalue la complétude des recommandations
   */
  private assessRecommendationsCompleteness(recommendations: AIRecommendations): number {
    let score = 0;
    let maxScore = 0;

    // Vérifier la présence des différents types de recommandations
    if (recommendations.pricing && recommendations.pricing.length > 0) {
      score += 0.3;
    }
    maxScore += 0.3;

    if (recommendations.marketing && recommendations.marketing.length > 0) {
      score += 0.2;
    }
    maxScore += 0.2;

    if (recommendations.opportunities && recommendations.opportunities.length > 0) {
      score += 0.2;
    }
    maxScore += 0.2;

    if (recommendations.actionPlan) {
      score += 0.3;
    }
    maxScore += 0.3;

    return maxScore > 0 ? score / maxScore : 0;
  }

  /**
   * Évalue la pertinence des recommandations
   */
  private assessRecommendationsRelevance(
    recommendations: AIRecommendations,
    analysisData: VintedAnalysisResult
  ): number {
    // Vérifier si les recommandations sont adaptées aux données
    const itemCount = analysisData.items?.length || 0;
    const hasVariedPrices = this.hasVariedPrices(analysisData);
    
    let relevanceScore = 0.5; // Score de base

    // Ajuster selon la pertinence des recommandations de prix
    if (recommendations.pricing && recommendations.pricing.length > 0 && hasVariedPrices) {
      relevanceScore += 0.2;
    }

    // Ajuster selon la présence d'un plan d'action
    if (recommendations.actionPlan && itemCount > 10) {
      relevanceScore += 0.2;
    }

    // Ajuster selon la diversité des recommandations
    const recommendationTypes = [
      recommendations.pricing?.length || 0,
      recommendations.marketing?.length || 0,
      recommendations.opportunities?.length || 0,
    ].filter(count => count > 0).length;

    relevanceScore += (recommendationTypes / 3) * 0.1;

    return Math.min(relevanceScore, 1);
  }

  /**
   * Évalue la complétude des prédictions de tendances
   */
  private assessTrendPredictionsCompleteness(predictions: TrendPrediction): number {
    let score = 0;
    let maxScore = 0;

    if (predictions.predictions && predictions.predictions.length > 0) {
      score += 0.4;
    }
    maxScore += 0.4;

    if (predictions.scenarios && predictions.scenarios.length > 0) {
      score += 0.3;
    }
    maxScore += 0.3;

    if (predictions.timeframe) {
      score += 0.3;
    }
    maxScore += 0.3;

    return maxScore > 0 ? score / maxScore : 0;
  }

  /**
   * Évalue la pertinence des prédictions de tendances
   */
  private assessTrendPredictionsRelevance(predictions: TrendPrediction): number {
    if (!predictions.predictions || predictions.predictions.length === 0) {
      return 0;
    }

    // Vérifier la diversité des métriques prédites
    const metrics = new Set(predictions.predictions.map(pred => pred.metric));
    const metricScore = Math.min(metrics.size / 3, 1); // Maximum 3 métriques principales

    // Vérifier la présence de facteurs explicatifs
    const factorsScore = predictions.predictions.every(pred => 
      pred.factors && pred.factors.length > 0
    ) ? 1 : 0.5;

    return (metricScore + factorsScore) / 2;
  }

  /**
   * Évalue la complétude de la détection d'anomalies
   */
  private assessAnomalyDetectionCompleteness(anomalies: AnomalyDetection[]): number {
    if (anomalies.length === 0) {
      return 1; // Pas d'anomalies peut être normal
    }

    // Vérifier que chaque anomalie a les champs requis
    const completeAnomalies = anomalies.filter(anomaly => 
      anomaly.description &&
      anomaly.suggestedAction &&
      anomaly.severity &&
      anomaly.confidence !== undefined
    );

    return completeAnomalies.length / anomalies.length;
  }

  /**
   * Évalue la pertinence de la détection d'anomalies
   */
  private assessAnomalyDetectionRelevance(
    anomalies: AnomalyDetection[],
    analysisData: VintedAnalysisResult
  ): number {
    if (anomalies.length === 0) {
      return 0.8; // Pas d'anomalies peut être normal
    }

    // Vérifier la distribution des sévérités
    const severities = anomalies.map(a => a.severity);
    const severityDistribution = {
      critical: severities.filter(s => s === 'critical').length,
      high: severities.filter(s => s === 'high').length,
      medium: severities.filter(s => s === 'medium').length,
      low: severities.filter(s => s === 'low').length,
    };

    // Préférer moins d'anomalies critiques (plus crédible)
    const criticalRatio = severityDistribution.critical / anomalies.length;
    const relevanceScore = criticalRatio < 0.2 ? 1 : (1 - criticalRatio);

    return Math.max(0.3, relevanceScore);
  }

  /**
   * Vérifie si les données ont des prix variés
   */
  private hasVariedPrices(analysisData: VintedAnalysisResult): boolean {
    const prices = analysisData.items?.map(item => item.price) || [];
    if (prices.length < 2) return false;

    const minPrice = Math.min(...prices.map(p => Number(p.amount)));
    const maxPrice = Math.max(...prices.map(p => Number(p.amount)));
    
    return (maxPrice - minPrice) / minPrice > 0.2; // Variation de plus de 20%
  }

  /**
   * Enregistre le feedback utilisateur pour améliorer l'évaluation de qualité
   */
  recordUserFeedback(
    requestId: string,
    analysisType: 'insights' | 'recommendations' | 'trends' | 'anomalies',
    feedbackScore: number, // 1-5
    feedbackComments?: string
  ): void {
    try {
      // Normaliser le score de 1-5 à 0-1
      const normalizedScore = (feedbackScore - 1) / 4;
      
      // Mettre à jour les métriques existantes avec le feedback
      const qualityMetrics: AIQualityMetrics = {
        requestId,
        analysisType,
        timestamp: Date.now(),
        insightCount: 0, // Sera mis à jour si on trouve les métriques existantes
        averageConfidence: 0,
        userFeedbackScore: normalizedScore,
        dataQualityScore: 0,
        completenessScore: 0,
      };

      aiMetricsCollector.recordQualityMetrics(qualityMetrics);

      logger.info('[AIQuality] User feedback recorded', {
        requestId,
        analysisType,
        feedbackScore,
        normalizedScore,
        feedbackComments,
      });
    } catch (error) {
      logger.error('[AIQuality] Error recording user feedback', {
        error: error.message,
        requestId,
        analysisType,
      });
    }
  }
}

// Instance singleton
export const aiQualityAssessor = AIQualityAssessor.getInstance();