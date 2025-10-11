import { databaseService } from "./database/db";

// Note: Using the schema definition from lib/db/schema.ts would be ideal, but we'll define the interfaces here for clarity
export interface Product {
  id: string;
  name: string;
  price: number;
  prixVente?: number;
  benefices?: number; // Will be calculated
  pourcentageBenefice?: number; // Will be calculated
  vendu: string; // '0' or '1' based on schema
  dateVente?: string;
  createdAt: string; // ISO string based on schema
  plateforme?: string;
  user_id: string;
  parcelleId?: string;
  // ... other fields as needed
}

export interface Parcelle {
  id: string;
  numero: string;
  transporteur: string;
  poids: number;
  prix_achat: number;
  date_creation: number;
  user_id: string;
}

export interface ROIData {
  produit: string;
  roi: number;
}

export interface PlatformPerformance {
  plateforme: string;
  rentabilite: number;
}

export interface RadarMetric {
  subject: string;
  A: number;
  fullMark: number;
}

export interface TrendData {
  periode: string;
  ventes: number;
}

export interface HeatmapPoint {
  day: number;
  hour: number;
  value: number;
}

export interface AverageSellingTime {
  categorie: string;
  jours: number;
}

export interface TrendCurveData {
  mois: string;
  valeur: number;
  min: number;
  max: number;
}

export interface SalesPrediction {
  mois: string;
  prevision: number;
}

export interface KeyStatistics {
  produitsVendus: number;
  ventesTotales: number;
  beneficesTotaux: number;
  nombreParcelles: number;
}

export interface DashboardData extends KeyStatistics {
  roiParProduct: ROIData[];
  tempsMoyenVente: AverageSellingTime[];
  heatmapVentes: HeatmapPoint[];
  meilleuresPlateformes: PlatformPerformance[];
  radarPerformances: RadarMetric[];
  tendancesSaisonnieres: TrendData[];
  courbeTendance: TrendCurveData[];
  previsionsVentes: SalesPrediction[];
}

export class StatisticsService {
  private static instance: StatisticsService;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  public static getInstance(): StatisticsService {
    if (!StatisticsService.instance) {
      StatisticsService.instance = new StatisticsService();
    }
    return StatisticsService.instance;
  }

  private constructor() {}

