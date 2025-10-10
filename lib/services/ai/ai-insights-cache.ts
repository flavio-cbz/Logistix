import { cacheService } from "@/app/api/v1/cache/cache-service";
import { logger } from "@/lib/utils/logging/logger";
import { marketAnalysisConfig } from "./market-analysis-config";
import { sha256Hex } from "@/lib/utils/crypto";
import type {
  AIInsights,
  AIRecommendations,
  TrendPrediction,
  AnomalyDetection,
  VintedAnalysisResult,
} from "@/types/vinted-market-analysis";
import { getErrorMessage } from "@/lib/utils/error-utils";

/**
 * Service de cache spécialisé pour les insights IA.
 * - Typages stricts et validations basiques des données en cache
 * - Journalisation robuste et métriques internes
 * - TTL adapté au type d'artefact IA (insights, recommandations, tendances, anomalies)
 * - Compatibilité ascendante: expose getStats() et clear() en plus des méthodes existantes
 */

type AnalysisType = "insights" | "recommendations" | "trends" | "anomalies";

interface BaseCacheEntry {
  timestamp: number;
  version: "1.0";
  configHash: string;
}

interface InsightsEntry extends BaseCacheEntry {
  insights: AIInsights;
}

interface RecommendationsEntry extends BaseCacheEntry {
  recommendations: AIRecommendations;
}

interface TrendsEntry extends BaseCacheEntry {
  predictions: TrendPrediction;
}

interface AnomaliesEntry extends BaseCacheEntry {
  anomalies: AnomalyDetection[];
}

type InternalMetrics = {
  hits: number;
  misses: number;
  sets: number;
  invalidations: number;
  errors: number;
};

export interface CacheMetrics extends InternalMetrics {
  hitRate: number;
  totalRequests: number;
}

/**
 * Service singleton de cache des insights IA
 */
export class AIInsightsCacheService {
  private static instance: AIInsightsCacheService;

  private readonly CACHE_PREFIX = "ai_insights";
  private readonly DEFAULT_TTL = 3600; // secondes

  // Métriques de cache
  private metrics: InternalMetrics = {
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
    analysisType: AnalysisType,
  ): string {
    const items = Array.isArray(analysisData?.items) ? analysisData.items : [];

    const prices = items.map((i) => {
      const amt = (i as any)?.price?.amount;
      const n = Number(amt);
      return Number.isFinite(n) ? n : 0;
    });
    const minPrice = prices.length ? Math.min(...prices) : 0;
    const maxPrice = prices.length ? Math.max(...prices) : 0;

    const categories = Array.from(
      new Set(
        items
          .map((i) => {
            const c = (i as any)?.category;
            return typeof c === "string" ? c : "";
          })
          .filter((c: string) => c && c.length > 0),
      ),
    ).sort();

    const soldDates = items
      .map((i) => (i as any)?.sold_at)
      .filter(
        (d: unknown): d is string => typeof d === "string" && d.length > 0,
      );

    const dateRange = {
      start: soldDates[0]! ?? "",
      end: soldDates.length ? soldDates[soldDates.length - 1]! : "",
    };

    // Inclure la configuration IA pour invalider le cache si elle change
    const keyData = {
      type: analysisType,
      itemCount: items.length,
      priceRange: { min: minPrice, max: maxPrice },
      categories,
      dateRange,
      configHash: this.getConfigHash(),
    };

    const keyString = JSON.stringify(keyData);
    return `${this.CACHE_PREFIX}:${analysisType}:${this.hashString(keyString)}`;
  }

  /**
   * Génère un hash pour une chaîne
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
   * Valide la forme d'une entrée "insights"
   */
  private isInsightsEntry(obj: unknown): obj is InsightsEntry {
    if (!obj || typeof obj !== "object") return false;
    const o = obj as Partial<InsightsEntry>;
    return (
      typeof o.timestamp === "number" &&
      typeof o.configHash === "string" &&
      (o.version === "1.0" || o.version === undefined) &&
      Object.prototype.hasOwnProperty.call(o as object, "insights")
    );
  }

