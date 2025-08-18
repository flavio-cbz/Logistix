"use client"

import React, { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAccessibility } from '@/lib/contexts/accessibility-context'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { AIInsights, AnomalyDetection, TrendPrediction } from '@/types/vinted-market-analysis'
import { 
  Search, 
  Filter, 
  SortAsc, 
  SortDesc, 
  Eye, 
  EyeOff,
  Zap,
  TrendingUp,
  AlertTriangle,
  Target,
  Lightbulb,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

export interface InteractiveInsightExplorerProps {
  insights?: AIInsights
  anomalies?: AnomalyDetection[]
  trendPredictions?: TrendPrediction
  onInsightSelect?: (insight: any) => void
  onFilterChange?: (filters: InsightFilters) => void
  className?: string
}

export interface InsightFilters {
  search: string
  type: 'all' | 'insight' | 'recommendation' | 'warning' | 'opportunity' | 'trend' | 'anomaly'
  confidence: [number, number]
  impact: 'all' | 'low' | 'medium' | 'high'
  sortBy: 'confidence' | 'impact' | 'type' | 'date'
  sortOrder: 'asc' | 'desc'
}

interface CombinedInsight {
  id: string
  type: 'insight' | 'recommendation' | 'warning' | 'opportunity' | 'trend' | 'anomaly'
  title: string
  description: string
  confidence: number
  impact: 'low' | 'medium' | 'high'
  category: string
  evidence?: string[]
  actionable: boolean
  relatedData?: any
  timestamp: string
}

const typeConfig = {
  insight: { icon: Lightbulb, color: 'blue', label: 'Insight' },
  recommendation: { icon: Target, color: 'green', label: 'Recommandation' },
  warning: { icon: AlertTriangle, color: 'yellow', label: 'Attention' },
  opportunity: { icon: Zap, color: 'purple', label: 'Opportunité' },
  trend: { icon: TrendingUp, color: 'indigo', label: 'Tendance' },
  anomaly: { icon: AlertTriangle, color: 'red', label: 'Anomalie' }
}

const impactConfig = {
  low: { color: 'gray', label: 'Faible' },
  medium: { color: 'yellow', label: 'Moyen' },
  high: { color: 'red', label: 'Élevé' }
}

export const InteractiveInsightExplorer: React.FC<InteractiveInsightExplorerProps> = ({
  insights,
  anomalies = [],
  trendPredictions,
  onInsightSelect,
  onFilterChange,
  className
}) => {
  const { announceToScreenReader, preferences } = useAccessibility()
  const [filters, setFilters] = useState<InsightFilters>({
    search: '',
    type: 'all',
    confidence: [0, 100],
    impact: 'all',
    sortBy: 'confidence',
    sortOrder: 'desc'
  })
  const [selectedInsight, setSelectedInsight] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // Combiner tous les insights en une seule liste
  const combinedInsights = useMemo((): CombinedInsight[] => {
    const combined: CombinedInsight[] = []

    // Ajouter les insights principaux
    if (insights?.keyFindings) {
      insights.keyFindings.forEach((finding, index) => {
        combined.push({
          id: `insight-${index}`,
          type: finding.type as any,
          title: finding.title,
          description: finding.description,
          confidence: finding.confidence,
          impact: finding.impact,
          category: 'Analyse principale',
          evidence: finding.evidence,
          actionable: true,
          timestamp: insights.generatedAt
        })
      })
    }

    // Ajouter les anomalies
    anomalies.forEach((anomaly) => {
      combined.push({
        id: anomaly.id,
        type: 'anomaly',
        title: `Anomalie ${anomaly.type}`,
        description: anomaly.description,
        confidence: anomaly.confidence,
        impact: anomaly.severity === 'critical' ? 'high' : 
               anomaly.severity === 'high' ? 'high' :
               anomaly.severity === 'medium' ? 'medium' : 'low',
        category: 'Détection d\'anomalies',
        evidence: anomaly.evidence,
        actionable: true,
        relatedData: { suggestedAction: anomaly.suggestedAction },
        timestamp: anomaly.detectedAt
      })
    })

    // Ajouter les prédictions de tendances
    if (trendPredictions?.predictions) {
      trendPredictions.predictions.forEach((prediction, index) => {
        combined.push({
          id: `trend-${index}`,
          type: 'trend',
          title: `Tendance ${prediction.metric}`,
          description: `${prediction.direction === 'up' ? 'Hausse' : prediction.direction === 'down' ? 'Baisse' : 'Stabilité'} prévue de ${prediction.magnitude.toFixed(1)}%`,
          confidence: prediction.confidence,
          impact: prediction.magnitude > 20 ? 'high' : prediction.magnitude > 10 ? 'medium' : 'low',
          category: 'Prédictions',
          evidence: prediction.factors,
          actionable: true,
          relatedData: { timeframe: trendPredictions.timeframe, factors: prediction.factors },
          timestamp: trendPredictions.generatedAt
        })
      })
    }

    return combined
  }, [insights, anomalies, trendPredictions])

  // Filtrer et trier les insights
  const filteredInsights = useMemo(() => {
    let filtered = combinedInsights.filter(insight => {
      // Filtre de recherche
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        if (!insight.title.toLowerCase().includes(searchLower) &&
            !insight.description.toLowerCase().includes(searchLower)) {
          return false
        }
      }

      // Filtre de type
      if (filters.type !== 'all' && insight.type !== filters.type) {
        return false
      }

      // Filtre de confiance
      const confidencePercent = insight.confidence * 100
      if (confidencePercent < filters.confidence[0] || confidencePercent > filters.confidence[1]) {
        return false
      }

      // Filtre d'impact
      if (filters.impact !== 'all' && insight.impact !== filters.impact) {
        return false
      }

      return true
    })

    // Tri
    filtered.sort((a, b) => {
      let comparison = 0
      
      switch (filters.sortBy) {
        case 'confidence':
          comparison = a.confidence - b.confidence
          break
        case 'impact':
          const impactOrder = { low: 0, medium: 1, high: 2 }
          comparison = impactOrder[a.impact] - impactOrder[b.impact]
          break
        case 'type':
          comparison = a.type.localeCompare(b.type)
          break
        case 'date':
          comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          break
      }

      return filters.sortOrder === 'desc' ? -comparison : comparison
    })

    return filtered
  }, [combinedInsights, filters])

  // Gestionnaires d'événements
  const handleFilterChange = useCallback((newFilters: Partial<InsightFilters>) => {
    const updatedFilters = { ...filters, ...newFilters }
    setFilters(updatedFilters)
    onFilterChange?.(updatedFilters)
    
    announceToScreenReader(
      `Filtres mis à jour. ${filteredInsights.length} insights affichés.`
    )
  }, [filters, onFilterChange, filteredInsights.length, announceToScreenReader])

  const handleInsightSelect = useCallback((insight: CombinedInsight) => {
    setSelectedInsight(selectedInsight === insight.id ? null : insight.id)
    onInsightSelect?.(insight)
    
    announceToScreenReader(
      `Insight ${insight.title} ${selectedInsight === insight.id ? 'désélectionné' : 'sélectionné'}`
    )
  }, [selectedInsight, onInsightSelect, announceToScreenReader])

  const clearFilters = useCallback(() => {
    const defaultFilters: InsightFilters = {
      search: '',
      type: 'all',
      confidence: [0, 100],
      impact: 'all',
      sortBy: 'confidence',
      sortOrder: 'desc'
    }
    setFilters(defaultFilters)
    onFilterChange?.(defaultFilters)
    announceToScreenReader('Filtres réinitialisés')
  }, [onFilterChange, announceToScreenReader])

  // Statistiques des insights filtrés
  const stats = useMemo(() => {
    const typeCount = filteredInsights.reduce((acc, insight) => {
      acc[insight.type] = (acc[insight.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const avgConfidence = filteredInsights.length > 0 
      ? filteredInsights.reduce((sum, insight) => sum + insight.confidence, 0) / filteredInsights.length
      : 0

    const highImpactCount = filteredInsights.filter(i => i.impact === 'high').length

    return {
      total: filteredInsights.length,
      typeCount,
      avgConfidence,
      highImpactCount
    }
  }, [filteredInsights])

  // Rendu d'un insight individuel
  const renderInsight = (insight: CombinedInsight, index: number) => {
    const isSelected = selectedInsight === insight.id
    const config = typeConfig[insight.type]
    const Icon = config.icon

    return (
      <motion.div
        key={insight.id}
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ 
          delay: index * 0.05,
          duration: preferences.reducedMotion ? 0 : 0.2 
        }}
        className={cn(
          'cursor-pointer transition-all duration-200',
          isSelected && 'ring-2 ring-blue-500 ring-offset-2'
        )}
        onClick={() => handleInsightSelect(insight)}
      >
        <Card className={cn(
          'hover:shadow-md transition-shadow',
          isSelected && 'border-blue-500'
        )}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className={cn(
                'p-2 rounded-lg',
                `bg-${config.color}-100 text-${config.color}-600`
              )}>
                <Icon className="h-4 w-4" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium truncate">{insight.title}</h4>
                  <div className="flex items-center gap-2 ml-2">
                    <Badge 
                      variant={insight.impact === 'high' ? 'destructive' : 
                             insight.impact === 'medium' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {impactConfig[insight.impact].label}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {(insight.confidence * 100).toFixed(0)}%
                    </Badge>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                  {insight.description}
                </p>
                
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{insight.category}</span>
                  <span>{config.label}</span>
                </div>
                
                {/* Détails étendus pour l'insight sélectionné */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: preferences.reducedMotion ? 0 : 0.2 }}
                      className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
                    >
                      {/* Preuves */}
                      {insight.evidence && insight.evidence.length > 0 && (
                        <div className="mb-3">
                          <h5 className="font-medium text-sm mb-2">Preuves:</h5>
                          <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                            {insight.evidence.map((evidence, evidenceIndex) => (
                              <li key={evidenceIndex} className="flex items-start gap-2">
                                <span className="text-gray-400 mt-0.5">•</span>
                                <span>{evidence}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {/* Action suggérée pour les anomalies */}
                      {insight.type === 'anomaly' && insight.relatedData?.suggestedAction && (
                        <div className="mb-3">
                          <h5 className="font-medium text-sm mb-1">Action suggérée:</h5>
                          <p className="text-xs text-blue-600">
                            {insight.relatedData.suggestedAction}
                          </p>
                        </div>
                      )}
                      
                      {/* Facteurs pour les tendances */}
                      {insight.type === 'trend' && insight.relatedData?.factors && (
                        <div className="mb-3">
                          <h5 className="font-medium text-sm mb-1">Facteurs influents:</h5>
                          <div className="flex flex-wrap gap-1">
                            {insight.relatedData.factors.map((factor: string, factorIndex: number) => (
                              <Badge key={factorIndex} variant="outline" className="text-xs">
                                {factor}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {new Date(insight.timestamp).toLocaleString()}
                        </span>
                        {insight.actionable && (
                          <Button size="sm" variant="outline">
                            Agir
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  return (
    <div className={cn('interactive-insight-explorer', className)}>
      {/* En-tête avec statistiques */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Explorateur d'insights</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filtres
              {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            >
              {viewMode === 'grid' ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Statistiques rapides */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                <div className="text-sm text-gray-600">Total insights</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{stats.highImpactCount}</div>
                <div className="text-sm text-gray-600">Impact élevé</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {(stats.avgConfidence * 100).toFixed(0)}%
                </div>
                <div className="text-sm text-gray-600">Confiance moy.</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {Object.keys(stats.typeCount).length}
                </div>
                <div className="text-sm text-gray-600">Types différents</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Panneau de filtres */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: preferences.reducedMotion ? 0 : 0.3 }}
            className="mb-6"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Filtres et tri</span>
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-2" />
                    Effacer
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Recherche */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Recherche</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Rechercher..."
                        value={filters.search}
                        onChange={(e) => handleFilterChange({ search: e.target.value })}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* Type */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Type</label>
                    <Select
                      value={filters.type}
                      onValueChange={(value) => handleFilterChange({ type: value as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les types</SelectItem>
                        {Object.entries(typeConfig).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            {config.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Impact */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Impact</label>
                    <Select
                      value={filters.impact}
                      onValueChange={(value) => handleFilterChange({ impact: value as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les impacts</SelectItem>
                        <SelectItem value="high">Élevé</SelectItem>
                        <SelectItem value="medium">Moyen</SelectItem>
                        <SelectItem value="low">Faible</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Tri */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Trier par</label>
                    <div className="flex gap-2">
                      <Select
                        value={filters.sortBy}
                        onValueChange={(value) => handleFilterChange({ sortBy: value as any })}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="confidence">Confiance</SelectItem>
                          <SelectItem value="impact">Impact</SelectItem>
                          <SelectItem value="type">Type</SelectItem>
                          <SelectItem value="date">Date</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleFilterChange({ 
                          sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' 
                        })}
                      >
                        {filters.sortOrder === 'asc' ? 
                          <SortAsc className="h-4 w-4" /> : 
                          <SortDesc className="h-4 w-4" />
                        }
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Slider de confiance */}
                <div className="mt-4">
                  <label className="block text-sm font-medium mb-2">
                    Niveau de confiance: {filters.confidence[0]}% - {filters.confidence[1]}%
                  </label>
                  <Slider
                    value={filters.confidence}
                    onValueChange={(value) => handleFilterChange({ confidence: value as [number, number] })}
                    max={100}
                    min={0}
                    step={5}
                    className="w-full"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Liste des insights */}
      <div className={cn(
        'grid gap-4',
        viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'
      )}>
        <AnimatePresence mode="popLayout">
          {filteredInsights.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="col-span-full"
            >
              <Card>
                <CardContent className="text-center py-8">
                  <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Aucun insight trouvé
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Essayez de modifier vos filtres de recherche
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            filteredInsights.map((insight, index) => renderInsight(insight, index))
          )}
        </AnimatePresence>
      </div>

      {/* Informations d'accessibilité */}
      <div className="sr-only" aria-live="polite">
        {filteredInsights.length} insights affichés sur {combinedInsights.length} total.
        {selectedInsight && ` Insight ${selectedInsight} sélectionné.`}
      </div>
    </div>
  )
}

export default InteractiveInsightExplorer