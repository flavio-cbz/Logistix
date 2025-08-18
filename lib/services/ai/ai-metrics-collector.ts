import { logger } from '@/lib/utils/logging/universal-logger';
import { marketAnalysisConfig } from './market-analysis-config';

/**
 * Interface pour les métriques de performance IA
 */
export interface AIPerformanceMetrics {
  requestId: string;
  analysisType: 'insights' | 'recommendations' | 'trends' | 'anomalies';
  startTime: number;
  endTime: number;
  processingTime: number;
  tokensUsed: number;
  estimatedCost: number;
  success: boolean;
  errorType?: string;
  confidence?: number;
  cacheHit: boolean;
  modelVersion?: string;
  provider?: string;
}

/**
 * Interface pour les métriques de qualité IA
 */
export interface AIQualityMetrics {
  requestId: string;
  analysisType: 'insights' | 'recommendations' | 'trends' | 'anomalies';
  timestamp: number;
  insightCount: number;
  averageConfidence: number;
  relevanceScore?: number;
  accuracyScore?: number;
  userFeedbackScore?: number;
  dataQualityScore: number;
  completenessScore: number;
}

/**
 * Interface pour les métriques de coût IA
 */
export interface AICostMetrics {
  timestamp: number;
  analysisType: 'insights' | 'recommendations' | 'trends' | 'anomalies';
  tokensUsed: number;
  estimatedCost: number;
  provider: string;
  modelVersion: string;
  userId?: string;
  requestId: string;
}

/**
 * Interface pour les métriques agrégées
 */
export interface AIAggregatedMetrics {
  timeframe: 'hour' | 'day' | 'week' | 'month';
  startTime: number;
  endTime: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageProcessingTime: number;
  totalTokensUsed: number;
  totalCost: number;
  averageConfidence: number;
  cacheHitRate: number;
  errorsByType: Record<string, number>;
  requestsByType: Record<string, number>;
  costByProvider: Record<string, number>;
}

/**
 * Service de collecte de métriques IA
 */
export class AIMetricsCollector {
  private static instance: AIMetricsCollector;
  private performanceMetrics: AIPerformanceMetrics[] = [];
  private qualityMetrics: AIQualityMetrics[] = [];
  private costMetrics: AICostMetrics[] = [];
  private readonly MAX_METRICS_HISTORY = 10000; // Limite pour éviter la surcharge mémoire
  private readonly CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 heure
  private cleanupTimer?: NodeJS.Timeout;

  private constructor() {
    this.startCleanupTimer();
  }

  public static getInstance(): AIMetricsCollector {
    if (!AIMetricsCollector.instance) {
      AIMetricsCollector.instance = new AIMetricsCollector();
    }
    return AIMetricsCollector.instance;
  }

  /**
   * Enregistre les métriques de performance pour une requête IA
   */
  recordPerformanceMetrics(metrics: AIPerformanceMetrics): void {
    try {
      this.performanceMetrics.push({
        ...metrics,
        timestamp: Date.now(),
      } as any);

      // Nettoyer si nécessaire
      if (this.performanceMetrics.length > this.MAX_METRICS_HISTORY) {
        this.performanceMetrics = this.performanceMetrics.slice(-this.MAX_METRICS_HISTORY * 0.8);
      }

      // Logger les métriques importantes

      // Alerter si les performances sont dégradées
      this.checkPerformanceAlerts(metrics);
    } catch (error) {
      logger.error('[AIMetrics] Error recording performance metrics', {
        error: error.message,
        requestId: metrics.requestId,
      });
    }
  }

  /**
   * Enregistre les métriques de qualité pour une analyse IA
   */
  recordQualityMetrics(metrics: AIQualityMetrics): void {
    try {
      this.qualityMetrics.push(metrics);

      // Nettoyer si nécessaire
      if (this.qualityMetrics.length > this.MAX_METRICS_HISTORY) {
        this.qualityMetrics = this.qualityMetrics.slice(-this.MAX_METRICS_HISTORY * 0.8);
      }


      // Alerter si la qualité est faible
      this.checkQualityAlerts(metrics);
    } catch (error) {
      logger.error('[AIMetrics] Error recording quality metrics', {
        error: error.message,
        requestId: metrics.requestId,
      });
    }
  }

  /**
   * Enregistre les métriques de coût pour une requête IA
   */
  recordCostMetrics(metrics: AICostMetrics): void {
    try {
      this.costMetrics.push(metrics);

      // Nettoyer si nécessaire
      if (this.costMetrics.length > this.MAX_METRICS_HISTORY) {
        this.costMetrics = this.costMetrics.slice(-this.MAX_METRICS_HISTORY * 0.8);
      }


      // Vérifier les limites de coût
      this.checkCostAlerts(metrics);
    } catch (error) {
      logger.error('[AIMetrics] Error recording cost metrics', {
        error: error.message,
        requestId: metrics.requestId,
      });
    }
  }