  /**
   * Get comprehensive dashboard data for a user
   */
  async getDashboardData(user_id: string): Promise<DashboardData> {
    const cacheKey = `dashboard_${user_id}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch all required data using optimized SQL queries
    const [
      keyStats,
      roiData,
      avgSellingTimeData,
      heatmapData,
      platformPerformanceData,
      radarData,
      seasonalTrendData,
      trendCurveData,
      salesPredictionData,
    ] = await Promise.all([
      this.calculateKeyStatistics(user_id),
      this.calculateROIPerProduct(user_id),
      this.calculateAverageSellingTime(user_id),
      this.calculateSalesHeatmap(user_id),
      this.calculateBestPlatforms(user_id),
      this.calculateRadarPerformances(user_id),
      this.calculateSeasonalTrends(user_id),
      this.calculateTrendCurve(user_id),
      this.calculateSalesPredictions(user_id),
    ]);

    const data: DashboardData = {
      ...keyStats,
      roiParProduct: roiData,
      tempsMoyenVente: avgSellingTimeData,
      heatmapVentes: heatmapData,
      meilleuresPlateformes: platformPerformanceData,
      radarPerformances: radarData,
      tendancesSaisonnieres: seasonalTrendData,
      courbeTendance: trendCurveData,
      previsionsVentes: salesPredictionData,
    };

    this.setCachedData(cacheKey, data);
    return data;
  }

  /**
   * Calculate ROI for each product using SQL aggregation
   */
  async calculateROIPerProduct(user_id: string): Promise<ROIData[]> {
    // ROI calculation: ((prixVente - price) / price) * 100
    // We need to calculate this in SQL because pourcentageBenefice doesn't exist in the schema
    // Fix SQL column names: use DB column names (snake_case)
    const result = await databaseService.query<{
      produit: string;
      roi: number;
    }>(
      `
      SELECT name as produit, 
             CASE 
               WHEN price > 0 THEN ROUND(((prixVente - price) / price) * 100, 2)
               ELSE 0 
             END as roi
      FROM products 
      WHERE user_id = ? AND vendu = '1' AND prixVente IS NOT NULL AND price IS NOT NULL
      ORDER BY roi DESC
      LIMIT 10
    `,
      [user_id],
    );

    return result.map((row) => ({
      produit: row.produit,
      roi: row.roi,
    }));
  }

  /**
   * Calculate average selling time by platform using SQL aggregation
   */
  async calculateAverageSellingTime(
    user_id: string,
  ): Promise<AverageSellingTime[]> {
    // Fix SQL column names: use DB column names (snake_case)
    const result = await databaseService.query<{
      categorie: string;
      jours: number;
    }>(
      `
      SELECT 
        COALESCE(plateforme, 'Non spécifié') as categorie,
        ROUND(AVG((julianday(dateVente) - julianday(created_at))), 2) as jours
      FROM products 
      WHERE user_id = ? AND vendu = '1' AND dateVente IS NOT NULL AND created_at IS NOT NULL
      GROUP BY plateforme
    `,
      [user_id],
    );

    return result.map((row) => ({
      categorie: row.categorie,
      jours: row.jours,
    }));
  }

  /**
   * Calculate sales heatmap data using SQL aggregation
   */
  async calculateSalesHeatmap(user_id: string): Promise<HeatmapPoint[]> {
    // This is more complex to do purely in SQL, so we'll keep a hybrid approach
    // but limit the data fetched from the database
    const ventes = await databaseService.query<{ dateVente: string }>(
      `
      SELECT dateVente
      FROM products 
      WHERE user_id = ? AND vendu = '1' AND dateVente IS NOT NULL
    `,
      [user_id],
    );

    const heatmapData = Array(7)
      .fill(0)
      .map(() => Array(24).fill(0));

    ventes.forEach((p) => {
      const dateVente = new Date(p.dateVente!);
      const dayOfWeek = dateVente.getDay();
      const hour = dateVente.getHours();
      heatmapData[dayOfWeek]![hour]++;
    });

    return heatmapData
      .map((hours, day) => hours.map((value, hour) => ({ day, hour, value })))
      .flat();
  }

  /**
   * Calculate key statistics using SQL aggregation
   */
  async calculateKeyStatistics(user_id: string): Promise<KeyStatistics> {
    // Calculate benefices (profit) as prixVente - price for sold items
    const result = await databaseService.queryOne<{
      produitsVendus: number;
      ventesTotales: number;
      beneficesTotaux: number;
      nombreParcelles: number;
    }>(
      `
      SELECT 
        (SELECT COUNT(*) FROM products WHERE user_id = ? AND vendu = '1') as produitsVendus,
        (SELECT COALESCE(ROUND(SUM(prixVente), 2), 0) FROM products WHERE user_id = ? AND vendu = '1' AND prixVente IS NOT NULL) as ventesTotales,
        (SELECT COALESCE(ROUND(SUM(CASE WHEN prixVente IS NOT NULL AND price IS NOT NULL THEN prixVente - price ELSE 0 END), 2), 0) 
         FROM products WHERE user_id = ? AND vendu = '1') as beneficesTotaux,
        (SELECT COUNT(*) FROM parcelles WHERE user_id = ?) as nombreParcelles
    `,
      [user_id, user_id, user_id, user_id],
    );

    if (!result) {
      return {
        produitsVendus: 0,
        ventesTotales: 0,
        beneficesTotaux: 0,
        nombreParcelles: 0,
      };
    }

    return {
      produitsVendus: result.produitsVendus,
      ventesTotales: result.ventesTotales,
      beneficesTotaux: result.beneficesTotaux,
      nombreParcelles: result.nombreParcelles,
    };
  }

  /**
   * Calculate best performing platforms using SQL aggregation
   */
  async calculateBestPlatforms(
    user_id: string,
  ): Promise<PlatformPerformance[]> {
    // Calculate profit (benefices) as prixVente - price
    const result = await databaseService.query<{
      plateforme: string;
      rentabilite: number;
    }>(
      `
      SELECT 
        COALESCE(plateforme, 'Non spécifié') as plateforme,
        ROUND(SUM(CASE WHEN prixVente IS NOT NULL AND price IS NOT NULL THEN prixVente - price ELSE 0 END), 2) as rentabilite
      FROM products 
      WHERE user_id = ? AND vendu = '1' 
      GROUP BY plateforme
      ORDER BY rentabilite DESC
      LIMIT 5
    `,
      [user_id],
    );

    return result.map((row) => ({
      plateforme: row.plateforme,
      rentabilite: row.rentabilite,
    }));
  }

  /**
   * Calculate radar performance metrics using SQL aggregation
   */
  async calculateRadarPerformances(user_id: string): Promise<RadarMetric[]> {
    // Calculate average profit (benefices) as AVG(prixVente - price)
    const result = await databaseService.queryOne<{
      avgBenefice: number;
      avgTempsVenteJours: number;
      nombreVentes: number;
    }>(
      `
      SELECT 
        COALESCE(ROUND(AVG(CASE WHEN prixVente IS NOT NULL AND price IS NOT NULL THEN prixVente - price ELSE 0 END), 2), 0) as avgBenefice,
        COALESCE(ROUND(AVG((julianday(dateVente) - julianday(created_at))), 2), 0) as avgTempsVenteJours,
        COUNT(*) as nombreVentes
      FROM products 
      WHERE user_id = ? AND vendu = '1' AND dateVente IS NOT NULL AND created_at IS NOT NULL
    `,
      [user_id],
    );

    if (!result) {
      return [
        { subject: "Bénéfice Moyen", A: 0, fullMark: 100 },
        { subject: "Vitesse Vente", A: 0, fullMark: 100 },
        { subject: "Volume Ventes", A: 0, fullMark: 100 },
      ];
    }

    const vitesseVenteScore =
      result.avgTempsVenteJours > 0 ? 100 / result.avgTempsVenteJours : 0;
    const fullMark = 100;

    return [
      {
        subject: "Bénéfice Moyen",
        A: Math.min(
          result.avgBenefice > 0 ? Math.round(result.avgBenefice / 10) : 0,
          fullMark,
        ),
        fullMark,
      },
      {
        subject: "Vitesse Vente",
        A: Math.min(Math.round(vitesseVenteScore), fullMark),
        fullMark,
      },
      {
        subject: "Volume Ventes",
        A: Math.min(Math.round(result.nombreVentes), fullMark),
        fullMark,
      },
    ];
  }

  /**
   * Calculate seasonal trends using SQL aggregation
   */
  async calculateSeasonalTrends(user_id: string): Promise<TrendData[]> {
    const result = await databaseService.query<{
      periode: string;
      ventes: number;
    }>(
      `
      SELECT 
        strftime('%Y-%m', dateVente) as periode,
        ROUND(SUM(prixVente), 2) as ventes
      FROM products 
      WHERE user_id = ? AND vendu = '1' AND dateVente IS NOT NULL AND prixVente IS NOT NULL
      GROUP BY strftime('%Y-%m', dateVente)
      ORDER BY periode
    `,
      [user_id],
    );

    return result.map((row) => ({
      periode: row.periode,
      ventes: row.ventes,
    }));
  }

  /**
   * Calculate trend curve data using SQL aggregation
   */
  async calculateTrendCurve(user_id: string): Promise<TrendCurveData[]> {
    const result = await databaseService.query<{
      mois: string;
      valeur: number;
    }>(
      `
      SELECT 
        strftime('%Y-%m', dateVente) as mois,
        ROUND(SUM(prixVente), 2) as valeur
      FROM products 
      WHERE user_id = ? AND vendu = '1' AND dateVente IS NOT NULL AND prixVente IS NOT NULL
      GROUP BY strftime('%Y-%m', dateVente)
      ORDER BY mois DESC
      LIMIT 12
    `,
      [user_id],
    );

    // Reverse to get chronological order
    const reversedResult = result.reverse();

    return reversedResult.map((row) => {
      const min = row.valeur * 0.9;
      const max = row.valeur * 1.1;

      // Format mois for display (e.g., "janv. 23")
      const [year, month] = row.mois.split("-");
      const date = new Date(parseInt(year!), parseInt(month!) - 1);
      const nomMois = date.toLocaleString("fr-FR", {
        month: "short",
        year: "2-digit",
      });

      return {
        mois: nomMois,
        valeur: row.valeur,
        min: parseFloat(min.toFixed(2)),
        max: parseFloat(max.toFixed(2)),
      };
    });
  }

  /**
   * Calculate sales predictions (simplified version using last known values)
   */
  async calculateSalesPredictions(user_id: string): Promise<SalesPrediction[]> {
    const lastValues = await databaseService.query<{
      mois: string;
      valeur: number;
    }>(
      `
      SELECT 
        strftime('%Y-%m', dateVente) as mois,
        ROUND(SUM(prixVente), 2) as valeur
      FROM products 
      WHERE user_id = ? AND vendu = '1' AND dateVente IS NOT NULL AND prixVente IS NOT NULL
      GROUP BY strftime('%Y-%m', dateVente)
      ORDER BY mois DESC
      LIMIT 3
    `,
      [user_id],
    );

    const previsionsVentes: SalesPrediction[] = [];
    const now = new Date();

    // Get average of last values for prediction base
    const avgLastValues =
      lastValues.length > 0
        ? lastValues.reduce((sum, item) => sum + item.valeur, 0) /
          lastValues.length
        : 0;

    for (let i = 1; i <= 3; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const nomMois = date.toLocaleString("fr-FR", {
        month: "short",
        year: "2-digit",
      });

      // Simple prediction based on average with some variation
      const prevision = avgLastValues * (1 + (Math.random() - 0.5) * 0.2);

      previsionsVentes.push({
        mois: nomMois,
        prevision: parseFloat(prevision.toFixed(2)),
      });
    }

    return previsionsVentes;
  }

  /**
   * Get performance metrics and KPIs
   */
  async getPerformanceMetrics(user_id: string): Promise<{
    responseTime: number;
    cacheHitRate: number;
    dataFreshness: number;
  }> {
    const startTime = Date.now();

    // Simulate some processing
    await this.getDashboardData(user_id);

    const responseTime = Date.now() - startTime;
    const cacheHitRate = this.calculateCacheHitRate();
    const dataFreshness = this.calculateDataFreshness(user_id);

    return {
      responseTime,
      cacheHitRate,
      dataFreshness,
    };
  }

  /**
   * Clear cache for specific user or all cache
   */
  clearCache(user_id?: string): void {
    if (user_id) {
      const keysToDelete = Array.from(this.cache.keys()).filter((_key) =>
        _key.includes(user_id),
      );
      keysToDelete.forEach((_key) => this.cache.delete(_key));
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number; entries: string[] } {
    return {
      size: this.cache.size,
      hitRate: this.calculateCacheHitRate(),
      entries: Array.from(this.cache.keys()),
    };
  }

  // Private helper methods

  private getCachedData(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    if (cached) {
      this.cache.delete(key);
    }
    return null;
  }

  private setCachedData(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private calculateCacheHitRate(): number {
    // This would need to be tracked over time in a real implementation
    return Math.random() * 100; // Placeholder
  }

  private calculateDataFreshness(user_id: string): number {
    const cacheKey = `dashboard_${user_id}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return Date.now() - cached.timestamp;
    }
    return 0;
  }
}

// Export singleton instance
export const statisticsService = StatisticsService.getInstance();
