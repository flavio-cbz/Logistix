"use client"

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from 'next-themes'
import { useAccessibility } from '@/lib/contexts/accessibility-context'
import { useKeyboardNavigation } from '@/lib/hooks/use-keyboard-navigation'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { InteractiveChart, ChartDataPoint, ChartType } from './interactive-chart'
import { ModernChart } from './modern-chart'
import { EnhancedChart, AIAnnotation, InteractiveElement } from '@/lib/services/ai/enhanced-visualization-engine'
import { 
  Download, 
  Share2, 
  Maximize2, 
  Eye, 
  EyeOff, 
  Info, 
  Lightbulb,
  Target,
  AlertTriangle,
  TrendingUp,
  Zap,
  X,
  ChevronDown,
  ChevronUp,
  Play,
  Pause
} from 'lucide-react'

export interface AIEnhancedChartProps {
  enhancedChart: EnhancedChart
  width?: number
  height?: number
  showAnnotations?: boolean
  showInsights?: boolean
  showControls?: boolean
  interactive?: boolean
  exportable?: boolean
  onAnnotationClick?: (annotation: AIAnnotation) => void
  onAnnotationHover?: (annotation: AIAnnotation | null) => void
  onInsightExpand?: (insight: string) => void
  onExport?: (format: 'png' | 'svg' | 'pdf' | 'json') => void
  onShare?: () => void
  className?: string
}

interface AnnotationTooltip {
  annotation: AIAnnotation
  position: { x: number; y: number }
  visible: boolean
}

const annotationTypeConfig = {
  insight: { 
    icon: Lightbulb, 
    color: 'blue', 
    label: 'Insight',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-300'
  },
  recommendation: { 
    icon: Target, 
    color: 'green', 
    label: 'Recommandation',
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
    borderColor: 'border-green-300'
  },
  warning: { 
    icon: AlertTriangle, 
    color: 'yellow', 
    label: 'Attention',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-700',
    borderColor: 'border-yellow-300'
  },
  opportunity: { 
    icon: Zap, 
    color: 'purple', 
    label: 'Opportunité',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-300'
  },
  trend: { 
    icon: TrendingUp, 
    color: 'indigo', 
    label: 'Tendance',
    bgColor: 'bg-indigo-100',
    textColor: 'text-indigo-700',
    borderColor: 'border-indigo-300'
  }
}

