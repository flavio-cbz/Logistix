"use client"

import React, { useRef, useEffect, useState, useCallback } from 'react'
import { useAccessibility } from '@/lib/contexts/accessibility-context'
import { useKeyboardNavigation } from '@/lib/hooks/use-keyboard-navigation'
import { cn } from '@/lib/utils'

// Types pour les différents types de graphiques
export type ChartType = 'histogram' | 'scatter' | 'heatmap' | 'violin' | 'box' | 'line' | 'bar'

export interface ChartDataPoint {
  x: number | string
  y: number
  label?: string
  category?: string
  metadata?: Record<string, any>
}

export interface ChartAccessibility {
  title: string
  description: string
  dataTable?: boolean
  sonification?: boolean
  keyboardNavigation?: boolean
}

export interface ChartInteractions {
  zoom?: boolean
  pan?: boolean
  brush?: boolean
  tooltip?: boolean
  selection?: boolean
  hover?: boolean
}

export interface InteractiveChartProps {
  data: ChartDataPoint[]
  type: ChartType
  width?: number
  height?: number
  accessibility: ChartAccessibility
  interactions?: ChartInteractions
  responsive?: boolean
  theme?: 'light' | 'dark' | 'auto'
  colors?: string[]
  onDataPointClick?: (point: ChartDataPoint, index: number) => void
  onDataPointHover?: (point: ChartDataPoint | null, index: number) => void
  onSelectionChange?: (selectedPoints: ChartDataPoint[]) => void
  className?: string
}

