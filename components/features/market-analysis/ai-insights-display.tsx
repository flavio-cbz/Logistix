"use client"

import React, { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAccessibility } from '@/lib/contexts/accessibility-context'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { 
  AIInsights, 
  AIRecommendations, 
  AnomalyDetection, 
  TrendPrediction,
  ActionItem,
  PricingRecommendation,
  MarketingRecommendation,
  OpportunityRecommendation,
  RiskMitigation
} from '@/types/vinted-market-analysis'
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Target, 
  Lightbulb,
  DollarSign,
  Calendar,
  BarChart3,
  Eye,
  ChevronDown,
  ChevronRight,
  Info,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react'

export interface AIInsightsDisplayProps {
  insights?: AIInsights
  recommendations?: AIRecommendations
  anomalies?: AnomalyDetection[]
  trendPredictions?: TrendPrediction
  onRecommendationAction?: (recommendation: any, action: string) => void
  onInsightExpand?: (insight: string) => void
  className?: string
}

const priorityConfig = {
  high: { color: 'red', icon: AlertTriangle, label: 'Haute' },
  medium: { color: 'yellow', icon: Clock, label: 'Moyenne' },
  low: { color: 'green', icon: Info, label: 'Basse' }
}

const confidenceConfig = {
  high: { color: 'green', threshold: 0.8 },
  medium: { color: 'yellow', threshold: 0.6 },
  low: { color: 'red', threshold: 0 }
}

const getConfidenceLevel = (confidence: number) => {
  if (confidence >= 0.8) return 'high'
  if (confidence >= 0.6) return 'medium'
  return 'low'
}

