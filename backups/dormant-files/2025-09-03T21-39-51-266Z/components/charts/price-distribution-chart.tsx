"use client"

import React, { useMemo, useState, useCallback, useEffect, useId, useRef } from 'react'
// import { motion, AnimatePresence, easeOut } from 'framer-motion' // Removed framer-motion imports
import { useTheme } from 'next-themes'
import { useAccessibility } from '@/lib/contexts/accessibility-context'
import { cn } from '@/lib/utils'
import { getChartColors, formatChartValue } from '@/lib/utils/chart-utils'
import type { AdvancedMetrics } from '@/lib/analytics/advanced-analytics-engine'

/**
 * Typages stricts internes au composant
 */
type HistogramBin = {
  range: [number, number]
  count: number
  percentage: number
}
type DensityPoint = {
  price: number
  density: number
}
type Percentiles = Record<number, number>

export interface PriceDistributionChartProps {
  metrics: AdvancedMetrics
  width?: number
  height?: number
  showDensityCurve?: boolean
  showPercentiles?: boolean
  showHistogram?: boolean
  accessibility: {
    title: string
    description: string
    dataTable?: boolean
  }
  onBinClick?: (bin: HistogramBin) => void
  className?: string
}

const PriceDistributionChartComponent: React.FC<PriceDistributionChartProps> = ({
  metrics,
  width = 800,
  height = 400,
  showDensityCurve = true,
  showPercentiles = true,
  showHistogram = true,
  accessibility,
  onBinClick,
  className,
}) => {
  const { announceToScreenReader, preferences: _preferences } = useAccessibility()
  const { theme } = useTheme()
  const [selectedBin, setSelectedBin] = useState<number | null>(null)
  const [showDataTable, setShowDataTable] = useState(false)
  const [hoveredElement, setHoveredElement] = useState<{ type: 'bin' | 'percentile'; index: number } | null>(null)
  const [_isVisible, setIsVisible] = useState(false)
  const reactId = useId()
  const descId = `${reactId}-desc`
  const tableId = `${reactId}-table`

  // Remplacement du hook manquant par un simple ref accessible
  const containerRef = useRef<HTMLDivElement | null>(null)

  // Couleurs mémoïsées (évite des recalculs inutiles)
  const chartColors = useMemo(() => getChartColors(theme), [theme])

  // Animation entrance effect
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  // Dimensions du graphique
  const margin = { top: 20, right: 60, bottom: 60, left: 60 }
  const chartWidth = width - margin.left - margin.right
  const chartHeight = height - margin.top - margin.bottom

  // Données préparées
  const { histogram, density, percentiles } = metrics.priceDistribution as {
    histogram: HistogramBin[]
    density: DensityPoint[]
    percentiles: Percentiles
  }

  // Échelles
  const xScale = useMemo(() => {
    if (histogram.length === 0) return { min: 0, max: 100, range: 100 }
    const first = histogram[0]!
    const last = histogram[histogram.length - 1]!
    if (!first || !last) return { min: 0, max: 100, range: 100 }
    const min = first.range[0]!
    const max = last.range[1]!
    const range = Math.max(max - min, 1e-6) // évite division par zéro
    return { min, max, range }
  }, [histogram])

  const yScale = useMemo(() => {
    const maxCount = histogram.length > 0 ? Math.max(...histogram.map((bin) => bin.count)) : 0
    const maxDensity = density.length > 0 ? Math.max(...density.map((d) => d.density)) : 0
    // Normaliser la densité sur la même échelle que le count et garantir un max > 0
    const max = Math.max(maxCount, maxDensity * 100, 1)
    return { min: 0, max, range: max }
  }, [histogram, density])

  // Fonctions de conversion (mémoïsées)
  const getXPosition = useCallback((value: number) => {
    return ((value - xScale.min) / xScale.range) * chartWidth
  }, [xScale.min, xScale.range, chartWidth])

  const getYPosition = useCallback((value: number) => {
    return chartHeight - (value / yScale.max) * chartHeight
  }, [yScale.max, chartHeight])

  // Gestionnaires d'événements
  const handleBinClick = useCallback((bin: HistogramBin, _index: number) => {
    setSelectedBin((prev) => (prev === _index ? null : _index))
    onBinClick?.(bin)
    announceToScreenReader(
      `Intervalle sélectionné: ${bin.range[0]!}€ - ${bin.range[1]!}€, ${bin.count} articles (${bin.percentage.toFixed(1)}%)`
    )
  }, [onBinClick, announceToScreenReader])

  const handleBinHover = useCallback((bin: HistogramBin | null, _index: number) => {
    setHoveredElement(bin ? { type: 'bin', index: _index } : null)
    if (bin) {
      announceToScreenReader(
        `Intervalle: ${bin.range[0]!}€ - ${bin.range[1]!}€, ${bin.count} articles (${bin.percentage.toFixed(1)}%)`,
        'polite'
      )
    }
  }, [announceToScreenReader])

  // Gestion du clavier (container)
  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case 'Enter':
      case ' ': {
        if (hoveredElement?.type === 'bin') {
          event.preventDefault()
          const idx = hoveredElement.index
          const hoveredBin = (idx >= 0 && idx < histogram.length) ? histogram[idx]! : undefined
          if (hoveredBin) {
            handleBinClick(hoveredBin as HistogramBin, idx)
          }
        }
        break
      }
      case 't': {
        event.preventDefault()
        setShowDataTable(prev => {
          const next = !prev
          announceToScreenReader(`Table de données ${next ? 'affichée' : 'masquée'}`)
          return next
        })
        break
      }
      case 'Escape':
        event.preventDefault()
        setSelectedBin(null)
        setHoveredElement(null)
        announceToScreenReader('Sélection effacée')
        break
    }
  }, [hoveredElement, histogram, handleBinClick, announceToScreenReader])

  // Rendu de l'histogramme avec animations modernes
  const renderHistogram = () => {
    if (!showHistogram || histogram.length === 0) return null

    const totalBins = histogram.length
    const binWidth = (chartWidth / totalBins) * 0.9
    const binSpacing = (chartWidth / totalBins) * 0.1

    return histogram.map((bin, _index) => {
      const x = (_index * chartWidth / totalBins) + binSpacing / 2
      const barHeight = yScale.max > 0 ? (bin.count / yScale.max) * chartHeight : 0
      const y = chartHeight - barHeight
      const isSelected = selectedBin === _index
      const isHovered = hoveredElement?.type === 'bin' && hoveredElement.index === _index

      return (
        <rect // Replaced motion.rect
          key={`${bin.range[0]!}-${bin.range[1]!}`}
          x={x + margin.left}
          y={y + margin.top}
          width={binWidth}
          height={barHeight}
          fill={isSelected ? chartColors.primary[0]! : chartColors.primary[1]!}
          stroke={isHovered ? chartColors.primary[0]! : 'none'}
          strokeWidth={isHovered ? 2 : 0}
          opacity={isHovered ? 0.9 : 0.8}
          rx={4}
          ry={4}
          // initial={{ height: 0, y: chartHeight + margin.top }} // Removed motion props
          // animate={{ // Removed motion props
          //   height: barHeight,
          //   y: y + margin.top,
          //   transition: {
          //     duration: preferences.reducedMotion ? 0 : 0.8,
          //     delay: preferences.reducedMotion ? 0 : _index * 0.05,
          //     ease: "easeOut"
          //   }
          // }}
          // whileHover={!preferences.reducedMotion ? { // Removed motion props
          //   scale: 1.05,
          //   transition: { duration: 0.2 }
          // } : {}}
          style={{
            cursor: 'pointer',
            filter: isHovered ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))' : 'none',
          }}
          onClick={() => handleBinClick(bin, _index)}
          onMouseEnter={() => handleBinHover(bin, _index)}
          onMouseLeave={() => handleBinHover(null, _index)}
          role="button"
          tabIndex={0}
          aria-label={`Intervalle ${formatChartValue(bin.range[0]!, 'currency')} - ${formatChartValue(bin.range[1]!, 'currency')}: ${bin.count} articles (${bin.percentage.toFixed(1)}%)`}
          aria-selected={isSelected}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              handleBinClick(bin, _index)
            }
          }}
        />
      )
    })
  }

  // Rendu de la courbe de densité avec animation
  const renderDensityCurve = () => {
    if (!showDensityCurve || density.length === 0) return null

    const points = density.map((d) => {
      const x = getXPosition(d.price)
      const y = getYPosition(d.density * 100) // Normaliser pour l'affichage
      return `${x + margin.left},${y + margin.top}`
    }).join(' ')

    // Valeur arbitraire suffisante pour l'animation

    return (
      <polyline // Replaced motion.polyline
        points={points}
        fill="none"
        stroke={chartColors.primary[2]!}
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity={0.9}
        // initial={{ // Removed motion props
        //   pathLength: 0,
        //   opacity: 0
        // }}
        // animate={{ // Removed motion props
        //   pathLength: pathLength,
        //   opacity: 0.9,
        //   transition: {
        //     duration: preferences.reducedMotion ? 0 : 1.5,
        //     delay: preferences.reducedMotion ? 0 : 0.5,
        //     ease: "easeOut"
        //   }
        // }}
        style={{
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
        }}
      />
    )
  }

  // Rendu des percentiles avec animations
  const renderPercentiles = () => {
    if (!showPercentiles) return null

    const importantPercentiles = [25, 50, 75, 90, 95] as const

    return importantPercentiles.map((p, _index) => {
      if (!(p in percentiles)) return null

      const value = percentiles[p]! ?? 0
      const x = getXPosition(value)
      const isMedian = p === 50

      return (
        <g // Replaced motion.g
          key={p}
          // initial={{ opacity: 0, y: 10 }} // Removed motion props
          // animate={{ // Removed motion props
          //   opacity: 0.8,
          //   y: 0,
          //   transition: {
          //     duration: preferences.reducedMotion ? 0 : 0.6,
          //     delay: preferences.reducedMotion ? 0 : 1 + _index * 0.1,
          //     ease: "easeOut"
          //   }
          // }}
        >
          <line // Replaced motion.line
            x1={x + margin.left}
            y1={margin.top}
            x2={x + margin.left}
            y2={height - margin.bottom}
            stroke={isMedian ? chartColors.primary[2]! : chartColors.grid}
            strokeWidth={isMedian ? 3 : 2}
            strokeDasharray={isMedian ? 'none' : '6,4'}
            opacity={isMedian ? 0.9 : 0.6}
            // initial={{ scaleY: 0 }} // Removed motion props
            // animate={{ // Removed motion props
            //   scaleY: 1,
            //   transition: {
            //     duration: preferences.reducedMotion ? 0 : 0.5,
            //     delay: preferences.reducedMotion ? 0 : 1 + _index * 0.1,
            //     ease: "easeOut"
            //   }
            // }}
            style={{ transformOrigin: 'bottom' }}
          />
          <text // Replaced motion.text
            x={x + margin.left}
            y={margin.top - 8}
            textAnchor="middle"
            fontSize="11"
            fill={chartColors.text}
            className="font-semibold"
            // initial={{ opacity: 0, y: 5 }} // Removed motion props
            // animate={{ // Removed motion props
            //   opacity: 1,
            //   y: 0,
            //   transition: {
            //     duration: preferences.reducedMotion ? 0 : 0.4,
            //     delay: preferences.reducedMotion ? 0 : 1.2 + _index * 0.1,
            //     ease: "easeOut"
            //   }
            // }}
          >
            P{p}: {formatChartValue(value, 'currency')}
          </text>
        </g>
      )
    }).filter(Boolean)
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
          Nombre d'articles
        </text>

        {/* Graduations X */}
        {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
          const value = xScale.min + ratio * xScale.range
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
                {value.toFixed(0)}€
              </text>
            </g>
          )
        })}

        {/* Graduations Y */}
        {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
          const value = ratio * yScale.max
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
                {value.toFixed(0)}
              </text>
            </g>
          )
        })}
      </>
    )
  }

  // Stats rapides mémoïsées
  const quickStats = useMemo(() => ([
    {
      label: 'Médiane',
      value: formatChartValue((percentiles[50]! ?? 0), 'currency'),
      color: chartColors.primary[0]!
    },
    {
      label: 'Q1 - Q3',
      value: `${formatChartValue((percentiles[25]! ?? 0), 'currency')} - ${formatChartValue((percentiles[75]! ?? 0), 'currency')}`,
      color: chartColors.primary[1]!
    },
    {
      label: 'Écart-type',
      value: formatChartValue(metrics.descriptiveStats.standardDeviation, 'currency'),
      color: chartColors.primary[2]!
    },
    {
      label: 'Total articles',
      value: histogram.reduce((sum: number, bin) => sum + (bin.count || 0), 0).toLocaleString('fr-FR'),
      color: chartColors.primary[3]!
    }
  ]), [percentiles, metrics.descriptiveStats.standardDeviation, histogram, chartColors.primary])

  // Table de données accessible
  const renderDataTable = () => {
    if (!showDataTable) return null

    return (
      <div className="mt-4 overflow-auto">
        <table id={tableId} className="w-full border-collapse border border-[hsl(var(--border))]">
          <caption className="sr-only">
            Distribution des prix - Données détaillées
          </caption>
          <thead>
            <tr>
              <th className="border border-[hsl(var(--border))] px-2 py-1 bg-[hsl(var(--muted))]">Intervalle de prix</th>
              <th className="border border-[hsl(var(--border))] px-2 py-1 bg-[hsl(var(--muted))]">Nombre d'articles</th>
              <th className="border border-[hsl(var(--border))] px-2 py-1 bg-[hsl(var(--muted))]">Pourcentage</th>
            </tr>
          </thead>
          <tbody>
            {histogram.map((bin, _index) => (
              <tr
                key={`${bin.range[0]!}-${bin.range[1]!}`}
                className={selectedBin === _index ? 'bg-[hsl(var(--primary))]' : ''}
              >
                <td className="border border-[hsl(var(--border))] px-2 py-1">
                  {bin.range[0]!!.toFixed(0)}€ - {bin.range[1]!!.toFixed(0)}€
                </td>
                <td className="border border-[hsl(var(--border))] px-2 py-1 text-right">
                  {bin.count}
                </td>
                <td className="border border-[hsl(var(--border))] px-2 py-1 text-right">
                  {bin.percentage.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>

          {/* Statistiques des percentiles */}
        </table>

        <div className="mt-4">
          <h4 className="font-medium mb-2">Percentiles</h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
            {Object.entries(percentiles as Record<string, number>).map(([p, value]) => (
              <div key={p} className="bg-[hsl(var(--muted))] p-2 rounded">
                <div className="font-medium">P{p}</div>
                <div>{(value as number).toFixed(0)}€</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Légende
  const renderLegend = () => {
    return (
      <div className="flex flex-wrap gap-4 mt-2 text-sm">
        {showHistogram && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[hsl(var(--primary))] rounded"></div>
            <span>Distribution (histogramme)</span>
          </div>
        )}
        {showDensityCurve && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 bg-[hsl(var(--destructive))] rounded"></div>
            <span>Courbe de densité</span>
          </div>
        )}
        {showPercentiles && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 border-t-2 border-[hsl(var(--border))] border-dashed"></div>
            <span>Percentiles</span>
          </div>
        )}
      </div>
    )
  }

  // Animation variants (removed motion related properties)
  // const containerVariants = {
  //   hidden: { opacity: 0, y: 20 },
  //   visible: {
  //     opacity: 1,
  //     y: 0,
  //     transition: {
  //       duration: 0.6,
  //       ease: easeOut,
  //       staggerChildren: 0.1
  //     }
  //   }
  // }

  // const titleVariants = {
  //   hidden: { opacity: 0, x: -20 },
  //   visible: {
  //     opacity: 1,
  //     x: 0,
  //     transition: { duration: 0.5, ease: easeOut }
  //   }
  // }

  // Pré-calcul pour tooltip
  const hoveredBin = hoveredElement ? histogram[hoveredElement.index]! : undefined
  const hasHoveredBin = Boolean(hoveredElement?.type === 'bin' && hoveredElement.index >= 0 && hoveredElement.index < histogram.length && hoveredBin)

  // Pré-calcul pour résumé SR
  const selectedBinData = (selectedBin !== null && selectedBin >= 0 && selectedBin < histogram.length) ? histogram[selectedBin]! : undefined

  return (
    <div // Replaced motion.div
      ref={containerRef as unknown as React.Ref<HTMLDivElement>}
      // variants={containerVariants} // Removed motion props
      // initial="hidden" // Removed motion props
      // animate={isVisible ? "visible" : "hidden"} // Removed motion props
      className={cn('price-distribution-chart chart-container', className)}
      role="img"
      aria-label={accessibility.title}
      aria-describedby={descId}
      onKeyDown={handleKeyDown!}
      tabIndex={0}
    >
      {/* Description pour les lecteurs d'écran */}
      <div id={descId} className="sr-only">
        {accessibility.description}
        {histogram.length > 0 && (
          <span>
            {` Graphique de distribution des prix avec ${histogram.length} intervalles. 
            Prix minimum: ${xScale.min.toFixed(0)}€, maximum: ${xScale.max.toFixed(0)}€. 
            Médiane: ${percentiles[50]!?.toFixed(0)}€. 
            Utilisez les flèches pour naviguer, Entrée pour sélectionner, T pour la table de données.`}
          </span>
        )}
      </div>

      {/* Titre et contrôles */}
      <div // Replaced motion.div
        // variants={titleVariants} // Removed motion props
        className="flex justify-between items-center mb-6"
      >
        <h3 className="text-xl font-semibold text-chart-text">{accessibility.title}</h3>

        <div className="flex gap-3">
          {accessibility.dataTable && (
            <button // Replaced motion.button
              // whileHover={{ scale: 1.05 }} // Removed motion props
              // whileTap={{ scale: 0.95 }} // Removed motion props
              onClick={() => setShowDataTable(v => !v)}
              className="px-4 py-2 text-sm font-medium bg-chart-background border border-chart-grid hover:bg-muted rounded-lg transition-colors"
              aria-pressed={showDataTable}
              aria-controls={tableId}
              aria-expanded={showDataTable}
            >
              {showDataTable ? 'Masquer' : 'Afficher'} les données
            </button>
          )}

          {/* <AnimatePresence> // Removed AnimatePresence */}
            {selectedBin !== null && (
              <button // Replaced motion.button
                // initial={{ opacity: 0, scale: 0.8 }} // Removed motion props
                // animate={{ opacity: 1, scale: 1 }} // Removed motion props
                // exit={{ opacity: 0, scale: 0.8 }} // Removed motion props
                // whileHover={{ scale: 1.05 }} // Removed motion props
                // whileTap={{ scale: 0.95 }} // Removed motion props
                onClick={() => {
                  setSelectedBin(null)
                  announceToScreenReader('Sélection effacée')
                }}
                className="px-4 py-2 text-sm font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-lg transition-colors"
              >
                Effacer la sélection
              </button>
            )}
          {/* </AnimatePresence> // Removed AnimatePresence */}
        </div>
      </div>

      {/* Statistiques rapides avec animations */}
      <div // Replaced motion.div
        // variants={titleVariants} // Removed motion props
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
      >
        {quickStats.map((stat, _index) => (
          <div // Replaced motion.div
            key={stat.label}
            // initial={{ opacity: 0, y: 20 }} // Removed motion props
            // animate={{ // Removed motion props
            //   opacity: 1,
            //   y: 0,
            //   transition: {
            //     duration: 0.5,
            //     delay: _index * 0.1,
            //     ease: "easeOut"
            //   }
            // }}
            className="bg-chart-background border border-chart-grid p-4 rounded-lg shadow-enhanced-sm hover:shadow-enhanced-md transition-shadow"
          >
            <div className="font-medium text-chart-text opacity-70 text-sm mb-1">
              {stat.label}
            </div>
            <div
              className="text-lg font-bold"
              style={{ color: stat.color }}
            >
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* SVG du graphique avec animations */}
      <div // Replaced motion.div
        // variants={titleVariants} // Removed motion props
        className="relative"
      >
        <svg
          width={width}
          height={height}
          className="border border-chart-grid bg-chart-background rounded-lg shadow-enhanced-sm"
          role="presentation"
          aria-hidden="true"
          style={{
            filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.1))',
          }}
        >
          {renderAxes()}
          {renderHistogram()}
          {renderDensityCurve()}
          {renderPercentiles()}
        </svg>
      </div>

      {/* Légende */}
      {renderLegend()}

      {/* Tooltip moderne */}
      {/* <AnimatePresence> // Removed AnimatePresence */}
        {hasHoveredBin && hoveredElement && hoveredBin && (
          <div // Replaced motion.div
            // initial={{ opacity: 0, scale: 0.9, y: 10 }} // Removed motion props
            // animate={{ opacity: 1, scale: 1, y: 0 }} // Removed motion props
            // exit={{ opacity: 0, scale: 0.9, y: 10 }} // Removed motion props
            // transition={{ duration: 0.15, ease: "easeOut" }} // Removed motion props
            className="chart-tooltip absolute pointer-events-none z-20"
            style={{
              left: ((hoveredElement.index * chartWidth / histogram.length) + margin.left),
              top: margin.top - 10,
              transform: 'translateX(-50%) translateY(-100%)'
            }}
          >
            <div className="font-semibold text-chart-tooltip-text mb-1">
              {formatChartValue(hoveredBin.range[0]!, 'currency')} - {formatChartValue(hoveredBin.range[1]!, 'currency')}
            </div>
            <div className="text-chart-tooltip-text opacity-90 text-sm">
              {hoveredBin.count} articles ({hoveredBin.percentage.toFixed(1)}%)
            </div>
          </div>
        )}
      {/* </AnimatePresence> // Removed AnimatePresence */}

      {/* Table de données */}
      {renderDataTable()}

      {/* Résumé pour les lecteurs d'écran */}
      <div className="sr-only" aria-live="polite">
        {selectedBinData && (
          <span>
            Intervalle sélectionné: {selectedBinData.range[0]!!.toFixed(0)}€ - {selectedBinData.range[1]!!.toFixed(0)}€
          </span>
        )}
      </div>
    </div>
  )
}

export const PriceDistributionChart = React.memo(PriceDistributionChartComponent)