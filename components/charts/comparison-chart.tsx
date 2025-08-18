"use client"

import React, { useMemo, useState, useCallback } from 'react'
import { useAccessibility } from '@/lib/contexts/accessibility-context'
import { useKeyboardNavigation } from '@/lib/hooks/use-keyboard-navigation'
import { cn } from '@/lib/utils'
import { AdvancedMetrics, ComparisonResult } from '@/lib/analytics/advanced-analytics-engine'

export interface ComparisonChartProps {
  comparisons: ComparisonResult[]
  metricsData: Record<string, AdvancedMetrics>
  width?: number
  height?: number
  chartType?: 'overlay' | 'sideBySide' | 'difference'
  showStatistics?: boolean
  accessibility: {
    title: string
    description: string
    dataTable?: boolean
  }
  onComparisonSelect?: (comparison: ComparisonResult) => void
  className?: string
}

export const ComparisonChart: React.FC<ComparisonChartProps> = ({
  comparisons,
  metricsData,
  width = 900,
  height = 500,
  chartType = 'overlay',
  showStatistics = true,
  accessibility,
  onComparisonSelect,
  className
}) => {
  const { announceToScreenReader, preferences } = useAccessibility()
  const [selectedComparison, setSelectedComparison] = useState<number | null>(null)
  const [showDataTable, setShowDataTable] = useState(false)
  const [hoveredElement, setHoveredElement] = useState<{
    type: 'baseline' | 'comparison' | 'difference'
    comparisonIndex: number
    dataIndex?: number
  } | null>(null)

  const { containerRef } = useKeyboardNavigation({
    enableArrowNavigation: true,
    orientation: 'both'
  })

  // Dimensions du graphique
  const margin = { top: 40, right: 100, bottom: 80, left: 80 }
  const chartWidth = width - margin.left - margin.right
  const chartHeight = height - margin.top - margin.bottom

  // Couleurs pour les différentes analyses
  const colors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#6366f1'
  ]

  // Préparation des données pour l'affichage
  interface ChartDatum {
    comparison: ComparisonResult
    index: number
    baseline: {
      id: string
      histogram: { range: [number, number]; count: number }[]
      stats: any
      color: string
    }
    compared: {
      id: string
      histogram: { range: [number, number]; count: number }[]
      stats: any
      color: string
    }
  }

  const chartData: ChartDatum[] = useMemo(() => {
    return comparisons.map((comparison, index) => {
      const baselineMetrics = metricsData[comparison.baselineId]
      const comparisonMetrics = metricsData[comparison.comparisonId]
      
      if (!baselineMetrics || !comparisonMetrics) return null

      return {
        comparison,
        index,
        baseline: {
          id: comparison.baselineId,
          histogram: baselineMetrics.priceDistribution.histogram,
          stats: baselineMetrics.descriptiveStats,
          color: colors[index * 2 % colors.length]
        },
        compared: {
          id: comparison.comparisonId,
          histogram: comparisonMetrics.priceDistribution.histogram,
          stats: comparisonMetrics.descriptiveStats,
          color: colors[(index * 2 + 1) % colors.length]
        }
      }
    }).filter(Boolean) as ChartDatum[]
  }, [comparisons, metricsData, colors])

  // Échelles globales pour tous les graphiques
  const globalScales = useMemo(() => {
    const allHistograms = chartData.flatMap(d => [...d.baseline.histogram, ...d.compared.histogram])
    
    if (allHistograms.length === 0) {
      return { x: { min: 0, max: 100, range: 100 }, y: { min: 0, max: 100, range: 100 } }
    }

    const xMin = Math.min(...allHistograms.map(h => h.range[0]))
    const xMax = Math.max(...allHistograms.map(h => h.range[1]))
    const yMax = Math.max(...allHistograms.map(h => h.count))

    return {
      x: { min: xMin, max: xMax, range: xMax - xMin },
      y: { min: 0, max: yMax, range: yMax }
    }
  }, [chartData])

  // Fonctions de conversion
  const getXPosition = useCallback((value: number) => {
    return ((value - globalScales.x.min) / globalScales.x.range) * chartWidth
  }, [globalScales.x, chartWidth])

  const getYPosition = useCallback((value: number) => {
    return chartHeight - (value / globalScales.y.max) * chartHeight
  }, [globalScales.y, chartHeight])

  // Gestionnaires d'événements
  const handleComparisonClick = useCallback((index: number) => {
    const cmp = comparisons[index]
    if (!cmp) return
    setSelectedComparison(selectedComparison === index ? null : index)
    onComparisonSelect?.(cmp)
    announceToScreenReader(
      `Comparaison sélectionnée: ${cmp.baselineId} vs ${cmp.comparisonId}`
    )
  }, [selectedComparison, comparisons, onComparisonSelect, announceToScreenReader])

  const handleHover = useCallback((element: typeof hoveredElement) => {
    setHoveredElement(element)
    if (element) {
      const comparison = comparisons[element.comparisonIndex]
      if (!comparison) return
      announceToScreenReader(
        `Comparaison: ${comparison.baselineId} vs ${comparison.comparisonId}`,
        'polite'
      )
    }
  }, [comparisons, announceToScreenReader])

  // Gestion du clavier
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'Enter':
      case ' ':
        if (hoveredElement) {
          event.preventDefault()
          handleComparisonClick(hoveredElement.comparisonIndex)
        }
        break
      case 't':
        event.preventDefault()
        setShowDataTable(!showDataTable)
        announceToScreenReader(`Table de données ${showDataTable ? 'masquée' : 'affichée'}`)
        break
      case 'Escape':
        event.preventDefault()
        setSelectedComparison(null)
        setHoveredElement(null)
        announceToScreenReader('Sélection effacée')
        break
    }
  }, [hoveredElement, handleComparisonClick, showDataTable, announceToScreenReader])

  // Rendu en mode overlay
  const renderOverlayChart = () => {
    return chartData.map((data, comparisonIndex) => {
      const isSelected = selectedComparison === comparisonIndex
      const isHovered = hoveredElement?.comparisonIndex === comparisonIndex
      const opacity = isSelected ? 1 : isHovered ? 0.8 : 0.6

      return (
        <g key={comparisonIndex}>
          {/* Histogramme baseline */}
          {data.baseline.histogram.map((bin, binIndex) => {
            const x = getXPosition(bin.range[0])
            const width = getXPosition(bin.range[1]) - x
            const height = (bin.count / globalScales.y.max) * chartHeight
            const y = chartHeight - height

            return (
              <rect
                key={`baseline-${binIndex}`}
                x={x + margin.left}
                y={y + margin.top}
                width={width * 0.4} // Réduire la largeur pour l'overlay
                height={height}
                fill={data.baseline.color}
                opacity={opacity}
                stroke={isSelected ? '#000' : 'none'}
                strokeWidth={isSelected ? 1 : 0}
                style={{
                  cursor: 'pointer',
                  transition: preferences.reducedMotion ? 'none' : 'all 0.2s ease'
                }}
                onClick={() => handleComparisonClick(comparisonIndex)}
                onMouseEnter={() => handleHover({ type: 'baseline', comparisonIndex, dataIndex: binIndex })}
                onMouseLeave={() => handleHover(null)}
                role="button"
                tabIndex={0}
                aria-label={`Baseline ${data.baseline.id}: ${bin.range[0]}€-${bin.range[1]}€, ${bin.count} articles`}
              />
            )
          })}

          {/* Histogramme comparison */}
          {data.compared.histogram.map((bin, binIndex) => {
            const x = getXPosition(bin.range[0])
            const width = getXPosition(bin.range[1]) - x
            const height = (bin.count / globalScales.y.max) * chartHeight
            const y = chartHeight - height

            return (
              <rect
                key={`compared-${binIndex}`}
                x={x + margin.left + width * 0.4} // Décaler pour l'overlay
                y={y + margin.top}
                width={width * 0.4}
                height={height}
                fill={data.compared.color}
                opacity={opacity}
                stroke={isSelected ? '#000' : 'none'}
                strokeWidth={isSelected ? 1 : 0}
                style={{
                  cursor: 'pointer',
                  transition: preferences.reducedMotion ? 'none' : 'all 0.2s ease'
                }}
                onClick={() => handleComparisonClick(comparisonIndex)}
                onMouseEnter={() => handleHover({ type: 'comparison', comparisonIndex, dataIndex: binIndex })}
                onMouseLeave={() => handleHover(null)}
                role="button"
                tabIndex={0}
                aria-label={`Comparaison ${data.compared.id}: ${bin.range[0]}€-${bin.range[1]}€, ${bin.count} articles`}
              />
            )
          })}
        </g>
      )
    })
  }

  // Rendu en mode côte à côte
  const renderSideBySideChart = () => {
    const chartSpacing = chartHeight / chartData.length
    
    return chartData.map((data, comparisonIndex) => {
      const yOffset = comparisonIndex * chartSpacing
      const subChartHeight = chartSpacing * 0.8
      const isSelected = selectedComparison === comparisonIndex

      return (
        <g key={comparisonIndex}>
          {/* Titre de la comparaison */}
          <text
            x={margin.left}
            y={yOffset + margin.top + 15}
            fontSize="12"
            fill="currentColor"
            className="font-medium"
          >
            {data.baseline.id} vs {data.compared.id}
          </text>

          {/* Histogrammes côte à côte */}
          {data.baseline.histogram.map((bin, binIndex) => {
            const x = getXPosition(bin.range[0])
            const width = getXPosition(bin.range[1]) - x
            const height = (bin.count / globalScales.y.max) * subChartHeight
            const y = yOffset + subChartHeight - height

            return (
              <rect
                key={`baseline-${binIndex}`}
                x={x + margin.left}
                y={y + margin.top + 20}
                width={width * 0.45}
                height={height}
                fill={data.baseline.color}
                opacity={isSelected ? 1 : 0.7}
                stroke={isSelected ? '#000' : 'none'}
                strokeWidth={isSelected ? 1 : 0}
                style={{ cursor: 'pointer' }}
                onClick={() => handleComparisonClick(comparisonIndex)}
              />
            )
          })}

          {data.compared.histogram.map((bin, binIndex) => {
            const x = getXPosition(bin.range[0])
            const width = getXPosition(bin.range[1]) - x
            const height = (bin.count / globalScales.y.max) * subChartHeight
            const y = yOffset + subChartHeight - height

            return (
              <rect
                key={`compared-${binIndex}`}
                x={x + margin.left + width * 0.5}
                y={y + margin.top + 20}
                width={width * 0.45}
                height={height}
                fill={data.compared.color}
                opacity={isSelected ? 1 : 0.7}
                stroke={isSelected ? '#000' : 'none'}
                strokeWidth={isSelected ? 1 : 0}
                style={{ cursor: 'pointer' }}
                onClick={() => handleComparisonClick(comparisonIndex)}
              />
            )
          })}
        </g>
      )
    })
  }

  // Rendu en mode différence
  const renderDifferenceChart = () => {
    return chartData.map((data, comparisonIndex) => {
      const isSelected = selectedComparison === comparisonIndex
      
      // Calculer les différences bin par bin
      const maxBins = Math.max(data.baseline.histogram.length, data.compared.histogram.length)
      
      return (
        <g key={comparisonIndex}>
          {Array.from({ length: maxBins }).map((_, binIndex) => {
            const baselineBin = data.baseline.histogram[binIndex]
            const comparedBin = data.compared.histogram[binIndex]
            
            if (!baselineBin || !comparedBin) return null
            
            const difference = comparedBin.count - baselineBin.count
            const x = getXPosition(baselineBin.range[0])
            const width = getXPosition(baselineBin.range[1]) - x
            const height = Math.abs(difference / globalScales.y.max) * chartHeight
            const y = difference >= 0 ? chartHeight / 2 - height : chartHeight / 2
            
            return (
              <rect
                key={`diff-${binIndex}`}
                x={x + margin.left}
                y={y + margin.top}
                width={width * 0.8}
                height={height}
                fill={difference >= 0 ? '#10b981' : '#ef4444'}
                opacity={isSelected ? 1 : 0.7}
                stroke={isSelected ? '#000' : 'none'}
                strokeWidth={isSelected ? 1 : 0}
                style={{ cursor: 'pointer' }}
                onClick={() => handleComparisonClick(comparisonIndex)}
                role="button"
                tabIndex={0}
                aria-label={`Différence: ${difference > 0 ? '+' : ''}${difference} articles dans l'intervalle ${baselineBin.range[0]}€-${baselineBin.range[1]}€`}
              />
            )
          })}
        </g>
      )
    })
  }

  // Rendu des axes
  const renderAxes = () => {
    return (
      <>
        {/* Axe X */}
        <line
          x1={margin.left}
          y1={height - margin.bottom}
          x2={width - margin.right}
          y2={height - margin.bottom}
          stroke="currentColor"
          strokeWidth="1"
        />
        
        {/* Axe Y */}
        <line
          x1={margin.left}
          y1={margin.top}
          x2={margin.left}
          y2={height - margin.bottom}
          stroke="currentColor"
          strokeWidth="1"
        />

        {/* Ligne zéro pour le mode différence */}
        {chartType === 'difference' && (
          <line
            x1={margin.left}
            y1={height / 2}
            x2={width - margin.right}
            y2={height / 2}
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="2,2"
            opacity={0.5}
          />
        )}

        {/* Labels des axes */}
        <text
          x={width / 2}
          y={height - 10}
          textAnchor="middle"
          fontSize="12"
          fill="currentColor"
          className="font-medium"
        >
          Prix (€)
        </text>

        <text
          x={15}
          y={height / 2}
          textAnchor="middle"
          fontSize="12"
          fill="currentColor"
          className="font-medium"
          transform={`rotate(-90, 15, ${height / 2})`}
        >
          {chartType === 'difference' ? 'Différence (articles)' : 'Nombre d\'articles'}
        </text>

        {/* Graduations */}
        {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
          const value = globalScales.x.min + ratio * globalScales.x.range
          const x = ratio * chartWidth + margin.left
          
          return (
            <g key={ratio}>
              <line
                x1={x}
                y1={height - margin.bottom}
                x2={x}
                y2={height - margin.bottom + 5}
                stroke="currentColor"
                strokeWidth="1"
              />
              <text
                x={x}
                y={height - margin.bottom + 18}
                textAnchor="middle"
                fontSize="10"
                fill="currentColor"
              >
                {value.toFixed(0)}€
              </text>
            </g>
          )
        })}
      </>
    )
  }

  // Statistiques de comparaison
  const renderStatistics = () => {
    if (!showStatistics || selectedComparison === null) return null
     
    const comparison = comparisons[selectedComparison]
    const data = chartData[selectedComparison]
    if (!comparison || !data) return null
    
    return (
      <div className="absolute top-4 right-4 bg-white border rounded-lg p-4 shadow-lg max-w-xs">
        <h4 className="font-medium mb-2">Statistiques de comparaison</h4>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Différence de prix:</span>
            <span className={comparison.metrics.priceDifference.percentage >= 0 ? 'text-green-600' : 'text-red-600'}>
              {comparison.metrics.priceDifference.percentage >= 0 ? '+' : ''}
              {comparison.metrics.priceDifference.percentage.toFixed(1)}%
            </span>
          </div>
          
          <div className="flex justify-between">
            <span>Différence de volume:</span>
            <span className={comparison.metrics.volumeDifference.percentage >= 0 ? 'text-green-600' : 'text-red-600'}>
              {comparison.metrics.volumeDifference.percentage >= 0 ? '+' : ''}
              {comparison.metrics.volumeDifference.percentage.toFixed(1)}%
            </span>
          </div>
          
          <div className="flex justify-between">
            <span>Similarité de tendance:</span>
            <span>{(comparison.metrics.trendSimilarity * 100).toFixed(0)}%</span>
          </div>
          
          <div className="flex justify-between">
            <span>Signification:</span>
            <span>{(comparison.significance * 100).toFixed(0)}%</span>
          </div>
        </div>

        {comparison.insights.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <h5 className="font-medium text-xs mb-1">Insights:</h5>
            <ul className="text-xs space-y-1">
              {comparison.insights?.slice(0, 3).map((insight: any, index: number) => (
                <li key={index} className="text-gray-600">• {insight}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )
  }

  // Table de données accessible
  const renderDataTable = () => {
    if (!showDataTable) return null

    return (
      <div className="mt-4 overflow-auto">
        <table className="w-full border-collapse border border-gray-300">
          <caption className="sr-only">
            Données de comparaison détaillées
          </caption>
          <thead>
            <tr>
              <th className="border border-gray-300 px-2 py-1 bg-gray-100">Comparaison</th>
              <th className="border border-gray-300 px-2 py-1 bg-gray-100">Diff. Prix (%)</th>
              <th className="border border-gray-300 px-2 py-1 bg-gray-100">Diff. Volume (%)</th>
              <th className="border border-gray-300 px-2 py-1 bg-gray-100">Similarité (%)</th>
              <th className="border border-gray-300 px-2 py-1 bg-gray-100">Signification (%)</th>
            </tr>
          </thead>
          <tbody>
            {comparisons.map((comparison, index) => (
              <tr
                key={index}
                className={selectedComparison === index ? 'bg-blue-100' : ''}
              >
                <td className="border border-gray-300 px-2 py-1">
                  {comparison.baselineId} vs {comparison.comparisonId}
                </td>
                <td className="border border-gray-300 px-2 py-1 text-right">
                  <span className={comparison.metrics.priceDifference.percentage >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {comparison.metrics.priceDifference.percentage >= 0 ? '+' : ''}
                    {comparison.metrics.priceDifference.percentage.toFixed(1)}%
                  </span>
                </td>
                <td className="border border-gray-300 px-2 py-1 text-right">
                  <span className={comparison.metrics.volumeDifference.percentage >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {comparison.metrics.volumeDifference.percentage >= 0 ? '+' : ''}
                    {comparison.metrics.volumeDifference.percentage.toFixed(1)}%
                  </span>
                </td>
                <td className="border border-gray-300 px-2 py-1 text-right">
                  {(comparison.metrics.trendSimilarity * 100).toFixed(0)}%
                </td>
                <td className="border border-gray-300 px-2 py-1 text-right">
                  {(comparison.significance * 100).toFixed(0)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // Légende
  const renderLegend = () => {
    return (
      <div className="flex flex-wrap gap-4 mt-4 text-sm">
        {chartData.map((data, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className="flex gap-1">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: data.baseline.color }}
              ></div>
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: data.compared.color }}
              ></div>
            </div>
            <span>{data.baseline.id} vs {data.compared.id}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div
      ref={containerRef as React.RefObject<HTMLDivElement>}
      className={cn('comparison-chart relative', className)}
      role="img"
      aria-label={accessibility.title}
      aria-describedby="chart-description"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Description pour les lecteurs d'écran */}
      <div id="chart-description" className="sr-only">
        {accessibility.description}
        {comparisons.length > 0 && (
          <span>
            {` Graphique de comparaison avec ${comparisons.length} comparaisons. 
            Mode d'affichage: ${chartType}. 
            Utilisez les flèches pour naviguer, Entrée pour sélectionner.`}
          </span>
        )}
      </div>

      {/* Titre et contrôles */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">{accessibility.title}</h3>
        
        <div className="flex gap-2">
          <select
            value={chartType}
            onChange={(e) => {
              // Cette prop devrait être contrôlée par le parent
              announceToScreenReader(`Mode d'affichage changé: ${e.target.value}`)
            }}
            className="px-3 py-1 text-sm border rounded"
          >
            <option value="overlay">Superposition</option>
            <option value="sideBySide">Côte à côte</option>
            <option value="difference">Différences</option>
          </select>
          
          {accessibility.dataTable && (
            <button
              onClick={() => setShowDataTable(!showDataTable)}
              className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded"
              aria-pressed={showDataTable}
            >
              {showDataTable ? 'Masquer' : 'Afficher'} les données
            </button>
          )}
          
          {selectedComparison !== null && (
            <button
              onClick={() => {
                setSelectedComparison(null)
                announceToScreenReader('Sélection effacée')
              }}
              className="px-3 py-1 text-sm bg-red-200 hover:bg-red-300 rounded"
            >
              Effacer la sélection
            </button>
          )}
        </div>
      </div>

      {/* SVG du graphique */}
      <div className="relative">
        <svg
          width={width}
          height={height}
          className="border border-gray-300 bg-white rounded"
          role="presentation"
          aria-hidden="true"
        >
          {renderAxes()}
          {chartType === 'overlay' && renderOverlayChart()}
          {chartType === 'sideBySide' && renderSideBySideChart()}
          {chartType === 'difference' && renderDifferenceChart()}
        </svg>

        {/* Statistiques */}
        {renderStatistics()}
      </div>

      {/* Légende */}
      {renderLegend()}

      {/* Table de données */}
      {renderDataTable()}

      {/* Résumé pour les lecteurs d'écran */}
      <div className="sr-only" aria-live="polite">
        {selectedComparison !== null && (
          <span>
            {(() => {
              const c = comparisons[selectedComparison!];
              if (!c) return null;
              return `Comparaison sélectionnée: ${c.baselineId} vs ${c.comparisonId}`;
            })()}
          </span>
        )}
      </div>
    </div>
  )
}

export default ComparisonChart