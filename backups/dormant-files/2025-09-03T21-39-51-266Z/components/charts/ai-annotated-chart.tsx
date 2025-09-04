"use client"

import React, { memo, useCallback, useMemo, useRef, useState } from 'react'
// import { motion, AnimatePresence } from 'framer-motion' // Removed framer-motion import
import { useAccessibility } from '@/lib/contexts/accessibility-context'
import { cn } from '@/lib/utils'
import type { EnhancedChart, AIAnnotation } from '@/lib/services/ai/enhanced-visualization-engine'
import { InteractiveChart } from './interactive-chart'
import type { ChartDataPoint } from './interactive-chart'

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

// Strict types for chartData
type PriceBin = { min: number; max: number; count: number }
type PriceDistributionData = { bins: PriceBin[] }

type TrendPoint = { date: string | number | Date; price: number }
type TrendAnalysisData = { trendPoints: TrendPoint[] }

type Opportunity = { position: { x: number; y: number }; title: string; potentialValue: number }
type OpportunityMapData = { opportunities: Opportunity[] }

function isPriceDistributionData(data: unknown): data is PriceDistributionData {
  if (!data || typeof data !== 'object') return false
  const d = data as Partial<PriceDistributionData>
  return Array.isArray(d.bins) && d.bins.every(
    (b) => typeof b?.min === 'number' && typeof b?.max === 'number' && typeof b?.count === 'number'
  )
}

function isTrendAnalysisData(data: unknown): data is TrendAnalysisData {
  if (!data || typeof data !== 'object') return false
  const d = data as Partial<TrendAnalysisData>
  return Array.isArray(d.trendPoints) && d.trendPoints.every(
    (p) =>
      typeof (p as any)?.price === 'number' &&
      (typeof (p as any)?.date === 'string' || typeof (p as any)?.date === 'number' || (p as any)?.date instanceof Date)
  )
}

function isOpportunityMapData(data: unknown): data is OpportunityMapData {
  if (!data || typeof data !== 'object') return false
  const d = data as Partial<OpportunityMapData>
  return Array.isArray(d.opportunities) && d.opportunities.every(
    (o) =>
      typeof o?.title === 'string' &&
      typeof o?.potentialValue === 'number' &&
      typeof o?.position?.x === 'number' &&
      typeof o?.position?.y === 'number'
  )
}

// Map annotation type to color token
function getAnnotationColor(type: AIAnnotation['type']): string {
  switch (type) {
    case 'insight':
      return 'hsl(var(--primary))'
    case 'recommendation':
      return 'hsl(var(--success))'
    case 'warning':
      return 'hsl(var(--warning))'
    case 'opportunity':
      return 'hsl(var(--accent))'
    case 'trend':
      return 'hsl(var(--destructive))'
    default:
      return 'hsl(var(--muted))'
  }
}

const INSIGHT_PANEL_ID = 'ai-insight-panel'

