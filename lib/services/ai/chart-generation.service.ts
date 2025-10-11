import DataTransformationService from "./data-transformation.service";
import AIAnnotationService from "./ai-annotation.service";
import type { MarketOpportunity } from "./market-insights";
import ChartMetadataService from "./chart-metadata.service";

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

export default class ChartGenerationService {
  public static async createPriceDistributionChart(
    analysisResult: EnhancedAnalysisResult,
  ): Promise<any> {
    const priceData =
      DataTransformationService.extractPriceDistributionData(analysisResult);

    if (
      !priceData ||
      !Array.isArray(priceData.prices) ||
      priceData.prices.length === 0
    ) {
      return {
        id: "price-distribution-enhanced",
        type: "price-distribution",
        title: "Distribution des prix avec insights IA",
        description: "Aucune donnée de prix exploitable.",
        chartData: { bins: [], prices: [] },
        aiAnnotations: [],
        interactiveElements: [],
        insights: {
          summary: "Aucune donnée disponible.",
          keyFindings: [],
          recommendations: [],
        },
        metadata: {
          generatedAt: new Date().toISOString(),
          confidence: 0,
          dataQuality:
            analysisResult['processingMetadata']?.dataQuality?.score ?? 0,
          processingTime: 0,
        },
      };
    }

    // Déléguer la génération des annotations à AIAnnotationService
    const { annotations, interactiveElements } =
      AIAnnotationService.generatePriceDistributionAnnotations(
        analysisResult,
        priceData,
      );

    return {
      id: "price-distribution-enhanced",
      type: "price-distribution",
      title: "Distribution des prix avec insights IA",
      description:
        "Analyse de la répartition des prix avec recommandations et détection d'anomalies",
      chartData: priceData,
      aiAnnotations: annotations,
      interactiveElements,
      insights: {
        summary: this.generatePriceDistributionSummary(analysisResult),
        keyFindings: this.extractPriceDistributionFindings(analysisResult),
        recommendations:
          this.extractPriceDistributionRecommendations(analysisResult),
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        confidence: ChartMetadataService.calculateChartConfidence(annotations),
        dataQuality: analysisResult['processingMetadata'].dataQuality.score,
        processingTime: 0,
      },
    };
  }

  public static async createTrendAnalysisChart(
    analysisResult: EnhancedAnalysisResult,
  ): Promise<any> {
    const trendData =
      DataTransformationService.extractTrendData(analysisResult);

    // Déléguer la génération des annotations à AIAnnotationService
    const { annotations, interactiveElements } =
      AIAnnotationService.generateTrendAnnotations(analysisResult, trendData);

    return {
      id: "trend-analysis-enhanced",
      type: "trend-analysis",
      title: "Analyse de tendance avec prédictions IA",
      description:
        "Évolution des prix et volumes avec prédictions et identification des tendances",
      chartData: trendData,
      aiAnnotations: annotations,
      interactiveElements,
      insights: {
        summary: this.generateTrendSummary(analysisResult),
        keyFindings: this.extractTrendFindings(analysisResult),
        recommendations: this.extractTrendRecommendations(analysisResult),
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        confidence: ChartMetadataService.calculateChartConfidence(annotations),
        dataQuality: analysisResult['processingMetadata'].dataQuality.score,
        processingTime: 0,
      },
    };
  }

  public static async createOpportunityMapChart(
    analysisResult: EnhancedAnalysisResult,
  ): Promise<any> {
    // Déléguer la génération des annotations à AIAnnotationService
    const { annotations, interactiveElements } =
      AIAnnotationService.generateOpportunityAnnotations(analysisResult);

    return {
      id: "opportunity-map-enhanced",
      type: "opportunity-map",
      title: "Carte des opportunités de marché",
      description:
        "Visualisation des opportunités identifiées par l'IA avec potentiel de profit",
      chartData: this.prepareOpportunityMapData(
        analysisResult['marketInsights']?.marketOpportunities ?? [],
      ),
      aiAnnotations: annotations,
      interactiveElements,
      insights: {
        summary: this.generateOpportunitySummary(analysisResult),
        keyFindings: this.extractOpportunityFindings(analysisResult),
        recommendations: this.extractOpportunityRecommendations(analysisResult),
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        confidence: ChartMetadataService.calculateChartConfidence(annotations),
        dataQuality: analysisResult['processingMetadata'].dataQuality.score,
        processingTime: 0,
      },
    };
  }

