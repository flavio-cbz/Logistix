"use client"

import React, { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAccessibility } from '@/lib/contexts/accessibility-context'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  AIRecommendations,
  PricingRecommendation,
  MarketingRecommendation,
  OpportunityRecommendation,
  RiskMitigation,
  ActionItem,
  ActionPlan
} from '@/types/vinted-market-analysis'
import { 
  DollarSign,
  Megaphone,
  Target,
  Shield,
  Calendar,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Play,
  Pause,
  MoreHorizontal,
  ExternalLink,
  Copy,
  Share,
  Bookmark,
  BookmarkCheck,
  ThumbsUp,
  ThumbsDown,
  MessageSquare
} from 'lucide-react'

export interface RecommendationActionPanelProps {
  recommendations?: AIRecommendations
  onActionExecute?: (recommendation: any, action: RecommendationAction) => void
  onFeedback?: (recommendation: any, feedback: 'positive' | 'negative', comment?: string) => void
  onBookmark?: (recommendation: any, bookmarked: boolean) => void
  onShare?: (recommendation: any) => void
  className?: string
}

export interface RecommendationAction {
  type: 'apply' | 'schedule' | 'modify' | 'dismiss' | 'learn-more' | 'export'
  data?: any
}

interface RecommendationWithActions {
  id: string
  type: 'pricing' | 'marketing' | 'opportunity' | 'risk'
  title: string
  description: string
  confidence: number
  priority: 'high' | 'medium' | 'low'
  effort: 'low' | 'medium' | 'high'
  impact: string
  timeline: string
  actionable: boolean
  data: any
  bookmarked?: boolean
  feedback?: 'positive' | 'negative'
  status?: 'pending' | 'in-progress' | 'completed' | 'dismissed'
}

const typeConfig = {
  pricing: {
    icon: DollarSign,
    color: 'green',
    label: 'Prix',
    description: 'Optimisation des prix'
  },
  marketing: {
    icon: Megaphone,
    color: 'blue',
    label: 'Marketing',
    description: 'Stratégies marketing'
  },
  opportunity: {
    icon: Target,
    color: 'purple',
    label: 'Opportunité',
    description: 'Nouvelles opportunités'
  },
  risk: {
    icon: Shield,
    color: 'red',
    label: 'Risque',
    description: 'Mitigation des risques'
  }
}

const priorityConfig = {
  high: { color: 'red', label: 'Haute', icon: AlertTriangle },
  medium: { color: 'yellow', label: 'Moyenne', icon: Clock },
  low: { color: 'green', label: 'Basse', icon: CheckCircle }
}

const effortConfig = {
  low: { color: 'green', label: 'Faible', bars: 1 },
  medium: { color: 'yellow', label: 'Moyen', bars: 2 },
  high: { color: 'red', label: 'Élevé', bars: 3 }
}