  /**
   * Valide la forme d'une entrée "recommendations"
   */
  private isRecommendationsEntry(obj: unknown): obj is RecommendationsEntry {
    if (!obj || typeof obj !== "object") return false;
    const o = obj as Partial<RecommendationsEntry>;
    return (
      typeof o.timestamp === "number" &&
      typeof o.configHash === "string" &&
      (o.version === "1.0" || o.version === undefined) &&
      Object.prototype.hasOwnProperty.call(o as object, "recommendations")
    );
  }

  /**
   * Valide la forme d'une entrée "trends"
   */
  private isTrendsEntry(obj: unknown): obj is TrendsEntry {
    if (!obj || typeof obj !== "object") return false;
    const o = obj as Partial<TrendsEntry>;
    return (
      typeof o.timestamp === "number" &&
      typeof o.configHash === "string" &&
      (o.version === "1.0" || o.version === undefined) &&
      Object.prototype.hasOwnProperty.call(o as object, "predictions")
    );
  }

  /**
   * Valide la forme d'une entrée "anomalies"
   */
  private isAnomaliesEntry(obj: unknown): obj is AnomaliesEntry {
    if (!obj || typeof obj !== "object") return false;
    const o = obj as Partial<AnomaliesEntry>;
    return (
      typeof o.timestamp === "number" &&
      typeof o.configHash === "string" &&
      (o.version === "1.0" || o.version === undefined) &&
      Array.isArray(o.anomalies)
    );
  }

  /**
   * Cache les insights IA
   */
  async cacheInsights(
    analysisData: VintedAnalysisResult,
    insights: AIInsights,
    ttl?: number,
  ): Promise<void> {
    try {
      const cacheKey = this.generateInsightsCacheKey(analysisData, "insights");
      const cacheTTL = this.normalizeTTL(ttl ?? this.getCacheTTL("insights"));

      const entry: InsightsEntry = {
        insights,
        timestamp: Date.now(),
        version: "1.0",
        configHash: this.getConfigHash(),
      };

      await cacheService.set(cacheKey, entry, cacheTTL);
      this.metrics.sets++;
    } catch (error) {
      this.metrics.errors++;
      logger.error(
        "[AIInsightsCache] Erreur lors de la mise en cache des insights",
        {
          error: getErrorMessage(error),
          analysisDataSize: Array.isArray(analysisData?.items)
            ? analysisData.items.length
            : 0,
        },
      );
    }
  }

