/**
 * Hook personnalisé pour récupérer les statistiques avancées
 * Connecté à l'API /api/v1/statistiques avec gestion du cache et polling
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// === TYPES ===

export type PeriodType = '7d' | '30d' | '90d' | '1y' | 'all';
export type GroupByType = 'day' | 'week' | 'month';

export interface VueEnsemble {
  totalProduits: number;
  produitsVendus: number;
  produitsEnLigne: number;
  produitsStock: number;
  chiffreAffaires: number;
  beneficesTotal: number;
  margeMoyenne: number;
  prixMoyenVente: number;
  prixMoyenAchat: number;
  tauxVente: number;
  tauxMarge: number;
}

export interface EvolutionPoint {
  date: string;
  ventes: number;
  chiffreAffaires: number;
  benefices: number;
  produitsVendus: number;
}

export interface PerformancePlateforme {
  plateforme: string;
  nbVentes: number;
  chiffreAffaires: number;
  benefices: number;
  margeMoyenne: number;
  prixMoyenVente: number;
  partMarche: number;
}

export interface PerformanceParcelle {
  parcelleId: string;
  parcelleNumero: string;
  parcelleNom: string;
  nbProduitsTotal: number;
  nbProduitsVendus: number;
  tauxVente: number;
  poidsTotal: number;
  coutTotal: number;
  chiffreAffaires: number;
  beneficesTotal: number;
  ROI: number;
  prixParGramme: number;
  coutLivraisonTotal: number;
}

export interface TopFlopProduit {
  id: string;
  nom: string;
  prixAchat: number;
  prixVente: number;
  coutLivraison: number;
  benefice: number;
  margePercent: number;
  plateforme: string;
  dateVente: string;
}

export interface DelaisVente {
  delaiMoyen: number;
  delaiMedian: number;
  delaiMin: number;
  delaiMax: number;
  nbProduitsAvecDelai: number;
}

export interface ProduitNonVendu {
  id: string;
  nom: string;
  prixAchat: number;
  coutLivraison: number;
  dateMiseEnLigne: string | null;
  joursEnLigne: number | null;
  parcelleNumero: string;
}

export interface AnalyseCouts {
  coutAchatTotal: number;
  coutLivraisonTotal: number;
  coutTotalInvesti: number;
  nbParcelles: number;
  coutMoyenParProduit: number;
  coutMoyenLivraison: number;
}

export interface StatistiquesData {
  periode: string;
  groupBy: string;
  vueEnsemble: VueEnsemble;
  evolutionTemporelle: EvolutionPoint[];
  performancePlateforme: PerformancePlateforme[];
  performanceParcelle: PerformanceParcelle[];
  topProduits: TopFlopProduit[];
  flopProduits: TopFlopProduit[];
  delaisVente: DelaisVente;
  produitsNonVendus: ProduitNonVendu[];
  analyseCouts: AnalyseCouts;
  lastUpdate: string;
}

interface UseStatistiquesOptions {
  enabled?: boolean;
  refetchInterval?: number; // en millisecondes (ex: 30000 = 30s)
  onError?: (error: Error) => void;
}

interface UseStatistiquesReturn {
  data: StatistiquesData | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// === HOOK PRINCIPAL ===

export function useStatistiques(
  period: PeriodType = '30d',
  groupBy: GroupByType = 'day',
  options: UseStatistiquesOptions = {}
): UseStatistiquesReturn {
  const { 
    enabled = true, 
    refetchInterval = 0, 
    onError 
  } = options;

  const [data, setData] = useState<StatistiquesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fonction de récupération des données
  const fetchData = useCallback(async () => {
    if (!enabled) return;

    // Annuler la requête précédente si elle existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      setIsLoading(true);
      setIsError(false);

      const url = `/api/v1/statistiques?period=${period}&groupBy=${groupBy}`;
      const response = await fetch(url, {
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erreur inconnue');
      }

      setData(result.data);
      setError(null);
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          // Requête annulée, ne rien faire
          return;
        }
        setError(err);
        setIsError(true);
        if (onError) {
          onError(err);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [enabled, period, groupBy, onError]);

  // Effet pour le fetch initial
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Effet pour le polling (refetch automatique)
  useEffect(() => {
    if (refetchInterval > 0 && enabled) {
      intervalRef.current = setInterval(() => {
        fetchData();
      }, refetchInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [refetchInterval, enabled, fetchData]);

  // Cleanup à la destruction
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    data,
    isLoading,
    isError,
    error,
    refetch: fetchData,
  };
}

// === HOOKS DÉRIVÉS (PLUS SPÉCIFIQUES) ===

/**
 * Hook pour récupérer uniquement la vue d'ensemble
 */
