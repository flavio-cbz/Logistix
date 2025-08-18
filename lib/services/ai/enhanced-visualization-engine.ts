import { VintedAnalysisResult } from "@/types/vinted-market-analysis";
import { MarketInsights, PricingRecommendation, MarketOpportunity } from "./market-insights";
import { EnhancedAnalysisResult } from "./ai-analysis-engine";
import { AIAnalysisError } from "./ai-errors";

// Types pour les graphiques enrichis avec annotations IA
export interface AIAnnotation {
  id: string;
  position: { x: number; y: number };
  type: 'insight' | 'recommendation' | 'warning' | 'opportunity' | 'trend';
  title: string;
  description: string;
  confidence: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  actionable: boolean;
  relatedData?: {
    dataPointIndex?: number;
    value?: number;
    trend?: 'up' | 'down' | 'stable';
  };
}

export interface InteractiveElement {
  id: string;
  trigger: 'hover' | 'click' | 'focus';
  element: string; // CSS selector or element ID
  action: 'show-detail' | 'highlight-related' | 'show-recommendation' | 'expand-insight';
  data: {
    content?: string;
    relatedAnnotations?: string[];
    recommendations?: PricingRecommendation[];
    opportunities?: MarketOpportunity[];
  };
}

export interface EnhancedChart {
  id: string;
  type: 'price-distribution' | 'trend-analysis' | 'competitive-position' | 'opportunity-map' | 'market-insights' | 'comparison';
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
  type: 'comparison';
  comparisonData: {
    baseline: VintedAnalysisResult;
    comparisons: VintedAnalysisResult[];
    differences: Array<{
      metric: string;
      baselineValue: number;
      comparisonValues: number[];
      percentageChanges: number[];
      significance: 'low' | 'medium' | 'high';
    }>;
  };
}

export interface ChartExportOptions {
  format: 'pdf' | 'excel' | 'json' | 'png' | 'svg';
  includeAnnotations: boolean;
  includeInsights: boolean;
  includeRawData: boolean;
  customization?: {
    title?: string;
    subtitle?: string;
    branding?: boolean;
    colorScheme?: 'light' | 'dark' | 'custom';
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
    analysisResult: EnhancedAnalysisResult
  ): Promise<EnhancedChart[]> {
    const startTime = Date.now();
    const charts: EnhancedChart[] = [];

    try {
      // 1. Graphique de distribution des prix avec insights IA
      const priceDistributionChart = await this.createPriceDistributionChart(analysisResult);
      charts.push(priceDistributionChart);

      // 2. Graphique d'analyse de tendance avec prédictions
      if (analysisResult.marketInsights) {
        const trendChart = await this.createTrendAnalysisChart(analysisResult);
        charts.push(trendChart);
      }

      // 3. Carte des opportunités de marché
      if (analysisResult.marketInsights?.marketOpportunities.length > 0) {
        const opportunityChart = await this.createOpportunityMapChart(analysisResult);
        charts.push(opportunityChart);
      }

      // 4. Graphique de position concurrentielle
      if (analysisResult.marketInsights?.competitivePosition) {
        const competitiveChart = await this.createCompetitivePositionChart(analysisResult);
        charts.push(competitiveChart);
      }

      return charts;

    } catch (error) {
      throw new AIAnalysisError(
        `Erreur lors de la création des graphiques enrichis: ${error.message}`,
        'CHART_GENERATION_FAILED' as any,
        { retryable: true, fallbackAvailable: true, cause: error }
      );
    }
  }

