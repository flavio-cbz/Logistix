import type { SoldItem } from "@/types/vinted-market-analysis";
import type { MarketOpportunity } from "./market-insights";

// Define EnhancedAnalysisResult locally to break circular dependency
interface EnhancedAnalysisResult {
  salesVolume: number;
  avgPrice: number;
  priceRange: { min: number; max: number };
  rawItems?: SoldItem[];
  enrichedItems?: any[];
  analysisDate: string;
  [key: string]: any;
}

export class DataTransformationService {
  public static extractPriceDistributionData(
    analysisResult: EnhancedAnalysisResult,
  ): any {
    const prices =
      analysisResult.rawItems
        ?.map((item: SoldItem) => parseFloat(item.price.amount))
        .filter((price) => !isNaN(price)) || [];

    if (prices.length === 0) {
      return { bins: [], prices: [] };
    }

    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const binCount = Math.min(
      10,
      Math.max(5, Math.ceil(Math.sqrt(prices.length))),
    );
    const binSize = (max - min) / binCount;

    const bins = Array.from({ length: binCount }, (_, i) => ({
      min: min + i * binSize,
      max: min + (i + 1) * binSize,
      count: 0,
      percentage: 0,
    }));

    // Compter les prix dans chaque bin
    prices.forEach((price) => {
      const binIndex = Math.min(
        Math.floor((price - min) / binSize),
        binCount - 1,
      );
      bins[binIndex]!.count++;
    });

    // Calculer les pourcentages
    bins.forEach((bin) => {
      bin.percentage = (bin.count / prices.length) * 100;
    });

    return { bins, prices, min, max };
  }

  public static extractTrendData(analysisResult: EnhancedAnalysisResult): any {
    const items = analysisResult.rawItems || [];
    const trendPoints = items
      .filter((item: SoldItem) => item.sold_at)
      .map((item: SoldItem) => ({
        date: item.sold_at!,
        price: parseFloat(item.price.amount),
        volume: 1,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return { trendPoints, avgPrice: analysisResult.avgPrice };
  }

  public static prepareOpportunityMapData(
    opportunities: MarketOpportunity[],
  ): any {
    return {
      opportunities: opportunities.map((opp, _index) => ({
        ...opp,
        position: {
          x: opp.effort === "low" ? 20 : opp.effort === "medium" ? 50 : 80,
          y: 100 - (Math.min(opp.potentialValue / 1000, 1) * 80 + 10),
        },
        size: Math.min(Math.max(opp.potentialValue / 100, 10), 50), // Taille du point
      })),
    };
  }

  public static prepareCompetitivePositionData(competitivePosition: any): any {
    return {
      position: competitivePosition.position,
      marketShare: competitivePosition.marketShare,
      competitors: competitivePosition.competitorAnalysis || [],
      strengths: competitivePosition.strengths,
      weaknesses: competitivePosition.weaknesses,
      opportunities: competitivePosition.opportunities,
      threats: competitivePosition.threats,
    };
  }
}

export default DataTransformationService;
