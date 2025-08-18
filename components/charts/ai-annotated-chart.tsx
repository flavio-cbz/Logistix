"use client"

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from 'next-themes'
import { useAccessibility } from '@/lib/contexts/accessibility-context'
import { useKeyboardNavigation } from '@/lib/hooks/use-keyboard-navigation'
import { cn } from '@/lib/utils'
import { EnhancedChart, AIAnnotation, InteractiveElement } from '@/lib/services/ai/enhanced-visualization-engine'
import { InteractiveChart, ChartDataPoint } from './interactive-chart'

export interface AIAnnotatedChartProps {
  enhancedChart: EnhancedChart
  width?: number
  height?: number
  showAnnotations?: boolean
  showInsights?: boolean
  onAnnotationClick?: (annotation: AIAnnotation) => void
  onInsightExpand?: (insight: string) => void
  className?: string
}

interface AnnotationTooltip {
  annotation: AIAnnotation
  position: { x: number; y: number }
  visible: boolean
}

export const AIAnnotatedChart: React.FC<AIAnnotatedChartProps> = ({
  enhancedChart,
  width = 800,
  height = 500,
  showAnnotations = true,
  showInsights = true,
  onAnnotationClick,
  onInsightExpand,
  className
}) => {
  const { announceToScreenReader, preferences } = useAccessibility()
  const { theme } = useTheme()
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null)
  const [hoveredAnnotation, setHoveredAnnotation] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<AnnotationTooltip | null>(null)
  const [showInsightPanel, setShowInsightPanel] = useState(false)
  const chartRef = useRef<HTMLDivElement>(null)

  const { containerRef } = useKeyboardNavigation({
    enableArrowNavigation: true,
    orientation: 'both'
  })

  // Convertir les données du graphique enrichi pour InteractiveChart
  const chartDataPoints: ChartDataPoint[] = React.useMemo(() => {
    if (enhancedChart.type === 'price-distribution') {
      const { bins } = enhancedChart.chartData
      return bins?.map((bin: any, index: number) => ({
        x: (bin.min + bin.max) / 2,
        y: bin.count,
        label: `${bin.min.toFixed(0)}€-${bin.max.toFixed(0)}€: ${bin.count} articles`,
        category: 'price-range',
        metadata: { bin, index }
      })) || []
    }
    
    if (enhancedChart.type === 'trend-analysis') {
      const { trendPoints } = enhancedChart.chartData
      return trendPoints?.map((point: any, index: number) => ({
        x: new Date(point.date).getTime(),
        y: point.price,
        label: `${new Date(point.date).toLocaleDateString()}: ${point.price.toFixed(2)}€`,
        category: 'trend-point',
        metadata: { point, index }
      })) || []
    }

    if (enhancedChart.type === 'opportunity-map') {
      const { opportunities } = enhancedChart.chartData
      return opportunities?.map((opp: any, index: number) => ({
        x: opp.position.x,
        y: opp.position.y,
        label: `${opp.title}: ${opp.potentialValue}€`,
        category: 'opportunity',
        metadata: { opportunity: opp, index }
      })) || []
    }

    return []
  }, [enhancedChart])

  // Gestionnaire de clic sur annotation
  const handleAnnotationClick = useCallback((annotation: AIAnnotation) => {
    setSelectedAnnotation(selectedAnnotation === annotation.id ? null : annotation.id)
    onAnnotationClick?.(annotation)
    
    announceToScreenReader(
      `Annotation sélectionnée: ${annotation.title}. ${annotation.description}`,
      'assertive'
    )
  }, [selectedAnnotation, onAnnotationClick, announceToScreenReader])

  // Gestionnaire de survol d'annotation
  const handleAnnotationHover = useCallback((annotation: AIAnnotation | null, event?: React.MouseEvent) => {
    if (annotation && event) {
      const rect = chartRef.current?.getBoundingClientRect()
      if (rect) {
        setTooltip({
          annotation,
          position: {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
          },
          visible: true
        })
      }
      setHoveredAnnotation(annotation.id)
      
      announceToScreenReader(
        `${annotation.title}: ${annotation.description}`,
        'polite'
      )
    } else {
      setTooltip(null)
      setHoveredAnnotation(null)
    }
  }, [announceToScreenReader])

  // Gestionnaire de navigation clavier
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    const annotations = enhancedChart.aiAnnotations
    const currentIndex = selectedAnnotation 
      ? annotations.findIndex(ann => ann.id === selectedAnnotation)
      : -1

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault()
        const nextIndex = (currentIndex + 1) % annotations.length
        setSelectedAnnotation(annotations[nextIndex]?.id || null)
        break
        
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault()
        const prevIndex = currentIndex <= 0 ? annotations.length - 1 : currentIndex - 1
        setSelectedAnnotation(annotations[prevIndex]?.id || null)
        break
        
      case 'Enter':
      case ' ':
        event.preventDefault()
        if (selectedAnnotation) {
          const annotation = annotations.find(ann => ann.id === selectedAnnotation)
          if (annotation) {
            handleAnnotationClick(annotation)
          }
        }
        break
        
      case 'i':
        event.preventDefault()
        setShowInsightPanel(!showInsightPanel)
        announceToScreenReader(`Panneau d'insights ${showInsightPanel ? 'masqué' : 'affiché'}`)
        break
        
      case 'Escape':
        event.preventDefault()
        setSelectedAnnotation(null)
        setTooltip(null)
        setShowInsightPanel(false)
        break
    }
  }, [enhancedChart.aiAnnotations, selectedAnnotation, showInsightPanel, handleAnnotationClick, announceToScreenReader])

  // Rendu des annotations IA
  const renderAnnotations = () => {
    if (!showAnnotations) return null

    return enhancedChart.aiAnnotations.map((annotation) => {
      const isSelected = selectedAnnotation === annotation.id
      const isHovered = hoveredAnnotation === annotation.id
      
      // Calculer la position absolue dans le graphique
      const x = (annotation.position.x / 100) * width
      const y = (annotation.position.y / 100) * height

      // Couleurs selon le type d'annotation
      const getAnnotationColor = (type: AIAnnotation['type']) => {
        switch (type) {
          case 'insight': return '#3b82f6'
          case 'recommendation': return '#10b981'
          case 'warning': return '#f59e0b'
          case 'opportunity': return '#8b5cf6'
          case 'trend': return '#ef4444'
          default: return '#6b7280'
        }
      }

      const color = getAnnotationColor(annotation.type)
      const size = annotation.priority === 'critical' ? 12 : 
                   annotation.priority === 'high' ? 10 : 
                   annotation.priority === 'medium' ? 8 : 6

      return (
        <motion.div
          key={annotation.id}
          className={cn(
            'absolute cursor-pointer z-10',
            'transform -translate-x-1/2 -translate-y-1/2',
            isSelected && 'z-20'
          )}
          style={{
            left: x,
            top: y,
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ 
            scale: isHovered ? 1.3 : isSelected ? 1.2 : 1, 
            opacity: 1 
          }}
          transition={{ 
            duration: preferences.reducedMotion ? 0 : 0.2,
            type: 'spring',
            stiffness: 300
          }}
          onClick={() => handleAnnotationClick(annotation)}
          onMouseEnter={(e) => handleAnnotationHover(annotation, e)}
          onMouseLeave={() => handleAnnotationHover(null)}
          role="button"
          tabIndex={0}
          aria-label={`${annotation.title}: ${annotation.description}`}
          aria-selected={isSelected}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              handleAnnotationClick(annotation)
            }
          }}
        >
          {/* Point d'annotation principal */}
          <div
            className={cn(
              'rounded-full border-2 border-white shadow-lg',
              'flex items-center justify-center text-white text-xs font-bold',
              isSelected && 'ring-2 ring-offset-2 ring-blue-500'
            )}
            style={{
              backgroundColor: color,
              width: size * 2,
              height: size * 2,
              opacity: annotation.confidence
            }}
          >
            {annotation.type === 'insight' && '💡'}
            {annotation.type === 'recommendation' && '✅'}
            {annotation.type === 'warning' && '⚠️'}
            {annotation.type === 'opportunity' && '🎯'}
            {annotation.type === 'trend' && '📈'}
          </div>

          {/* Indicateur de confiance */}
          <div
            className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border border-white"
            style={{
              backgroundColor: annotation.confidence > 0.8 ? '#10b981' : 
                             annotation.confidence > 0.6 ? '#f59e0b' : '#ef4444'
            }}
            title={`Confiance: ${(annotation.confidence * 100).toFixed(0)}%`}
          />

          {/* Ligne de connexion si l'annotation est liée à un point de données */}
          {annotation.relatedData?.dataPointIndex !== undefined && (
            <div
              className="absolute w-px bg-gray-400 opacity-50"
              style={{
                height: '20px',
                top: '100%',
                left: '50%',
                transform: 'translateX(-50%)'
              }}
            />
          )}
        </motion.div>
      )
    })
  }

  // Rendu du tooltip
  const renderTooltip = () => {
    if (!tooltip?.visible) return null

    return (
      <motion.div
        className={cn(
          'absolute z-30 bg-black text-white p-3 rounded-lg shadow-xl',
          'max-w-xs pointer-events-none'
        )}
        style={{
          left: tooltip.position.x + 10,
          top: tooltip.position.y - 10,
          transform: 'translateY(-100%)'
        }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: preferences.reducedMotion ? 0 : 0.15 }}
      >
        <div className="font-semibold text-sm mb-1">
          {tooltip.annotation.title}
        </div>
        <div className="text-xs text-gray-300 mb-2">
          {tooltip.annotation.description}
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">
            Confiance: {(tooltip.annotation.confidence * 100).toFixed(0)}%
          </span>
          <span className={cn(
            'px-2 py-1 rounded text-xs font-medium',
            tooltip.annotation.priority === 'critical' && 'bg-red-600',
            tooltip.annotation.priority === 'high' && 'bg-orange-600',
            tooltip.annotation.priority === 'medium' && 'bg-yellow-600',
            tooltip.annotation.priority === 'low' && 'bg-gray-600'
          )}>
            {tooltip.annotation.priority}
          </span>
        </div>
        {tooltip.annotation.actionable && (
          <div className="mt-2 text-xs text-blue-300">
            Cliquez pour plus d'actions
          </div>
        )}
      </motion.div>
    )
  }

  // Rendu du panneau d'insights
  const renderInsightPanel = () => {
    if (!showInsights || !showInsightPanel) return null

    return (
      <motion.div
        className={cn(
          'absolute top-4 right-4 bg-white dark:bg-gray-800',
          'border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg',
          'p-4 max-w-sm z-20'
        )}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: preferences.reducedMotion ? 0 : 0.3 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-lg">Insights IA</h3>
          <button
            onClick={() => setShowInsightPanel(false)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="Fermer le panneau d'insights"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* Résumé */}
          <div>
            <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-1">
              Résumé
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {enhancedChart.insights.summary}
            </p>
          </div>

          {/* Principales découvertes */}
          {enhancedChart.insights.keyFindings.length > 0 && (
            <div>
              <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">
                Principales découvertes
              </h4>
              <ul className="space-y-1">
                {enhancedChart.insights.keyFindings.map((finding, index) => (
                  <li key={index} className="text-xs text-gray-600 dark:text-gray-400 flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    <span>{finding}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommandations */}
          {enhancedChart.insights.recommendations.length > 0 && (
            <div>
              <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">
                Recommandations
              </h4>
              <ul className="space-y-1">
                {enhancedChart.insights.recommendations.map((rec, index) => (
                  <li key={index} className="text-xs text-gray-600 dark:text-gray-400 flex items-start">
                    <span className="text-green-500 mr-2">→</span>
                    <button
                      onClick={() => onInsightExpand?.(rec)}
                      className="text-left hover:text-gray-800 dark:hover:text-gray-200 underline"
                    >
                      {rec}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Métadonnées */}
          <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>Confiance: {(enhancedChart.metadata.confidence * 100).toFixed(0)}%</span>
              <span>Qualité: {(enhancedChart.metadata.dataQuality * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <div
      ref={(node) => {
        chartRef.current = node
        containerRef.current = node
      }}
      className={cn('ai-annotated-chart relative', className)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="img"
      aria-label={`${enhancedChart.title} avec ${enhancedChart.aiAnnotations.length} annotations IA`}
      aria-describedby="chart-description"
    >
      {/* Description pour les lecteurs d'écran */}
      <div id="chart-description" className="sr-only">
        {enhancedChart.description}. 
        {enhancedChart.aiAnnotations.length > 0 && (
          <span>
            {` ${enhancedChart.aiAnnotations.length} annotations IA disponibles. 
            Utilisez les flèches pour naviguer, Entrée pour sélectionner, 
            I pour afficher/masquer les insights.`}
          </span>
        )}
      </div>

      {/* Titre et contrôles */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold">{enhancedChart.title}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {enhancedChart.description}
          </p>
        </div>
        
        <div className="flex gap-2">
          {showInsights && (
            <button
              onClick={() => setShowInsightPanel(!showInsightPanel)}
              className={cn(
                'px-3 py-1 text-sm rounded border',
                showInsightPanel 
                  ? 'bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-300'
                  : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
              )}
              aria-pressed={showInsightPanel}
            >
              💡 Insights ({enhancedChart.aiAnnotations.length})
            </button>
          )}
          
          <button
            onClick={() => setSelectedAnnotation(null)}
            className="px-3 py-1 text-sm bg-gray-100 border border-gray-300 text-gray-700 rounded hover:bg-gray-200 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            disabled={!selectedAnnotation}
          >
            Effacer sélection
          </button>
        </div>
      </div>

      {/* Graphique principal avec annotations */}
      <div className="relative">
        <InteractiveChart
          data={chartDataPoints}
          type={enhancedChart.type === 'price-distribution' ? 'bar' : 
                enhancedChart.type === 'trend-analysis' ? 'line' : 'scatter'}
          width={width}
          height={height}
          accessibility={{
            title: enhancedChart.title,
            description: enhancedChart.description,
            dataTable: true,
            keyboardNavigation: true
          }}
          interactions={{
            zoom: true,
            pan: true,
            tooltip: true,
            hover: true
          }}
          responsive={true}
        />

        {/* Annotations IA */}
        <AnimatePresence>
          {renderAnnotations()}
        </AnimatePresence>

        {/* Tooltip */}
        <AnimatePresence>
          {renderTooltip()}
        </AnimatePresence>

        {/* Panneau d'insights */}
        <AnimatePresence>
          {renderInsightPanel()}
        </AnimatePresence>
      </div>

      {/* Légende des annotations */}
      {showAnnotations && enhancedChart.aiAnnotations.length > 0 && (
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="font-medium text-sm mb-2">Légende des annotations IA</h4>
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-1">
              <span>💡</span>
              <span>Insight</span>
            </div>
            <div className="flex items-center gap-1">
              <span>✅</span>
              <span>Recommandation</span>
            </div>
            <div className="flex items-center gap-1">
              <span>⚠️</span>
              <span>Attention</span>
            </div>
            <div className="flex items-center gap-1">
              <span>🎯</span>
              <span>Opportunité</span>
            </div>
            <div className="flex items-center gap-1">
              <span>📈</span>
              <span>Tendance</span>
            </div>
          </div>
        </div>
      )}

      {/* Résumé pour les lecteurs d'écran */}
      <div className="sr-only" aria-live="polite">
        {selectedAnnotation && (
          <span>
            Annotation sélectionnée: {
              enhancedChart.aiAnnotations.find(ann => ann.id === selectedAnnotation)?.title
            }
          </span>
        )}
      </div>
    </div>
  )
}

export default AIAnnotatedChart