export const AIInsightsDisplay: React.FC<AIInsightsDisplayProps> = ({
  insights,
  recommendations,
  anomalies = [],
  trendPredictions,
  onRecommendationAction,
  onInsightExpand,
  className
}) => {
  const { announceToScreenReader, preferences } = useAccessibility()
  const { theme } = useTheme()
  const [activeTab, setActiveTab] = useState('insights')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [selectedRecommendation, setSelectedRecommendation] = useState<string | null>(null)

  // Gestion de l'expansion des sections
  const toggleSection = useCallback((sectionId: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId)
    } else {
      newExpanded.add(sectionId)
    }
    setExpandedSections(newExpanded)
    
    announceToScreenReader(
      `Section ${sectionId} ${newExpanded.has(sectionId) ? 'développée' : 'réduite'}`
    )
  }, [expandedSections, announceToScreenReader])

  // Gestion des actions sur les recommandations
  const handleRecommendationAction = useCallback((recommendation: any, action: string) => {
    setSelectedRecommendation(recommendation.id || recommendation.type)
    onRecommendationAction?.(recommendation, action)
    
    announceToScreenReader(
      `Action ${action} appliquée à la recommandation ${recommendation.type}`
    )
  }, [onRecommendationAction, announceToScreenReader])

  // Statistiques globales
  const stats = useMemo(() => {
    const totalRecommendations = recommendations ? 
      recommendations.pricing.length + 
      recommendations.marketing.length + 
      recommendations.opportunities.length : 0

    const highPriorityAnomalies = anomalies.filter(a => a.severity === 'high' || a.severity === 'critical').length
    const avgConfidence = insights ? insights.confidence : 0

    return {
      totalRecommendations,
      highPriorityAnomalies,
      avgConfidence,
      hasInsights: !!insights,
      hasRecommendations: !!recommendations,
      hasAnomalies: anomalies.length > 0,
      hasPredictions: !!trendPredictions
    }
  }, [insights, recommendations, anomalies, trendPredictions])

  // Rendu du résumé des insights
  const renderInsightsSummary = () => {
    if (!insights) return null

    return (
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Résumé de l'analyse IA
            </CardTitle>
            <Badge variant={getConfidenceLevel(insights.confidence) === 'high' ? 'default' : 'secondary'}>
              Confiance: {(insights.confidence * 100).toFixed(0)}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            {insights.summary}
          </p>
          
          {/* Barre de confiance */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span>Niveau de confiance</span>
              <span>{(insights.confidence * 100).toFixed(0)}%</span>
            </div>
            <Progress 
              value={insights.confidence * 100} 
              className="h-2"
              aria-label={`Niveau de confiance: ${(insights.confidence * 100).toFixed(0)}%`}
            />
          </div>

          {/* Contexte de marché */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h4 className="font-medium text-sm mb-1">Position concurrentielle</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {insights.marketContext.competitivePosition}
              </p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h4 className="font-medium text-sm mb-1">Conditions de marché</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {insights.marketContext.marketConditions}
              </p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h4 className="font-medium text-sm mb-1">Facteurs saisonniers</h4>
              <div className="flex flex-wrap gap-1">
                {insights.marketContext.seasonalFactors.map((factor, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {factor}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Rendu des principales découvertes
  const renderKeyFindings = () => {
    if (!insights?.keyFindings.length) return null

    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-blue-500" />
            Principales découvertes ({insights.keyFindings.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {insights.keyFindings.map((finding, index) => {
              const Icon = finding.type === 'opportunity' ? Target :
                         finding.type === 'risk' ? AlertTriangle :
                         finding.type === 'trend' ? TrendingUp : Lightbulb

              const colorClass = finding.impact === 'high' ? 'text-red-600' :
                               finding.impact === 'medium' ? 'text-yellow-600' : 'text-green-600'

              return (
                <motion.div
                  key={index}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ 
                    delay: index * 0.1,
                    duration: preferences.reducedMotion ? 0 : 0.3 
                  }}
                >
                  <div className="flex items-start gap-3">
                    <Icon className={cn("h-5 w-5 mt-0.5", colorClass)} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{finding.title}</h4>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={finding.impact === 'high' ? 'destructive' : 
                                   finding.impact === 'medium' ? 'default' : 'secondary'}
                          >
                            {finding.impact}
                          </Badge>
                          <Badge variant="outline">
                            {(finding.confidence * 100).toFixed(0)}%
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {finding.description}
                      </p>
                      
                      {/* Preuves */}
                      {finding.evidence && finding.evidence.length > 0 && (
                        <div className="mt-3">
                          <button
                            onClick={() => toggleSection(`evidence-${index}`)}
                            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                            aria-expanded={expandedSections.has(`evidence-${index}`)}
                          >
                            {expandedSections.has(`evidence-${index}`) ? 
                              <ChevronDown className="h-4 w-4" /> : 
                              <ChevronRight className="h-4 w-4" />
                            }
                            Voir les preuves ({finding.evidence.length})
                          </button>
                          
                          <AnimatePresence>
                            {expandedSections.has(`evidence-${index}`) && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: preferences.reducedMotion ? 0 : 0.2 }}
                                className="mt-2 pl-4 border-l-2 border-gray-200 dark:border-gray-700"
                              >
                                <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                  {finding.evidence.map((evidence, evidenceIndex) => (
                                    <li key={evidenceIndex} className="flex items-start gap-2">
                                      <span className="text-gray-400 mt-0.5">•</span>
                                      <span>{evidence}</span>
                                    </li>
                                  ))}
                                </ul>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Rendu des recommandations de prix
  const renderPricingRecommendations = () => {
    if (!recommendations?.pricing.length) return null

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-green-500" />
          Recommandations de prix ({recommendations.pricing.length})
        </h3>
        
        {recommendations.pricing.map((rec, index) => (
          <Card key={index} className="border-l-4 border-l-green-500">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-medium">{rec.strategy}</h4>
                  <p className="text-2xl font-bold text-green-600">
                    {rec.optimalPrice.toFixed(2)}€
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant="outline">
                    {(rec.confidence * 100).toFixed(0)}% confiance
                  </Badge>
                  <p className="text-sm text-gray-500 mt-1">
                    {rec.priceRange.min.toFixed(2)}€ - {rec.priceRange.max.toFixed(2)}€
                  </p>
                </div>
              </div>
              
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {rec.justification}
              </p>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-600">
                  Impact attendu: {rec.expectedImpact}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRecommendationAction(rec, 'view-details')}
                  >
                    Détails
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleRecommendationAction(rec, 'apply')}
                  >
                    Appliquer
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  // Rendu des anomalies
  const renderAnomalies = () => {
    if (!anomalies.length) return null

    const criticalAnomalies = anomalies.filter(a => a.severity === 'critical')
    const highAnomalies = anomalies.filter(a => a.severity === 'high')
    const otherAnomalies = anomalies.filter(a => a.severity === 'medium' || a.severity === 'low')

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          Anomalies détectées ({anomalies.length})
        </h3>

        {/* Anomalies critiques */}
        {criticalAnomalies.length > 0 && (
          <div>
            <h4 className="font-medium text-red-600 mb-2">Critiques</h4>
            {criticalAnomalies.map((anomaly, index) => (
              <Card key={anomaly.id} className="border-l-4 border-l-red-500 mb-2">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h5 className="font-medium text-red-700">{anomaly.type.toUpperCase()}</h5>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {anomaly.description}
                      </p>
                      <p className="text-sm font-medium text-blue-600 mt-2">
                        Action suggérée: {anomaly.suggestedAction}
                      </p>
                    </div>
                    <Badge variant="destructive">
                      {anomaly.severity}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Autres anomalies */}
        {(highAnomalies.length > 0 || otherAnomalies.length > 0) && (
          <div>
            <button
              onClick={() => toggleSection('other-anomalies')}
              className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              aria-expanded={expandedSections.has('other-anomalies')}
            >
              {expandedSections.has('other-anomalies') ? 
                <ChevronDown className="h-4 w-4" /> : 
                <ChevronRight className="h-4 w-4" />
              }
              Autres anomalies ({highAnomalies.length + otherAnomalies.length})
            </button>
            
            <AnimatePresence>
              {expandedSections.has('other-anomalies') && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: preferences.reducedMotion ? 0 : 0.3 }}
                  className="mt-2 space-y-2"
                >
                  {[...highAnomalies, ...otherAnomalies].map((anomaly) => (
                    <Card key={anomaly.id} className="border-l-4 border-l-yellow-500">
                      <CardContent className="pt-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h5 className="font-medium">{anomaly.type.toUpperCase()}</h5>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {anomaly.description}
                            </p>
                          </div>
                          <Badge 
                            variant={anomaly.severity === 'high' ? 'destructive' : 'secondary'}
                          >
                            {anomaly.severity}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    )
  }

  if (!stats.hasInsights && !stats.hasRecommendations && !stats.hasAnomalies) {
    return (
      <Card className={className}>
        <CardContent className="text-center py-8">
          <Lightbulb className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            Aucun insight IA disponible
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Lancez une analyse de marché pour obtenir des insights intelligents
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn('ai-insights-display', className)}>
      {/* Statistiques globales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {stats.totalRecommendations}
              </div>
              <div className="text-sm text-gray-600">Recommandations</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {stats.highPriorityAnomalies}
              </div>
              <div className="text-sm text-gray-600">Anomalies critiques</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {(stats.avgConfidence * 100).toFixed(0)}%
              </div>
              <div className="text-sm text-gray-600">Confiance moyenne</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {insights?.keyFindings.length || 0}
              </div>
              <div className="text-sm text-gray-600">Découvertes clés</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Résumé des insights */}
      {renderInsightsSummary()}

      {/* Onglets pour organiser le contenu */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Insights
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Recommandations
          </TabsTrigger>
          <TabsTrigger value="anomalies" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Anomalies
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Tendances
          </TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="mt-6">
          {renderKeyFindings()}
        </TabsContent>

        <TabsContent value="recommendations" className="mt-6">
          {renderPricingRecommendations()}
        </TabsContent>

        <TabsContent value="anomalies" className="mt-6">
          {renderAnomalies()}
        </TabsContent>

        <TabsContent value="trends" className="mt-6">
          <Card>
            <CardContent className="pt-4">
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  Prédictions de tendances à venir
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Informations d'accessibilité */}
      <div className="sr-only" aria-live="polite">
        {selectedRecommendation && `Recommandation ${selectedRecommendation} sélectionnée`}
      </div>
    </div>
  )
}

export default AIInsightsDisplay