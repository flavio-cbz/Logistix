import { logger } from '@/lib/utils/logging/logger';
import { getErrorMessage } from '@/lib/utils/error-utils'; // Utilisation de la version centrale
import type { VintedAnalysisResult, EnhancedVintedAnalysisResult } from '@/types/vinted-market-analysis';
import type { AdvancedMetrics } from '@/lib/analytics/advanced-analytics-engine';
import { generateReport, generateEnhancedReport } from './report-generator';
import { AIAnalysisError, AIErrorCode } from './ai-errors';


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
  ): Promise<EnhancedVintedAnalysisResult | VintedAnalysisResult> {
    try {
      logger.info('[AIFallback] Génération de rapport de fallback');
      
      const baseAnalysis: VintedAnalysisResult = {
        salesVolume: analysisData.salesVolume,
        avgPrice: analysisData.avgPrice,
        priceRange: analysisData.priceRange,
        brandInfo: analysisData.brandInfo,
        catalogInfo: analysisData.catalogInfo,
        rawItems: analysisData.rawItems,
        analysisDate: analysisData.analysisDate,
        items: analysisData.items,
        enrichedItems: analysisData.enrichedItems,
        brandDistribution: analysisData.brandDistribution,
        modelDistribution: analysisData.modelDistribution,
        advancedMetrics: analysisData.advancedMetrics,
        input: analysisData.input,
      };
      
      // Essayer d'abord le générateur de rapport avancé
      try {
        const enhancedReport = await generateEnhancedReport(baseAnalysis, advancedMetrics);
        // Retourner un EnhancedVintedAnalysisResult complet
        return {
          ...baseAnalysis,
          ...enhancedReport,
          processingMetadata: {
            aiProcessingTime: 0,
            llmProvider: 'fallback',
            modelVersion: 'N/A',
            confidence: 0.3,
            lastProcessed: new Date().toISOString(),
            fallbackUsed: true,
          },
          dataQuality: {
            score: 0.5,
            issues: ['Fallback report generated'],
            recommendations: [],
          }
        } as unknown as EnhancedVintedAnalysisResult; // Cast via unknown to satisfy TS
      } catch (enhancedError: unknown) {
        logger.warn('[AIFallback] Échec du rapport avancé, utilisation du rapport simple', {
          error: getErrorMessage(enhancedError),
          input: { baseAnalysis, advancedMetrics },
        });

        try {
          const simpleReport = await generateReport(baseAnalysis);
          // S'assurer que le rapport simple contient toutes les propriétés requises
          return {
            ...baseAnalysis,
            ...simpleReport,
          } as VintedAnalysisResult;
        } catch (simpleError: unknown) {
          logger.error('[AIFallback] Échec du rapport simple après l\'échec du rapport avancé', {
            error: getErrorMessage(simpleError),
            input: { baseAnalysis },
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
        salesVolume: 0,
        avgPrice: 0,
        priceRange: { min: 0, max: 0 },
        brandInfo: null,
        catalogInfo: { id: 0, name: 'Fallback' },
        rawItems: [],
        analysisDate: new Date().toISOString(),
      };
    }
  }
}

// Instance singleton
export const aiFallbackService = AIFallbackService.getInstance();
export { generateReport };