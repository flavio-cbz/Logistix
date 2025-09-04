"use client"

import React, { useState } from 'react'
import { InteractiveChart, PriceDistributionChart, TrendAnalysisChart, ComparisonChart } from './index'
import type { AdvancedMetrics, TrendAnalysis, ComparisonResult } from '@/lib/analytics/advanced-analytics-engine'

// Données de test
const mockChartData = [
  { x: 10, y: 25, label: "Article 1" },
  { x: 20, y: 35, label: "Article 2" },
  { x: 30, y: 45, label: "Article 3" },
  { x: 40, y: 30, label: "Article 4" },
  { x: 50, y: 55, label: "Article 5" },
  { x: 60, y: 40, label: "Article 6" },
  { x: 70, y: 65, label: "Article 7" },
  { x: 80, y: 50, label: "Article 8" },
]

const mockAdvancedMetrics: AdvancedMetrics = {
  descriptiveStats: {
    mean: 42.5,
    median: 40,
    mode: [40],
    standardDeviation: 12.5,
    variance: 156.25,
    quartiles: [30, 40, 55],
    outliers: [65],
    skewness: 0.2,
    kurtosis: -0.5,
    range: { min: 25, max: 65 },
    interquartileRange: 25
  },
  priceDistribution: {
    histogram: [
      { range: [20, 30], count: 1, percentage: 12.5, density: 0.125 },
      { range: [30, 40], count: 3, percentage: 37.5, density: 0.375 },
      { range: [40, 50], count: 2, percentage: 25, density: 0.25 },
      { range: [50, 60], count: 1, percentage: 12.5, density: 0.125 },
      { range: [60, 70], count: 1, percentage: 12.5, density: 0.125 }
    ],
    density: [
      { price: 25, density: 0.02 },
      { price: 35, density: 0.08 },
      { price: 45, density: 0.06 },
      { price: 55, density: 0.03 },
      { price: 65, density: 0.01 }
    ],
    percentiles: {
      25: 32.5,
      50: 40,
      75: 52.5,
      90: 60,
      95: 62.5
    },
    cumulativeDistribution: [
      { price: 25, cumulative: 0.125 },
      { price: 35, cumulative: 0.5 },
      { price: 45, cumulative: 0.75 },
      { price: 55, cumulative: 0.875 },
      { price: 65, cumulative: 1.0 }
    ]
  },
  temporalAnalysis: {
    seasonality: {
      detected: true,
      pattern: 'weekly',
      confidence: 0.75,
      peaks: [
        { period: 'Vendredi', value: 50, significance: 0.25 },
        { period: 'Samedi', value: 55, significance: 0.375 }
      ],
      cycles: [
        { length: 7, amplitude: 5, phase: 1.5 }
      ]
    },
    trends: {
      direction: 'up',
      strength: 0.6,
      duration: 30,
      slope: 0.5,
      rSquared: 0.75,
      changePoints: [
        {
          date: '2024-01-15',
          type: 'increase',
          magnitude: 0.2,
          significance: 0.8
        }
      ]
    },
    cyclicalPatterns: [],
    volatility: {
      overall: 0.15,
      periods: [
        { start: '2024-01-01', end: '2024-01-15', volatility: 0.1 },
        { start: '2024-01-15', end: '2024-01-30', volatility: 0.2 }
      ]
    }
  },
  competitiveAnalysis: {
    marketPosition: 'average',
    competitorDensity: 0.8,
    priceGaps: [
      { min: 35, max: 45, opportunity: 2.5, confidence: 0.7 }
    ],
    marketShare: {
      estimated: 0.15,
      confidence: 0.6
    },
    competitiveAdvantage: [
      { factor: 'Prix', advantage: 0.1, description: 'Prix compétitif' }
    ]
  },
  qualityScore: {
    overall: 0.8,
    dataCompleteness: 0.9,
    sampleSize: 0.7,
    timeRange: 0.8,
    variance: 0.75
  }
}

const mockTrendData: TrendAnalysis = {
  direction: 'up',
  strength: 0.6,
  duration: 30,
  seasonality: {
    detected: true,
    pattern: 'weekly',
    confidence: 0.75
  },
  changePoints: [
    {
      date: '2024-01-15',
      type: 'increase',
      magnitude: 0.2
    },
    {
      date: '2024-01-25',
      type: 'volatility',
      magnitude: 0.15
    }
  ]
}

