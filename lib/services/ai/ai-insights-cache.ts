import { cacheService } from '@/app/api/v1/cache/cache-service';
import { cacheManager } from '@/lib/services/cache-manager';
import { logger } from '@/lib/utils/logging/logger';
import { marketAnalysisConfig } from './market-analysis-config';
import { sha256Hex } from '@/lib/utils/crypto';
import { AIInsights, AIRecommendations, TrendPrediction, AnomalyDetection } from '@/types/vinted-market-analysis';
import { VintedAnalysisResult } from '@/types/vinted-market-analysis';

/**
 * Service de cache spécialisé pour les insights IA
 * Étend les services de cache existants avec des fonctionnalités spécifiques à l'IA
 */
export class AIInsightsCacheService {
  private static instance: AIInsightsCacheService;
  private readonly CACHE_PREFIX = 'ai_insights';
  private readonly DEFAULT_TTL = 3600; // 1 heure
  
  // Métriques de cache
  private metrics = {
    hits: 0,
    misses: 0,
    sets: 0,
    invalidations: 0,
    errors: 0,
  };

  public static getInstance(): AIInsightsCacheService {
    if (!AIInsightsCacheService.instance) {
      AIInsightsCacheService.instance = new AIInsightsCacheService();
    }
    return AIInsightsCacheService.instance;
  }

  /**
   * Génère une clé de cache pour les insights IA
   */
  private generateInsightsCacheKey(
    analysisData: VintedAnalysisResult,
    analysisType: 'insights' | 'recommendations' | 'trends' | 'anomalies'
  ): string {
    // Créer un hash basé sur les données critiques pour l'analyse
    const keyData = {
      type: analysisType,
      itemCount: analysisData.items?.length || 0,
      priceRange: {
        min: Math.min(...(analysisData.items?.map(i => Number(i.price?.amount) || 0) || [0])),
        max: Math.max(...(analysisData.items?.map(i => Number(i.price?.amount) || 0) || [0])),
      },
      categories: [...new Set(analysisData.items?.map(i => (i as any).category).filter(Boolean) || [])].sort() as string[],
      dateRange: {
        start: analysisData.items?.[0]?.sold_at || '',
        end: analysisData.items?.[analysisData.items.length - 1]?.sold_at || '',
      },
      // Inclure la configuration IA pour invalider le cache si elle change
      configHash: this.getConfigHash(),
    };

    const keyString = JSON.stringify(keyData);
    return `${this.CACHE_PREFIX}:${analysisType}:${this.hashString(keyString)}`;
  }

  /**
   * Génère un hash simple pour une chaîne
   */
  private hashString(str: string): string {
    return sha256Hex(str);
  }

  /**
   * Génère un hash de la configuration actuelle
   */
  private getConfigHash(): string {
    const config = marketAnalysisConfig.getConfig();
    return this.hashString(JSON.stringify(config));
  }

  /**
   * Cache les insights IA
   */
  async cacheInsights(
    analysisData: VintedAnalysisResult,
    insights: AIInsights,
    ttl?: number
  ): Promise<void> {
    try {
      const cacheKey = this.generateInsightsCacheKey(analysisData, 'insights');
      const cacheTTL = ttl || this.getCacheTTL('insights');
      
      // Utiliser le cache persistant pour les insights
      await cacheService.set(cacheKey, {
        insights,
        timestamp: Date.now(),
        version: '1.0',
        configHash: this.getConfigHash(),
      }, cacheTTL);

      this.metrics.sets++;
      
    } catch (error) {
      this.metrics.errors++;
      logger.error('[AIInsightsCache] Erreur lors de la mise en cache des insights', {
        error: error.message,
        analysisDataSize: analysisData.items?.length || 0,
      });
    }
  }