export function useVueEnsemble(period: PeriodType = '30d'): UseStatistiquesReturn & {
  vueEnsemble: VueEnsemble | null;
} {
  const result = useStatistiques(period, 'day', { enabled: true });
  
  return {
    ...result,
    vueEnsemble: result.data?.vueEnsemble || null,
  };
}

/**
 * Hook pour récupérer l'évolution temporelle avec période et groupement configurables
 */
export function useEvolutionTemporelle(
  period: PeriodType = '30d',
  groupBy: GroupByType = 'day'
): UseStatistiquesReturn & {
  evolution: EvolutionPoint[];
} {
  const result = useStatistiques(period, groupBy, { enabled: true });
  
  return {
    ...result,
    evolution: result.data?.evolutionTemporelle || [],
  };
}

/**
 * Hook pour récupérer la performance des plateformes
 */
export function usePerformancePlateforme(period: PeriodType = '30d'): UseStatistiquesReturn & {
  plateformes: PerformancePlateforme[];
} {
  const result = useStatistiques(period, 'day', { enabled: true });
  
  return {
    ...result,
    plateformes: result.data?.performancePlateforme || [],
  };
}

/**
 * Hook pour récupérer la performance des parcelles
 */
export function usePerformanceParcelle(period: PeriodType = 'all'): UseStatistiquesReturn & {
  parcelles: PerformanceParcelle[];
} {
  const result = useStatistiques(period, 'day', { enabled: true });
  
  return {
    ...result,
    parcelles: result.data?.performanceParcelle || [],
  };
}

/**
 * Hook pour récupérer les top et flop produits
 */
export function useTopFlopProduits(period: PeriodType = '30d'): UseStatistiquesReturn & {
  topProduits: TopFlopProduit[];
  flopProduits: TopFlopProduit[];
} {
  const result = useStatistiques(period, 'day', { enabled: true });
  
  return {
    ...result,
    topProduits: result.data?.topProduits || [],
    flopProduits: result.data?.flopProduits || [],
  };
}

/**
 * Hook pour récupérer les délais de vente
 */
export function useDelaisVente(period: PeriodType = 'all'): UseStatistiquesReturn & {
  delais: DelaisVente | null;
} {
  const result = useStatistiques(period, 'day', { enabled: true });
  
  return {
    ...result,
    delais: result.data?.delaisVente || null,
  };
}

/**
 * Hook pour récupérer les produits non vendus
 */
export function useProduitsNonVendus(): UseStatistiquesReturn & {
  produitsNonVendus: ProduitNonVendu[];
} {
  const result = useStatistiques('all', 'day', { enabled: true });
  
  return {
    ...result,
    produitsNonVendus: result.data?.produitsNonVendus || [],
  };
}

/**
 * Hook pour récupérer l'analyse des coûts
 */
export function useAnalyseCouts(period: PeriodType = 'all'): UseStatistiquesReturn & {
  couts: AnalyseCouts | null;
} {
  const result = useStatistiques(period, 'day', { enabled: true });
  
  return {
    ...result,
    couts: result.data?.analyseCouts || null,
  };
}