  /**
   * Calcule les métriques agrégées pour une période donnée
   */
  getAggregatedMetrics(
    timeframe: 'hour' | 'day' | 'week' | 'month',
    startTime?: number,
    endTime?: number
  ): AIAggregatedMetrics {
    const now = Date.now();
    const timeframeMs = this.getTimeframeMs(timeframe);
    
    const actualStartTime = startTime || (now - timeframeMs);
    const actualEndTime = endTime || now;

    // Filtrer les métriques dans la période
    const periodMetrics = this.performanceMetrics.filter(
      m => m.startTime >= actualStartTime && m.startTime <= actualEndTime
    );

    const periodCostMetrics = this.costMetrics.filter(
      m => m.timestamp >= actualStartTime && m.timestamp <= actualEndTime
    );

    // Calculer les agrégations
    const totalRequests = periodMetrics.length;
    const successfulRequests = periodMetrics.filter(m => m.success).length;
    const failedRequests = totalRequests - successfulRequests;

    const averageProcessingTime = totalRequests > 0
      ? periodMetrics.reduce((sum, m) => sum + m.processingTime, 0) / totalRequests
      : 0;

    const totalTokensUsed = periodMetrics.reduce((sum, m) => sum + m.tokensUsed, 0);
    const totalCost = periodCostMetrics.reduce((sum, m) => sum + m.estimatedCost, 0);

    const averageConfidence = totalRequests > 0
      ? periodMetrics
          .filter(m => m.confidence !== undefined)
          .reduce((sum, m) => sum + (m.confidence || 0), 0) / totalRequests
      : 0;

    const cacheHits = periodMetrics.filter(m => m.cacheHit).length;
    const cacheHitRate = totalRequests > 0 ? cacheHits / totalRequests : 0;

    // Grouper les erreurs par type
    const errorsByType: Record<string, number> = {};
    periodMetrics
      .filter(m => !m.success && m.errorType)
      .forEach(m => {
        errorsByType[m.errorType!] = (errorsByType[m.errorType!] || 0) + 1;
      });

    // Grouper les requêtes par type
    const requestsByType: Record<string, number> = {};
    periodMetrics.forEach(m => {
      requestsByType[m.analysisType] = (requestsByType[m.analysisType] || 0) + 1;
    });

    // Grouper les coûts par fournisseur
    const costByProvider: Record<string, number> = {};
    periodCostMetrics.forEach(m => {
      costByProvider[m.provider] = (costByProvider[m.provider] || 0) + m.estimatedCost;
    });

    return {
      timeframe,
      startTime: actualStartTime,
      endTime: actualEndTime,
      totalRequests,
      successfulRequests,
      failedRequests,
      averageProcessingTime: Math.round(averageProcessingTime),
      totalTokensUsed,
      totalCost: Math.round(totalCost * 100) / 100,
      averageConfidence: Math.round(averageConfidence * 100) / 100,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      errorsByType,
      requestsByType,
      costByProvider,
    };
  }

  /**
   * Obtient les métriques de performance récentes
   */
  getRecentPerformanceMetrics(limit: number = 100): AIPerformanceMetrics[] {
    return this.performanceMetrics
      .slice(-limit)
      .sort((a, b) => b.startTime - a.startTime);
  }