export const InteractiveChart: React.FC<InteractiveChartProps> = ({
  data,
  type,
  width = 600,
  height = 400,
  accessibility,
  interactions = {
    zoom: true,
    pan: true,
    tooltip: true,
    hover: true
  },
  responsive = true,
  theme = 'auto',
  colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'],
  onDataPointClick,
  onDataPointHover,
  onSelectionChange,
  className
}) => {
  const { announceToScreenReader, preferences } = useAccessibility()
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [selectedPoints, setSelectedPoints] = useState<number[]>([])
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null)
  const [showDataTable, setShowDataTable] = useState(false)
  const [dimensions, setDimensions] = useState({ width, height })

  // Navigation clavier pour le graphique
  const { containerRef: keyboardRef } = useKeyboardNavigation({
    enableArrowNavigation: accessibility.keyboardNavigation,
    orientation: 'both'
  })

  // Combiner les refs
  const combinedRef = useCallback((node: HTMLDivElement) => {
    containerRef.current = node
    if (accessibility.keyboardNavigation) {
      keyboardRef.current = node
    }
  }, [keyboardRef, accessibility.keyboardNavigation])

  // Gestion du responsive
  useEffect(() => {
    if (!responsive || !containerRef.current) return

    const resizeObserver = new ResizeObserver(entries => {
      const entry = entries[0]
      if (entry) {
        const { width: containerWidth } = entry.contentRect
        const aspectRatio = height / width
        const newWidth = Math.min(containerWidth, width)
        const newHeight = newWidth * aspectRatio

        setDimensions({ width: newWidth, height: newHeight })
      }
    })

    resizeObserver.observe(containerRef.current)
    return () => resizeObserver.disconnect()
  }, [responsive, width, height])

  // Calculs pour le rendu du graphique
  const margin = { top: 20, right: 20, bottom: 40, left: 40 }
  const chartWidth = dimensions.width - margin.left - margin.right
  const chartHeight = dimensions.height - margin.top - margin.bottom

  // Échelles pour les axes
  const xScale = useCallback(() => {
    const xValues = data.map(d => typeof d.x === 'number' ? d.x : 0)
    const xMin = Math.min(...xValues)
    const xMax = Math.max(...xValues)
    return { min: xMin, max: xMax, range: xMax - xMin }
  }, [data])

  const yScale = useCallback(() => {
    const yValues = data.map(d => d.y)
    const yMin = Math.min(...yValues)
    const yMax = Math.max(...yValues)
    return { min: yMin, max: yMax, range: yMax - yMin }
  }, [data])

  // Conversion des coordonnées données vers SVG
  const getXPosition = useCallback((value: number) => {
    const scale = xScale()
    return (value - scale.min) / scale.range * chartWidth
  }, [xScale, chartWidth])

  const getYPosition = useCallback((value: number) => {
    const scale = yScale()
    return chartHeight - (value - scale.min) / scale.range * chartHeight
  }, [yScale, chartHeight])

  // Gestionnaires d'événements
  const handlePointClick = useCallback((point: ChartDataPoint, index: number) => {
    setSelectedPoints(prev => {
      const newSelection = prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
      
      onSelectionChange?.(newSelection.map(i => data[i]))
      return newSelection
    })

    onDataPointClick?.(point, index)
    announceToScreenReader(`Point sélectionné: ${point.label || `${point.x}, ${point.y}`}`)
  }, [data, onDataPointClick, onSelectionChange, announceToScreenReader])

  const handlePointHover = useCallback((point: ChartDataPoint | null, index: number) => {
    setHoveredPoint(point ? index : null)
    onDataPointHover?.(point, index)
    
    if (point && interactions.hover) {
      announceToScreenReader(`Point survolé: ${point.label || `${point.x}, ${point.y}`}`, 'polite')
    }
  }, [onDataPointHover, interactions.hover, announceToScreenReader])

  // Gestion du clavier
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!accessibility.keyboardNavigation) return

    switch (event.key) {
      case 'Enter':
      case ' ':
        if (hoveredPoint !== null) {
          event.preventDefault()
          handlePointClick(data[hoveredPoint], hoveredPoint)
        }
        break
      case 't':
        event.preventDefault()
        setShowDataTable(!showDataTable)
        announceToScreenReader(`Table de données ${showDataTable ? 'masquée' : 'affichée'}`)
        break
      case 'Escape':
        event.preventDefault()
        setSelectedPoints([])
        setHoveredPoint(null)
        announceToScreenReader('Sélection effacée')
        break
    }
  }, [accessibility.keyboardNavigation, hoveredPoint, data, handlePointClick, showDataTable, announceToScreenReader])

  // Rendu des différents types de graphiques
  const renderChart = () => {
    switch (type) {
      case 'scatter':
        return renderScatterPlot()
      case 'bar':
        return renderBarChart()
      case 'line':
        return renderLineChart()
      case 'histogram':
        return renderHistogram()
      default:
        return renderScatterPlot()
    }
  }

  const renderScatterPlot = () => {
    return data.map((point, index) => {
      const x = getXPosition(typeof point.x === 'number' ? point.x : 0)
      const y = getYPosition(point.y)
      const isSelected = selectedPoints.includes(index)
      const isHovered = hoveredPoint === index

      return (
        <circle
          key={index}
          cx={x + margin.left}
          cy={y + margin.top}
          r={isHovered ? 6 : isSelected ? 5 : 4}
          fill={colors[index % colors.length]}
          stroke={isSelected ? '#000' : 'none'}
          strokeWidth={isSelected ? 2 : 0}
          opacity={isHovered ? 0.8 : 0.7}
          style={{
            cursor: 'pointer',
            transition: preferences.reducedMotion ? 'none' : 'all 0.2s ease'
          }}
          onClick={() => handlePointClick(point, index)}
          onMouseEnter={() => interactions.hover && handlePointHover(point, index)}
          onMouseLeave={() => interactions.hover && handlePointHover(null, index)}
          role="button"
          tabIndex={accessibility.keyboardNavigation ? 0 : -1}
          aria-label={`Point de données: ${point.label || `${point.x}, ${point.y}`}`}
          aria-selected={isSelected}
        />
      )
    })
  }

  const renderBarChart = () => {
    const barWidth = chartWidth / data.length * 0.8
    const barSpacing = chartWidth / data.length * 0.2

    return data.map((point, index) => {
      const x = (index * chartWidth / data.length) + barSpacing / 2
      const y = getYPosition(point.y)
      const barHeight = chartHeight - y
      const isSelected = selectedPoints.includes(index)
      const isHovered = hoveredPoint === index

      return (
        <rect
          key={index}
          x={x + margin.left}
          y={y + margin.top}
          width={barWidth}
          height={barHeight}
          fill={colors[index % colors.length]}
          stroke={isSelected ? '#000' : 'none'}
          strokeWidth={isSelected ? 2 : 0}
          opacity={isHovered ? 0.8 : 0.7}
          style={{
            cursor: 'pointer',
            transition: preferences.reducedMotion ? 'none' : 'all 0.2s ease'
          }}
          onClick={() => handlePointClick(point, index)}
          onMouseEnter={() => interactions.hover && handlePointHover(point, index)}
          onMouseLeave={() => interactions.hover && handlePointHover(null, index)}
          role="button"
          tabIndex={accessibility.keyboardNavigation ? 0 : -1}
          aria-label={`Barre: ${point.label || point.x} - ${point.y}`}
          aria-selected={isSelected}
        />
      )
    })
  }

  const renderLineChart = () => {
    const points = data.map((point, index) => {
      const x = getXPosition(typeof point.x === 'number' ? point.x : index)
      const y = getYPosition(point.y)
      return `${x + margin.left},${y + margin.top}`
    }).join(' ')

    return (
      <>
        <polyline
          points={points}
          fill="none"
          stroke={colors[0]}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {data.map((point, index) => {
          const x = getXPosition(typeof point.x === 'number' ? point.x : index)
          const y = getYPosition(point.y)
          const isSelected = selectedPoints.includes(index)
          const isHovered = hoveredPoint === index

          return (
            <circle
              key={index}
              cx={x + margin.left}
              cy={y + margin.top}
              r={isHovered ? 5 : isSelected ? 4 : 3}
              fill={colors[0]}
              stroke="#fff"
              strokeWidth="2"
              style={{
                cursor: 'pointer',
                transition: preferences.reducedMotion ? 'none' : 'all 0.2s ease'
              }}
              onClick={() => handlePointClick(point, index)}
              onMouseEnter={() => interactions.hover && handlePointHover(point, index)}
              onMouseLeave={() => interactions.hover && handlePointHover(null, index)}
              role="button"
              tabIndex={accessibility.keyboardNavigation ? 0 : -1}
              aria-label={`Point: ${point.label || `${point.x}, ${point.y}`}`}
              aria-selected={isSelected}
            />
          )
        })}
      </>
    )
  }

  const renderHistogram = () => {
    // Simplification: traiter comme un graphique en barres
    return renderBarChart()
  }

  // Rendu des axes
  const renderAxes = () => {
    const xScaleData = xScale()
    const yScaleData = yScale()

    return (
      <>
        {/* Axe X */}
        <line
          x1={margin.left}
          y1={dimensions.height - margin.bottom}
          x2={dimensions.width - margin.right}
          y2={dimensions.height - margin.bottom}
          stroke="currentColor"
          strokeWidth="1"
        />
        
        {/* Axe Y */}
        <line
          x1={margin.left}
          y1={margin.top}
          x2={margin.left}
          y2={dimensions.height - margin.bottom}
          stroke="currentColor"
          strokeWidth="1"
        />

        {/* Labels des axes */}
        <text
          x={dimensions.width / 2}
          y={dimensions.height - 5}
          textAnchor="middle"
          fontSize="12"
          fill="currentColor"
        >
          {typeof data[0]?.x === 'string' ? 'Catégorie' : 'Valeur X'}
        </text>

        <text
          x={15}
          y={dimensions.height / 2}
          textAnchor="middle"
          fontSize="12"
          fill="currentColor"
          transform={`rotate(-90, 15, ${dimensions.height / 2})`}
        >
          Valeur Y
        </text>
      </>
    )
  }

  // Table de données accessible
  const renderDataTable = () => {
    if (!showDataTable) return null

    return (
      <div className="mt-4 overflow-auto">
        <table className="w-full border-collapse border border-gray-300">
          <caption className="sr-only">
            {accessibility.title} - Données du graphique
          </caption>
          <thead>
            <tr>
              <th className="border border-gray-300 px-2 py-1 bg-gray-100">
                {typeof data[0]?.x === 'string' ? 'Catégorie' : 'X'}
              </th>
              <th className="border border-gray-300 px-2 py-1 bg-gray-100">Y</th>
              {data[0]?.label && (
                <th className="border border-gray-300 px-2 py-1 bg-gray-100">Label</th>
              )}
            </tr>
          </thead>
          <tbody>
            {data.map((point, index) => (
              <tr
                key={index}
                className={selectedPoints.includes(index) ? 'bg-blue-100' : ''}
              >
                <td className="border border-gray-300 px-2 py-1">{point.x}</td>
                <td className="border border-gray-300 px-2 py-1">{point.y}</td>
                {point.label && (
                  <td className="border border-gray-300 px-2 py-1">{point.label}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div
      ref={combinedRef}
      className={cn('interactive-chart', className)}
      role="img"
      aria-label={accessibility.title}
      aria-describedby="chart-description"
      onKeyDown={handleKeyDown}
      tabIndex={accessibility.keyboardNavigation ? 0 : -1}
    >
      {/* Description pour les lecteurs d'écran */}
      <div id="chart-description" className="sr-only">
        {accessibility.description}
        {data.length > 0 && (
          <span>
            {` Graphique contenant ${data.length} points de données. 
            Utilisez les flèches pour naviguer, Entrée pour sélectionner, 
            T pour afficher/masquer la table de données.`}
          </span>
        )}
      </div>

      {/* Titre visible */}
      <h3 className="text-lg font-semibold mb-2">{accessibility.title}</h3>

      {/* Contrôles */}
      <div className="flex gap-2 mb-2">
        {accessibility.dataTable && (
          <button
            onClick={() => setShowDataTable(!showDataTable)}
            className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded"
            aria-pressed={showDataTable}
          >
            {showDataTable ? 'Masquer' : 'Afficher'} la table
          </button>
        )}
        
        {selectedPoints.length > 0 && (
          <button
            onClick={() => {
              setSelectedPoints([])
              announceToScreenReader('Sélection effacée')
            }}
            className="px-3 py-1 text-sm bg-red-200 hover:bg-red-300 rounded"
          >
            Effacer la sélection ({selectedPoints.length})
          </button>
        )}
      </div>

      {/* SVG du graphique */}
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="border border-gray-300 bg-white"
        role="presentation"
        aria-hidden="true"
      >
        {renderAxes()}
        {renderChart()}
      </svg>

      {/* Légende */}
      {hoveredPoint !== null && interactions.tooltip && (
        <div
          className="absolute bg-black text-white px-2 py-1 rounded text-sm pointer-events-none z-10"
          style={{
            left: getXPosition(typeof data[hoveredPoint].x === 'number' ? data[hoveredPoint].x : 0) + margin.left,
            top: getYPosition(data[hoveredPoint].y) + margin.top - 30
          }}
        >
          {data[hoveredPoint].label || `${data[hoveredPoint].x}, ${data[hoveredPoint].y}`}
        </div>
      )}

      {/* Table de données */}
      {renderDataTable()}

      {/* Résumé statistique pour les lecteurs d'écran */}
      <div className="sr-only" aria-live="polite">
        {selectedPoints.length > 0 && (
          <span>{selectedPoints.length} point(s) sélectionné(s)</span>
        )}
      </div>
    </div>
  )
}

export default InteractiveChart