export const AIEnhancedChart: React.FC<AIEnhancedChartProps> = ({
  enhancedChart,
  width = 800,
  height = 500,
  showAnnotations = true,
  showInsights = true,
  showControls = true,
  interactive = true,
  exportable = true,
  onAnnotationClick,
  onAnnotationHover,
  onInsightExpand,
  onExport,
  onShare,
  className
}) => {
  const { announceToScreenReader, preferences } = useAccessibility()
  const { theme } = useTheme()
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null)
  const [hoveredAnnotation, setHoveredAnnotation] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<AnnotationTooltip | null>(null)
  const [showInsightPanel, setShowInsightPanel] = useState(false)
  const [annotationsVisible, setAnnotationsVisible] = useState(showAnnotations)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [animationsPaused, setAnimationsPaused] = useState(false)
  const chartRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const { containerRef: keyboardRef } = useKeyboardNavigation({
    enableArrowNavigation: true,
    orientation: 'both'
  })

  // Combiner les refs
  const combinedRef = useCallback((node: HTMLDivElement) => {
    containerRef.current = node
    keyboardRef.current = node
  }, [keyboardRef])

  // Convertir les données du graphique enrichi pour les composants de graphique
  const chartData = useMemo(() => {
    const { chartData: rawData } = enhancedChart
    
    switch (enhancedChart.type) {
      case 'price-distribution':
        return rawData.bins?.map((bin: any, index: number) => ({
          x: `${bin.min.toFixed(0)}€-${bin.max.toFixed(0)}€`,
          y: bin.count,
          label: `${bin.count} articles`,
          category: 'price-range',
          metadata: { bin, index }
        })) || []
        
      case 'trend-analysis':
        return rawData.trendPoints?.map((point: any) => ({
          x: point.date,
          y: point.price,
          label: `${new Date(point.date).toLocaleDateString()}: ${point.price.toFixed(2)}€`,
          category: 'trend-point',
          metadata: { point }
        })) || []
        
      case 'opportunity-map':
        return rawData.opportunities?.map((opp: any) => ({
          x: opp.position.x,
          y: opp.position.y,
          label: `${opp.title}: ${opp.potentialValue}€`,
          category: 'opportunity',
          metadata: { opportunity: opp }
        })) || []
        
      default:
        return []
    }
  }, [enhancedChart])

  // Déterminer le type de graphique
  const chartType: ChartType = useMemo(() => {
    switch (enhancedChart.type) {
      case 'price-distribution':
        return 'bar'
      case 'trend-analysis':
        return 'line'
      case 'opportunity-map':
        return 'scatter'
      default:
        return 'scatter'
    }
  }, [enhancedChart.type])

  // Gestionnaire de clic sur annotation
  const handleAnnotationClick = useCallback((annotation: AIAnnotation) => {
    const newSelected = selectedAnnotation === annotation.id ? null : annotation.id
    setSelectedAnnotation(newSelected)
    onAnnotationClick?.(annotation)
    
    announceToScreenReader(
      `Annotation ${newSelected ? 'sélectionnée' : 'désélectionnée'}: ${annotation.title}`,
      'assertive'
    )
  }, [selectedAnnotation, onAnnotationClick, announceToScreenReader])

  // Gestionnaire de survol d'annotation
  const handleAnnotationHover = useCallback((annotation: AIAnnotation | null, event?: React.MouseEvent) => {
    if (annotation && event && chartRef.current) {
      const rect = chartRef.current.getBoundingClientRect()
      setTooltip({
        annotation,
        position: {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top
        },
        visible: true
      })
      setHoveredAnnotation(annotation.id)
      
      onAnnotationHover?.(annotation)
      announceToScreenReader(
        `${annotation.title}: ${annotation.description}`,
        'polite'
      )
    } else {
      setTooltip(null)
      setHoveredAnnotation(null)
      onAnnotationHover?.(null)
    }
  }, [onAnnotationHover, announceToScreenReader])

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
        if (annotations[nextIndex]) {
          setSelectedAnnotation(annotations[nextIndex].id)
        }
        break
        
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault()
        const prevIndex = currentIndex <= 0 ? annotations.length - 1 : currentIndex - 1
        if (annotations[prevIndex]) {
          setSelectedAnnotation(annotations[prevIndex].id)
        }
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
        
      case 'a':
        event.preventDefault()
        setAnnotationsVisible(!annotationsVisible)
        announceToScreenReader(`Annotations ${annotationsVisible ? 'masquées' : 'affichées'}`)
        break
        
      case 'f':
        event.preventDefault()
        setIsFullscreen(!isFullscreen)
        announceToScreenReader(`Mode ${isFullscreen ? 'normal' : 'plein écran'}`)
        break
        
      case 'Escape':
        event.preventDefault()
        setSelectedAnnotation(null)
        setTooltip(null)
        setShowInsightPanel(false)
        if (isFullscreen) setIsFullscreen(false)
        break
    }
  }, [enhancedChart.aiAnnotations, selectedAnnotation, showInsightPanel, annotationsVisible, isFullscreen, handleAnnotationClick, announceToScreenReader])

  // Rendu des annotations IA
  const renderAnnotations = () => {
    if (!annotationsVisible || !enhancedChart.aiAnnotations.length) return null

    return enhancedChart.aiAnnotations.map((annotation) => {
      const isSelected = selectedAnnotation === annotation.id
      const isHovered = hoveredAnnotation === annotation.id
      const config = annotationTypeConfig[annotation.type]
      const Icon = config.icon
      
      // Calculer la position absolue dans le graphique
      const x = (annotation.position.x / 100) * width
      const y = (annotation.position.y / 100) * height

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
            duration: preferences.reducedMotion || animationsPaused ? 0 : 0.2,
            type: 'spring',
            stiffness: 300
          }}
          onClick={() => handleAnnotationClick(annotation)}
          onMouseEnter={(e) => handleAnnotationHover(annotation, e)}
          onMouseLeave={() => handleAnnotationHover(null)}
          role="button"
          tabIndex={0}
          aria-label={`${config.label}: ${annotation.title}`}
          aria-selected={isSelected}
          aria-describedby={`annotation-${annotation.id}-description`}
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
              config.bgColor.replace('bg-', 'bg-').replace('-100', '-500'),
              isSelected && 'ring-2 ring-offset-2 ring-blue-500'
            )}
            style={{
              width: annotation.priority === 'critical' ? 24 : 
                     annotation.priority === 'high' ? 20 : 
                     annotation.priority === 'medium' ? 16 : 12,
              height: annotation.priority === 'critical' ? 24 : 
                      annotation.priority === 'high' ? 20 : 
                      annotation.priority === 'medium' ? 16 : 12,
              opacity: annotation.confidence
            }}
          >
            <Icon className="h-3 w-3" />
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

          {/* Description cachée pour l'accessibilité */}
          <div id={`annotation-${annotation.id}-description`} className="sr-only">
            {annotation.description}. Confiance: {(annotation.confidence * 100).toFixed(0)}%. 
            Priorité: {annotation.priority}.
          </div>
        </motion.div>
      )
    })
  }

  // Rendu du tooltip
  const renderTooltip = () => {
    if (!tooltip?.visible) return null

    const config = annotationTypeConfig[tooltip.annotation.type]

    return (
      <motion.div
        className={cn(
          'absolute z-30 bg-white dark:bg-gray-800 border shadow-xl rounded-lg p-3',
          'max-w-xs pointer-events-none',
          config.borderColor
        )}
        style={{
          left: Math.min(tooltip.position.x + 10, width - 200),
          top: Math.max(tooltip.position.y - 10, 10),
          transform: 'translateY(-100%)'
        }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: preferences.reducedMotion ? 0 : 0.15 }}
      >
        <div className="flex items-center gap-2 mb-2">
          <config.icon className={cn('h-4 w-4', config.textColor)} />
          <span className={cn('font-semibold text-sm', config.textColor)}>
            {tooltip.annotation.title}
          </span>
        </div>
        
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
          {tooltip.annotation.description}
        </p>
        
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">
            Confiance: {(tooltip.annotation.confidence * 100).toFixed(0)}%
          </span>
          <Badge 
            variant={tooltip.annotation.priority === 'critical' ? 'destructive' : 
                   tooltip.annotation.priority === 'high' ? 'default' : 'secondary'}
            className="text-xs"
          >
            {tooltip.annotation.priority}
          </Badge>
        </div>
        
        {tooltip.annotation.actionable && (
          <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
            Cliquez pour plus d'actions
          </div>
        )}
      </motion.div>
    )
  }

  // Rendu du panneau d'insights
  const renderInsightPanel = () => {
    if (!showInsights || !showInsightPanel || !enhancedChart.insights) return null

    return (
      <motion.div
        className={cn(
          'absolute top-4 right-4 bg-white dark:bg-gray-800',
          'border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg',
          'p-4 max-w-sm z-20 max-h-96 overflow-y-auto'
        )}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: preferences.reducedMotion ? 0 : 0.3 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-lg">Insights IA</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowInsightPanel(false)}
            className="h-6 w-6 p-0"
            aria-label="Fermer le panneau d'insights"
          >
            <X className="h-4 w-4" />
          </Button>
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
                    <span className="text-blue-500 mr-2 mt-0.5">•</span>
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
                    <span className="text-green-500 mr-2 mt-0.5">→</span>
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
          <Separator />
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Confiance: {(enhancedChart.metadata.confidence * 100).toFixed(0)}%</span>
            <span>Qualité: {(enhancedChart.metadata.dataQuality * 100).toFixed(0)}%</span>
          </div>
        </div>
      </motion.div>
    )
  }

  // Rendu des contrôles
  const renderControls = () => {
    if (!showControls) return null

    return (
      <div className="flex items-center gap-2 mb-4">
        {/* Toggle annotations */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setAnnotationsVisible(!annotationsVisible)
            announceToScreenReader(`Annotations ${annotationsVisible ? 'masquées' : 'affichées'}`)
          }}
          className="flex items-center gap-2"
          aria-pressed={annotationsVisible}
        >
          {annotationsVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          Annotations ({enhancedChart.aiAnnotations.length})
        </Button>

        {/* Toggle insights */}
        {showInsights && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setShowInsightPanel(!showInsightPanel)
              announceToScreenReader(`Panneau d'insights ${showInsightPanel ? 'masqué' : 'affiché'}`)
            }}
            className="flex items-center gap-2"
            aria-pressed={showInsightPanel}
          >
            <Lightbulb className="h-4 w-4" />
            Insights
          </Button>
        )}

        {/* Animation control */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setAnimationsPaused(!animationsPaused)
            announceToScreenReader(`Animations ${animationsPaused ? 'activées' : 'pausées'}`)
          }}
          className="flex items-center gap-2"
          aria-pressed={animationsPaused}
        >
          {animationsPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          {animationsPaused ? 'Reprendre' : 'Pause'}
        </Button>

        {/* Fullscreen */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setIsFullscreen(!isFullscreen)
            announceToScreenReader(`Mode ${isFullscreen ? 'normal' : 'plein écran'}`)
          }}
          className="flex items-center gap-2"
        >
          <Maximize2 className="h-4 w-4" />
          {isFullscreen ? 'Réduire' : 'Plein écran'}
        </Button>

        {/* Export */}
        {exportable && (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onExport?.('png')}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              PNG
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onExport?.('svg')}
            >
              SVG
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onExport?.('pdf')}
            >
              PDF
            </Button>
          </div>
        )}

        {/* Share */}
        {onShare && (
          <Button
            variant="outline"
            size="sm"
            onClick={onShare}
            className="flex items-center gap-2"
          >
            <Share2 className="h-4 w-4" />
            Partager
          </Button>
        )}

        {/* Clear selection */}
        {selectedAnnotation && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedAnnotation(null)
              announceToScreenReader('Sélection effacée')
            }}
          >
            Effacer sélection
          </Button>
        )}
      </div>
    )
  }

  // Rendu de la légende des annotations
  const renderAnnotationLegend = () => {
    if (!annotationsVisible || !enhancedChart.aiAnnotations.length) return null

    const typeCounts = enhancedChart.aiAnnotations.reduce((acc, annotation) => {
      acc[annotation.type] = (acc[annotation.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return (
      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <h4 className="font-medium text-sm mb-2">Légende des annotations IA</h4>
        <div className="flex flex-wrap gap-4 text-xs">
          {Object.entries(typeCounts).map(([type, count]) => {
            const config = annotationTypeConfig[type as keyof typeof annotationTypeConfig]
            if (!config) return null
            
            return (
              <div key={type} className="flex items-center gap-2">
                <config.icon className={cn('h-4 w-4', config.textColor)} />
                <span>{config.label} ({count})</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const containerClasses = cn(
    'ai-enhanced-chart relative',
    isFullscreen && 'fixed inset-0 z-50 bg-white dark:bg-gray-900 p-4',
    className
  )

  return (
    <div
      ref={combinedRef}
      className={containerClasses}
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
            I pour afficher/masquer les insights, A pour les annotations, F pour le plein écran.`}
          </span>
        )}
      </div>

      {/* Titre et contrôles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
        <div>
          <h3 className="text-lg font-semibold">{enhancedChart.title}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {enhancedChart.description}
          </p>
        </div>
        
        {renderControls()}
      </div>

      {/* Graphique principal avec annotations */}
      <div 
        ref={chartRef}
        className="relative"
        style={{ 
          width: isFullscreen ? '100%' : width, 
          height: isFullscreen ? 'calc(100vh - 200px)' : height 
        }}
      >
        {interactive ? (
          <InteractiveChart
            data={chartData}
            type={chartType}
            width={isFullscreen ? window.innerWidth - 100 : width}
            height={isFullscreen ? window.innerHeight - 200 : height}
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
        ) : (
          <ModernChart
            data={chartData.map(d => ({ x: d.x, y: d.y, label: d.label }))}
            type={chartType === 'scatter' ? 'line' : chartType === 'bar' ? 'bar' : 'line'}
            xAxisKey="x"
            yAxisKey="y"
            title={enhancedChart.title}
            description={enhancedChart.description}
            height={isFullscreen ? window.innerHeight - 200 : height}
            enableAnimations={!animationsPaused}
          />
        )}

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
      {renderAnnotationLegend()}

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

export default AIEnhancedChart