const AIAnnotatedChartComponent: React.FC<AIAnnotatedChartProps> = ({
  enhancedChart,
  width = 800,
  height = 500,
  showAnnotations = true,
  showInsights = true,
  onAnnotationClick,
  onInsightExpand,
  className
}) => {
  const { announceToScreenReader, preferences: _preferences } = useAccessibility()
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null)
  const [, setHoveredAnnotation] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<AnnotationTooltip | null>(null)
  const [showInsightPanel, setShowInsightPanel] = useState(false)
  const chartRef = useRef<HTMLDivElement>(null)

  // Data mapping with strict typing
  const chartDataPoints: ChartDataPoint[] = useMemo(() => {
    switch (enhancedChart.type) {
      case 'price-distribution': {
        if (isPriceDistributionData(enhancedChart.chartData)) {
          const { bins } = enhancedChart.chartData
          return bins.map((bin: PriceBin, index: number) => ({
            x: (bin.min + bin.max) / 2,
            y: bin.count,
            label: `${bin.min.toFixed(0)}€-${bin.max.toFixed(0)}€: ${bin.count} articles`,
            category: 'price-range',
            metadata: { bin, index }
          }))
        }
        return []
      }
      case 'trend-analysis': {
        if (isTrendAnalysisData(enhancedChart.chartData)) {
          const { trendPoints } = enhancedChart.chartData
          return trendPoints.map((point: TrendPoint, index: number) => ({
            x: new Date(point.date as any).getTime(),
            y: point.price,
            label: `${new Date(point.date as any).toLocaleDateString()}: ${point.price.toFixed(2)}€`,
            category: 'trend-point',
            metadata: { point, index }
          }))
        }
        return []
      }
      case 'opportunity-map': {
        if (isOpportunityMapData(enhancedChart.chartData)) {
          const { opportunities } = enhancedChart.chartData
          return opportunities.map((opp: Opportunity, index: number) => ({
            x: opp.position.x,
            y: opp.position.y,
            label: `${opp.title}: ${opp.potentialValue}€`,
            category: 'opportunity',
            metadata: { opportunity: opp, index }
          }))
        }
        return []
      }
      default:
        return []
    }
  }, [enhancedChart])

  // Toggle insights panel with announcement based on next state
  const toggleInsightPanel = useCallback(() => {
    setShowInsightPanel((prev) => {
      const next = !prev
      announceToScreenReader(`Panneau d'insights ${next ? 'affiché' : 'masqué'}`)
      return next
    })
  }, [announceToScreenReader])

  // Click handler on annotation
  const handleAnnotationClick = useCallback(
    (annotation: AIAnnotation) => {
      setSelectedAnnotation((prev) => (prev === annotation.id ? null : annotation.id))
      onAnnotationClick?.(annotation)
      announceToScreenReader(`Annotation sélectionnée: ${annotation.title}. ${annotation.description}`, 'assertive')
    },
    [onAnnotationClick, announceToScreenReader]
  )

  // Hover handler with tooltip positioning
  const handleAnnotationHover = useCallback(
    (annotation: AIAnnotation | null, event?: React.MouseEvent) => {
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
        announceToScreenReader(`${annotation.title}: ${annotation.description}`, 'polite')
      } else {
        setTooltip(null)
        setHoveredAnnotation(null)
      }
    },
    [announceToScreenReader]
  )

  // Keyboard navigation handler
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const annotations = enhancedChart.aiAnnotations
      if (!annotations || annotations.length === 0) return

      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key

      const currentIndex = selectedAnnotation
        ? annotations.findIndex((ann) => ann.id === selectedAnnotation)
        : -1

      switch (key) {
        case 'ArrowRight':
        case 'ArrowDown': {
          event.preventDefault()
          const nextIndex = (currentIndex + 1) % annotations.length
          setSelectedAnnotation(annotations[nextIndex]!?.id ?? null)
          break
        }
        case 'ArrowLeft':
        case 'ArrowUp': {
          event.preventDefault()
          const prevIndex = currentIndex <= 0 ? annotations.length - 1 : currentIndex - 1
          setSelectedAnnotation(annotations[prevIndex]!?.id ?? null)
          break
        }
        case 'Enter':
        case ' ': {
          event.preventDefault()
          if (selectedAnnotation) {
            const annotation = annotations.find((ann) => ann.id === selectedAnnotation)
            if (annotation) handleAnnotationClick(annotation)
          }
          break
        }
        case 'i': {
          event.preventDefault()
          toggleInsightPanel()
          break
        }
        case 'escape':
        case 'Escape': {
          event.preventDefault()
          setSelectedAnnotation(null)
          setTooltip(null)
          setShowInsightPanel(false)
          break
        }
        default:
          break
      }
    },
    [enhancedChart.aiAnnotations, selectedAnnotation, handleAnnotationClick, toggleInsightPanel]
  )

  // Render AI annotations
  const renderAnnotations = () => {
    if (!showAnnotations) return null

    return enhancedChart.aiAnnotations.map((annotation) => {
      const isSelected = selectedAnnotation === annotation.id

      // Absolute position (annotation positions are expressed in 0–100%)
      const x = (annotation.position.x / 100) * width
      const y = (annotation.position.y / 100) * height

      const color = getAnnotationColor(annotation.type)
      const size =
        annotation.priority === 'critical' ? 12 :
        annotation.priority === 'high' ? 10 :
        annotation.priority === 'medium' ? 8 : 6

      return (
        <div // Replaced motion.div
          key={annotation.id}
          className={cn(
            'absolute cursor-pointer z-10',
            'transform -translate-x-1/2 -translate-y-1/2',
            isSelected && 'z-20'
          )}
          style={{ left: x, top: y }}
          // initial={{ scale: 0, opacity: 0 }} // Removed motion props
          // animate={{ scale: isHovered ? 1.3 : isSelected ? 1.2 : 1, opacity: 1 }} // Removed motion props
          // transition={{ duration: preferences.reducedMotion ? 0 : 0.2, type: 'spring', stiffness: 300 }} // Removed motion props
          onClick={() => handleAnnotationClick(annotation)}
          onMouseEnter={(e: React.MouseEvent) => handleAnnotationHover(annotation, e)} // Explicitly type 'e'
          onMouseLeave={() => handleAnnotationHover(null)}
          role="button"
          tabIndex={0}
          aria-label={`${annotation.title}: ${annotation.description}`}
          aria-selected={isSelected}
          onKeyDown={(e: React.KeyboardEvent) => { // Explicitly type 'e'
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              handleAnnotationClick(annotation)
            }
          }}
        >
          {/* Main annotation dot */}
          <div
            className={cn(
              'rounded-full border-2 shadow-lg',
              'flex items-center justify-center text-xs font-bold',
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

          {/* Confidence indicator */}
          <div
            className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border bg-[hsl(var(--card))]"
            style={{
              backgroundColor:
                annotation.confidence > 0.8
                  ? 'hsl(var(--success))'
                  : annotation.confidence > 0.6
                  ? 'hsl(var(--warning))'
                  : 'hsl(var(--destructive))'
            }}
            title={`Confiance: ${(annotation.confidence * 100).toFixed(0)}%`}
          />

          {/* Connector to datapoint if any */}
          {annotation.relatedData?.dataPointIndex !== undefined && (
            <div
              className="absolute w-px bg-[hsl(var(--muted))] opacity-50"
              style={{ height: '20px', top: '100%', left: '50%', transform: 'translateX(-50%)' }}
            />
          )}
        </div>
      )
    })
  }

  // Tooltip rendering
  const renderTooltip = () => {
    if (!tooltip?.visible) return null

    return (
      <div // Replaced motion.div
        className={cn(
          'absolute z-30 bg-[hsl(var(--card))]/90 text-[hsl(var(--primary-foreground))] border border-[hsl(var(--border))]',
          'p-3 rounded-lg shadow-xl max-w-xs pointer-events-none'
        )}
        style={{ left: tooltip.position.x + 10, top: tooltip.position.y - 10, transform: 'translateY(-100%)' }}
        // initial={{ opacity: 0, scale: 0.8 }} // Removed motion props
        // animate={{ opacity: 1, scale: 1 }} // Removed motion props
        // exit={{ opacity: 0, scale: 0.8 }} // Removed motion props
        // transition={{ duration: preferences.reducedMotion ? 0 : 0.15 }} // Removed motion props
      >
        <div className="font-semibold text-sm mb-1">{tooltip.annotation.title}</div>
        <div className="text-xs text-[hsl(var(--muted-foreground))] mb-2">{tooltip.annotation.description}</div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-[hsl(var(--muted-foreground))]">
            Confiance: ${(tooltip.annotation.confidence * 100).toFixed(0)}%
          </span>
          <span
            className={cn(
              'px-2 py-1 rounded text-xs font-medium',
              tooltip.annotation.priority === 'critical' && 'bg-[hsl(var(--destructive))]',
              (tooltip.annotation.priority === 'high' || tooltip.annotation.priority === 'medium') && 'bg-[hsl(var(--warning))]',
              tooltip.annotation.priority === 'low' && 'bg-[hsl(var(--muted))]'
            )}
          >
            {tooltip.annotation.priority}
          </span>
        </div>
        {tooltip.annotation.actionable && (
          <div className="mt-2 text-xs text-[hsl(var(--primary-foreground))]">Cliquez pour plus d'actions</div>
        )}
      </div>
    )
  }

  // Insights panel rendering
  const renderInsightPanel = () => {
    if (!showInsights || !showInsightPanel) return null

    return (
      <div // Replaced motion.div
        id={INSIGHT_PANEL_ID}
        className={cn(
          'absolute top-4 right-4 bg-[hsl(var(--card))]/90 text-[hsl(var(--primary-foreground))]',
          'border border-[hsl(var(--border))] rounded-lg shadow-lg p-4 max-w-sm z-20'
        )}
        // initial={{ opacity: 0, x: 20 }} // Removed motion props
        // animate={{ opacity: 1, x: 0 }} // Removed motion props
        // exit={{ opacity: 0, x: 20 }} // Removed motion props
        // transition={{ duration: preferences.reducedMotion ? 0 : 0.3 }} // Removed motion props
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-lg">Insights IA</h3>
          <button
            type="button"
            onClick={toggleInsightPanel}
            className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--muted-foreground))]"
            aria-label="Fermer le panneau d'insights"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* Summary */}
          <div>
            <h4 className="font-medium text-sm text-[hsl(var(--muted-foreground))] mb-1">Résumé</h4>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              {enhancedChart.insights.summary}
            </p>
          </div>

          {/* Key findings */}
          {enhancedChart.insights.keyFindings.length > 0 && (
            <div>
              <h4 className="font-medium text-sm text-[hsl(var(--muted-foreground))] mb-2">Principales découvertes</h4>
              <ul className="space-y-1">
                {enhancedChart.insights.keyFindings.map((finding, _index) => (
                  <li key={_index} className="text-xs text-[hsl(var(--muted-foreground))] flex items-start">
                    <span className="text-[hsl(var(--primary-foreground))] mr-2">•</span>
                    <span>{finding}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {enhancedChart.insights.recommendations.length > 0 && (
        <div>
          <h4 className="font-medium text-sm text-[hsl(var(--muted-foreground))] mb-2">Recommandations</h4>
          <ul className="space-y-1">
            {enhancedChart.insights.recommendations.map((rec, _index) => (
              <li key={_index} className="text-xs text-[hsl(var(--muted-foreground))] flex items-start">
                <span className="text-[hsl(var(--success-foreground))] mr-2">→</span>
                <button
                  type="button"
                  onClick={() => onInsightExpand?.(rec)}
                  className="text-left underline hover:text-[hsl(var(--muted-foreground))]"
                >
                  {rec}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

          {/* Metadata */}
          <div className="pt-3 border-t border-[hsl(var(--border))]">
            <div className="flex justify-between text-xs text-[hsl(var(--muted-foreground))]">
              <span>Confiance: ${(enhancedChart.metadata.confidence * 100).toFixed(0)}%</span>
              <span>Qualité: ${(enhancedChart.metadata.dataQuality * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={chartRef}
      className={cn('ai-annotated-chart relative', className)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="img"
      aria-label={`${enhancedChart.title} avec ${enhancedChart.aiAnnotations.length} annotations IA`}
      aria-describedby="chart-description"
      aria-keyshortcuts="ArrowLeft,ArrowRight,ArrowUp,ArrowDown,Enter,Space,I"
    >
      {/* Description for screen readers */}
      <div id="chart-description" className="sr-only">
        {enhancedChart.description}.
        {enhancedChart.aiAnnotations.length > 0 && (
          <span>
            {` ${enhancedChart.aiAnnotations.length} annotations IA disponibles. Utilisez les flèches pour naviguer, Entrée pour sélectionner, I pour afficher/masquer les insights.`}
          </span>
        )}
      </div>

      {/* Title and controls */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold">{enhancedChart.title}</h3>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            {enhancedChart.description}
          </p>
        </div>

        <div className="flex gap-2">
          {showInsights && (
            <button
              type="button"
              onClick={toggleInsightPanel}
              className={cn(
                'px-3 py-1 text-sm rounded border',
                showInsightPanel
                  ? 'bg-[hsl(var(--primary))] border-[hsl(var(--border))] text-[hsl(var(--primary-foreground))]'
                  : 'bg-[hsl(var(--muted))] border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]'
              )}
              aria-pressed={showInsightPanel}
              aria-controls={INSIGHT_PANEL_ID}
              aria-expanded={showInsightPanel}
            >
              💡 Insights ({enhancedChart.aiAnnotations.length})
            </button>
          )}

          <button
            type="button"
            onClick={() => setSelectedAnnotation(null)}
            className="px-3 py-1 text-sm bg-[hsl(var(--muted))] border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] rounded hover:bg-[hsl(var(--muted))]"
            disabled={!selectedAnnotation}
          >
            Effacer sélection
          </button>
        </div>
      </div>

      {/* Main chart with annotations */}
      <div className="relative">
        <InteractiveChart
          data={chartDataPoints}
          type={
            enhancedChart.type === 'price-distribution'
              ? 'bar'
              : enhancedChart.type === 'trend-analysis'
              ? 'line'
              : 'scatter'
          }
          width={width}
          height={height}
          accessibility={{
            title: enhancedChart.title,
            description: enhancedChart.description,
            dataTable: true,
            keyboardNavigation: true
          }}
          interactions={{ zoom: true, pan: true, tooltip: true, hover: true }}
          responsive={true}
        />

        {/* AI annotations */}
        {renderAnnotations()}

        {/* Tooltip */}
        {renderTooltip()}

        {/* Insight panel */}
        {renderInsightPanel()}
      </div>

      {/* Annotations legend */}
      {showAnnotations && enhancedChart.aiAnnotations.length > 0 && (
        <div className="mt-4 p-3 bg-[hsl(var(--muted))] rounded-lg">
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

      {/* Live region for selection updates */}
      <div className="sr-only" aria-live="polite">
        {selectedAnnotation && (
          <span>
            Annotation sélectionnée:{' '}
            {enhancedChart.aiAnnotations.find((ann) => ann.id === selectedAnnotation)?.title}
          </span>
        )}
      </div>
    </div>
  )
}

export const AIAnnotatedChart = memo(AIAnnotatedChartComponent)
export default AIAnnotatedChart