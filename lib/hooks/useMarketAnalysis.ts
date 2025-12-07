import { useState, useCallback } from 'react';
import { MarketService } from '@/lib/services/market/market-service';
import { MarketAnalysis, MarketProduct } from '@/lib/types/market';
import { toast } from 'sonner';

export function useMarketAnalysis() {
    const [isSearching, setIsSearching] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [searchResults, setSearchResults] = useState<MarketProduct[]>([]);
    const [analysis, setAnalysis] = useState<MarketAnalysis | null>(null);
    const [error, setError] = useState<string | null>(null);

    const searchProducts = useCallback(async (query: string) => {
        setIsSearching(true);
        setError(null);
        try {
            const results = await MarketService.searchProducts({ query });
            setSearchResults(results);
            if (results.length === 0) {
                toast.info("Aucun produit trouvé", {
                    description: "Essayez avec des termes plus génériques."
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
            const result = await MarketService.analyzeProduct(productId);
            setAnalysis(result);
            toast.success("Analyse terminée", {
                description: `Prix moyen estimé : ${result.averagePrice}€`
            });
        } catch (err) {
            const message = err instanceof Error ? err.message : "Erreur lors de l'analyse";
            setError(message);
            toast.error("Erreur", { description: message });
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
