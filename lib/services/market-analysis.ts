import { useMarketAnalysisStore } from "@/lib/store";
import type { MarketAnalysisRequest, VintedAnalysisResult } from '@/types/vinted-market-analysis';

interface CategorySuggestion {
  id: number;
  title?: string;
  name?: string;
}

interface VintedCategoryResponse {
  categories: CategorySuggestion[];
}

interface VintedTokenStatusResponse {
  status: 'active' | 'inactive';
  error?: {
    code: string;
    message: string;
  };
}

interface MarketAnalysisStartResponse {
  id?: string;
  error?: {
    code: string;
    message: string;
  };
}

interface MarketAnalysisStatusResponse {
  status: 'pending' | 'completed' | 'failed';
  result?: VintedAnalysisResult;
  analysis?: VintedAnalysisResult;
  error?: string;
}

/**
 * Suggestions de catégories mockées pour débloquer la compilation.
 */
export async function getCategorySuggestions(productName: string): Promise<{ id: number; title: string }[]> {
  if (!productName || productName.trim().length < 3) return [];
  try {
    const res = await fetch(`/api/v1/vinted/category-filters?title=${encodeURIComponent(productName)}`);
    if (!res.ok) throw new Error('Failed to fetch category suggestions');
    const data: VintedCategoryResponse = await res.json();
    const categories = Array.isArray(data.categories) ? data.categories : [];
    return categories
      .map((c: CategorySuggestion) => ({ id: Number(c.id), title: String(c.title ?? c.name ?? '') }))
      .filter((c) => !!c.title);
  } catch (error: unknown) {
    console.error("Erreur lors de la récupération des suggestions de catégories:", error);
    return [];
  }
}

/**
 * Suggestions de marques mockées pour débloquer la compilation.
 */
export async function getBrandSuggestions(productName: string, _catalogId?: number): Promise<{ id: number; name: string }[]> {
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
    const baseUrl = typeof window !== 'undefined' ? '' : 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/v1/vinted/configure`, { credentials: 'include' });
    const data: VintedTokenStatusResponse = await response.json();
    
    // La réponse de l'API de configuration contient un champ "status" qui peut être "active" ou "inactive"
    const isValid = data.status === 'active';
    setTokenConfigured(isValid);
    if (!isValid) {
        setError("Le token Vinted est invalide ou a expiré.");
    }

  } catch (error: unknown) {
    console.error("Erreur lors de la vérification du token Vinted:", error);
    setTokenConfigured(false);
    setError("Impossible de vérifier le statut du token Vinted.");
  }
}

export async function launchMarketAnalysis(request: MarketAnalysisRequest): Promise<boolean> {
  const { setIsLoading, setError, setCurrentAnalysis, setTokenConfigured } = useMarketAnalysisStore.getState();
  let success = false;

  setIsLoading(true);
  setError(null);

  try {
    // Start the analysis job (creates DB record and returns job id)
    const startRes = await fetch('/api/v1/market-analysis/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    const startBody: MarketAnalysisStartResponse = await startRes.json();

    if (!startRes.ok || !startBody?.id) {
      // Handle token expired case if returned by start endpoint
      if (startBody?.error?.code === 'VINTED_TOKEN_EXPIRED') {
        setTokenConfigured(false);
        setError("Votre token Vinted a expiré. Veuillez le renouveler.");
        return false;
      }
      throw new Error(startBody?.error?.message || "Impossible de démarrer l'analyse");
    }

    const jobId: string = startBody.id;

    // Poll the status endpoint until completed/failed or timeout
    const pollIntervalMs = 1000;
    const timeoutMs = 60000; // 60s
    const startedAt = Date.now();

    while (true) {
      const statusRes = await fetch(`/api/v1/market-analysis/status?id=${encodeURIComponent(jobId)}`);
      if (!statusRes.ok) {
        const textBody = await statusRes.text();
        throw new Error(`Erreur lors de la vérification du statut: ${statusRes.status} ${textBody}`);
      }

      const statusBody: MarketAnalysisStatusResponse = await statusRes.json();

      if (statusBody?.status === 'completed') {
        // Prefer structured result if provided
        const result = statusBody?.result ?? statusBody?.analysis;
        if (result) {
          setCurrentAnalysis(result);
          success = true;
        } else {
          setError("L'analyse est marquée comme terminée mais aucun résultat n'a été trouvé.");
          success = false;
        }
        break;
      }

      if (statusBody?.status === 'failed') {
        setError(statusBody?.error || "L'analyse a échoué");
        success = false;
        break;
      }

      if (Date.now() - startedAt > timeoutMs) {
        setError("Délai d'attente dépassé pour l'analyse de marché.");
        success = false;
        break;
      }

      // Wait before next poll
      await new Promise((res) => setTimeout(res, pollIntervalMs));
    }

  } catch (error: unknown) {
    console.error("Erreur lors du lancement de l'analyse de marché:", error);
    if (error instanceof Error) {
      setError(error.message);
    } else {
      setError("Une erreur inconnue est survenue lors de l'analyse de marché.");
    }
    return false;
  } finally {
    setIsLoading(false);
  }

  return success;
}