  public static async createCompetitivePositionChart(
    analysisResult: EnhancedAnalysisResult,
  ): Promise<any> {
    const annotations: any[] = [];
    const interactiveElements: any[] = [];

    const competitivePosition =
      analysisResult['marketInsights']!.competitivePosition;

    annotations.push({
      id: "current-position",
      position: { x: 50, y: 50 },
      type: "insight",
      title: `Position: ${competitivePosition.position}`,
      description: `Part de marché estimée: ${(competitivePosition.marketShare.estimated * 100).toFixed(1)}%`,
      confidence: competitivePosition.marketShare.confidence,
      priority: "high",
      actionable: true,
    });

    competitivePosition.strengths.forEach((strength: any, _index: number) => {
      annotations.push({
        id: `strength-${_index}`,
        position: { x: 70 + _index * 10, y: 30 },
        type: "insight",
        title: "Force identifiée",
        description: strength,
        confidence: 0.8,
        priority: "medium",
        actionable: false,
      });
    });

    return {
      id: "competitive-position-enhanced",
      type: "competitive-position",
      title: "Position concurrentielle avec analyse IA",
      description:
        "Analyse de la position sur le marché avec forces, faiblesses et opportunités",
      chartData: this.prepareCompetitivePositionData(competitivePosition),
      aiAnnotations: annotations,
      interactiveElements,
      insights: {
        summary: this.generateCompetitiveSummary(analysisResult),
        keyFindings: this.extractCompetitiveFindings(analysisResult),
        recommendations: this.extractCompetitiveRecommendations(analysisResult),
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        confidence: ChartMetadataService.calculateChartConfidence(annotations),
        dataQuality: analysisResult['processingMetadata'].dataQuality.score,
        processingTime: 0,
      },
    };
  }

  // Annotation helpers moved to AIAnnotationService to avoid duplication and unused private methods.

  private static prepareOpportunityMapData(
    opportunities: MarketOpportunity[],
  ): any {
    return DataTransformationService.prepareOpportunityMapData(opportunities);
  }

  private static prepareCompetitivePositionData(competitivePosition: any): any {
    return DataTransformationService.prepareCompetitivePositionData(
      competitivePosition,
    );
  }

  // calculateChartConfidence moved to ChartMetadataService

  private static generatePriceDistributionSummary(
    analysisResult: EnhancedAnalysisResult,
  ): string {
    const avgPrice = analysisResult.avgPrice;
    const volume = analysisResult.salesVolume;
    const recommendations =
      analysisResult['marketInsights']?.pricingRecommendations?.length || 0;

    return `Distribution de ${volume} articles avec un prix moyen de ${avgPrice.toFixed(2)}€. ${recommendations} recommandations de prix identifiées par l'IA.`;
  }

  private static extractPriceDistributionFindings(
    analysisResult: EnhancedAnalysisResult,
  ): string[] {
    const findings: string[] = [];

    if (
      analysisResult['marketInsights']?.pricingRecommendations &&
      analysisResult['marketInsights'].pricingRecommendations.length > 0
    ) {
      const rec = analysisResult['marketInsights'].pricingRecommendations[0];
      findings.push(`Position prix actuelle: ${rec.strategy}`);
      findings.push(`Stratégie recommandée: ${rec.strategy}`);
    }

    findings.push(
      `Gamme de prix: ${analysisResult.priceRange.min}€ - ${analysisResult.priceRange.max}€`,
    );

    return findings;
  }

  private static extractPriceDistributionRecommendations(
    analysisResult: EnhancedAnalysisResult,
  ): string[] {
    const recommendations: string[] = [];

    if (analysisResult['marketInsights']?.pricingRecommendations) {
      analysisResult['marketInsights'].pricingRecommendations.forEach((rec: any) => {
        recommendations.push(
          `Optimiser le prix entre ${rec.optimalPriceRange.min}€ et ${rec.optimalPriceRange.max}€`,
        );
      });
    }

    return recommendations;
  }

