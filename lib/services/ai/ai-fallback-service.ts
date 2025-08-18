import { logger } from '@/lib/utils/logging/logger';
import { VintedAnalysisResult, AIInsights, AIRecommendations, TrendPrediction, AnomalyDetection, VintedAnalysisResultSchema } from '@/types/vinted-market-analysis';
import { AdvancedMetrics } from '@/lib/analytics/advanced-analytics-engine';
import { generateReport, generateEnhancedReport } from './report-generator';
import { normalizeTitle } from './title-normalizer';
import { isAnomaly } from './anomaly-detector';
import { marketAnalysisConfig } from './market-analysis-config';
import { AIAnalysisError, AIErrorCode } from './ai-errors';
import { z } from 'zod';

// Type strict pour l'analyse, déduit du schéma Zod
type StrictVintedAnalysisResult = z.infer<typeof VintedAnalysisResultSchema>;

/**
 * Fonction utilitaire pour extraire un message d'erreur
 */
function getErrorMessage(error: unknown): string {
  if (!error) return String(error);
  if (error instanceof Error) return error.message;
  try {
    return String(error);
  } catch {
    return 'unknown error';
  }
}

/**
 * Service de fallback pour l'IA qui fournit des analyses de base
 * quand les services IA avancés échouent
 */
export class AIFallbackService {
  private static instance: AIFallbackService;

  public static getInstance(): AIFallbackService {
    if (!AIFallbackService.instance) {
      AIFallbackService.instance = new AIFallbackService();
    }
    return AIFallbackService.instance;
  }

  /**
   * Génère un rapport de fallback en utilisant le générateur de rapport existant
   */
  async generateFallbackReport(
    analysisData: VintedAnalysisResult,
    advancedMetrics?: AdvancedMetrics
  ): Promise<any> {
    try {
      logger.info('[AIFallback] Génération de rapport de fallback');
      
      // Construction stricte de toutes les propriétés requises, sans spread
      const patchedBase = {
        salesVolume: typeof analysisData.salesVolume === 'number' ? analysisData.salesVolume : 0,
        avgPrice: typeof analysisData.avgPrice === 'number' ? analysisData.avgPrice : 0,
        priceRange: {
          min: analysisData.priceRange && typeof analysisData.priceRange.min === 'number'
            ? analysisData.priceRange.min
            : 0,
          max: analysisData.priceRange && typeof analysisData.priceRange.max === 'number'
            ? analysisData.priceRange.max
            : 0,
        },
        brandInfo: analysisData.brandInfo && typeof analysisData.brandInfo.id === 'number' && typeof analysisData.brandInfo.name === 'string'
          ? { id: analysisData.brandInfo.id, name: analysisData.brandInfo.name }
          : { id: 0, name: '' },
        catalogInfo: analysisData.catalogInfo && typeof analysisData.catalogInfo.id === 'number' && typeof analysisData.catalogInfo.name === 'string'
          ? { id: analysisData.catalogInfo.id, name: analysisData.catalogInfo.name }
          : { id: 0, name: '' },
        rawItems: Array.isArray(analysisData.rawItems) ? analysisData.rawItems : [],
        analysisDate: typeof analysisData.analysisDate === 'string' ? analysisData.analysisDate : new Date().toISOString(),
        items: Array.isArray(analysisData.items) ? analysisData.items : [],
        enrichedItems: Array.isArray((analysisData as any).enrichedItems) ? (analysisData as any).enrichedItems : [],
        brandDistribution: analysisData.brandDistribution && typeof analysisData.brandDistribution === 'object'
          ? analysisData.brandDistribution
          : {},
        modelDistribution: analysisData.modelDistribution && typeof analysisData.modelDistribution === 'object'
          ? analysisData.modelDistribution
          : {},
        advancedMetrics: analysisData.advancedMetrics ?? null,
      };
      
      // Essayer d'abord le générateur de rapport avancé
      // Amélioration : gestion plus robuste des erreurs et logs enrichis
      try {
        const enhancedReport = await generateEnhancedReport(patchedBase, advancedMetrics);
        return { ...patchedBase, ...enhancedReport };
      } catch (enhancedError: unknown) {
        logger.warn('[AIFallback] Échec du rapport avancé, utilisation du rapport simple', {
          error: getErrorMessage(enhancedError),
          input: { patchedBase, advancedMetrics },
        });

        try {
          const simpleReport = await generateReport(patchedBase);
          return simpleReport;
        } catch (simpleError: unknown) {
          logger.error('[AIFallback] Échec du rapport simple après l\'échec du rapport avancé', {
            error: getErrorMessage(simpleError),
            input: { patchedBase },
          });
          throw new AIAnalysisError('Impossible de générer un rapport AI', AIErrorCode.INFERENCE_FAILED);
        }
      }
    } catch (error: any) {
      logger.error('[AIFallback] Erreur lors de la génération du rapport de fallback', {
        error: getErrorMessage(error),
      });

      // Retourner un rapport minimal
      return {
        summary: 'Analyse de base disponible avec des données limitées.',
        recommendations: [
          'Collecter plus de données pour une analyse approfondie',
          'Surveiller les tendances du marché',
          'Ajuster les prix selon la demande',
        ],
      };
    }
  }
}

// Instance singleton
export const aiFallbackService = AIFallbackService.getInstance();
export { generateReport };