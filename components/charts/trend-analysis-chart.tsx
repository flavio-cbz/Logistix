"use client"

import React, { useMemo, useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from 'next-themes'
import { useAccessibility } from '@/lib/contexts/accessibility-context'
import { useKeyboardNavigation } from '@/lib/hooks/use-keyboard-navigation'
import { cn } from '@/lib/utils'
import { getChartColors, formatChartValue } from '@/lib/utils/chart-utils'
import { TrendAnalysis } from '@/lib/analytics/advanced-analytics-engine'

export interface TrendAnalysisChartProps {
  trendData: TrendAnalysis
  historicalData: Array<{
    date: string
    price: number
    volume: number
  }>
  width?: number
  height?: number
  showChangePoints?: boolean
  showSeasonality?: boolean
  showTrendLine?: boolean
  accessibility: {
    title: string
    description: string
    dataTable?: boolean
  }
  onChangePointClick?: (changePoint: TrendAnalysis['changePoints'][0]) => void
  className?: string
}

export const TrendAnalysisChart: React.FC<TrendAnalysisChartProps> = ({
  trendData,
  historicalData,
  width = 800,
  height = 400,
  showChangePoints = true,
  showSeasonality = true,
  showTrendLine = true,
  accessibility,
  onChangePointClick,
  className
}) => {
  const { announceToScreenReader, preferences } = useAccessibility()
  const { theme } = useTheme()
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null)
  const [showDataTable, setShowDataTable] = useState(false)
  const [hoveredElement, setHoveredElement] = useState<{ 
    type: 'data' | 'changepoint' | 'trend'; 
    index: number 
  } | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  const { containerRef } = useKeyboardNavigation({
    enableArrowNavigation: true,
    orientation: 'horizontal'
  })

  const chartColors = getChartColors(theme)

  // Animation entrance effect
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  // Dimensions du graphique
  const margin = { top: 40, right: 80, bottom: 60, left: 60 }
  const chartWidth = width - margin.left - margin.right
  const chartHeight = height - margin.top - margin.bottom

  // Préparation des données
  const sortedData = useMemo(() => {
    return [...historicalData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [historicalData])

  // Échelles
  const xScale = useMemo(() => {
    if (sortedData.length === 0) return { min: 0, max: 1, range: 1 }
    const dates = sortedData.map(d => new Date(d.date).getTime())
    const min = Math.min(...dates)
    const max = Math.max(...dates)
    return { min, max, range: max - min }
  }, [sortedData])

  const yScale = useMemo(() => {
    if (sortedData.length === 0) return { min: 0, max: 100, range: 100 }
    const prices = sortedData.map(d => d.price)
    const min = Math.min(...prices) * 0.95 // Marge de 5%
    const max = Math.max(...prices) * 1.05
    return { min, max, range: max - min }
  }, [sortedData])

  // Fonctions de conversion
  const getXPosition = useCallback((date: string) => {
    const timestamp = new Date(date).getTime()
    return ((timestamp - xScale.min) / xScale.range) * chartWidth
  }, [xScale, chartWidth])

  const getYPosition = useCallback((price: number) => {
    return chartHeight - ((price - yScale.min) / yScale.range) * chartHeight
  }, [yScale, chartHeight])

  // Calcul de la ligne de tendance
  const trendLineData = useMemo(() => {
    if (!showTrendLine || sortedData.length < 2) return []
    
    // Régression linéaire simple
    const n = sortedData.length
    const sumX = sortedData.reduce((sum, _, i) => sum + i, 0)
    const sumY = sortedData.reduce((sum, d) => sum + d.price, 0)
    const sumXY = sortedData.reduce((sum, d, i) => sum + i * d.price, 0)
    const sumXX = sortedData.reduce((sum, _, i) => sum + i * i, 0)
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n
    
    return sortedData.map((d, i) => ({
      date: d.date,
      trendPrice: slope * i + intercept
    }))
  }, [sortedData, showTrendLine])

  // Gestionnaires d'événements
  const handleDataPointClick = useCallback((index: number) => {
    setSelectedPoint(selectedPoint === index ? null : index)
    const point = sortedData[index]
    announceToScreenReader(
      `Point sélectionné: ${new Date(point.date).toLocaleDateString()}, ${point.price.toFixed(2)}€`
    )
  }, [selectedPoint, sortedData, announceToScreenReader])

  const handleChangePointClick = useCallback((changePoint: TrendAnalysis['changePoints'][0], index: number) => {
    onChangePointClick?.(changePoint)
    announceToScreenReader(
      `Point de changement: ${new Date(changePoint.date).toLocaleDateString()}, ${changePoint.type}, magnitude ${changePoint.magnitude.toFixed(2)}`
    )
  }, [onChangePointClick, announceToScreenReader])

  const handleHover = useCallback((element: typeof hoveredElement) => {
    setHoveredElement(element)
    if (element) {
      if (element.type === 'data') {
        const point = sortedData[element.index]
        announceToScreenReader(
          `${new Date(point.date).toLocaleDateString()}: ${point.price.toFixed(2)}€`,
          'polite'
        )
      } else if (element.type === 'changepoint') {
        const changePoint = trendData.changePoints[element.index]
        announceToScreenReader(
          `Point de changement: ${changePoint.type} le ${new Date(changePoint.date).toLocaleDateString()}`,
          'polite'
        )
      }
    }
  }, [sortedData, trendData.changePoints, announceToScreenReader])

  // Gestion du clavier
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'Enter':
      case ' ':
        if (hoveredElement?.type === 'data') {
          event.preventDefault()
          handleDataPointClick(hoveredElement.index)
        } else if (hoveredElement?.type === 'changepoint') {
          event.preventDefault()
          handleChangePointClick(trendData.changePoints[hoveredElement.index], hoveredElement.index)
        }
        break
      case 't':
        event.preventDefault()
        setShowDataTable(!showDataTable)
        announceToScreenReader(`Table de données ${showDataTable ? 'masquée' : 'affichée'}`)
        break
      case 'Escape':
        event.preventDefault()
        setSelectedPoint(null)
        setHoveredElement(null)
        announceToScreenReader('Sélection effacée')
        break
    }
  }, [hoveredElement, handleDataPointClick, handleChangePointClick, trendData.changePoints, showDataTable, announceToScreenReader])

  // Rendu de la ligne de prix
  const renderPriceLine = () => {
    if (sortedData.length < 2) return null

    const points = sortedData.map(d => {
      const x = getXPosition(d.date)
      const y = getYPosition(d.price)
      return `${x + margin.left},${y + margin.top}`
    }).join(' ')

    return (
      <polyline
        points={points}
        fill="none"
        stroke="#3b82f6"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    )
  }

  // Rendu des points de données
  const renderDataPoints = () => {
    return sortedData.map((point, index) => {
      const x = getXPosition(point.date)
      const y = getYPosition(point.price)
      const isSelected = selectedPoint === index
      const isHovered = hoveredElement?.type === 'data' && hoveredElement.index === index

      return (
        <circle
          key={index}
          cx={x + margin.left}
          cy={y + margin.top}
          r={isHovered ? 6 : isSelected ? 5 : 4}
          fill="#3b82f6"
          stroke={isSelected ? '#1d4ed8' : '#ffffff'}
          strokeWidth={isSelected ? 3 : 2}
          opacity={isHovered ? 0.8 : 0.9}
          style={{
            cursor: 'pointer',
            transition: preferences.reducedMotion ? 'none' : 'all 0.2s ease'
          }}
          onClick={() => handleDataPointClick(index)}
          onMouseEnter={() => handleHover({ type: 'data', index })}
          onMouseLeave={() => handleHover(null)}
          role="button"
          tabIndex={0}
          aria-label={`Prix le ${new Date(point.date).toLocaleDateString()}: ${point.price.toFixed(2)}€`}
          aria-selected={isSelected}
        />
      )
    })
  }

  // Rendu de la ligne de tendance
  const renderTrendLine = () => {
    if (!showTrendLine || trendLineData.length < 2) return null

    const points = trendLineData.map(d => {
      const x = getXPosition(d.date)
      const y = getYPosition(d.trendPrice)
      return `${x + margin.left},${y + margin.top}`
    }).join(' ')

    const trendColor = trendData.direction === 'up' ? '#10b981' : 
                      trendData.direction === 'down' ? '#ef4444' : '#6b7280'

    return (
      <polyline
        points={points}
        fill="none"
        stroke={trendColor}
        strokeWidth="2"
        strokeDasharray="5,5"
        opacity={0.7}
      />
    )
  }

  // Rendu des points de changement
  const renderChangePoints = () => {
    if (!showChangePoints) return null

    return trendData.changePoints.map((changePoint, index) => {
      const x = getXPosition(changePoint.date)
      const y = getYPosition(
        sortedData.find(d => d.date === changePoint.date)?.price || yScale.min
      )
      
      const color = changePoint.type === 'increase' ? '#10b981' :
                    changePoint.type === 'decrease' ? '#ef4444' : '#f59e0b'
      
      const isHovered = hoveredElement?.type === 'changepoint' && hoveredElement.index === index

      return (
        <g key={index}>
          <circle
            cx={x + margin.left}
            cy={y + margin.top}
            r={isHovered ? 8 : 6}
            fill={color}
            stroke="#ffffff"
            strokeWidth="2"
            opacity={0.8}
            style={{
              cursor: 'pointer',
              transition: preferences.reducedMotion ? 'none' : 'all 0.2s ease'
            }}
            onClick={() => handleChangePointClick(changePoint, index)}
            onMouseEnter={() => handleHover({ type: 'changepoint', index })}
            onMouseLeave={() => handleHover(null)}
            role="button"
            tabIndex={0}
            aria-label={`Point de changement: ${changePoint.type} le ${new Date(changePoint.date).toLocaleDateString()}`}
          />
          
          {/* Ligne verticale pour marquer le point de changement */}
          <line
            x1={x + margin.left}
            y1={margin.top}
            x2={x + margin.left}
            y2={height - margin.bottom}
            stroke={color}
            strokeWidth="1"
            strokeDasharray="2,2"
            opacity={0.5}
          />
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

        {/* Labels des axes */}
        <text
          x={width / 2}
          y={height - 10}
          textAnchor="middle"
          fontSize="12"
          fill="currentColor"
          className="font-medium"
        >
          Date
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
          Prix (€)
        </text>

        {/* Graduations X (dates) */}
        {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
          const timestamp = xScale.min + ratio * xScale.range
          const date = new Date(timestamp)
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
                {date.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })}
              </text>
            </g>
          )
        })}

        {/* Graduations Y (prix) */}
        {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
          const value = yScale.min + ratio * yScale.range
          const y = height - margin.bottom - ratio * chartHeight
          
          return (
            <g key={ratio}>
              <line
                x1={margin.left - 5}
                y1={y}
                x2={margin.left}
                y2={y}
                stroke="currentColor"
                strokeWidth="1"
              />
              <text
                x={margin.left - 10}
                y={y + 3}
                textAnchor="end"
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

  // Indicateur de tendance
  const renderTrendIndicator = () => {
    const trendColor = trendData.direction === 'up' ? '#10b981' : 
                      trendData.direction === 'down' ? '#ef4444' : '#6b7280'
    
    const trendIcon = trendData.direction === 'up' ? '↗' : 
                     trendData.direction === 'down' ? '↘' : '→'

    return (
      <div className="absolute top-4 right-4 bg-white border rounded-lg p-3 shadow-sm">
        <div className="flex items-center gap-2">
          <span 
            className="text-2xl"
            style={{ color: trendColor }}
            aria-hidden="true"
          >
            {trendIcon}
          </span>
          <div>
            <div className="font-medium text-sm">
              Tendance: {trendData.direction === 'up' ? 'Hausse' : 
                        trendData.direction === 'down' ? 'Baisse' : 'Stable'}
            </div>
            <div className="text-xs text-gray-600">
              Force: {(trendData.strength * 100).toFixed(0)}%
            </div>
            <div className="text-xs text-gray-600">
              Durée: {trendData.duration} jours
            </div>
          </div>
        </div>
        
        {trendData.seasonality.detected && (
          <div className="mt-2 pt-2 border-t text-xs">
            <div className="font-medium">Saisonnalité détectée</div>
            <div className="text-gray-600">
              Pattern: {trendData.seasonality.pattern}
            </div>
            <div className="text-gray-600">
              Confiance: {(trendData.seasonality.confidence * 100).toFixed(0)}%
            </div>
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
            Données historiques des prix
          </caption>
          <thead>
            <tr>
              <th className="border border-gray-300 px-2 py-1 bg-gray-100">Date</th>
              <th className="border border-gray-300 px-2 py-1 bg-gray-100">Prix (€)</th>
              <th className="border border-gray-300 px-2 py-1 bg-gray-100">Volume</th>
              <th className="border border-gray-300 px-2 py-1 bg-gray-100">Tendance</th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((point, index) => {
              const trendPoint = trendLineData[index]
              const isChangePoint = trendData.changePoints.some(cp => cp.date === point.date)
              
              return (
                <tr
                  key={index}
                  className={selectedPoint === index ? 'bg-blue-100' : isChangePoint ? 'bg-yellow-50' : ''}
                >
                  <td className="border border-gray-300 px-2 py-1">
                    {new Date(point.date).toLocaleDateString()}
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-right">
                    {point.price.toFixed(2)}€
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-right">
                    {point.volume}
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-right">
                    {trendPoint ? trendPoint.trendPrice.toFixed(2) + '€' : '-'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Points de changement */}
        {trendData.changePoints.length > 0 && (
          <div className="mt-4">
            <h4 className="font-medium mb-2">Points de changement détectés</h4>
            <div className="space-y-2">
              {trendData.changePoints.map((cp, index) => (
                <div key={index} className="bg-gray-50 p-2 rounded text-sm">
                  <div className="font-medium">
                    {new Date(cp.date).toLocaleDateString()} - {cp.type}
                  </div>
                  <div className="text-gray-600">
                    Magnitude: {cp.magnitude.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Légende
  const renderLegend = () => {
    return (
      <div className="flex flex-wrap gap-4 mt-2 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 bg-blue-500 rounded"></div>
          <span>Prix historiques</span>
        </div>
        {showTrendLine && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 border-t-2 border-green-500 border-dashed"></div>
            <span>Ligne de tendance</span>
          </div>
        )}
        {showChangePoints && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
            <span>Points de changement</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      ref={containerRef as unknown as React.Ref<HTMLDivElement>}
      className={cn('trend-analysis-chart relative', className)}
      role="img"
      aria-label={accessibility.title}
      aria-describedby="chart-description"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Description pour les lecteurs d'écran */}
      <div id="chart-description" className="sr-only">
        {accessibility.description}
        {sortedData.length > 0 && (
          <span>
            {` Graphique d'analyse de tendance avec ${sortedData.length} points de données. 
            Tendance ${trendData.direction} avec une force de ${(trendData.strength * 100).toFixed(0)}%. 
            ${trendData.changePoints.length} points de changement détectés. 
            Utilisez les flèches pour naviguer, Entrée pour sélectionner.`}
          </span>
        )}
      </div>

      {/* Titre et contrôles */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">{accessibility.title}</h3>
        
        <div className="flex gap-2">
          {accessibility.dataTable && (
            <button
              onClick={() => setShowDataTable(!showDataTable)}
              className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded"
              aria-pressed={showDataTable}
            >
              {showDataTable ? 'Masquer' : 'Afficher'} les données
            </button>
          )}
          
          {selectedPoint !== null && (
            <button
              onClick={() => {
                setSelectedPoint(null)
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
          {renderPriceLine()}
          {renderTrendLine()}
          {renderDataPoints()}
          {renderChangePoints()}
        </svg>

        {/* Indicateur de tendance */}
        {renderTrendIndicator()}
      </div>

      {/* Légende */}
      {renderLegend()}

      {/* Tooltip */}
      {hoveredElement && (
        <div
          className="absolute bg-black text-white px-3 py-2 rounded text-sm pointer-events-none z-10 shadow-lg"
          style={{
            left: hoveredElement.type === 'data' 
              ? getXPosition(sortedData[hoveredElement.index].date) + margin.left
              : hoveredElement.type === 'changepoint'
              ? getXPosition(trendData.changePoints[hoveredElement.index].date) + margin.left
              : 0,
            top: margin.top - 10,
            transform: 'translateX(-50%) translateY(-100%)'
          }}
        >
          {hoveredElement.type === 'data' && (
            <div>
              <div className="font-medium">
                {new Date(sortedData[hoveredElement.index].date).toLocaleDateString()}
              </div>
              <div>{sortedData[hoveredElement.index].price.toFixed(2)}€</div>
              <div className="text-xs opacity-75">
                Volume: {sortedData[hoveredElement.index].volume}
              </div>
            </div>
          )}
          {hoveredElement.type === 'changepoint' && (
            <div>
              <div className="font-medium">Point de changement</div>
              <div>{trendData.changePoints[hoveredElement.index].type}</div>
              <div className="text-xs opacity-75">
                Magnitude: {trendData.changePoints[hoveredElement.index].magnitude.toFixed(2)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Table de données */}
      {renderDataTable()}

      {/* Résumé pour les lecteurs d'écran */}
      <div className="sr-only" aria-live="polite">
        {selectedPoint !== null && (
          <span>
            Point sélectionné: {new Date(sortedData[selectedPoint].date).toLocaleDateString()}, 
            {sortedData[selectedPoint].price.toFixed(2)}€
          </span>
        )}
      </div>
    </div>
  )
}

export default TrendAnalysisChart