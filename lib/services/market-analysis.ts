import { useMarketAnalysisStore } from "@/lib/store";
import { MarketAnalysisRequest, VintedAnalysisResult } from "@/types/vinted-market-analysis";

/**
 * Suggestions de catégories mockées pour débloquer la compilation.
 */
export async function getCategorySuggestions(productName: string): Promise<string[]> {
  // Retourne des suggestions factices
  if (!productName) return [];
  return [
    "Vêtements",
    "Chaussures",
    "Accessoires",
    "Maison",
    "Électronique"
  ];
}

/**
 * Suggestions de marques mockées pour débloquer la compilation.
 */
export async function getBrandSuggestions(productName: string, catalogId?: number): Promise<{ id: number; name: string }[]> {
  // Retourne des marques factices
  if (!productName) return [];
  return [
    { id: 1, name: "Nike" },
    { id: 2, name: "Adidas" },
    { id: 3, name: "Apple" }
  ];
}

/**
 * Démarre une analyse de marché mockée pour débloquer la compilation.
 */
export async function startMarketAnalysis(request: MarketAnalysisRequest): Promise<VintedAnalysisResult> {
  // Retourne un résultat factice conforme au type attendu
  return {
    salesVolume: 42,
    avgPrice: 99.99,
    priceRange: { min: 50, max: 150 },
    brandInfo: { id: 1, name: "Nike" },
    catalogInfo: { id: request.catalogId ?? 0, name: "Vêtements" },
    rawItems: [
      {
        title: "Produit exemple",
        price: { amount: "99.99", currency: "EUR" },
        size_title: "M",
        brand: { id: 1, title: "Nike" },
        created_at: new Date().toISOString(),
        sold_at: new Date().toISOString()
      }
    ],
    analysisDate: new Date().toISOString()
  };
}

export async function checkVintedTokenStatus(): Promise<void> {
  const { setTokenConfigured, setError } = useMarketAnalysisStore.getState();
  try {
    const baseUrl = typeof window !== 'undefined' ? '' : 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/v1/vinted/auth`, { credentials: 'include' });
    const data = await response.json();
    
    const isValid = !!data.authenticated;
    setTokenConfigured(isValid);
    if (!isValid) {
        setError("Le token Vinted est invalide ou a expiré.");
    }

  } catch (error) {
    console.error("Erreur lors de la vérification du token Vinted:", error);
    setTokenConfigured(false);
    setError("Impossible de vérifier le statut du token Vinted.");
  }
}

export async function launchMarketAnalysis(request: MarketAnalysisRequest): Promise<void> {
  const { setIsLoading, setError, setCurrentAnalysis, setTokenConfigured } = useMarketAnalysisStore.getState();

  setIsLoading(true);
  setError(null);

  try {
    const response = await fetch('/api/v1/market-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    const responseBody = await response.text();

    if (!response.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseBody);
      } catch (e) {
        throw new Error(`Erreur serveur non-JSON: ${response.statusText}`);
      }
      
      if (errorData.error?.code === 'VINTED_TOKEN_EXPIRED') {
        setTokenConfigured(false);
        setError("Votre token Vinted a expiré. Veuillez le renouveler.");
        setIsLoading(false);
        return;
      }
      throw new Error(errorData.error?.message || "Erreur lors de l'analyse");
    }

    const analysisResult: VintedAnalysisResult = JSON.parse(responseBody);
    setCurrentAnalysis(analysisResult);

  } catch (error: any) {
    console.error("Erreur lors du lancement de l'analyse de marché:", error);
    setError(error.message);
  } finally {
    setIsLoading(false);
  }
}