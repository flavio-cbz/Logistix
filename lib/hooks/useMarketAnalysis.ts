import { useState, useCallback } from 'react';
import { MarketAnalysis, MarketProduct, MarketPlatform } from '@/lib/types/market';
import { toast } from 'sonner';

/**
 * Partial analysis result for internal use before full MarketAnalysis is computed.
 * Used when API returns simplified market stats that need to be converted.
 */
interface PartialAnalysisResult {
    averagePrice: number;
    medianPrice: number;
    minPrice: number;
    maxPrice: number;
    listingsCount: number;
    lastUpdated: string;
}

/**
 * Creates a full MarketAnalysis from partial data with sensible defaults.
 */
function toMarketAnalysis(partial: PartialAnalysisResult, productId: string): MarketAnalysis {
    return {
        productId,
        timestamp: new Date(partial.lastUpdated),
        totalListings: partial.listingsCount,
        averagePrice: partial.averagePrice,
        medianPrice: partial.medianPrice,
        minPrice: partial.minPrice,
        maxPrice: partial.maxPrice,
        priceDistribution: [],
        bestPlatform: 'Vinted' as MarketPlatform,
        demandLevel: partial.listingsCount > 100 ? 'High' : partial.listingsCount > 20 ? 'Medium' : 'Low',
        recommendation: {
            suggestedPrice: partial.averagePrice,
            confidenceScore: partial.listingsCount > 0 ? Math.min(partial.listingsCount * 2, 100) : 0,
            reasoning: 'Basé sur les données du marché Vinted'
        }
    };
}

export function useMarketAnalysis() {
    const [isSearching, setIsSearching] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [searchResults, setSearchResults] = useState<MarketProduct[]>([]);
    const [analysis, setAnalysis] = useState<MarketAnalysis | null>(null);
    const [error, setError] = useState<string | null>(null);

    const searchProducts = useCallback(async (_query: string) => {
        setIsSearching(true);
        setError(null);
        try {
            // Mock empty search for now as per previous service implementation
            await new Promise(resolve => setTimeout(resolve, 500));
            const results: MarketProduct[] = [];
            // Future: fetch('/api/v1/market/search', ...)

            setSearchResults(results);
            if (results.length === 0) {
                toast.info("Aucun produit trouvé", {
                    description: "Fonctionnalité de recherche à venir."
                });
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : "Erreur lors de la recherche";
            setError(message);
            toast.error("Erreur", { description: message });
        } finally {
            setIsSearching(false);
        }
    }, []);

    const analyzeProduct = useCallback(async (productId: string) => {
        setIsAnalyzing(true);
        setError(null);
        try {
            const response = await fetch('/api/v1/market/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ productId }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Erreur lors de l'analyse");
            }

            const product = data.data;
            let analysisResult: MarketAnalysis;

            if (product.enrichmentData?.marketStats) {
                const stats = product.enrichmentData.marketStats;
                const partial: PartialAnalysisResult = {
                    averagePrice: stats.avgPrice ?? 0,
                    medianPrice: stats.medianPrice ?? 0,
                    minPrice: stats.minPrice ?? 0,
                    maxPrice: stats.maxPrice ?? 0,
                    listingsCount: stats.sampleSize ?? 0,
                    lastUpdated: stats.lastUpdated ?? new Date().toISOString()
                };
                analysisResult = toMarketAnalysis(partial, productId);
            } else {
                // Fallback if direct mapping fails but success reported
                const partial: PartialAnalysisResult = {
                    averagePrice: 0,
                    medianPrice: 0,
                    minPrice: 0,
                    maxPrice: 0,
                    listingsCount: 0,
                    lastUpdated: new Date().toISOString()
                };
                analysisResult = toMarketAnalysis(partial, productId);
            }

            setAnalysis(analysisResult);
            toast.success("Analyse terminée", {
                description: `Prix moyen estimé : ${analysisResult.averagePrice}€`
            });

            return analysisResult;

        } catch (err) {
            const message = err instanceof Error ? err.message : "Erreur lors de l'analyse";
            setError(message);
            toast.error("Erreur", { description: message });
            throw err;
        } finally {
            setIsAnalyzing(false);
        }
    }, []);

    const resetAnalysis = useCallback(() => {
        setAnalysis(null);
        setSearchResults([]);
        setError(null);
    }, []);

    return {
        isSearching,
        isAnalyzing,
        searchResults,
        analysis,
        error,
        searchProducts,
        analyzeProduct,
        resetAnalysis
    };
}
