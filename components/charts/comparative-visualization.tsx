"use client"

import React, { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from 'next-themes'
import { useAccessibility } from '@/lib/contexts/accessibility-context'
import { cn } from '@/lib/utils'
import { VintedAnalysisResult } from '@/types/vinted-market-analysis'
import { EnhancedChart, ComparisonChart } from '@/lib/services/ai/enhanced-visualization-engine'
import AIAnnotatedChart from './ai-annotated-chart'

export interface ComparativeVisualizationProps {
  baseline: VintedAnalysisResult
  comparisons: VintedAnalysisResult[]
  comparisonChart?: ComparisonChart
  width?: number
  height?: number
  showDifferences?: boolean
  showTrendOverlay?: boolean
  onComparisonSelect?: (analysis: VintedAnalysisResult, index: number) => void
  className?: string
}

interface ComparisonMetric {
  name: string
  key: keyof VintedAnalysisResult
  format: (value: any) => string
  type: 'number' | 'currency' | 'percentage'
}

interface DifferenceHighlight {
  metric: string
  baselineValue: number
  comparisonValue: number
  percentageChange: number
  significance: 'low' | 'medium' | 'high'
  trend: 'up' | 'down' | 'stable'
}

export const ComparativeVisualization: React.FC<ComparativeVisualizationProps> = ({
  baseline,
  comparisons,
  comparisonChart,
  width = 1000,
  height = 600,
  showDifferences = true,
  showTrendOverlay = true,
  onComparisonSelect,
  className
}) => {
  const { announceToScreenReader, preferences } = useAccessibility()
  const { theme } = useTheme()
  const [selectedComparison, setSelectedComparison] = useState<number | null>(null)
  const [highlightedMetric, setHighlightedMetric] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'overlay' | 'side-by-side' | 'difference'>('overlay')

  // Métriques de comparaison disponibles
  const comparisonMetrics: ComparisonMetric[] = useMemo(() => [
    {
      name: 'Volume de ventes',
      key: 'salesVolume',
      format: (value) => `${value} articles`,
      type: 'number'
    },
    {
      name: 'Prix moyen',
      key: 'avgPrice',
      format: (value) => `${value.toFixed(2)}€`,
      type: 'currency'
    },
    {
      name: 'Prix minimum',
      key: 'priceRange',
      format: (value) => `${value.min.toFixed(2)}€`,
      type: 'currency'
    },
    {
      name: 'Prix maximum',
      key: 'priceRange',
      format: (value) => `${value.max.toFixed(2)}€`,
      type: 'currency'
    }
  ], [])

  // Calculer les différences entre baseline et comparaisons
  const differences: DifferenceHighlight[] = useMemo(() => {
    if (!selectedComparison || selectedComparison >= comparisons.length) return []

    const comparison = comparisons[selectedComparison]
    const diffs: DifferenceHighlight[] = []

    comparisonMetrics.forEach(metric => {
      let baselineValue: number
      let comparisonValue: number

      if (metric.key === 'priceRange') {
        baselineValue = metric.name.includes('minimum') ? baseline.priceRange.min : baseline.priceRange.max
        comparisonValue = metric.name.includes('minimum') ? comparison.priceRange.min : comparison.priceRange.max
      } else {
        baselineValue = baseline[metric.key] as number
        comparisonValue = comparison[metric.key] as number
      }

      const percentageChange = ((comparisonValue - baselineValue) / baselineValue) * 100
      const absChange = Math.abs(percentageChange)
      
      diffs.push({
        metric: metric.name,
        baselineValue,
        comparisonValue,
        percentageChange,
        significance: absChange > 20 ? 'high' : absChange > 10 ? 'medium' : 'low',
        trend: percentageChange > 5 ? 'up' : percentageChange < -5 ? 'down' : 'stable'
      })
    })

    return diffs
  }, [baseline, comparisons, selectedComparison, comparisonMetrics])

  // Gestionnaire de sélection de comparaison
  const handleComparisonSelect = useCallback((index: number) => {
    setSelectedComparison(selectedComparison === index ? null : index)
    onComparisonSelect?.(comparisons[index], index)
    
    announceToScreenReader(
      `Comparaison ${index + 1} ${selectedComparison === index ? 'désélectionnée' : 'sélectionnée'}`
    )
  }, [selectedComparison, comparisons, onComparisonSelect, announceToScreenReader])

  // Gestionnaire de survol de métrique
  const handleMetricHover = useCallback((metricName: string | null) => {
    setHighlightedMetric(metricName)
    if (metricName) {
      announceToScreenReader(`Métrique en surbrillance: ${metricName}`, 'polite')
    }
  }, [announceToScreenReader])

  // Rendu du sélecteur de comparaisons
  const renderComparisonSelector = () => {
    return (
      <div className="mb-6">
        <h4 className="font-medium text-sm mb-3">Sélectionner les analyses à comparer</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Baseline */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">Référence</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {new Date(baseline.analysisDate).toLocaleDateString()}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold">{baseline.avgPrice.toFixed(2)}€</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {baseline.salesVolume} articles
                </div>
              </div>
            </div>
          </div>

          {/* Comparaisons */}
          {comparisons.map((comparison, index) => (
            <motion.div
              key={index}
              className={cn(
                'p-3 border-2 rounded-lg cursor-pointer transition-colors',
                selectedComparison === index
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              )}
              onClick={() => handleComparisonSelect(index)}
              whileHover={{ scale: preferences.reducedMotion ? 1 : 1.02 }}
              whileTap={{ scale: preferences.reducedMotion ? 1 : 0.98 }}
              role="button"
              tabIndex={0}
              aria-pressed={selectedComparison === index}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleComparisonSelect(index)
                }
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">Comparaison {index + 1}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {new Date(comparison.analysisDate).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">{comparison.avgPrice.toFixed(2)}€</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {comparison.salesVolume} articles
                  </div>
                </div>
              </div>
              
              {selectedComparison === index && (
                <motion.div
                  className="mt-2 pt-2 border-t border-green-200 dark:border-green-800"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <div className="text-xs text-green-700 dark:text-green-300">
                    ✓ Sélectionné pour comparaison
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    )
  }

  // Rendu des contrôles de vue
  const renderViewControls = () => {
    return (
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm font-medium">Mode d'affichage:</span>
        {[
          { key: 'overlay', label: 'Superposition', icon: '📊' },
          { key: 'side-by-side', label: 'Côte à côte', icon: '📈' },
          { key: 'difference', label: 'Différences', icon: '📉' }
        ].map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setViewMode(key as typeof viewMode)}
            className={cn(
              'px-3 py-1 text-sm rounded border flex items-center gap-1',
              viewMode === key
                ? 'bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-300'
                : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
            )}
            aria-pressed={viewMode === key}
          >
            <span>{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>
    )
  }

  // Rendu du tableau de différences
  const renderDifferenceTable = () => {
    if (!showDifferences || differences.length === 0) return null

    return (
      <div className="mt-6">
        <h4 className="font-medium text-sm mb-3">Analyse des différences</h4>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300 dark:border-gray-600">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800">
                <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-left text-sm font-medium">
                  Métrique
                </th>
                <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-right text-sm font-medium">
                  Référence
                </th>
                <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-right text-sm font-medium">
                  Comparaison
                </th>
                <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-right text-sm font-medium">
                  Différence
                </th>
                <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center text-sm font-medium">
                  Tendance
                </th>
              </tr>
            </thead>
            <tbody>
              {differences.map((diff, index) => (
                <motion.tr
                  key={index}
                  className={cn(
                    'hover:bg-gray-50 dark:hover:bg-gray-800',
                    highlightedMetric === diff.metric && 'bg-yellow-50 dark:bg-yellow-900/20'
                  )}
                  onMouseEnter={() => handleMetricHover(diff.metric)}
                  onMouseLeave={() => handleMetricHover(null)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm">
                    {diff.metric}
                  </td>
                  <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm text-right">
                    {comparisonMetrics.find(m => m.name === diff.metric)?.format(diff.baselineValue) || diff.baselineValue}
                  </td>
                  <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm text-right">
                    {comparisonMetrics.find(m => m.name === diff.metric)?.format(diff.comparisonValue) || diff.comparisonValue}
                  </td>
                  <td className={cn(
                    'border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm text-right font-medium',
                    diff.percentageChange > 0 ? 'text-green-600 dark:text-green-400' : 
                    diff.percentageChange < 0 ? 'text-red-600 dark:text-red-400' : 
                    'text-gray-600 dark:text-gray-400'
                  )}>
                    {diff.percentageChange > 0 ? '+' : ''}{diff.percentageChange.toFixed(1)}%
                  </td>
                  <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center">
                    <span className={cn(
                      'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                      diff.significance === 'high' && diff.trend === 'up' && 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
                      diff.significance === 'high' && diff.trend === 'down' && 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
                      diff.significance === 'medium' && 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
                      diff.significance === 'low' && 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                    )}>
                      {diff.trend === 'up' ? '↗️' : diff.trend === 'down' ? '↘️' : '→'}
                      {diff.significance}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // Rendu du graphique de comparaison
  const renderComparisonChart = () => {
    if (!comparisonChart) return null

    return (
      <div className="mt-6">
        <AIAnnotatedChart
          enhancedChart={comparisonChart}
          width={width}
          height={height}
          showAnnotations={true}
          showInsights={true}
          className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
        />
      </div>
    )
  }

  // Rendu des graphiques côte à côte
  const renderSideBySideCharts = () => {
    if (viewMode !== 'side-by-side' || selectedComparison === null) return null

    const comparison = comparisons[selectedComparison]
    
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h5 className="font-medium mb-3">Référence</h5>
          <div className="space-y-2 text-sm">
            <div>Date: {new Date(baseline.analysisDate).toLocaleDateString()}</div>
            <div>Prix moyen: {baseline.avgPrice.toFixed(2)}€</div>
            <div>Volume: {baseline.salesVolume} articles</div>
            <div>Gamme: {baseline.priceRange.min.toFixed(2)}€ - {baseline.priceRange.max.toFixed(2)}€</div>
          </div>
        </div>
        
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h5 className="font-medium mb-3">Comparaison {selectedComparison + 1}</h5>
          <div className="space-y-2 text-sm">
            <div>Date: {new Date(comparison.analysisDate).toLocaleDateString()}</div>
            <div>Prix moyen: {comparison.avgPrice.toFixed(2)}€</div>
            <div>Volume: {comparison.salesVolume} articles</div>
            <div>Gamme: {comparison.priceRange.min.toFixed(2)}€ - {comparison.priceRange.max.toFixed(2)}€</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('comparative-visualization', className)}>
      {/* En-tête */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Analyse comparative</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Comparez les analyses de marché pour identifier les tendances et différences significatives
        </p>
      </div>

      {/* Sélecteur de comparaisons */}
      {renderComparisonSelector()}

      {/* Contrôles de vue */}
      {selectedComparison !== null && renderViewControls()}

      {/* Contenu principal selon le mode de vue */}
      <AnimatePresence mode="wait">
        {viewMode === 'overlay' && comparisonChart && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {renderComparisonChart()}
          </motion.div>
        )}

        {viewMode === 'side-by-side' && (
          <motion.div
            key="side-by-side"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {renderSideBySideCharts()}
          </motion.div>
        )}

        {viewMode === 'difference' && (
          <motion.div
            key="difference"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {renderDifferenceTable()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tableau des différences (toujours affiché si une comparaison est sélectionnée) */}
      {selectedComparison !== null && viewMode !== 'difference' && renderDifferenceTable()}

      {/* Résumé pour les lecteurs d'écran */}
      <div className="sr-only" aria-live="polite">
        {selectedComparison !== null && (
          <span>
            Comparaison active: analyse {selectedComparison + 1}. 
            {differences.length} métriques comparées.
          </span>
        )}
      </div>
    </div>
  )
}

export default ComparativeVisualization