  /**
   * Crée un graphique de distribution des prix avec annotations IA
   */
  private async createPriceDistributionChart(
    analysisResult: EnhancedAnalysisResult
  ): Promise<EnhancedChart> {
    const annotations: AIAnnotation[] = [];
    const interactiveElements: InteractiveElement[] = [];

    // Analyser la distribution des prix
    const priceData = this.extractPriceDistributionData(analysisResult);
    
    // Générer des annotations basées sur les insights IA
    if (analysisResult.marketInsights?.pricingRecommendations) {
      for (const [index, recommendation] of analysisResult.marketInsights.pricingRecommendations.entries()) {
        const optimalRange = recommendation.optimalPriceRange;
        
        // Trouver la position dans le graphique pour l'annotation
        const position = this.calculateAnnotationPosition(
          priceData,
          (optimalRange.min + optimalRange.max) / 2
        );

        annotations.push({
          id: `pricing-rec-${index}`,
          position,
          type: 'recommendation',
          title: 'Prix optimal recommandé',
          description: `${optimalRange.min}€ - ${optimalRange.max}€: ${recommendation.strategy}`,
          confidence: recommendation.confidence,
          priority: recommendation.confidence > 0.8 ? 'high' : 'medium',
          actionable: true,
          relatedData: {
            value: (optimalRange.min + optimalRange.max) / 2,
            trend: recommendation.currentPricePosition === 'underpriced' ? 'up' : 
                   recommendation.currentPricePosition === 'overpriced' ? 'down' : 'stable'
          }
        });

        // Ajouter un élément interactif
        interactiveElements.push({
          id: `pricing-interaction-${index}`,
          trigger: 'hover',
          element: `#pricing-rec-${index}`,
          action: 'show-detail',
          data: {
            content: recommendation.justification,
            recommendations: [recommendation]
          }
        });
      }
    }

    // Détecter les anomalies de prix
    const anomalies = this.detectPriceAnomalies(priceData, analysisResult);
    anomalies.forEach((anomaly, index) => {
      annotations.push({
        id: `anomaly-${index}`,
        position: anomaly.position,
        type: 'warning',
        title: 'Anomalie détectée',
        description: anomaly.description,
        confidence: anomaly.confidence,
        priority: 'medium',
        actionable: true,
        relatedData: anomaly.relatedData
      });
    });

    return {
      id: 'price-distribution-enhanced',
      type: 'price-distribution',
      title: 'Distribution des prix avec insights IA',
      description: 'Analyse de la répartition des prix avec recommandations et détection d\'anomalies',
      chartData: priceData,
      aiAnnotations: annotations,
      interactiveElements,
      insights: {
        summary: this.generatePriceDistributionSummary(analysisResult),
        keyFindings: this.extractPriceDistributionFindings(analysisResult),
        recommendations: this.extractPriceDistributionRecommendations(analysisResult)
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        confidence: this.calculateChartConfidence(annotations),
        dataQuality: analysisResult.processingMetadata.dataQuality.score,
        processingTime: Date.now() - Date.now()
      }
    };
  }

  /**
   * Crée un graphique d'analyse de tendance avec prédictions IA
   */
  private async createTrendAnalysisChart(
    analysisResult: EnhancedAnalysisResult
  ): Promise<EnhancedChart> {
    const annotations: AIAnnotation[] = [];
    const interactiveElements: InteractiveElement[] = [];

    // Extraire les données de tendance
    const trendData = this.extractTrendData(analysisResult);

    // Ajouter des annotations pour les tendances identifiées
    if (analysisResult.marketInsights?.marketTrends) {
      analysisResult.marketInsights.marketTrends.forEach((trend, index) => {
        const position = this.calculateTrendAnnotationPosition(trendData, trend);
        
        annotations.push({
          id: `trend-${index}`,
          position,
          type: 'trend',
          title: `Tendance ${trend.direction === 'up' ? 'haussière' : trend.direction === 'down' ? 'baissière' : 'stable'}`,
          description: `${trend.trend} - Impact: ${trend.impact}`,
          confidence: trend.strength,
          priority: trend.impact === 'high' ? 'high' : trend.impact === 'medium' ? 'medium' : 'low',
          actionable: true,
          relatedData: {
            trend: trend.direction,
            value: trend.strength
          }
        });
      });
    }

    return {
      id: 'trend-analysis-enhanced',
      type: 'trend-analysis',
      title: 'Analyse de tendance avec prédictions IA',
      description: 'Évolution des prix et volumes avec prédictions et identification des tendances',
      chartData: trendData,
      aiAnnotations: annotations,
      interactiveElements,
      insights: {
        summary: this.generateTrendSummary(analysisResult),
        keyFindings: this.extractTrendFindings(analysisResult),
        recommendations: this.extractTrendRecommendations(analysisResult)
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        confidence: this.calculateChartConfidence(annotations),
        dataQuality: analysisResult.processingMetadata.dataQuality.score,
        processingTime: 0
      }
    };
  }

