"use client"

import React, { useMemo, useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from 'next-themes'
import { useAccessibility } from '@/lib/contexts/accessibility-context'
import { useKeyboardNavigation } from '@/lib/hooks/use-keyboard-navigation'
import { cn } from '@/lib/utils'
import { getChartColors, formatChartValue } from '@/lib/utils/chart-utils'
import { AdvancedMetrics } from '@/lib/analytics/advanced-analytics-engine'

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
  onBinClick?: (bin: { range: [number, number]; count: number; percentage: number }) => void
  className?: string
}

export const PriceDistributionChart: React.FC<PriceDistributionChartProps> = ({
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
  const { announceToScreenReader, preferences } = useAccessibility()
  const { theme } = useTheme()
  const [selectedBin, setSelectedBin] = useState<number | null>(null)
  const [showDataTable, setShowDataTable] = useState(false)
  const [hoveredElement, setHoveredElement] = useState<{ type: 'bin' | 'percentile'; index: number } | null>(null)
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
  const margin = { top: 20, right: 60, bottom: 60, left: 60 }
  const chartWidth = width - margin.left - margin.right
  const chartHeight = height - margin.top - margin.bottom

  // Données préparées
  const { histogram, density, percentiles } = metrics.priceDistribution
  
  // Échelles
  const xScale = useMemo(() => {
    if (histogram.length === 0) return { min: 0, max: 100, range: 100 }
    const min = histogram[0].range[0]
    const max = histogram[histogram.length - 1].range[1]
    return { min, max, range: max - min }
  }, [histogram])

  const yScale = useMemo(() => {
    const maxCount = Math.max(...histogram.map(bin => bin.count))
    const maxDensity = density.length > 0 ? Math.max(...density.map(d => d.density)) : 0
    const max = Math.max(maxCount, maxDensity * 100) // Normaliser la densité
    return { min: 0, max, range: max }
  }, [histogram, density])

  // Fonctions de conversion
  const getXPosition = useCallback((value: number) => {
    return ((value - xScale.min) / xScale.range) * chartWidth
  }, [xScale, chartWidth])

  const getYPosition = useCallback((value: number) => {
    return chartHeight - (value / yScale.max) * chartHeight
  }, [yScale, chartHeight])

  // Gestionnaires d'événements
  const handleBinClick = useCallback((bin: typeof histogram[0], index: number) => {
    setSelectedBin(selectedBin === index ? null : index)
    onBinClick?.(bin)
    announceToScreenReader(
      `Intervalle sélectionné: ${bin.range[0]}€ - ${bin.range[1]}€, ${bin.count} articles (${bin.percentage.toFixed(1)}%)`
    )
  }, [selectedBin, onBinClick, announceToScreenReader])

  const handleBinHover = useCallback((bin: typeof histogram[0] | null, index: number) => {
    setHoveredElement(bin ? { type: 'bin', index } : null)
    if (bin) {
      announceToScreenReader(
        `Intervalle: ${bin.range[0]}€ - ${bin.range[1]}€, ${bin.count} articles (${bin.percentage.toFixed(1)}%)`,
        'polite'
      )
    }
  }, [announceToScreenReader])

  // Gestion du clavier
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'Enter':
      case ' ':
        if (hoveredElement?.type === 'bin') {
          event.preventDefault()
          handleBinClick(histogram[hoveredElement.index], hoveredElement.index)
        }
        break
      case 't':
        event.preventDefault()
        setShowDataTable(!showDataTable)
        announceToScreenReader(`Table de données ${showDataTable ? 'masquée' : 'affichée'}`)
        break
      case 'Escape':
        event.preventDefault()
        setSelectedBin(null)
        setHoveredElement(null)
        announceToScreenReader('Sélection effacée')
        break
    }
  }, [hoveredElement, histogram, handleBinClick, showDataTable, announceToScreenReader])

  // Rendu de l'histogramme avec animations modernes
  const renderHistogram = () => {
    if (!showHistogram) return null

    const binWidth = chartWidth / histogram.length * 0.9
    const binSpacing = chartWidth / histogram.length * 0.1

    return histogram.map((bin, index) => {
      const x = (index * chartWidth / histogram.length) + binSpacing / 2
      const barHeight = (bin.count / yScale.max) * chartHeight
      const y = chartHeight - barHeight
      const isSelected = selectedBin === index
      const isHovered = hoveredElement?.type === 'bin' && hoveredElement.index === index

      return (
        <motion.rect
          key={index}
          x={x + margin.left}
          y={y + margin.top}
          width={binWidth}
          height={barHeight}
          fill={isSelected ? chartColors.primary[0] : chartColors.primary[1]}
          stroke={isHovered ? chartColors.primary[0] : 'none'}
          strokeWidth={isHovered ? 2 : 0}
          opacity={isHovered ? 0.9 : 0.8}
          rx={4}
          ry={4}
          initial={{ height: 0, y: chartHeight + margin.top }}
          animate={{ 
            height: barHeight, 
            y: y + margin.top,
            transition: {
              duration: preferences.reducedMotion ? 0 : 0.8,
              delay: preferences.reducedMotion ? 0 : index * 0.05,
              ease: "easeOut"
            }
          }}
          whileHover={!preferences.reducedMotion ? { 
            scale: 1.05,
            transition: { duration: 0.2 }
          } : {}}
          style={{
            cursor: 'pointer',
            filter: isHovered ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))' : 'none',
          }}
          onClick={() => handleBinClick(bin, index)}
          onMouseEnter={() => handleBinHover(bin, index)}
          onMouseLeave={() => handleBinHover(null, index)}
          role="button"
          tabIndex={0}
          aria-label={`Intervalle ${formatChartValue(bin.range[0], 'currency')} - ${formatChartValue(bin.range[1], 'currency')}: ${bin.count} articles (${bin.percentage.toFixed(1)}%)`}
          aria-selected={isSelected}
        />
      )
    })
  }

  // Rendu de la courbe de densité avec animation
  const renderDensityCurve = () => {
    if (!showDensityCurve || density.length === 0) return null

    const points = density.map(d => {
      const x = getXPosition(d.price)
      const y = getYPosition(d.density * 100) // Normaliser pour l'affichage
      return `${x + margin.left},${y + margin.top}`
    }).join(' ')

    const pathLength = points.split(' ').length * 10 // Approximation

    return (
      <motion.polyline
        points={points}
        fill="none"
        stroke={chartColors.primary[2]}
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity={0.9}
        initial={{ 
          pathLength: 0,
          opacity: 0
        }}
        animate={{ 
          pathLength: pathLength,
          opacity: 0.9,
          transition: {
            duration: preferences.reducedMotion ? 0 : 1.5,
            delay: preferences.reducedMotion ? 0 : 0.5,
            ease: "easeOut"
          }
        }}
        style={{
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
        }}
      />
    )
  }

  // Rendu des percentiles avec animations
  const renderPercentiles = () => {
    if (!showPercentiles) return null

    const importantPercentiles = [25, 50, 75, 90, 95]
    
    return importantPercentiles.map((p, index) => {
      if (!(p in percentiles)) return null
      
      const value = percentiles[p]
      const x = getXPosition(value)
      const isMedian = p === 50
      
      return (
        <motion.g 
          key={p}
          initial={{ opacity: 0, y: 10 }}
          animate={{ 
            opacity: 0.8, 
            y: 0,
            transition: {
              duration: preferences.reducedMotion ? 0 : 0.6,
              delay: preferences.reducedMotion ? 0 : 1 + index * 0.1,
              ease: "easeOut"
            }
          }}
        >
          <motion.line
            x1={x + margin.left}
            y1={margin.top}
            x2={x + margin.left}
            y2={height - margin.bottom}
            stroke={isMedian ? chartColors.primary[2] : chartColors.grid}
            strokeWidth={isMedian ? 3 : 2}
            strokeDasharray={isMedian ? 'none' : '6,4'}
            opacity={isMedian ? 0.9 : 0.6}
            initial={{ scaleY: 0 }}
            animate={{ 
              scaleY: 1,
              transition: {
                duration: preferences.reducedMotion ? 0 : 0.5,
                delay: preferences.reducedMotion ? 0 : 1 + index * 0.1,
                ease: "easeOut"
              }
            }}
            style={{ transformOrigin: 'bottom' }}
          />
          <motion.text
            x={x + margin.left}
            y={margin.top - 8}
            textAnchor="middle"
            fontSize="11"
            fill={chartColors.text}
            className="font-semibold"
            initial={{ opacity: 0, y: 5 }}
            animate={{ 
              opacity: 1, 
              y: 0,
              transition: {
                duration: preferences.reducedMotion ? 0 : 0.4,
                delay: preferences.reducedMotion ? 0 : 1.2 + index * 0.1,
                ease: "easeOut"
              }
            }}
          >
            P{p}: {formatChartValue(value, 'currency')}
          </motion.text>
        </motion.g>
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

        {/* Graduations Y */}
        {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
          const value = ratio * yScale.max
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
                {value.toFixed(0)}
              </text>
            </g>
          )
        })}
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
            Distribution des prix - Données détaillées
          </caption>
          <thead>
            <tr>
              <th className="border border-gray-300 px-2 py-1 bg-gray-100">Intervalle de prix</th>
              <th className="border border-gray-300 px-2 py-1 bg-gray-100">Nombre d'articles</th>
              <th className="border border-gray-300 px-2 py-1 bg-gray-100">Pourcentage</th>
            </tr>
          </thead>
          <tbody>
            {histogram.map((bin, index) => (
              <tr
                key={index}
                className={selectedBin === index ? 'bg-blue-100' : ''}
              >
                <td className="border border-gray-300 px-2 py-1">
                  {bin.range[0].toFixed(0)}€ - {bin.range[1].toFixed(0)}€
                </td>
                <td className="border border-gray-300 px-2 py-1 text-right">
                  {bin.count}
                </td>
                <td className="border border-gray-300 px-2 py-1 text-right">
                  {bin.percentage.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Statistiques des percentiles */}
        <div className="mt-4">
          <h4 className="font-medium mb-2">Percentiles</h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
            {Object.entries(percentiles).map(([p, value]) => (
              <div key={p} className="bg-gray-50 p-2 rounded">
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
            <div className="w-4 h-4 bg-blue-300 rounded"></div>
            <span>Distribution (histogramme)</span>
          </div>
        )}
        {showDensityCurve && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 bg-red-500 rounded"></div>
            <span>Courbe de densité</span>
          </div>
        )}
        {showPercentiles && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 border-t-2 border-gray-500 border-dashed"></div>
            <span>Percentiles</span>
          </div>
        )}
      </div>
    )
  }

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut",
        staggerChildren: 0.1
      }
    }
  }

  const titleVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { duration: 0.5, ease: "easeOut" }
    }
  }

  return (
    <motion.div
      ref={containerRef as unknown as React.Ref<HTMLDivElement>}
      variants={containerVariants}
      initial="hidden"
      animate={isVisible ? "visible" : "hidden"}
      className={cn('price-distribution-chart chart-container', className)}
      role="img"
      aria-label={accessibility.title}
      aria-describedby="chart-description"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Description pour les lecteurs d'écran */}
      <div id="chart-description" className="sr-only">
        {accessibility.description}
        {histogram.length > 0 && (
          <span>
            {` Graphique de distribution des prix avec ${histogram.length} intervalles. 
            Prix minimum: ${xScale.min.toFixed(0)}€, maximum: ${xScale.max.toFixed(0)}€. 
            Médiane: ${percentiles[50]?.toFixed(0)}€. 
            Utilisez les flèches pour naviguer, Entrée pour sélectionner, T pour la table de données.`}
          </span>
        )}
      </div>

      {/* Titre et contrôles */}
      <motion.div 
        variants={titleVariants}
        className="flex justify-between items-center mb-6"
      >
        <h3 className="text-xl font-semibold text-chart-text">{accessibility.title}</h3>
        
        <div className="flex gap-3">
          {accessibility.dataTable && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowDataTable(!showDataTable)}
              className="px-4 py-2 text-sm font-medium bg-chart-background border border-chart-grid hover:bg-muted rounded-lg transition-colors"
              aria-pressed={showDataTable}
            >
              {showDataTable ? 'Masquer' : 'Afficher'} les données
            </motion.button>
          )}
          
          <AnimatePresence>
            {selectedBin !== null && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setSelectedBin(null)
                  announceToScreenReader('Sélection effacée')
                }}
                className="px-4 py-2 text-sm font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-lg transition-colors"
              >
                Effacer la sélection
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Statistiques rapides avec animations */}
      <motion.div 
        variants={titleVariants}
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
      >
        {[
          {
            label: 'Médiane',
            value: formatChartValue(percentiles[50] || 0, 'currency'),
            color: chartColors.primary[0]
          },
          {
            label: 'Q1 - Q3',
            value: `${formatChartValue(percentiles[25] || 0, 'currency')} - ${formatChartValue(percentiles[75] || 0, 'currency')}`,
            color: chartColors.primary[1]
          },
          {
            label: 'Écart-type',
            value: formatChartValue(metrics.descriptiveStats.standardDeviation, 'currency'),
            color: chartColors.primary[2]
          },
          {
            label: 'Total articles',
            value: histogram.reduce((sum, bin) => sum + bin.count, 0).toLocaleString('fr-FR'),
            color: chartColors.primary[3]
          }
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ 
              opacity: 1, 
              y: 0,
              transition: {
                duration: 0.5,
                delay: index * 0.1,
                ease: "easeOut"
              }
            }}
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
          </motion.div>
        ))}
      </motion.div>

      {/* SVG du graphique avec animations */}
      <motion.div
        variants={titleVariants}
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
      </motion.div>

      {/* Légende */}
      {renderLegend()}

      {/* Tooltip moderne */}
      <AnimatePresence>
        {hoveredElement?.type === 'bin' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="chart-tooltip absolute pointer-events-none z-20"
            style={{
              left: ((hoveredElement.index * chartWidth / histogram.length) + margin.left),
              top: margin.top - 10,
              transform: 'translateX(-50%) translateY(-100%)'
            }}
          >
            <div className="font-semibold text-chart-tooltip-text mb-1">
              {formatChartValue(histogram[hoveredElement.index].range[0], 'currency')} - {formatChartValue(histogram[hoveredElement.index].range[1], 'currency')}
            </div>
            <div className="text-chart-tooltip-text opacity-90 text-sm">
              {histogram[hoveredElement.index].count} articles ({histogram[hoveredElement.index].percentage.toFixed(1)}%)
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table de données */}
      {renderDataTable()}

      {/* Résumé pour les lecteurs d'écran */}
      <div className="sr-only" aria-live="polite">
        {selectedBin !== null && (
          <span>
            Intervalle sélectionné: {histogram[selectedBin].range[0].toFixed(0)}€ - {histogram[selectedBin].range[1].toFixed(0)}€
          </span>
        )}
      </div>
    </motion.div>
  )
}