  /**
   * Obtient les métriques de qualité récentes
   */
  getRecentQualityMetrics(limit: number = 100): AIQualityMetrics[] {
    return this.qualityMetrics
      .slice(-limit)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Obtient les métriques de coût récentes
   */
  getRecentCostMetrics(limit: number = 100): AICostMetrics[] {
    return this.costMetrics
      .slice(-limit)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Calcule le coût total pour une période
   */
  getTotalCostForPeriod(startTime: number, endTime: number): number {
    return this.costMetrics
      .filter(m => m.timestamp >= startTime && m.timestamp <= endTime)
      .reduce((sum, m) => sum + m.estimatedCost, 0);
  }

  /**
   * Calcule le coût mensuel actuel
   */
  getCurrentMonthlyCost(): number {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    return this.getTotalCostForPeriod(startOfMonth, Date.now());
  }

  /**
   * Vérifie les alertes de performance
   */
  private checkPerformanceAlerts(metrics: AIPerformanceMetrics): void {
    const config = marketAnalysisConfig.getPerformanceConfig();
    
    // Alerte si le temps de traitement dépasse le seuil
    if (metrics.processingTime > config.maxProcessingTime * 0.8) {
      logger.warn('[AIMetrics] Performance alert: High processing time', {
        requestId: metrics.requestId,
        processingTime: metrics.processingTime,
        threshold: config.maxProcessingTime * 0.8,
        analysisType: metrics.analysisType,
      });
    }

    // Alerte si la confiance est faible
    if (metrics.confidence && metrics.confidence < 0.5) {
      logger.warn('[AIMetrics] Quality alert: Low confidence', {
        requestId: metrics.requestId,
        confidence: metrics.confidence,
        analysisType: metrics.analysisType,
      });
    }
  }

  /**
   * Vérifie les alertes de qualité
   */
  private checkQualityAlerts(metrics: AIQualityMetrics): void {
    // Alerte si la qualité des données est faible
    if (metrics.dataQualityScore < 0.6) {
      logger.warn('[AIMetrics] Quality alert: Low data quality', {
        requestId: metrics.requestId,
        dataQualityScore: metrics.dataQualityScore,
        analysisType: metrics.analysisType,
      });
    }

    // Alerte si la confiance moyenne est faible
    if (metrics.averageConfidence < 0.5) {
      logger.warn('[AIMetrics] Quality alert: Low average confidence', {
        requestId: metrics.requestId,
        averageConfidence: metrics.averageConfidence,
        analysisType: metrics.analysisType,
      });
    }
  }

  /**
   * Vérifie les alertes de coût
   */
  private checkCostAlerts(metrics: AICostMetrics): void {
    const config = marketAnalysisConfig.getConfig();
    const currentMonthlyCost = this.getCurrentMonthlyCost();
    const monthlyBudget = config.costLimits.maxMonthlyBudget;
    const alertThreshold = config.costLimits.alertThreshold;

    // Alerte si on approche du budget mensuel
    if (currentMonthlyCost >= monthlyBudget * alertThreshold) {
      logger.warn('[AIMetrics] Cost alert: Approaching monthly budget', {
        currentMonthlyCost,
        monthlyBudget,
        percentage: Math.round((currentMonthlyCost / monthlyBudget) * 100),
        requestId: metrics.requestId,
      });
    }

    // Alerte si le coût par analyse est élevé
    if (metrics.estimatedCost > config.costLimits.maxCostPerAnalysis * 0.8) {
      logger.warn('[AIMetrics] Cost alert: High cost per analysis', {
        requestId: metrics.requestId,
        estimatedCost: metrics.estimatedCost,
        threshold: config.costLimits.maxCostPerAnalysis * 0.8,
        analysisType: metrics.analysisType,
      });
    }
  }

  /**
   * Convertit un timeframe en millisecondes
   */
  private getTimeframeMs(timeframe: 'hour' | 'day' | 'week' | 'month'): number {
    switch (timeframe) {
      case 'hour':
        return 60 * 60 * 1000;
      case 'day':
        return 24 * 60 * 60 * 1000;
      case 'week':
        return 7 * 24 * 60 * 60 * 1000;
      case 'month':
        return 30 * 24 * 60 * 60 * 1000;
      default:
        return 24 * 60 * 60 * 1000;
    }
  }

  /**
   * Démarre le timer de nettoyage automatique
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupOldMetrics();
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * Nettoie les anciennes métriques pour éviter la surcharge mémoire
   */
  private cleanupOldMetrics(): void {
    const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 jours

    const initialPerformanceCount = this.performanceMetrics.length;
    const initialQualityCount = this.qualityMetrics.length;
    const initialCostCount = this.costMetrics.length;

    this.performanceMetrics = this.performanceMetrics.filter(m => m.startTime > cutoffTime);
    this.qualityMetrics = this.qualityMetrics.filter(m => m.timestamp > cutoffTime);
    this.costMetrics = this.costMetrics.filter(m => m.timestamp > cutoffTime);

    const cleanedPerformance = initialPerformanceCount - this.performanceMetrics.length;
    const cleanedQuality = initialQualityCount - this.qualityMetrics.length;
    const cleanedCost = initialCostCount - this.costMetrics.length;

    if (cleanedPerformance > 0 || cleanedQuality > 0 || cleanedCost > 0) {
      logger.info('[AIMetrics] Cleaned up old metrics', {
        cleanedPerformance,
        cleanedQuality,
        cleanedCost,
        cutoffTime: new Date(cutoffTime).toISOString(),
      });
    }
  }

  /**
   * Arrête le service et nettoie les ressources
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    
    this.performanceMetrics = [];
    this.qualityMetrics = [];
    this.costMetrics = [];
  }

  /**
   * Exporte toutes les métriques pour sauvegarde ou analyse
   */
  exportMetrics(): {
    performance: AIPerformanceMetrics[];
    quality: AIQualityMetrics[];
    cost: AICostMetrics[];
    exportTime: number;
  } {
    return {
      performance: [...this.performanceMetrics],
      quality: [...this.qualityMetrics],
      cost: [...this.costMetrics],
      exportTime: Date.now(),
    };
  }

  /**
   * Importe des métriques depuis une sauvegarde
   */
  importMetrics(data: {
    performance?: AIPerformanceMetrics[];
    quality?: AIQualityMetrics[];
    cost?: AICostMetrics[];
  }): void {
    if (data.performance) {
      this.performanceMetrics = [...data.performance];
    }
    if (data.quality) {
      this.qualityMetrics = [...data.quality];
    }
    if (data.cost) {
      this.costMetrics = [...data.cost];
    }

    logger.info('[AIMetrics] Metrics imported successfully', {
      performanceCount: this.performanceMetrics.length,
      qualityCount: this.qualityMetrics.length,
      costCount: this.costMetrics.length,
    });
  }
}

// Instance singleton
export const aiMetricsCollector = AIMetricsCollector.getInstance();