  /**
   * Récupère les insights IA du cache
   */
  async getInsights(
    analysisData: VintedAnalysisResult,
  ): Promise<AIInsights | null> {
    try {
      const cacheKey = this.generateInsightsCacheKey(analysisData, "insights");
      const cached = await cacheService.get<InsightsEntry>(cacheKey);

      if (!cached || !this.isInsightsEntry(cached)) {
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
      logger.error(
        "[AIInsightsCache] Erreur lors de la récupération des insights",
        {
          error: getErrorMessage(error),
        },
      );
      return null;
    }
  }

  /**
   * Cache les recommandations IA
   */
  async cacheRecommendations(
    analysisData: VintedAnalysisResult,
    recommendations: AIRecommendations,
    ttl?: number,
  ): Promise<void> {
    try {
      const cacheKey = this.generateInsightsCacheKey(
        analysisData,
        "recommendations",
      );
      const cacheTTL = this.normalizeTTL(
        ttl ?? this.getCacheTTL("recommendations"),
      );

      const entry: RecommendationsEntry = {
        recommendations,
        timestamp: Date.now(),
        version: "1.0",
        configHash: this.getConfigHash(),
      };

      await cacheService.set(cacheKey, entry, cacheTTL);
      this.metrics.sets++;
    } catch (error) {
      this.metrics.errors++;
      logger.error(
        "[AIInsightsCache] Erreur lors de la mise en cache des recommandations",
        {
          error: getErrorMessage(error),
        },
      );
    }
  }

  /**
   * Récupère les recommandations IA du cache
   */
  async getRecommendations(
    analysisData: VintedAnalysisResult,
  ): Promise<AIRecommendations | null> {
    try {
      const cacheKey = this.generateInsightsCacheKey(
        analysisData,
        "recommendations",
      );
      const cached = await cacheService.get<RecommendationsEntry>(cacheKey);

      if (!cached || !this.isRecommendationsEntry(cached)) {
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
      logger.error(
        "[AIInsightsCache] Erreur lors de la récupération des recommandations",
        {
          error: getErrorMessage(error),
        },
      );
      return null;
    }
  }

  /**
   * Cache les prédictions de tendances
   */
  async cacheTrendPredictions(
    analysisData: VintedAnalysisResult,
    predictions: TrendPrediction,
    ttl?: number,
  ): Promise<void> {
    try {
      const cacheKey = this.generateInsightsCacheKey(analysisData, "trends");
      const cacheTTL = this.normalizeTTL(ttl ?? this.getCacheTTL("trends"));

      const entry: TrendsEntry = {
        predictions,
        timestamp: Date.now(),
        version: "1.0",
        configHash: this.getConfigHash(),
      };

      await cacheService.set(cacheKey, entry, cacheTTL);
      this.metrics.sets++;
    } catch (error) {
      this.metrics.errors++;
      logger.error(
        "[AIInsightsCache] Erreur lors de la mise en cache des prédictions",
        {
          error: getErrorMessage(error),
        },
      );
    }
  }

  /**
   * Récupère les prédictions de tendances du cache
   */
  async getTrendPredictions(
    analysisData: VintedAnalysisResult,
  ): Promise<TrendPrediction | null> {
    try {
      const cacheKey = this.generateInsightsCacheKey(analysisData, "trends");
      const cached = await cacheService.get<TrendsEntry>(cacheKey);

      if (!cached || !this.isTrendsEntry(cached)) {
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
      logger.error(
        "[AIInsightsCache] Erreur lors de la récupération des prédictions",
        {
          error: getErrorMessage(error),
        },
      );
      return null;
    }
  }

  /**
   * Cache les détections d'anomalies
   */
  async cacheAnomalyDetections(
    analysisData: VintedAnalysisResult,
    anomalies: AnomalyDetection[],
    ttl?: number,
  ): Promise<void> {
    try {
      const cacheKey = this.generateInsightsCacheKey(analysisData, "anomalies");
      const cacheTTL = this.normalizeTTL(ttl ?? this.getCacheTTL("anomalies"));

      const entry: AnomaliesEntry = {
        anomalies,
        timestamp: Date.now(),
        version: "1.0",
        configHash: this.getConfigHash(),
      };

      await cacheService.set(cacheKey, entry, cacheTTL);
      this.metrics.sets++;
    } catch (error) {
      this.metrics.errors++;
      logger.error(
        "[AIInsightsCache] Erreur lors de la mise en cache des anomalies",
        {
          error: getErrorMessage(error),
        },
      );
    }
  }

  /**
   * Récupère les détections d'anomalies du cache
   */
  async getAnomalyDetections(
    analysisData: VintedAnalysisResult,
  ): Promise<AnomalyDetection[] | null> {
    try {
      const cacheKey = this.generateInsightsCacheKey(analysisData, "anomalies");
      const cached = await cacheService.get<AnomaliesEntry>(cacheKey);

      if (!cached || !this.isAnomaliesEntry(cached)) {
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
      logger.error(
        "[AIInsightsCache] Erreur lors de la récupération des anomalies",
        {
          error: getErrorMessage(error),
        },
      );
      return null;
    }
  }

  /**
   * Invalide les insights pour des données spécifiques
   */
  async invalidateInsights(analysisData: VintedAnalysisResult): Promise<void> {
    await this.invalidateByType(analysisData, "insights");
  }

  /**
   * Invalide les recommandations pour des données spécifiques
   */
  async invalidateRecommendations(
    analysisData: VintedAnalysisResult,
  ): Promise<void> {
    await this.invalidateByType(analysisData, "recommendations");
  }

  /**
   * Invalide les prédictions de tendances pour des données spécifiques
   */
  async invalidateTrendPredictions(
    analysisData: VintedAnalysisResult,
  ): Promise<void> {
    await this.invalidateByType(analysisData, "trends");
  }

  /**
   * Invalide les détections d'anomalies pour des données spécifiques
   */
  async invalidateAnomalyDetections(
    analysisData: VintedAnalysisResult,
  ): Promise<void> {
    await this.invalidateByType(analysisData, "anomalies");
  }

  /**
   * Invalide une clé par type
   */
  private async invalidateByType(
    analysisData: VintedAnalysisResult,
    type: AnalysisType,
  ): Promise<void> {
    try {
      const cacheKey = this.generateInsightsCacheKey(analysisData, type);
      await cacheService.delete(cacheKey);
      this.metrics.invalidations++;
    } catch (error) {
      this.metrics.errors++;
      logger.error(
        `[AIInsightsCache] Erreur lors de l'invalidation (${type})`,
        {
          error: getErrorMessage(error),
        },
      );
    }
  }

  /**
   * Invalide tous les caches IA (mémoire + persistant)
   */
  async invalidateAll(): Promise<void> {
    try {
      // Cache persistant
      await cacheService.clear();

      this.metrics.invalidations++;
      logger.info("[AIInsightsCache] Tous les caches IA invalidés");
    } catch (error) {
      this.metrics.errors++;
      logger.error("[AIInsightsCache] Erreur lors de l'invalidation complète", {
        error: getErrorMessage(error),
      });
    }
  }

  /**
   * Alias de compatibilité: clear() -> invalidateAll()
   */
  async clear(): Promise<void> {
    return this.invalidateAll();
  }

  /**
   * Retourne les métriques du cache (lecture seule)
   */
  getMetrics(): CacheMetrics {
    const total = this.metrics.hits + this.metrics.misses;
    const hitRateRaw = total > 0 ? this.metrics.hits / total : 0;
    const hitRate =
      Math.round(Math.max(0, Math.min(1, hitRateRaw)) * 100) / 100;

    return {
      ...this.metrics,
      hitRate,
      totalRequests: total,
    };
  }

  /**
   * Alias de compatibilité: getStats() -> getMetrics()
   */
  getStats(): CacheMetrics {
    return this.getMetrics();
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

  /**
   * Préchauffe le cache pour des analyses fréquemment demandées
   */
  async warmCache(
    analysisData: VintedAnalysisResult,
    insights?: AIInsights,
    recommendations?: AIRecommendations,
    trends?: TrendPrediction,
    anomalies?: AnomalyDetection[],
  ): Promise<void> {
    const warmingPromises: Promise<void>[] = [];

    if (insights) {
      warmingPromises.push(this.cacheInsights(analysisData, insights));
    }

    if (recommendations) {
      warmingPromises.push(
        this.cacheRecommendations(analysisData, recommendations),
      );
    }

    if (trends) {
      warmingPromises.push(this.cacheTrendPredictions(analysisData, trends));
    }

    if (anomalies) {
      warmingPromises.push(
        this.cacheAnomalyDetections(analysisData, anomalies),
      );
    }

    try {
      await Promise.all(warmingPromises);
      logger.info("[AIInsightsCache] Cache préchauffé avec succès", {
        itemsWarmed: warmingPromises.length,
      });
    } catch (error) {
      logger.error("[AIInsightsCache] Erreur lors du préchauffage du cache", {
        error: getErrorMessage(error),
      });
    }
  }

  /**
   * Calcule le TTL approprié selon le type de cache
   */
  private getCacheTTL(type: AnalysisType): number {
    const perf = marketAnalysisConfig.getPerformanceConfig();
    const baseTTL =
      typeof (perf as any)?.cacheExpiry === "number" &&
      isFinite((perf as any).cacheExpiry)
        ? (perf as any).cacheExpiry
        : this.DEFAULT_TTL;

    let ttl = baseTTL;
    switch (type) {
      case "insights":
        ttl = baseTTL; // standard
        break;
      case "recommendations":
        ttl = baseTTL * 0.5; // plus volatile
        break;
      case "trends":
        ttl = baseTTL * 2; // plus stable
        break;
      case "anomalies":
        ttl = baseTTL * 0.25; // très volatile
        break;
      default:
        ttl = baseTTL;
        break;
    }
    return this.normalizeTTL(ttl);
  }

  /**
   * Normalise un TTL (nombre entier >= 1)
   */
  private normalizeTTL(value: number): number {
    if (!Number.isFinite(value) || value <= 0) return 1;
    return Math.max(1, Math.floor(value));
  }
}

// Instance singleton
export const aiInsightsCache = AIInsightsCacheService.getInstance();
