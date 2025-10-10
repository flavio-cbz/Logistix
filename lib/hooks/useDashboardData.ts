"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// Types pour les données de dashboard
interface DashboardMetrics {
  ventesTotales: number;
  produitsVendus: number;
  beneficesTotaux: number;
  nombreColis: number;
  tauxConversion: number;
  panierMoyen: number;
  clientsActifs: number;
  performanceJournaliere: Array<{
    date: string;
    ventes: number;
    commandes: number;
    benefices: number;
  }>;
  topProduits: Array<{
    nom: string;
    ventesRevenue: number; // chiffre d'affaires pour ce produit
    ventesCount: number; // nombre d'unités vendues
    benefices: number;
    stock: number;
  }>;
  alertes: Array<{
    id: string;
    type: 'stock' | 'performance' | 'livraison' | 'finance';
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    message: string;
    timestamp: string;
  }>;
  // Nouvelles données de parcelles et rotation stock
  statsParcelles?: Array<{
    parcelleId: string;
    numero: string;
    nom: string;
    nbProduits: number;
    nbVendus: number;
    tauxVente: number;
    coutTotal: number;
    chiffreAffaires: number;
    benefices: number;
    ROI: number;
  }>;
  rotationStock?: {
    stockTotal: number;
    stockEnLigne: number;
    stockBrouillon: number;
    valeurStockTotal: number;
    ageStockMoyen: number;
    tauxRotation: number;
  };
}

interface RealtimeConfig {
  enabled: boolean;
  interval: number; // en millisecondes
  maxRetries: number;
}

// Hook principal pour les données de dashboard
export function useDashboardData(config: RealtimeConfig = { enabled: true, interval: 30000, maxRetries: 3 }) {
  const [data, setData] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async (isInitial = false) => {
    try {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      abortControllerRef.current = new AbortController();
      
      if (isInitial) {
        setLoading(true);
      }
      
      setError(null);
      
      // Appel API réel vers le dashboard
      const response = await fetch('/api/v1/dashboard', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: abortControllerRef.current.signal,
      });
      
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de la récupération des données');
      }
      
      // Vérifier si la requête n'a pas été annulée
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }
      
      setData(result.data);
      setLastUpdate(new Date());
      setRetryCount(0);
      
      if (isInitial) {
        setLoading(false);
      }
      
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Requête annulée, ne pas traiter comme une erreur
      }
      
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      
      if (retryCount < config.maxRetries) {
        setRetryCount(prev => prev + 1);
        // Retry avec un délai exponentiel
        setTimeout(() => fetchData(isInitial), Math.pow(2, retryCount) * 1000);
      } else {
        setLoading(false);
      }
    }
  }, [config.maxRetries, retryCount]);

  const startRealtime = useCallback(() => {
    if (!config.enabled || intervalRef.current) return;
    
    intervalRef.current = setInterval(() => {
      fetchData(false);
    }, config.interval);
  }, [config.enabled, config.interval, fetchData]);

  const stopRealtime = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const refresh = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  // Effet pour le chargement initial
  useEffect(() => {
    fetchData(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Effet pour le temps réel
  useEffect(() => {
    if (data && !loading && !error) {
      startRealtime();
    }
    
    return stopRealtime;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, loading, error]);

  // Nettoyage à la destruction du composant
  useEffect(() => {
    return () => {
      stopRealtime();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [stopRealtime]);

  return {
    data,
    loading,
    error,
    lastUpdate,
    refresh,
    isRealtime: !!intervalRef.current
  };
}

// Hook pour les données de performance
export function usePerformanceMetrics() {
  const { data, loading, error, refresh } = useDashboardData();
  
  const metrics = data ? {
    totalRevenue: data.ventesTotales,
    totalOrders: data.produitsVendus,
    averageOrderValue: data.panierMoyen,
    conversionRate: data.tauxConversion,
    activeCustomers: data.clientsActifs,
    dailyPerformance: data.performanceJournaliere,
    trends: {
      // Calcul de la tendance des revenus (aujourd'hui vs hier)
      revenue: data.performanceJournaliere.length > 1 ? 
        ((data.performanceJournaliere[data.performanceJournaliere.length - 1]?.ventes || 0) - 
         (data.performanceJournaliere[data.performanceJournaliere.length - 2]?.ventes || 0)) / 
        (data.performanceJournaliere[data.performanceJournaliere.length - 2]?.ventes || 1) * 100 : 0,
      
      // Calcul de la tendance des commandes (aujourd'hui vs hier)
      orders: data.performanceJournaliere.length > 1 ? 
        ((data.performanceJournaliere[data.performanceJournaliere.length - 1]?.commandes || 0) - 
         (data.performanceJournaliere[data.performanceJournaliere.length - 2]?.commandes || 0)) / 
        (data.performanceJournaliere[data.performanceJournaliere.length - 2]?.commandes || 1) * 100 : 0,
      
      // Calcul de la tendance de conversion (moyenne des 3 derniers jours vs les 3 précédents)
      conversion: data.performanceJournaliere.length >= 6 ? (() => {
        const recent = data.performanceJournaliere.slice(-3);
        const previous = data.performanceJournaliere.slice(-6, -3);
        
        const recentAvg = recent.reduce((sum, day) => sum + (day.commandes || 0), 0) / recent.length;
        const previousAvg = previous.reduce((sum, day) => sum + (day.commandes || 0), 0) / previous.length;
        
        return previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0;
      })() : 0
    }
  } : null;

  return {
    metrics,
    loading,
    error,
    refresh
  };
}

// Hook pour les alertes temps réel
export function useRealTimeAlerts() {
  const { data } = useDashboardData({ enabled: true, interval: 10000, maxRetries: 5 });
  
  return {
    alerts: data?.alertes || [],
    criticalCount: data?.alertes.filter(a => a.severity === 'critical').length || 0,
    highCount: data?.alertes.filter(a => a.severity === 'high').length || 0
  };
}

// Hook pour optimiser les performances
export function useOptimizedDashboard() {
  const [viewMode, setViewMode] = useState<'overview' | 'detailed'>('overview');
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');
  
  const config = {
    enabled: viewMode === 'detailed',
    interval: viewMode === 'overview' ? 60000 : 30000, // Mise à jour moins fréquente en mode overview
    maxRetries: 3
  };
  
  const { data, loading, error, refresh, isRealtime } = useDashboardData(config);
  
  return {
    data,
    loading,
    error,
    refresh,
    isRealtime,
    viewMode,
    setViewMode,
    selectedTimeRange,
    setSelectedTimeRange
  };
}