const mockHistoricalData = [
  { date: '2024-01-01', price: 35, volume: 10 },
  { date: '2024-01-05', price: 38, volume: 12 },
  { date: '2024-01-10', price: 42, volume: 15 },
  { date: '2024-01-15', price: 48, volume: 18 },
  { date: '2024-01-20', price: 45, volume: 14 },
  { date: '2024-01-25', price: 52, volume: 20 },
  { date: '2024-01-30', price: 50, volume: 16 }
]

const mockComparisons: ComparisonResult[] = [
  {
    baselineId: 'analysis-1',
    comparisonId: 'analysis-2',
    metrics: {
      priceDifference: { absolute: 5, percentage: 12.5 },
      volumeDifference: { absolute: 3, percentage: 20 },
      trendSimilarity: 0.75,
      marketPositionShift: 0.1
    },
    insights: [
      'Prix augmenté de 12.5%',
      'Volume en hausse de 20%',
      'Tendance similaire maintenue'
    ],
    significance: 0.8
  }
]

const mockMetricsData = {
  'analysis-1': mockAdvancedMetrics,
  'analysis-2': {
    ...mockAdvancedMetrics,
    descriptiveStats: {
      ...mockAdvancedMetrics.descriptiveStats,
      mean: 47.5
    }
  }
}