  /**
   * Crée une carte des opportunités de marché
   */
  private async createOpportunityMapChart(
    analysisResult: EnhancedAnalysisResult
  ): Promise<EnhancedChart> {
    const annotations: AIAnnotation[] = [];
    const interactiveElements: InteractiveElement[] = [];

    if (!analysisResult.marketInsights?.marketOpportunities) {
      throw new AIAnalysisError(
        'Aucune opportunité de marché disponible pour la visualisation',
        'MISSING_DATA' as any
      );
    }

    // Créer des annotations pour chaque opportunité
    analysisResult.marketInsights.marketOpportunities.forEach((opportunity, index) => {
      const position = this.calculateOpportunityPosition(opportunity, index);
      
      annotations.push({
        id: `opportunity-${index}`,
        position,
        type: 'opportunity',
        title: opportunity.title,
        description: `${opportunity.description} - Potentiel: ${opportunity.potentialValue}€`,
        confidence: opportunity.confidence,
        priority: opportunity.effort === 'low' && opportunity.potentialValue > 100 ? 'high' : 'medium',
        actionable: true,
        relatedData: {
          value: opportunity.potentialValue
        }
      });

      // Ajouter l'interactivité
      interactiveElements.push({
        id: `opportunity-interaction-${index}`,
        trigger: 'click',
        element: `#opportunity-${index}`,
        action: 'show-recommendation',
        data: {
          content: opportunity.description,
          opportunities: [opportunity]
        }
      });
    });

    return {
      id: 'opportunity-map-enhanced',
      type: 'opportunity-map',
      title: 'Carte des opportunités de marché',
      description: 'Visualisation des opportunités identifiées par l\'IA avec potentiel de profit',
      chartData: this.prepareOpportunityMapData(analysisResult.marketInsights.marketOpportunities),
      aiAnnotations: annotations,
      interactiveElements,
      insights: {
        summary: this.generateOpportunitySummary(analysisResult),
        keyFindings: this.extractOpportunityFindings(analysisResult),
        recommendations: this.extractOpportunityRecommendations(analysisResult)
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        confidence: this.calculateChartConfidence(annotations),
        dataQuality: analysisResult.processingMetadata.dataQuality.score,
        processingTime: 0
      }
    };
  }

  /**
   * Crée un graphique de position concurrentielle
   */
  private async createCompetitivePositionChart(
    analysisResult: EnhancedAnalysisResult
  ): Promise<EnhancedChart> {
    const annotations: AIAnnotation[] = [];
    const interactiveElements: InteractiveElement[] = [];

    const competitivePosition = analysisResult.marketInsights!.competitivePosition;
    
    // Annotation pour la position actuelle
    annotations.push({
      id: 'current-position',
      position: { x: 50, y: 50 }, // Centre du graphique
      type: 'insight',
      title: `Position: ${competitivePosition.position}`,
      description: `Part de marché estimée: ${(competitivePosition.marketShare.estimated * 100).toFixed(1)}%`,
      confidence: competitivePosition.marketShare.confidence,
      priority: 'high',
      actionable: true
    });

    // Annotations pour les forces et faiblesses
    competitivePosition.strengths.forEach((strength, index) => {
      annotations.push({
        id: `strength-${index}`,
        position: { x: 70 + index * 10, y: 30 },
        type: 'insight',
        title: 'Force identifiée',
        description: strength,
        confidence: 0.8,
        priority: 'medium',
        actionable: false
      });
    });

    return {
      id: 'competitive-position-enhanced',
      type: 'competitive-position',
      title: 'Position concurrentielle avec analyse IA',
      description: 'Analyse de la position sur le marché avec forces, faiblesses et opportunités',
      chartData: this.prepareCompetitivePositionData(competitivePosition),
      aiAnnotations: annotations,
      interactiveElements,
      insights: {
        summary: this.generateCompetitiveSummary(analysisResult),
        keyFindings: this.extractCompetitiveFindings(analysisResult),
        recommendations: this.extractCompetitiveRecommendations(analysisResult)
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        confidence: this.calculateChartConfidence(annotations),
        dataQuality: analysisResult.processingMetadata.dataQuality.score,
        processingTime: 0
      }
    };
  }

  // Méthodes utilitaires pour l'extraction et le calcul des données

  private extractPriceDistributionData(analysisResult: EnhancedAnalysisResult): any {
    // Créer des bins de prix basés sur les données
    const prices = analysisResult.rawItems?.map(item => 
      parseFloat(item.price.amount)
    ).filter(price => !isNaN(price)) || [];

    if (prices.length === 0) {
      return { bins: [], prices: [] };
    }

    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const binCount = Math.min(10, Math.max(5, Math.ceil(Math.sqrt(prices.length))));
    const binSize = (max - min) / binCount;

    const bins = Array.from({ length: binCount }, (_, i) => ({
      min: min + i * binSize,
      max: min + (i + 1) * binSize,
      count: 0,
      percentage: 0
    }));

    // Compter les prix dans chaque bin
    prices.forEach(price => {
      const binIndex = Math.min(Math.floor((price - min) / binSize), binCount - 1);
      bins[binIndex].count++;
    });

    // Calculer les pourcentages
    bins.forEach(bin => {
      bin.percentage = (bin.count / prices.length) * 100;
    });

    return { bins, prices, min, max };
  }

