// Corrections : imports type-only, renommage _description/_data, index → _index, suppression variables inutilisées

import { getErrorMessage, toError } from "../../utils/error-utils";
import type { VintedAnalysisResult } from "@/types/vinted-market-analysis";
import { AIAnalysisError } from "./ai-errors";
import ChartGenerationService from "./chart-generation.service";
// import type { AIAnnotation, InteractiveElement } from "../../types/ai-annotation";

// Temporary type definitions
type AIAnnotation = any;
type InteractiveElement = any;

// Define EnhancedAnalysisResult locally to break circular dependency
interface EnhancedAnalysisResult {
  salesVolume: number;
  avgPrice: number;
  priceRange: { min: number; max: number };
  rawItems?: any[];
  enrichedItems?: any[];
  analysisDate: string;
  [key: string]: any;
}

export interface EnhancedChart {
  id: string;
  type:
    | "price-distribution"
    | "trend-analysis"
    | "competitive-position"
    | "opportunity-map"
    | "market-insights"
    | "comparison";
  title: string;
  description: string;
  chartData: any; // Données du graphique original
  aiAnnotations: AIAnnotation[];
  interactiveElements: InteractiveElement[];
  insights: {
    summary: string;
    keyFindings: string[];
    recommendations: string[];
  };
  metadata: {
    generatedAt: string;
    confidence: number;
    dataQuality: number;
    processingTime: number;
  };
}

export interface ComparisonChart extends EnhancedChart {
  type: "comparison";
  comparisonData: {
    baseline: VintedAnalysisResult;
    comparisons: VintedAnalysisResult[];
    differences: Array<{
      metric: string;
      baselineValue: number;
      comparisonValues: number[];
      percentageChanges: number[];
      significance: "low" | "medium" | "high";
    }>;
  };
}

export interface ChartExportOptions {
  format: "pdf" | "excel" | "json" | "png" | "svg";
  includeAnnotations: boolean;
  includeInsights: boolean;
  includeRawData: boolean;
  customization?: {
    title?: string;
    subtitle?: string;
    branding?: boolean;
    colorScheme?: "light" | "dark" | "custom";
  };
}

export interface ExportResult {
  success: boolean;
  filePath?: string;
  downloadUrl?: string;
  error?: string;
  metadata: {
    format: string;
    fileSize: number;
    generatedAt: string;
    includesAI: boolean;
  };
}

/**
 * Moteur de visualisation enrichi avec annotations IA
 */
export class EnhancedVisualizationEngine {
  private static instance: EnhancedVisualizationEngine;

  public static getInstance(): EnhancedVisualizationEngine {
    if (!EnhancedVisualizationEngine.instance) {
      EnhancedVisualizationEngine.instance = new EnhancedVisualizationEngine();
    }
    return EnhancedVisualizationEngine.instance;
  }

  /**
   * Crée des graphiques enrichis avec annotations IA
   */
  async createEnhancedCharts(
    analysisResult: EnhancedAnalysisResult,
  ): Promise<EnhancedChart[]> {
    const charts: EnhancedChart[] = [];

    try {
      // 1. Graphique de distribution des prix avec insights IA
      const priceDistributionChart =
        await this.createPriceDistributionChart(analysisResult);
      charts.push(priceDistributionChart);

      // 2. Graphique d'analyse de tendance avec prédictions
      if (analysisResult['marketInsights']) {
        const trendChart = await this.createTrendAnalysisChart(analysisResult);
        charts.push(trendChart);
      }

      // 3. Carte des opportunités de marché
      if (
        (analysisResult['marketInsights']?.marketOpportunities?.length ?? 0) > 0
      ) {
        const opportunityChart =
          await this.createOpportunityMapChart(analysisResult);
        charts.push(opportunityChart);
      }

      // 4. Graphique de position concurrentielle
      if (analysisResult['marketInsights']?.competitivePosition) {
        const competitiveChart =
          await this.createCompetitivePositionChart(analysisResult);
        charts.push(competitiveChart);
      }

      return charts;
    } catch (error) {
      throw new AIAnalysisError(
        `Erreur lors de la création des graphiques enrichis: ${getErrorMessage(error)}`,
        "CHART_GENERATION_FAILED" as any,
        { retryable: true, fallbackAvailable: true, cause: toError(error) },
      );
    }
  }

  /**
   * Crée un graphique de distribution des prix avec annotations IA
   */
  private async createPriceDistributionChart(
    analysisResult: EnhancedAnalysisResult,
  ): Promise<EnhancedChart> {
    // Délégué à ChartGenerationService
    return (await ChartGenerationService.createPriceDistributionChart(
      analysisResult,
    )) as EnhancedChart;
  }

  /**
   * Crée un graphique d'analyse de tendance avec prédictions IA
   */
  private async createTrendAnalysisChart(
    analysisResult: EnhancedAnalysisResult,
  ): Promise<EnhancedChart> {
    // Délégué à ChartGenerationService
    return (await ChartGenerationService.createTrendAnalysisChart(
      analysisResult,
    )) as EnhancedChart;
  }

  /**
   * Crée une carte des opportunités de marché
   */
  private async createOpportunityMapChart(
    analysisResult: EnhancedAnalysisResult,
  ): Promise<EnhancedChart> {
    // Délégué à ChartGenerationService
    return (await ChartGenerationService.createOpportunityMapChart(
      analysisResult,
    )) as EnhancedChart;
  }

  /**
   * Crée un graphique de position concurrentielle
   */
  private async createCompetitivePositionChart(
    analysisResult: EnhancedAnalysisResult,
  ): Promise<EnhancedChart> {
    // Délégué à ChartGenerationService
    return (await ChartGenerationService.createCompetitivePositionChart(
      analysisResult,
    )) as EnhancedChart;
  }

  // Méthodes utilitaires pour l'extraction et le calcul des données

  // Helpers moved to ChartGenerationService — removed duplicate implementations to avoid unused private methods.
  // ChartGenerationService now contains all transformation / annotation helpers.
}

// Instance globale
export const enhancedVisualizationEngine =
  EnhancedVisualizationEngine.getInstance();