  /**
   * Récupère les insights IA du cache
   */
  async getInsights(analysisData: VintedAnalysisResult): Promise<AIInsights | null> {
    try {
      const cacheKey = this.generateInsightsCacheKey(analysisData, 'insights');
      const cached = await cacheService.get<{
        insights: AIInsights;
        timestamp: number;
        version: string;
        configHash: string;
      }>(cacheKey);

      if (!cached) {
        this.metrics.misses++;
        return null;
      }

      // Vérifier si la configuration a changé
      if (cached.configHash !== this.getConfigHash()) {
        await this.invalidateInsights(analysisData);
        this.metrics.misses++;
        return null;
      }

      this.metrics.hits++;
      

      return cached.insights;
    } catch (error) {
      this.metrics.errors++;
      logger.error('[AIInsightsCache] Erreur lors de la récupération des insights', {
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Cache les recommandations IA
   */
  async cacheRecommendations(
    analysisData: VintedAnalysisResult,
    recommendations: AIRecommendations,
    ttl?: number
  ): Promise<void> {
    try {
      const cacheKey = this.generateInsightsCacheKey(analysisData, 'recommendations');
      const cacheTTL = ttl || this.getCacheTTL('recommendations');
      
      await cacheService.set(cacheKey, {
        recommendations,
        timestamp: Date.now(),
        version: '1.0',
        configHash: this.getConfigHash(),
      }, cacheTTL);

      this.metrics.sets++;
      
    } catch (error) {
      this.metrics.errors++;
      logger.error('[AIInsightsCache] Erreur lors de la mise en cache des recommandations', {
        error: error.message,
      });
    }
  }

  /**
   * Récupère les recommandations IA du cache
   */
  async getRecommendations(analysisData: VintedAnalysisResult): Promise<AIRecommendations | null> {
    try {
      const cacheKey = this.generateInsightsCacheKey(analysisData, 'recommendations');
      const cached = await cacheService.get<{
        recommendations: AIRecommendations;
        timestamp: number;
        version: string;
        configHash: string;
      }>(cacheKey);

      if (!cached) {
        this.metrics.misses++;
        return null;
      }

      if (cached.configHash !== this.getConfigHash()) {
        await this.invalidateRecommendations(analysisData);
        this.metrics.misses++;
        return null;
      }

      this.metrics.hits++;
      return cached.recommendations;
    } catch (error) {
      this.metrics.errors++;
      logger.error('[AIInsightsCache] Erreur lors de la récupération des recommandations', {
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Cache les prédictions de tendances
   */
  async cacheTrendPredictions(
    analysisData: VintedAnalysisResult,
    predictions: TrendPrediction,
    ttl?: number
  ): Promise<void> {
    try {
      const cacheKey = this.generateInsightsCacheKey(analysisData, 'trends');
      const cacheTTL = ttl || this.getCacheTTL('trends');
      
      await cacheService.set(cacheKey, {
        predictions,
        timestamp: Date.now(),
        version: '1.0',
        configHash: this.getConfigHash(),
      }, cacheTTL);

      this.metrics.sets++;
      
    } catch (error) {
      this.metrics.errors++;
      logger.error('[AIInsightsCache] Erreur lors de la mise en cache des prédictions', {
        error: error.message,
      });
    }
  }

  /**
   * Récupère les prédictions de tendances du cache
   */
  async getTrendPredictions(analysisData: VintedAnalysisResult): Promise<TrendPrediction | null> {
    try {
      const cacheKey = this.generateInsightsCacheKey(analysisData, 'trends');
      const cached = await cacheService.get<{
        predictions: TrendPrediction;
        timestamp: number;
        version: string;
        configHash: string;
      }>(cacheKey);

      if (!cached) {
        this.metrics.misses++;
        return null;
      }

      if (cached.configHash !== this.getConfigHash()) {
        await this.invalidateTrendPredictions(analysisData);
        this.metrics.misses++;
        return null;
      }

      this.metrics.hits++;
      return cached.predictions;
    } catch (error) {
      this.metrics.errors++;
      logger.error('[AIInsightsCache] Erreur lors de la récupération des prédictions', {
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Cache les détections d'anomalies
   */
  async cacheAnomalyDetections(
    analysisData: VintedAnalysisResult,
    anomalies: AnomalyDetection[],
    ttl?: number
  ): Promise<void> {
    try {
      const cacheKey = this.generateInsightsCacheKey(analysisData, 'anomalies');
      const cacheTTL = ttl || this.getCacheTTL('anomalies');
      
      await cacheService.set(cacheKey, {
        anomalies,
        timestamp: Date.now(),
        version: '1.0',
        configHash: this.getConfigHash(),
      }, cacheTTL);

      this.metrics.sets++;
      
    } catch (error) {
      this.metrics.errors++;
      logger.error('[AIInsightsCache] Erreur lors de la mise en cache des anomalies', {
        error: error.message,
      });
    }
  }

  /**
   * Récupère les détections d'anomalies du cache
   */
  async getAnomalyDetections(analysisData: VintedAnalysisResult): Promise<AnomalyDetection[] | null> {
    try {
      const cacheKey = this.generateInsightsCacheKey(analysisData, 'anomalies');
      const cached = await cacheService.get<{
        anomalies: AnomalyDetection[];
        timestamp: number;
        version: string;
        configHash: string;
      }>(cacheKey);

      if (!cached) {
        this.metrics.misses++;
        return null;
      }

      if (cached.configHash !== this.getConfigHash()) {
        await this.invalidateAnomalyDetections(analysisData);
        this.metrics.misses++;
        return null;
      }

      this.metrics.hits++;
      return cached.anomalies;
    } catch (error) {
      this.metrics.errors++;
      logger.error('[AIInsightsCache] Erreur lors de la récupération des anomalies', {
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Invalide les insights pour des données spécifiques
   */
  async invalidateInsights(analysisData: VintedAnalysisResult): Promise<void> {
    try {
      const cacheKey = this.generateInsightsCacheKey(analysisData, 'insights');
      await cacheService.delete(cacheKey);
      this.metrics.invalidations++;
      
    } catch (error) {
      this.metrics.errors++;
      logger.error('[AIInsightsCache] Erreur lors de l\'invalidation des insights', {
        error: error.message,
      });
    }
  }

  /**
   * Invalide les recommandations pour des données spécifiques
   */
  async invalidateRecommendations(analysisData: VintedAnalysisResult): Promise<void> {
    try {
      const cacheKey = this.generateInsightsCacheKey(analysisData, 'recommendations');
      await cacheService.delete(cacheKey);
      this.metrics.invalidations++;
      
    } catch (error) {
      this.metrics.errors++;
      logger.error('[AIInsightsCache] Erreur lors de l\'invalidation des recommandations', {
        error: error.message,
      });
    }
  }

  /**
   * Invalide les prédictions de tendances pour des données spécifiques
   */
  async invalidateTrendPredictions(analysisData: VintedAnalysisResult): Promise<void> {
    try {
      const cacheKey = this.generateInsightsCacheKey(analysisData, 'trends');
      await cacheService.delete(cacheKey);
      this.metrics.invalidations++;
      
    } catch (error) {
      this.metrics.errors++;
      logger.error('[AIInsightsCache] Erreur lors de l\'invalidation des prédictions', {
        error: error.message,
      });
    }
  }

  /**
   * Invalide les détections d'anomalies pour des données spécifiques
   */
  async invalidateAnomalyDetections(analysisData: VintedAnalysisResult): Promise<void> {
    try {
      const cacheKey = this.generateInsightsCacheKey(analysisData, 'anomalies');
      await cacheService.delete(cacheKey);
      this.metrics.invalidations++;
      
    } catch (error) {
      this.metrics.errors++;
      logger.error('[AIInsightsCache] Erreur lors de l\'invalidation des anomalies', {
        error: error.message,
      });
    }
  }

  /**
   * Invalide tous les caches IA
   */
  async invalidateAll(): Promise<void> {
    try {
      // Utiliser le cache manager pour nettoyer les entrées en mémoire
      await cacheManager.clear();
      
      // Note: Pour le cache persistant, nous devrions idéalement avoir une méthode
      // pour supprimer par préfixe, mais pour l'instant nous utilisons clear()
      await cacheService.clear();
      
      this.metrics.invalidations++;
      
      logger.info('[AIInsightsCache] Tous les caches IA invalidés');
    } catch (error) {
      this.metrics.errors++;
      logger.error('[AIInsightsCache] Erreur lors de l\'invalidation complète', {
        error: error.message,
      });
    }
  }

  /**
   * Obtient le TTL approprié selon le type de cache
   */
  private getCacheTTL(type: 'insights' | 'recommendations' | 'trends' | 'anomalies'): number {
    const config = marketAnalysisConfig.getPerformanceConfig();
    const baseTTL = config.cacheExpiry || this.DEFAULT_TTL;
    
    // Ajuster le TTL selon le type d'analyse
    switch (type) {
      case 'insights':
        return baseTTL; // TTL standard pour les insights
      case 'recommendations':
        return baseTTL * 0.5; // TTL plus court pour les recommandations (plus volatiles)
      case 'trends':
        return baseTTL * 2; // TTL plus long pour les prédictions (plus stables)
      case 'anomalies':
        return baseTTL * 0.25; // TTL très court pour les anomalies (très volatiles)
      default:
        return baseTTL;
    }
  }

  /**
   * Préchauffe le cache pour des analyses fréquemment demandées
   */
  async warmCache(
    analysisData: VintedAnalysisResult,
    insights?: AIInsights,
    recommendations?: AIRecommendations,
    trends?: TrendPrediction,
    anomalies?: AnomalyDetection[]
  ): Promise<void> {
    const warmingPromises: Promise<void>[] = [];

    if (insights) {
      warmingPromises.push(this.cacheInsights(analysisData, insights));
    }
    
    if (recommendations) {
      warmingPromises.push(this.cacheRecommendations(analysisData, recommendations));
    }
    
    if (trends) {
      warmingPromises.push(this.cacheTrendPredictions(analysisData, trends));
    }
    
    if (anomalies) {
      warmingPromises.push(this.cacheAnomalyDetections(analysisData, anomalies));
    }

    try {
      await Promise.all(warmingPromises);
      logger.info('[AIInsightsCache] Cache préchauffé avec succès', {
        itemsWarmed: warmingPromises.length,
      });
    } catch (error) {
      logger.error('[AIInsightsCache] Erreur lors du préchauffage du cache', {
        error: error.message,
      });
    }
  }

  /**
   * Retourne les métriques du cache
   */
  getMetrics() {
    const hitRate = this.metrics.hits + this.metrics.misses > 0 
      ? this.metrics.hits / (this.metrics.hits + this.metrics.misses)
      : 0;

    return {
      ...this.metrics,
      hitRate: Math.round(hitRate * 100) / 100,
      totalRequests: this.metrics.hits + this.metrics.misses,
    };
  }

  /**
   * Remet à zéro les métriques
   */
  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      invalidations: 0,
      errors: 0,
    };
  }
}

// Instance singleton
export const aiInsightsCache = AIInsightsCacheService.getInstance();