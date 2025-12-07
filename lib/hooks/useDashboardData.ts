"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

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
    ventesRevenue: number;
    ventesCount: number;
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
  targets?: {
    revenue: number;
    productsSold: number;
    margin: number;
    conversionRate: number;
  };
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
  const { enabled, interval } = config;

  const { data, isLoading, error, refetch, dataUpdatedAt } = useQuery<DashboardMetrics>({
    queryKey: ['dashboard-metrics'],
    queryFn: async () => {
      const response = await fetch('/api/v1/dashboard', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }
      const result = await response.json();
      if (!result.success) {
        // Extract error message from either string or object format
        const errorMessage = typeof result.error === 'string'
          ? result.error
          : result.error?.message || 'Erreur lors de la récupération des données';
        throw new Error(errorMessage);
      }
      return result.data;
    },
    refetchInterval: enabled ? interval : false,
    retry: config.maxRetries,
    staleTime: 10000,
  });

  return {
    data: data || null,
    loading: isLoading,
    error: error instanceof Error ? error.message : (error ? String(error) : null),
    lastUpdate: dataUpdatedAt ? new Date(dataUpdatedAt) : null,
    refresh: refetch,
    isRealtime: enabled
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