export const RecommendationActionPanel: React.FC<RecommendationActionPanelProps> = ({
  recommendations,
  onActionExecute,
  onFeedback,
  onBookmark,
  onShare,
  className
}) => {
  const { announceToScreenReader, preferences } = useAccessibility()
  const [activeTab, setActiveTab] = useState('all')
  const [selectedRecommendations, setSelectedRecommendations] = useState<Set<string>>(new Set())
  const [expandedRecommendation, setExpandedRecommendation] = useState<string | null>(null)
  const [bookmarkedItems, setBookmarkedItems] = useState<Set<string>>(new Set())
  const [feedbackItems, setFeedbackItems] = useState<Map<string, 'positive' | 'negative'>>(new Map())

  // Convertir les recommandations en format unifié
  const unifiedRecommendations = useMemo((): RecommendationWithActions[] => {
    if (!recommendations) return []

    const unified: RecommendationWithActions[] = []

    // Recommandations de prix
    recommendations.pricing.forEach((rec, index) => {
      unified.push({
        id: `pricing-${index}`,
        type: 'pricing',
        title: `Stratégie de prix: ${rec.strategy}`,
        description: rec.justification,
        confidence: rec.confidence,
        priority: rec.confidence > 0.8 ? 'high' : rec.confidence > 0.6 ? 'medium' : 'low',
        effort: 'low',
        impact: rec.expectedImpact,
        timeline: 'Immédiat',
        actionable: true,
        data: rec,
        bookmarked: bookmarkedItems.has(`pricing-${index}`),
        feedback: feedbackItems.get(`pricing-${index}`)
      })
    })

    // Recommandations marketing
    recommendations.marketing.forEach((rec, index) => {
      unified.push({
        id: `marketing-${index}`,
        type: 'marketing',
        title: `Stratégie marketing: ${rec.strategy}`,
        description: `Cibler ${rec.targetAudience} via ${rec.channels.join(', ')}`,
        confidence: rec.confidence,
        priority: rec.confidence > 0.8 ? 'high' : rec.confidence > 0.6 ? 'medium' : 'low',
        effort: rec.channels.length > 2 ? 'high' : 'medium',
        impact: rec.expectedOutcome,
        timeline: rec.timeline,
        actionable: true,
        data: rec,
        bookmarked: bookmarkedItems.has(`marketing-${index}`),
        feedback: feedbackItems.get(`marketing-${index}`)
      })
    })

    // Opportunités
    recommendations.opportunities.forEach((rec, index) => {
      unified.push({
        id: `opportunity-${index}`,
        type: 'opportunity',
        title: rec.opportunity,
        description: rec.description,
        confidence: rec.confidence,
        priority: rec.profitPotential === 'high' ? 'high' : 
                 rec.profitPotential === 'medium' ? 'medium' : 'low',
        effort: rec.effort,
        impact: `Potentiel ${rec.profitPotential}`,
        timeline: rec.timeline,
        actionable: true,
        data: rec,
        bookmarked: bookmarkedItems.has(`opportunity-${index}`),
        feedback: feedbackItems.get(`opportunity-${index}`)
      })
    })

    // Risques
    recommendations.risks.forEach((rec, index) => {
      unified.push({
        id: `risk-${index}`,
        type: 'risk',
        title: `Risque: ${rec.risk}`,
        description: rec.mitigation,
        confidence: rec.confidence,
        priority: rec.severity === 'critical' ? 'high' :
                 rec.severity === 'high' ? 'high' :
                 rec.severity === 'medium' ? 'medium' : 'low',
        effort: rec.preventionSteps.length > 3 ? 'high' : 'medium',
        impact: `Sévérité ${rec.severity}`,
        timeline: 'À planifier',
        actionable: true,
        data: rec,
        bookmarked: bookmarkedItems.has(`risk-${index}`),
        feedback: feedbackItems.get(`risk-${index}`)
      })
    })

    return unified.sort((a, b) => {
      // Trier par priorité puis par confiance
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
      if (priorityDiff !== 0) return priorityDiff
      return b.confidence - a.confidence
    })
  }, [recommendations, bookmarkedItems, feedbackItems])

  // Filtrer par onglet actif
  const filteredRecommendations = useMemo(() => {
    if (activeTab === 'all') return unifiedRecommendations
    if (activeTab === 'bookmarked') return unifiedRecommendations.filter(r => r.bookmarked)
    return unifiedRecommendations.filter(r => r.type === activeTab)
  }, [unifiedRecommendations, activeTab])

  // Gestionnaires d'événements
  const handleActionExecute = useCallback((recommendation: RecommendationWithActions, actionType: string, data?: any) => {
    const action: RecommendationAction = { type: actionType as any, data }
    onActionExecute?.(recommendation.data, action)
    
    announceToScreenReader(
      `Action ${actionType} exécutée pour la recommandation ${recommendation.title}`
    )
  }, [onActionExecute, announceToScreenReader])

  const handleBookmark = useCallback((recommendation: RecommendationWithActions) => {
    const newBookmarked = new Set(bookmarkedItems)
    const isBookmarked = newBookmarked.has(recommendation.id)
    
    if (isBookmarked) {
      newBookmarked.delete(recommendation.id)
    } else {
      newBookmarked.add(recommendation.id)
    }
    
    setBookmarkedItems(newBookmarked)
    onBookmark?.(recommendation.data, !isBookmarked)
    
    announceToScreenReader(
      `Recommandation ${isBookmarked ? 'retirée des' : 'ajoutée aux'} favoris`
    )
  }, [bookmarkedItems, onBookmark, announceToScreenReader])

  const handleFeedback = useCallback((recommendation: RecommendationWithActions, feedback: 'positive' | 'negative') => {
    const newFeedback = new Map(feedbackItems)
    newFeedback.set(recommendation.id, feedback)
    setFeedbackItems(newFeedback)
    
    onFeedback?.(recommendation.data, feedback)
    
    announceToScreenReader(
      `Feedback ${feedback === 'positive' ? 'positif' : 'négatif'} enregistré`
    )
  }, [feedbackItems, onFeedback, announceToScreenReader])

  const toggleExpanded = useCallback((recommendationId: string) => {
    setExpandedRecommendation(
      expandedRecommendation === recommendationId ? null : recommendationId
    )
  }, [expandedRecommendation])

  // Statistiques
  const stats = useMemo(() => {
    const total = unifiedRecommendations.length
    const highPriority = unifiedRecommendations.filter(r => r.priority === 'high').length
    const bookmarked = bookmarkedItems.size
    const avgConfidence = total > 0 
      ? unifiedRecommendations.reduce((sum, r) => sum + r.confidence, 0) / total
      : 0

    return { total, highPriority, bookmarked, avgConfidence }
  }, [unifiedRecommendations, bookmarkedItems])

  // Rendu d'une recommandation
  const renderRecommendation = (recommendation: RecommendationWithActions, index: number) => {
    const isExpanded = expandedRecommendation === recommendation.id
    const config = typeConfig[recommendation.type]
    const priorityConf = priorityConfig[recommendation.priority]
    const effortConf = effortConfig[recommendation.effort]
    const Icon = config.icon

    return (
      <motion.div
        key={recommendation.id}
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ 
          delay: index * 0.05,
          duration: preferences.reducedMotion ? 0 : 0.2 
        }}
      >
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className={cn(
                  'p-2 rounded-lg',
                  `bg-${config.color}-100 text-${config.color}-600`
                )}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg mb-1">{recommendation.title}</CardTitle>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {recommendation.description}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 ml-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleBookmark(recommendation)}
                  className="p-2"
                >
                  {recommendation.bookmarked ? 
                    <BookmarkCheck className="h-4 w-4 text-blue-600" /> :
                    <Bookmark className="h-4 w-4" />
                  }
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onShare?.(recommendation.data)}
                  className="p-2"
                >
                  <Share className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            {/* Métriques */}
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-sm text-gray-500 mb-1">Confiance</div>
                <div className="font-semibold text-lg">
                  {(recommendation.confidence * 100).toFixed(0)}%
                </div>
                <Progress 
                  value={recommendation.confidence * 100} 
                  className="h-1 mt-1"
                />
              </div>
              
              <div className="text-center">
                <div className="text-sm text-gray-500 mb-1">Priorité</div>
                <Badge 
                  variant={recommendation.priority === 'high' ? 'destructive' : 
                         recommendation.priority === 'medium' ? 'default' : 'secondary'}
                >
                  {priorityConf.label}
                </Badge>
              </div>
              
              <div className="text-center">
                <div className="text-sm text-gray-500 mb-1">Effort</div>
                <div className="flex justify-center gap-1">
                  {Array.from({ length: 3 }, (_, i) => (
                    <div
                      key={i}
                      className={cn(
                        'w-2 h-4 rounded-sm',
                        i < effortConf.bars 
                          ? `bg-${effortConf.color}-500` 
                          : 'bg-gray-200'
                      )}
                    />
                  ))}
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-sm text-gray-500 mb-1">Délai</div>
                <div className="text-sm font-medium">{recommendation.timeline}</div>
              </div>
            </div>

            {/* Impact */}
            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-sm font-medium mb-1">Impact attendu</div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {recommendation.impact}
              </p>
            </div>

            {/* Actions principales */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-2">
                <Button
                  onClick={() => handleActionExecute(recommendation, 'apply')}
                  className="flex items-center gap-2"
                >
                  <Play className="h-4 w-4" />
                  Appliquer
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleActionExecute(recommendation, 'schedule')}
                  className="flex items-center gap-2"
                >
                  <Calendar className="h-4 w-4" />
                  Planifier
                </Button>
                <Button
                  variant="outline"
                  onClick={() => toggleExpanded(recommendation.id)}
                >
                  {isExpanded ? 'Moins' : 'Plus'} de détails
                </Button>
              </div>
              
              {/* Feedback */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFeedback(recommendation, 'positive')}
                  className={cn(
                    'p-2',
                    recommendation.feedback === 'positive' && 'text-green-600 bg-green-50'
                  )}
                >
                  <ThumbsUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFeedback(recommendation, 'negative')}
                  className={cn(
                    'p-2',
                    recommendation.feedback === 'negative' && 'text-red-600 bg-red-50'
                  )}
                >
                  <ThumbsDown className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Détails étendus */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: preferences.reducedMotion ? 0 : 0.3 }}
                >
                  <Separator className="mb-4" />
                  
                  {/* Détails spécifiques par type */}
                  {recommendation.type === 'pricing' && (
                    <div className="space-y-3">
                      <div>
                        <h5 className="font-medium mb-2">Détails de prix</h5>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Prix optimal:</span>
                            <span className="ml-2 font-medium">
                              {recommendation.data.optimalPrice.toFixed(2)}€
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Fourchette:</span>
                            <span className="ml-2 font-medium">
                              {recommendation.data.priceRange.min.toFixed(2)}€ - {recommendation.data.priceRange.max.toFixed(2)}€
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {recommendation.type === 'marketing' && (
                    <div className="space-y-3">
                      <div>
                        <h5 className="font-medium mb-2">Canaux recommandés</h5>
                        <div className="flex flex-wrap gap-2">
                          {recommendation.data.channels.map((channel: string, index: number) => (
                            <Badge key={index} variant="outline">
                              {channel}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h5 className="font-medium mb-1">Audience cible</h5>
                        <p className="text-sm text-gray-600">
                          {recommendation.data.targetAudience}
                        </p>
                      </div>
                    </div>
                  )}

                  {recommendation.type === 'opportunity' && (
                    <div className="space-y-3">
                      <div>
                        <h5 className="font-medium mb-2">Étapes d'action</h5>
                        <ul className="text-sm space-y-1">
                          {recommendation.data.actionSteps.map((step: string, index: number) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="text-blue-500 mt-0.5">•</span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {recommendation.type === 'risk' && (
                    <div className="space-y-3">
                      <div>
                        <h5 className="font-medium mb-2">Étapes de prévention</h5>
                        <ul className="text-sm space-y-1">
                          {recommendation.data.preventionSteps.map((step: string, index: number) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="text-red-500 mt-0.5">•</span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Actions secondaires */}
                  <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleActionExecute(recommendation, 'modify')}
                      className="flex items-center gap-2"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                      Modifier
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleActionExecute(recommendation, 'export')}
                      className="flex items-center gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Exporter
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleActionExecute(recommendation, 'learn-more')}
                      className="flex items-center gap-2"
                    >
                      <MessageSquare className="h-4 w-4" />
                      En savoir plus
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  if (!recommendations || unifiedRecommendations.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="text-center py-8">
          <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            Aucune recommandation disponible
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Lancez une analyse pour obtenir des recommandations personnalisées
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn('recommendation-action-panel', className)}>
      {/* Statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.highPriority}</div>
              <div className="text-sm text-gray-600">Haute priorité</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.bookmarked}</div>
              <div className="text-sm text-gray-600">Favoris</div>
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
      </div>

      {/* Onglets */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">Toutes ({stats.total})</TabsTrigger>
          <TabsTrigger value="pricing">Prix ({unifiedRecommendations.filter(r => r.type === 'pricing').length})</TabsTrigger>
          <TabsTrigger value="marketing">Marketing ({unifiedRecommendations.filter(r => r.type === 'marketing').length})</TabsTrigger>
          <TabsTrigger value="opportunity">Opportunités ({unifiedRecommendations.filter(r => r.type === 'opportunity').length})</TabsTrigger>
          <TabsTrigger value="risk">Risques ({unifiedRecommendations.filter(r => r.type === 'risk').length})</TabsTrigger>
          <TabsTrigger value="bookmarked">Favoris ({stats.bookmarked})</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {filteredRecommendations.map((recommendation, index) => 
                renderRecommendation(recommendation, index)
              )}
            </AnimatePresence>
          </div>
        </div>
      </Tabs>

      {/* Plan d'action global */}
      {recommendations?.actionPlan && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Plan d'action global
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="immediate" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="immediate">
                  Immédiat ({recommendations.actionPlan.immediate.length})
                </TabsTrigger>
                <TabsTrigger value="shortTerm">
                  Court terme ({recommendations.actionPlan.shortTerm.length})
                </TabsTrigger>
                <TabsTrigger value="longTerm">
                  Long terme ({recommendations.actionPlan.longTerm.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="immediate" className="mt-4">
                <div className="space-y-2">
                  {recommendations.actionPlan.immediate.map((action, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex-1">
                        <h5 className="font-medium">{action.action}</h5>
                        <p className="text-sm text-gray-600">{action.expectedImpact}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={action.priority === 'high' ? 'destructive' : 'default'}>
                          {action.priority}
                        </Badge>
                        <Button size="sm">Démarrer</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="shortTerm" className="mt-4">
                <div className="space-y-2">
                  {recommendations.actionPlan.shortTerm.map((action, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex-1">
                        <h5 className="font-medium">{action.action}</h5>
                        <p className="text-sm text-gray-600">{action.expectedOutcome}</p>
                        <p className="text-xs text-gray-500">{action.timeline}</p>
                      </div>
                      <Button size="sm" variant="outline">Planifier</Button>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="longTerm" className="mt-4">
                <div className="space-y-2">
                  {recommendations.actionPlan.longTerm.map((action, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex-1">
                        <h5 className="font-medium">{action.strategy}</h5>
                        <div className="text-sm text-gray-600 mt-1">
                          <div>Objectifs: {action.goals.join(', ')}</div>
                          <div>Métriques: {action.metrics.join(', ')}</div>
                        </div>
                        <p className="text-xs text-gray-500">{action.timeline}</p>
                      </div>
                      <Button size="sm" variant="outline">Étudier</Button>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Informations d'accessibilité */}
      <div className="sr-only" aria-live="polite">
        {filteredRecommendations.length} recommandations affichées dans l'onglet {activeTab}.
      </div>
    </div>
  )
}

export default RecommendationActionPanel