  private static generateTrendSummary(
    analysisResult: EnhancedAnalysisResult,
  ): string {
    const trends = analysisResult['marketInsights']?.marketTrends?.length || 0;
    return `${trends} tendances de marché identifiées avec analyse prédictive.`;
  }

  private static extractTrendFindings(
    analysisResult: EnhancedAnalysisResult,
  ): string[] {
    const findings: string[] = [];

    analysisResult['marketInsights']?.marketTrends?.forEach((trend: { trend: string; direction: string; strength: number }) => {
      findings.push(
        `${trend.trend} - Direction: ${trend.direction}, Force: ${(trend.strength * 100).toFixed(0)}%`,
      );
    });

    return findings;
  }

  private static extractTrendRecommendations(
    analysisResult: EnhancedAnalysisResult,
  ): string[] {
    const recommendations: string[] = [];

    analysisResult['marketInsights']?.marketTrends?.forEach((trend: { trend: string; impact: string }) => {
      if (trend.impact === "high") {
        recommendations.push(
          `Adapter la stratégie selon la tendance: ${trend.trend}`,
        );
      }
    });

    return recommendations;
  }

  private static generateOpportunitySummary(
    analysisResult: EnhancedAnalysisResult,
  ): string {
    const opportunities =
      analysisResult['marketInsights']?.marketOpportunities?.length || 0;
    const totalPotential =
      analysisResult['marketInsights']?.marketOpportunities
        ?.filter(
          (opp: any): opp is typeof opp & { potentialValue: number } =>
            opp != null && typeof opp.potentialValue === "number",
        )
        .reduce((sum: number, opp: { potentialValue: number }) => sum + opp.potentialValue, 0) || 0;

    return `${opportunities} opportunités identifiées avec un potentiel total de ${totalPotential.toFixed(0)}€.`;
  }

  private static extractOpportunityFindings(
    analysisResult: EnhancedAnalysisResult,
  ): string[] {
    const findings: string[] = [];

    analysisResult['marketInsights']?.marketOpportunities?.forEach((opp: { title: string; potentialValue: number; effort: string; timeframe: string }) => {
      findings.push(
        `${opp.title}: ${opp.potentialValue}€ (${opp.effort} effort, ${opp.timeframe})`,
      );
    });

    return findings;
  }

  private static extractOpportunityRecommendations(
    analysisResult: EnhancedAnalysisResult,
  ): string[] {
    const recommendations: string[] = [];

    analysisResult['marketInsights']?.marketOpportunities
      ?.filter(
        (
          opp: any,
        ): opp is typeof opp & {
          priority: string;
          actionSteps: string[];
          title: string;
        } =>
          opp != null &&
          (opp.priority === "high" || opp.priority === "critical") &&
          Array.isArray(opp.actionSteps) &&
          typeof opp.title === "string",
      )
      .forEach((opp: { title: string; actionSteps: string[] }) => {
        if (opp.actionSteps.length > 0) {
          recommendations.push(
            `Prioriser: ${opp.title} - ${opp.actionSteps[0]}`,
          );
        }
      });

    return recommendations;
  }

  private static generateCompetitiveSummary(
    analysisResult: EnhancedAnalysisResult,
  ): string {
    const position = analysisResult['marketInsights']?.competitivePosition;
    if (!position) return "Position concurrentielle non disponible";

    const marketShare = (position.marketShare.estimated * 100).toFixed(1);
    return `Position ${position.position} avec ${marketShare}% de part de marché estimée.`;
  }

  private static extractCompetitiveFindings(
    analysisResult: EnhancedAnalysisResult,
  ): string[] {
    const findings: string[] = [];
    const position = analysisResult['marketInsights']?.competitivePosition;

    if (position) {
      findings.push(`${position.strengths.length} forces identifiées`);
      findings.push(`${position.weaknesses.length} faiblesses à adresser`);
      findings.push(
        `${position.opportunities.length} opportunités stratégiques`,
      );
    }

    return findings;
  }

  private static extractCompetitiveRecommendations(
    analysisResult: EnhancedAnalysisResult,
  ): string[] {
    const recommendations: string[] = [];
    const position = analysisResult['marketInsights']?.competitivePosition;

    if (position) {
      position.opportunities.forEach((opp: string) => {
        recommendations.push(`Exploiter l'opportunité: ${opp}`);
      });
    }

    return recommendations;
  }
}