  private calculateAnnotationPosition(priceData: any, targetPrice: number): { x: number; y: number } {
    const { min, max } = priceData;
    const xPosition = ((targetPrice - min) / (max - min)) * 100;
    return { x: Math.max(5, Math.min(95, xPosition)), y: 20 };
  }

  private detectPriceAnomalies(priceData: any, analysisResult: EnhancedAnalysisResult): Array<{
    position: { x: number; y: number };
    description: string;
    confidence: number;
    relatedData: any;
  }> {
    const anomalies: any[] = [];
    const { bins } = priceData;

    // Détecter les bins avec très peu d'articles (potentiels gaps)
    bins.forEach((bin: any, index: number) => {
      if (bin.percentage < 2 && bin.count > 0) {
        anomalies.push({
          position: { x: (index / bins.length) * 100, y: 80 },
          description: `Faible représentation dans la tranche ${bin.min.toFixed(0)}€-${bin.max.toFixed(0)}€`,
          confidence: 0.7,
          relatedData: {
            dataPointIndex: index,
            value: (bin.min + bin.max) / 2
          }
        });
      }
    });

    return anomalies;
  }

  private extractTrendData(analysisResult: EnhancedAnalysisResult): any {
    // Simuler des données de tendance basées sur les données disponibles
    const items = analysisResult.rawItems || [];
    const trendPoints = items
      .filter(item => item.sold_at)
      .map(item => ({
        date: item.sold_at!,
        price: parseFloat(item.price.amount),
        volume: 1
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return { trendPoints, avgPrice: analysisResult.avgPrice };
  }

  private calculateTrendAnnotationPosition(trendData: any, trend: any): { x: number; y: number } {
    // Position basée sur l'impact et la direction de la tendance
    const xPosition = trend.impact === 'high' ? 80 : trend.impact === 'medium' ? 50 : 20;
    const yPosition = trend.direction === 'up' ? 20 : trend.direction === 'down' ? 80 : 50;
    return { x: xPosition, y: yPosition };
  }

  private calculateOpportunityPosition(opportunity: MarketOpportunity, index: number): { x: number; y: number } {
    // Positionner selon l'effort vs potentiel
    const effortMap = { low: 20, medium: 50, high: 80 };
    const potentialNormalized = Math.min(opportunity.potentialValue / 1000, 1) * 80 + 10;
    
    return {
      x: effortMap[opportunity.effort],
      y: 100 - potentialNormalized // Inverser Y pour que le haut = plus de potentiel
    };
  }

  private prepareOpportunityMapData(opportunities: MarketOpportunity[]): any {
    return {
      opportunities: opportunities.map((opp, index) => ({
        ...opp,
        position: this.calculateOpportunityPosition(opp, index),
        size: Math.min(Math.max(opp.potentialValue / 100, 10), 50) // Taille du point
      }))
    };
  }

  private prepareCompetitivePositionData(competitivePosition: any): any {
    return {
      position: competitivePosition.position,
      marketShare: competitivePosition.marketShare,
      competitors: competitivePosition.competitorAnalysis || [],
      strengths: competitivePosition.strengths,
      weaknesses: competitivePosition.weaknesses,
      opportunities: competitivePosition.opportunities,
      threats: competitivePosition.threats
    };
  }

  private calculateChartConfidence(annotations: AIAnnotation[]): number {
    if (annotations.length === 0) return 0.5;
    
    const avgConfidence = annotations.reduce((sum, ann) => sum + ann.confidence, 0) / annotations.length;
    return avgConfidence;
  }

  // Méthodes de génération de résumés et insights

  private generatePriceDistributionSummary(analysisResult: EnhancedAnalysisResult): string {
    const avgPrice = analysisResult.avgPrice;
    const volume = analysisResult.salesVolume;
    const recommendations = analysisResult.marketInsights?.pricingRecommendations?.length || 0;
    
    return `Distribution de ${volume} articles avec un prix moyen de ${avgPrice.toFixed(2)}€. ${recommendations} recommandations de prix identifiées par l'IA.`;
  }

  private extractPriceDistributionFindings(analysisResult: EnhancedAnalysisResult): string[] {
    const findings: string[] = [];
    
    if (analysisResult.marketInsights?.pricingRecommendations) {
      const rec = analysisResult.marketInsights.pricingRecommendations[0];
      findings.push(`Position prix actuelle: ${rec.currentPricePosition}`);
      findings.push(`Stratégie recommandée: ${rec.strategy}`);
    }
    
    findings.push(`Gamme de prix: ${analysisResult.priceRange.min}€ - ${analysisResult.priceRange.max}€`);
    
    return findings;
  }

  private extractPriceDistributionRecommendations(analysisResult: EnhancedAnalysisResult): string[] {
    const recommendations: string[] = [];
    
    if (analysisResult.marketInsights?.pricingRecommendations) {
      analysisResult.marketInsights.pricingRecommendations.forEach(rec => {
        recommendations.push(`Optimiser le prix entre ${rec.optimalPriceRange.min}€ et ${rec.optimalPriceRange.max}€`);
      });
    }
    
    return recommendations;
  }

  private generateTrendSummary(analysisResult: EnhancedAnalysisResult): string {
    const trends = analysisResult.marketInsights?.marketTrends?.length || 0;
    return `${trends} tendances de marché identifiées avec analyse prédictive.`;
  }

  private extractTrendFindings(analysisResult: EnhancedAnalysisResult): string[] {
    const findings: string[] = [];
    
    analysisResult.marketInsights?.marketTrends?.forEach(trend => {
      findings.push(`${trend.trend} - Direction: ${trend.direction}, Force: ${(trend.strength * 100).toFixed(0)}%`);
    });
    
    return findings;
  }

  private extractTrendRecommendations(analysisResult: EnhancedAnalysisResult): string[] {
    const recommendations: string[] = [];
    
    analysisResult.marketInsights?.marketTrends?.forEach(trend => {
      if (trend.impact === 'high') {
        recommendations.push(`Adapter la stratégie selon la tendance: ${trend.trend}`);
      }
    });
    
    return recommendations;
  }

  private generateOpportunitySummary(analysisResult: EnhancedAnalysisResult): string {
    const opportunities = analysisResult.marketInsights?.marketOpportunities?.length || 0;
    const totalPotential = analysisResult.marketInsights?.marketOpportunities?.reduce(
      (sum, opp) => sum + opp.potentialValue, 0
    ) || 0;
    
    return `${opportunities} opportunités identifiées avec un potentiel total de ${totalPotential.toFixed(0)}€.`;
  }

  private extractOpportunityFindings(analysisResult: EnhancedAnalysisResult): string[] {
    const findings: string[] = [];
    
    analysisResult.marketInsights?.marketOpportunities?.forEach(opp => {
      findings.push(`${opp.title}: ${opp.potentialValue}€ (${opp.effort} effort, ${opp.timeframe})`);
    });
    
    return findings;
  }

  private extractOpportunityRecommendations(analysisResult: EnhancedAnalysisResult): string[] {
    const recommendations: string[] = [];
    
    analysisResult.marketInsights?.marketOpportunities
      ?.filter(opp => opp.priority === 'high' || opp.priority === 'critical')
      ?.forEach(opp => {
        recommendations.push(`Prioriser: ${opp.title} - ${opp.actionSteps[0]}`);
      });
    
    return recommendations;
  }

  private generateCompetitiveSummary(analysisResult: EnhancedAnalysisResult): string {
    const position = analysisResult.marketInsights?.competitivePosition;
    if (!position) return 'Position concurrentielle non disponible';
    
    const marketShare = (position.marketShare.estimated * 100).toFixed(1);
    return `Position ${position.position} avec ${marketShare}% de part de marché estimée.`;
  }

  private extractCompetitiveFindings(analysisResult: EnhancedAnalysisResult): string[] {
    const findings: string[] = [];
    const position = analysisResult.marketInsights?.competitivePosition;
    
    if (position) {
      findings.push(`${position.strengths.length} forces identifiées`);
      findings.push(`${position.weaknesses.length} faiblesses à adresser`);
      findings.push(`${position.opportunities.length} opportunités stratégiques`);
    }
    
    return findings;
  }

  private extractCompetitiveRecommendations(analysisResult: EnhancedAnalysisResult): string[] {
    const recommendations: string[] = [];
    const position = analysisResult.marketInsights?.competitivePosition;
    
    if (position) {
      position.opportunities.forEach(opp => {
        recommendations.push(`Exploiter l'opportunité: ${opp}`);
      });
    }
    
    return recommendations;
  }
}

// Instance globale
export const enhancedVisualizationEngine = EnhancedVisualizationEngine.getInstance();