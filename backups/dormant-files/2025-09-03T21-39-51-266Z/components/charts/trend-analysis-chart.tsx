"use client"

import React, { useMemo, useState, useCallback, useId, useRef } from 'react'
import { useAccessibility } from '@/lib/contexts/accessibility-context'
import { cn } from '@/lib/utils'
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
  onChangePointClick?: (changePoint: TrendAnalysis['changePoints'] extends Array<infer T> ? T : never) => void
  className?: string
}

type ChangePoint = {
  date: string
  type: string
  magnitude: number
  [key: string]: unknown
}
type HistoricalPoint = TrendAnalysisChartProps['historicalData'][number]
type HoverElement =
  | { type: 'data'; index: number }
  | { type: 'changepoint'; index: number }
  | { type: 'trend'; index: number }

const currencyFmt = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2
})
const percentFmt = new Intl.NumberFormat('fr-FR', {
  style: 'percent',
  maximumFractionDigits: 0
})

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
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null)
  const [showDataTable, setShowDataTable] = useState(false)
  const [hoveredElement, setHoveredElement] = useState<HoverElement | null>(null)
  const descriptionId = useId()

  // Cast typé pour les changePoints
  const changePoints: ChangePoint[] = (trendData.changePoints ?? []) as ChangePoint[]

  // Ref correcte pour le container
  const containerRef = useRef<HTMLDivElement>(null)

  // Dimensions du graphique
  const margin = { top: 40, right: 80, bottom: 60, left: 60 }
  const chartWidth = width - margin.left - margin.right
  const chartHeight = height - margin.top - margin.bottom

  // Préparation des données
  const sortedData = useMemo<HistoricalPoint[]>(() => {
    return [...historicalData].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )
  }, [historicalData])

  // Échelles
  const xScale = useMemo(() => {
    if (sortedData.length === 0) return { min: 0, max: 1, range: 1 }
    const dates = sortedData.map(d => new Date(d.date).getTime())
    const min = Math.min(...dates)
    const max = Math.max(...dates)
    const range = Math.max(1, max - min) // évite un range 0
    return { min, max, range }
  }, [sortedData])

  const yScale = useMemo(() => {
    if (sortedData.length === 0) return { min: 0, max: 100, range: 100 }
    const prices = sortedData.map(d => d.price)
    let min = Math.min(...prices) * 0.95 // Marge de 5%
    let max = Math.max(...prices) * 1.05
    if (max - min === 0) {
      // Évite une division par zéro (ex: toutes les valeurs identiques)
      max = min + 1
    }
    const range = max - min
    return { min, max, range }
  }, [sortedData])

  // Fonctions de conversion
  const getXPosition = useCallback(
    (date: string) => {
      const timestamp = new Date(date).getTime()
      return ((timestamp - xScale.min) / xScale.range) * chartWidth
    },
    [xScale, chartWidth]
  )

  const getYPosition = useCallback(
    (price: number) => {
      return chartHeight - ((price - yScale.min) / yScale.range) * chartHeight
    },
    [yScale, chartHeight]
  )

  // Calcul de la ligne de tendance (régression linéaire simple)
  const trendLineData = useMemo(
    () =>
      showTrendLine && sortedData.length >= 2
        ? (() => {
            const n = sortedData.length
            const sumX = sortedData.reduce((sum, _, i) => sum + i, 0)
            const sumY = sortedData.reduce((sum, d) => sum + d.price, 0)
            const sumXY = sortedData.reduce((sum, d, i) => sum + i * d.price, 0)
            const sumXX = sortedData.reduce((sum, _, i) => sum + i * i, 0)
            const denom = n * sumXX - sumX * sumX
            const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0
            const intercept = (sumY - slope * sumX) / n
            return sortedData.map((d, i) => ({
              date: d.date,
              trendPrice: slope * i + intercept
            }))
          })()
        : [],
    [sortedData, showTrendLine]
  )

  // Mémoisation des points SVG
  const pricePolylinePoints = useMemo(() => {
    if (sortedData.length < 2) return ''
    return sortedData
      .map(d => `${getXPosition(d.date) + margin.left},${getYPosition(d.price) + margin.top}`)
      .join(' ')
  }, [sortedData, getXPosition, getYPosition, margin.left, margin.top])

  const trendPolylinePoints = useMemo(() => {
    if (!showTrendLine || trendLineData.length < 2) return ''
    return trendLineData
      .map(d => `${getXPosition(d.date) + margin.left},${getYPosition(d.trendPrice) + margin.top}`)
      .join(' ')
  }, [showTrendLine, trendLineData, getXPosition, getYPosition, margin.left, margin.top])

  // Gestionnaires d'événements
  const handleDataPointClick = useCallback(
    (index: number) => {
      const point = sortedData[index]!
      if (!point) return
      setSelectedPoint(prev => (prev === index ? null : index))
      announceToScreenReader(
        `Point sélectionné: ${new Date(point.date).toLocaleDateString()}, ${currencyFmt.format(point.price)}`
      )
    },
    [sortedData, announceToScreenReader]
  )

  const handleChangePointClick = useCallback(
    (changePoint: ChangePoint) => {
      onChangePointClick?.(changePoint)
      announceToScreenReader(
        `Point de changement: ${new Date(changePoint.date).toLocaleDateString()}, ${changePoint.type}, magnitude ${changePoint.magnitude.toFixed(
          2
        )}`
      )
    },
    [onChangePointClick, announceToScreenReader]
  )

  const handleHover = useCallback(
    (element: HoverElement | null) => {
      setHoveredElement(element)
      if (!element) return
      if (element.type === 'data') {
        const point = sortedData[element.index]!
        if (!point) return
        announceToScreenReader(
          `${new Date(point.date).toLocaleDateString()}: ${currencyFmt.format(point.price)}`,
          'polite'
        )
      } else if (element.type === 'changepoint') {
        const changePoint = changePoints[element.index]
        if (!changePoint) return
        announceToScreenReader(
          `Point de changement: ${changePoint.type} le ${new Date(changePoint.date).toLocaleDateString()}`,
          'polite'
        )
      }
    },
    [sortedData, changePoints, announceToScreenReader]
  )

  // Gestion du clavier
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const key = event.key.toLowerCase()
      switch (key) {
        case 'enter':
        case ' ':
          if (hoveredElement?.type === 'data') {
            event.preventDefault()
            if (hoveredElement.index >= 0 && hoveredElement.index < sortedData.length) {
              handleDataPointClick(hoveredElement.index)
            }
          } else if (hoveredElement?.type === 'changepoint') {
            event.preventDefault()
            const cp = changePoints[hoveredElement.index]
            if (cp) handleChangePointClick(cp)
          }
          break
        case 't':
          event.preventDefault()
          setShowDataTable(prev => !prev)
          announceToScreenReader(`Table de données ${showDataTable ? 'masquée' : 'affichée'}`)
          break
        case 'escape':
          event.preventDefault()
          setSelectedPoint(null)
          setHoveredElement(null)
          announceToScreenReader('Sélection effacée')
          break
      }
    },
    [
      hoveredElement,
      handleDataPointClick,
      handleChangePointClick,
      changePoints,
      showDataTable,
      announceToScreenReader,
      sortedData.length
    ]
  )

  // Rendu de la ligne de prix
  const renderPriceLine = () => {
    if (sortedData.length < 2) return null
    return (
      <polyline
        points={pricePolylinePoints}
        fill="none"
        stroke="hsl(var(--primary))"
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
          fill="hsl(var(--primary))"
          stroke={isSelected ? 'hsl(var(--ring))' : 'hsl(var(--background))'}
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
          aria-label={`Prix le ${new Date(point.date).toLocaleDateString()}: ${currencyFmt.format(point.price)}`}
          aria-selected={isSelected}
        />
      )
    })
  }

  // Rendu de la ligne de tendance
  const renderTrendLine = () => {
    if (!showTrendLine || trendLineData.length < 2) return null

    const trendColor =
      trendData.direction === 'up'
        ? 'hsl(var(--success))'
        : trendData.direction === 'down'
        ? 'hsl(var(--destructive))'
        : 'hsl(var(--muted))'

    return (
      <polyline
        points={trendPolylinePoints}
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
    return showChangePoints
      ? changePoints.map((changePoint: ChangePoint, index: number) => {
          const x = getXPosition(changePoint.date)
          const y = getYPosition(
            sortedData.find(d => d.date === changePoint.date)?.price ?? yScale.min
          )

          const color =
            changePoint.type === 'increase'
              ? 'hsl(var(--success))'
              : changePoint.type === 'decrease'
              ? 'hsl(var(--destructive))'
              : 'hsl(var(--warning))'

          const isHovered = hoveredElement?.type === 'changepoint' && hoveredElement.index === index

          return (
            <g key={`${changePoint.date}-${index}`}>
              <circle
                cx={x + margin.left}
                cy={y + margin.top}
                r={isHovered ? 8 : 6}
                fill={color}
                stroke="hsl(var(--background))"
                strokeWidth="2"
                opacity={0.8}
                style={{
                  cursor: 'pointer',
                  transition: preferences.reducedMotion ? 'none' : 'all 0.2s ease'
                }}
                onClick={() => handleChangePointClick(changePoint)}
                onMouseEnter={() => setHoveredElement({ type: 'changepoint', index })}
                onMouseLeave={() => setHoveredElement(null)}
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
      : null
  }

  // Rendu des axes
  const renderAxes = () => {
    const xTicks = [0, 0.25, 0.5, 0.75, 1] as const
    const yTicks = [0, 0.25, 0.5, 0.75, 1] as const
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
        {xTicks.map((ratio: number) => {
          const timestamp = xScale.min + ratio * xScale.range
          const date = new Date(timestamp)
          const x = ratio * chartWidth + margin.left

          return (
            <g key={`x-${ratio}`}>
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
        {yTicks.map((ratio: number) => {
          const value = yScale.min + ratio * yScale.range
          const y = height - margin.bottom - ratio * chartHeight

          return (
            <g key={`y-${ratio}`}>
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
                {currencyFmt.format(value)}
              </text>
            </g>
          )
        })}
      </>
    )
  }

  // Indicateur de tendance
  const renderTrendIndicator = () => {
    const trendColor =
      trendData.direction === 'up'
        ? 'hsl(var(--success))'
        : trendData.direction === 'down'
        ? 'hsl(var(--destructive))'
        : 'hsl(var(--muted))'

    const trendIcon =
      trendData.direction === 'up' ? '↗' : trendData.direction === 'down' ? '↘' : '→'

    return (
      <div className="absolute top-4 right-4 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg p-3 shadow-enhanced-sm">
        <div className="flex items-center gap-2">
          <span className="text-2xl" style={{ color: trendColor }} aria-hidden="true">
            {trendIcon}
          </span>
          <div>
            <div className="font-medium text-sm">
              Tendance:{' '}
              {trendData.direction === 'up'
                ? 'Hausse'
                : trendData.direction === 'down'
                ? 'Baisse'
                : 'Stable'}
            </div>
            <div className="text-xs text-[hsl(var(--muted-foreground))]">
              Force: {percentFmt.format(trendData.strength)}
            </div>
            <div className="text-xs text-[hsl(var(--muted-foreground))]">
              Durée: {trendData.duration} jours
            </div>
          </div>
        </div>

        {showSeasonality && trendData.seasonality.detected && (
          <div className="mt-2 pt-2 border-t text-xs border-t-[hsl(var(--border))]">
            <div className="font-medium">Saisonnalité détectée</div>
            <div className="text-[hsl(var(--muted-foreground))]">
              Pattern: {trendData.seasonality.pattern}
            </div>
            <div className="text-[hsl(var(--muted-foreground))]">
              Confiance: {percentFmt.format(trendData.seasonality.confidence)}
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
        <table className="w-full border-collapse border border-[hsl(var(--border))]">
          <caption className="sr-only">Données historiques des prix</caption>
          <thead>
            <tr>
              <th className="border border-[hsl(var(--border))] px-2 py-1 bg-[hsl(var(--muted))]">Date</th>
              <th className="border border-[hsl(var(--border))] px-2 py-1 bg-[hsl(var(--muted))]">Prix (€)</th>
              <th className="border border-[hsl(var(--border))] px-2 py-1 bg-[hsl(var(--muted))]">Volume</th>
              <th className="border border-[hsl(var(--border))] px-2 py-1 bg-[hsl(var(--muted))]">Tendance</th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((point, index) => {
              const trendPoint = trendLineData[index]!
              const isChangePoint = changePoints.some((cp: ChangePoint) => cp.date === point.date)

              return (
                <tr
                  key={index}
                  className={
                    selectedPoint === index
                      ? 'bg-[hsl(var(--primary))]'
                      : isChangePoint
                      ? 'bg-[hsl(var(--warning))]'
                      : ''
                  }
                >
                  <td className="border border-[hsl(var(--border))] px-2 py-1">
                    {new Date(point.date).toLocaleDateString()}
                  </td>
                  <td className="border border-[hsl(var(--border))] px-2 py-1 text-right">
                    {currencyFmt.format(point.price)}
                  </td>
                  <td className="border border-[hsl(var(--border))] px-2 py-1 text-right">
                    {point.volume}
                  </td>
                  <td className="border border-[hsl(var(--border))] px-2 py-1 text-right">
                    {trendPoint ? currencyFmt.format(trendPoint.trendPrice) : '-'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Points de changement */}
        {changePoints.length > 0 && (
          <div className="mt-4">
            <h4 className="font-medium mb-2">Points de changement détectés</h4>
            <div className="space-y-2">
              {changePoints.map((changePoint: ChangePoint, index: number) => (
                <div key={`${changePoint.date}-${index}`} className="bg-[hsl(var(--muted))] p-2 rounded text-sm">
                  <div className="font-medium">
                    {new Date(changePoint.date).toLocaleDateString()} - {changePoint.type}
                  </div>
                  <div className="text-[hsl(var(--muted-foreground))]">
                    Magnitude: {changePoint.magnitude.toFixed(2)}
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
          <div className="w-4 h-1 bg-[hsl(var(--primary))] rounded"></div>
          <span>Prix historiques</span>
        </div>
        {showTrendLine && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 border-t-2 border-[hsl(var(--border))] border-dashed"></div>
            <span>Ligne de tendance</span>
          </div>
        )}
        {showChangePoints && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[hsl(var(--warning))] rounded-full"></div>
            <span>Points de changement</span>
          </div>
        )}
      </div>
    )
  }

  const hoveredDataPoint =
    hoveredElement?.type === 'data' && hoveredElement.index >= 0
      ? sortedData[hoveredElement.index]!
      : undefined
  const hoveredChangePoint: ChangePoint | undefined =
    hoveredElement?.type === 'changepoint' && hoveredElement.index >= 0
      ? changePoints[hoveredElement.index]
      : undefined

  const tooltipLeft = (() => {
    if (hoveredDataPoint) return getXPosition(hoveredDataPoint.date) + margin.left
    if (hoveredChangePoint) return getXPosition(hoveredChangePoint.date) + margin.left
    return 0
  })()

  const selectedPointData =
    selectedPoint !== null && selectedPoint >= 0 ? sortedData[selectedPoint]! : undefined

  return (
    <div
      ref={containerRef}
      className={cn('trend-analysis-chart relative', className)}
      role="img"
      aria-roledescription="Graphique de tendance"
      aria-label={accessibility.title}
      aria-describedby={descriptionId}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Description pour les lecteurs d'écran */}
      <div id={descriptionId} className="sr-only">
        {accessibility.description}
        {sortedData.length > 0 && (
          <span>
            {` Graphique d'analyse de tendance avec ${sortedData.length} points de données. 
            Tendance ${trendData.direction} avec une force de ${percentFmt.format(trendData.strength)}. 
            ${changePoints.length} points de changement détectés. 
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
              onClick={() => setShowDataTable(prev => !prev)}
              className="px-3 py-1 text-sm bg-[hsl(var(--muted))] hover:bg-[hsl(var(--muted))] rounded"
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
              className="px-3 py-1 text-sm bg-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))] rounded"
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
          className="border border-[hsl(var(--chart-grid))] bg-[hsl(var(--chart-background))] rounded"
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
      {(hoveredDataPoint || hoveredChangePoint) && (
        <div
          className="absolute bg-[hsl(var(--popover))] text-[hsl(var(--popover-foreground))] px-3 py-2 rounded text-sm pointer-events-none z-10 shadow-enhanced-lg"
          style={{
            left: tooltipLeft,
            top: margin.top - 10,
            transform: 'translateX(-50%) translateY(-100%)'
          }}
        >
          {hoveredDataPoint && (
            <div>
              <div className="font-medium">
                {new Date(hoveredDataPoint.date).toLocaleDateString()}
              </div>
              <div>{currencyFmt.format(hoveredDataPoint.price)}</div>
              <div className="text-xs opacity-75">Volume: {hoveredDataPoint.volume}</div>
            </div>
          )}
          {hoveredChangePoint && (
            <div>
              <div className="font-medium">Point de changement</div>
              <div>{hoveredChangePoint.type}</div>
              <div className="text-xs opacity-75">
                Magnitude: {hoveredChangePoint.magnitude.toFixed(2)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Table de données */}
      {renderDataTable()}

      {/* Résumé pour les lecteurs d'écran */}
      <div className="sr-only" aria-live="polite">
        {selectedPointData && (
          <span>
            Point sélectionné:{' '}
            {new Date(selectedPointData.date).toLocaleDateString()},{' '}
            {currencyFmt.format(selectedPointData.price)}
          </span>
        )}
      </div>
    </div>
  )
}

export default TrendAnalysisChart