export const ChartShowcase: React.FC = () => {
  const [selectedChart, setSelectedChart] = useState<string>('interactive')

  const renderChart = () => {
    switch (selectedChart) {
      case 'interactive':
        return (
          <InteractiveChart
            data={mockChartData}
            type="scatter"
            accessibility={{
              title: "Graphique interactif de démonstration",
              description: "Graphique en nuage de points montrant la relation entre les variables X et Y",
              dataTable: true
            }}
            interactions={{
              zoom: true,
              pan: true,
              tooltip: true,
              hover: true
            }}
            onDataPointClick={(_point, _index) => {
            }}
            className="mb-8"
          />
        )

      case 'distribution':
        return (
          <PriceDistributionChart
            metrics={mockAdvancedMetrics}
            accessibility={{
              title: "Distribution des prix",
              description: "Histogramme montrant la distribution des prix avec courbe de densité et percentiles",
              dataTable: true
            }}
            showDensityCurve={true}
            showPercentiles={true}
            showHistogram={true}
            onBinClick={(_bin) => {
            }}
            className="mb-8"
          />
        )

      case 'trend':
        return (
          <TrendAnalysisChart
            trendData={mockTrendData}
            historicalData={mockHistoricalData}
            accessibility={{
              title: "Analyse de tendance",
              description: "Graphique temporel montrant l'évolution des prix avec détection des points de changement",
              dataTable: true
            }}
            showChangePoints={true}
            showSeasonality={true}
            showTrendLine={true}
            onChangePointClick={(_changePoint) => {
            }}
            className="mb-8"
          />
        )

      case 'comparison':
        return (
          <ComparisonChart
            comparisons={mockComparisons}
            metricsData={mockMetricsData}
            accessibility={{
              title: "Comparaison d'analyses",
              description: "Graphique de comparaison entre différentes analyses de marché",
              dataTable: true
            }}
            chartType="overlay"
            showStatistics={true}
            onComparisonSelect={(_comparison) => {
            }}
            className="mb-8"
          />
        )

      default:
        return null
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Démonstration des composants de visualisation</h1>
      
      {/* Sélecteur de graphique */}
      <div className="mb-6">
        <label htmlFor="chart-selector" className="block text-sm font-medium mb-2">
          Choisir un type de graphique :
        </label>
        <select
          id="chart-selector"
          value={selectedChart}
          onChange={(e) => setSelectedChart(e.target.value)}
          className="px-3 py-2 border border-[hsl(var(--border))] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="interactive">Graphique interactif</option>
          <option value="distribution">Distribution des prix</option>
          <option value="trend">Analyse de tendance</option>
          <option value="comparison">Comparaison d'analyses</option>
        </select>
      </div>

      {/* Description du graphique actuel */}
      <div className="mb-6 p-4 bg-[hsl(var(--muted))] rounded-lg">
        <h2 className="text-lg font-semibold mb-2">
          {selectedChart === 'interactive' && 'Graphique interactif'}
          {selectedChart === 'distribution' && 'Distribution des prix'}
          {selectedChart === 'trend' && 'Analyse de tendance'}
          {selectedChart === 'comparison' && 'Comparaison d\'analyses'}
        </h2>
        <p className="text-[hsl(var(--muted-foreground))]">
          {selectedChart === 'interactive' && 'Graphique polyvalent supportant différents types de visualisation (scatter, bar, line, histogram) avec interactions complètes et accessibilité.'}
          {selectedChart === 'distribution' && 'Visualisation de la distribution des prix avec histogramme, courbe de densité, percentiles et statistiques détaillées.'}
          {selectedChart === 'trend' && 'Analyse temporelle des tendances avec détection automatique des points de changement et indicateurs de saisonnalité.'}
          {selectedChart === 'comparison' && 'Comparaison visuelle entre plusieurs analyses avec différents modes d\'affichage et métriques de différence.'}
        </p>
      </div>

      {/* Fonctionnalités d'accessibilité */}
      <div className="mb-6 p-4 bg-[hsl(var(--primary))] rounded-lg">
        <h3 className="text-md font-semibold mb-2">🔧 Fonctionnalités d'accessibilité</h3>
        <ul className="text-sm text-[hsl(var(--primary-foreground))] space-y-1">
          <li>• Navigation clavier complète (Tab, flèches, Entrée, Échap)</li>
          <li>• Support des lecteurs d'écran avec annonces ARIA</li>
          <li>• Tables de données alternatives (appuyez sur 'T')</li>
          <li>• Respect des préférences reduced-motion</li>
          <li>• Contrastes de couleurs WCAG 2.1 AA</li>
          <li>• Tooltips et descriptions contextuelles</li>
        </ul>
      </div>

      {/* Instructions d'utilisation */}
      <div className="mb-6 p-4 bg-[hsl(var(--success))] rounded-lg">
        <h3 className="text-md font-semibold mb-2">⌨️ Instructions d'utilisation</h3>
        <ul className="text-sm text-[hsl(var(--success-foreground))] space-y-1">
          <li>• <kbd className="px-1 py-0.5 bg-[hsl(var(--card))] rounded text-xs">Tab</kbd> : Naviguer entre les éléments</li>
          <li>• <kbd className="px-1 py-0.5 bg-[hsl(var(--card))] rounded text-xs">Flèches</kbd> : Naviguer dans le graphique</li>
          <li>• <kbd className="px-1 py-0.5 bg-[hsl(var(--card))] rounded text-xs">Entrée/Espace</kbd> : Sélectionner un élément</li>
          <li>• <kbd className="px-1 py-0.5 bg-[hsl(var(--card))] rounded text-xs">T</kbd> : Afficher/masquer la table de données</li>
          <li>• <kbd className="px-1 py-0.5 bg-[hsl(var(--card))] rounded text-xs">Échap</kbd> : Effacer la sélection</li>
          <li>• Survolez les éléments pour voir les tooltips</li>
        </ul>
      </div>

      {/* Graphique */}
      <div className="border border-[hsl(var(--border))] rounded-lg p-4 bg-[hsl(var(--card))]">
        {renderChart()}
      </div>

      {/* Informations techniques */}
      <div className="mt-6 p-4 bg-[hsl(var(--muted))] rounded-lg">
        <h3 className="text-md font-semibold mb-2">ℹ️ Informations techniques</h3>
        <div className="text-sm text-[hsl(var(--muted-foreground))] space-y-1">
          <p><strong>Composants créés :</strong> InteractiveChart, PriceDistributionChart, TrendAnalysisChart, ComparisonChart</p>
          <p><strong>Accessibilité :</strong> Contexte AccessibilityProvider, hooks de navigation clavier</p>
          <p><strong>Types :</strong> Interfaces TypeScript complètes pour tous les composants</p>
          <p><strong>Fonctionnalités :</strong> Interactions, animations, responsive design, export de données</p>
        </div>
      </div>
    </div>
  )
}

export default ChartShowcase