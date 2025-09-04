"use client"

import { useState, useCallback, useMemo } from 'react'
import { useAccessibility } from '@/lib/contexts/accessibility-context'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { AIRecommendations,
  PricingRecommendation,
  MarketingRecommendation,
  OpportunityRecommendation,
  RiskMitigation } from '@/types/vinted-market-analysis'
import {
  DollarSign,
  Megaphone,
  Target,
  Shield,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  Play,
  MoreHorizontal,
  ExternalLink,
  Share as ShareIcon,
  Bookmark,
  BookmarkCheck,
  ThumbsUp,
  ThumbsDown,
  MessageSquare
} from 'lucide-react'

type RecommendationType = 'pricing' | 'marketing' | 'opportunity' | 'risk'
type RecommendationDataMap = {
  pricing: PricingRecommendation
  marketing: MarketingRecommendation
  opportunity: OpportunityRecommendation
  risk: RiskMitigation
}
type AnyRecommendation =
  PricingRecommendation |
  MarketingRecommendation |
  OpportunityRecommendation |
  RiskMitigation
type ActiveTab = 'all' | RecommendationType | 'bookmarked'
const VALID_TABS = ['all', 'pricing', 'marketing', 'opportunity', 'risk', 'bookmarked'] as const

export interface RecommendationAction {
  type: 'apply' | 'schedule' | 'modify' | 'dismiss' | 'learn-more' | 'export'
  data?: unknown
}

export interface RecommendationActionPanelProps {
  recommendations?: AIRecommendations
  onActionExecute?: (recommendation: AnyRecommendation, action: RecommendationAction) => void
  onFeedback?: (recommendation: AnyRecommendation, feedback: 'positive' | 'negative', comment?: string) => void
  onBookmark?: (recommendation: AnyRecommendation, bookmarked: boolean) => void
  onShare?: (recommendation: AnyRecommendation) => void
  className?: string
}

type RecommendationWithActions<T extends RecommendationType = RecommendationType> = {
  id: string
  type: T
  title: string
  description: string
  confidence: number
  priority: 'high' | 'medium' | 'low'
  effort: 'low' | 'medium' | 'high'
  impact: string
  timeline: string
  actionable: boolean
  data: RecommendationDataMap[T]
  bookmarked?: boolean
  feedback?: 'positive' | 'negative' | undefined
  status?: 'pending' | 'in-progress' | 'completed' | 'dismissed'
}

const typeConfig: Record<RecommendationType, {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  label: string
  description: string
  bgClass: string
  textClass: string
}> = {
  pricing: {
    icon: DollarSign,
    label: 'Prix',
    description: 'Optimisation des prix',
    bgClass: 'bg-emerald-100',
    textClass: 'text-emerald-600'
  },
  marketing: {
    icon: Megaphone,
    label: 'Marketing',
    description: 'Stratégies marketing',
    bgClass: 'bg-sky-100',
    textClass: 'text-sky-600'
  },
  opportunity: {
    icon: Target,
    label: 'Opportunité',
    description: 'Nouvelles opportunités',
    bgClass: 'bg-violet-100',
    textClass: 'text-violet-600'
  },
  risk: {
    icon: Shield,
    label: 'Risque',
    description: 'Mitigation des risques',
    bgClass: 'bg-rose-100',
    textClass: 'text-rose-600'
  }
}

const priorityConfig = {
  high: { label: 'Haute', icon: AlertTriangle },
  medium: { label: 'Moyenne', icon: Clock },
  low: { label: 'Basse', icon: CheckCircle }
} as const

const effortConfig = {
  low: { label: 'Faible', bars: 1, barClass: 'bg-emerald-500' },
  medium: { label: 'Moyen', bars: 2, barClass: 'bg-amber-500' },
  high: { label: 'Élevé', bars: 3, barClass: 'bg-rose-500' }
} as const

export const RecommendationActionPanel: React.FC<RecommendationActionPanelProps> = ({
  recommendations,
  onActionExecute,
  onFeedback,
  onBookmark,
  onShare,
  className
}) => {
  const { announceToScreenReader } = useAccessibility()
  const [activeTab, setActiveTab] = useState<ActiveTab>('all')
  const [expandedRecommendation, setExpandedRecommendation] = useState<string | null>(null)
  const [bookmarkedItems, setBookmarkedItems] = useState<Set<string>>(new Set())
  const [feedbackItems, setFeedbackItems] = useState<Map<string, 'positive' | 'negative'>>(new Map())

  const handleTabChange = useCallback((value: string) => {
    if ((VALID_TABS as readonly string[]).includes(value)) {
      setActiveTab(value as ActiveTab)
    }
  }, [])

  // Convertir les recommandations en format unifié
  const unifiedRecommendations = useMemo((): RecommendationWithActions[] => {
    if (!recommendations) return []

    const unified: RecommendationWithActions[] = []

    // Recommandations de prix
    recommendations.pricing.forEach((rec, _index) => {
      unified.push({
        id: `pricing-${_index}`,
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
        bookmarked: bookmarkedItems.has(`pricing-${_index}`),
        feedback: feedbackItems.get(`pricing-${_index}`)
      })
    })

    // Recommandations marketing
    recommendations.marketing.forEach((rec, _index) => {
      unified.push({
        id: `marketing-${_index}`,
        type: 'marketing',
        title: `Stratégie marketing: ${rec.strategy}`,
        description: `Cibler ${rec.targetAudience} via ${(rec.channels ?? []).join(', ')}`,
        confidence: rec.confidence,
        priority: rec.confidence > 0.8 ? 'high' : rec.confidence > 0.6 ? 'medium' : 'low',
        effort: (rec.channels ?? []).length > 2 ? 'high' : 'medium',
        impact: rec.expectedOutcome,
        timeline: rec.timeline,
        actionable: true,
        data: rec,
        bookmarked: bookmarkedItems.has(`marketing-${_index}`),
        feedback: feedbackItems.get(`marketing-${_index}`)
      })
    })

    // Opportunités
    recommendations.opportunities.forEach((rec, _index) => {
      unified.push({
        id: `opportunity-${_index}`,
        type: 'opportunity',
        title: rec.opportunity,
        description: rec.description,
        confidence: rec.confidence,
        priority:
          rec.profitPotential === 'high'
            ? 'high'
            : rec.profitPotential === 'medium'
            ? 'medium'
            : 'low',
        effort: rec.effort,
        impact: `Potentiel ${rec.profitPotential}`,
        timeline: rec.timeline,
        actionable: true,
        data: rec,
        bookmarked: bookmarkedItems.has(`opportunity-${_index}`),
        feedback: feedbackItems.get(`opportunity-${_index}`)
      })
    })

    // Risques
    recommendations.risks.forEach((rec, _index) => {
      unified.push({
        id: `risk-${_index}`,
        type: 'risk',
        title: `Risque: ${rec.risk}`,
        description: rec.mitigation,
        confidence: rec.confidence,
        priority:
          rec.severity === 'high'
            ? 'high'
            : rec.severity === 'medium'
            ? 'medium'
            : 'low',
        effort: (rec.preventionSteps ?? []).length > 3 ? 'high' : 'medium',
        impact: `Sévérité ${rec.severity}`,
        timeline: 'À planifier',
        actionable: true,
        data: rec,
        bookmarked: bookmarkedItems.has(`risk-${_index}`),
        feedback: feedbackItems.get(`risk-${_index}`)
      })
    })

    return unified.sort((a, b) => {
      // Trier par priorité puis par confiance
      const priorityOrder = { high: 3, medium: 2, low: 1 } as const
      const priorityDiff = priorityOrder[b.priority]! - priorityOrder[a.priority]!
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
  const handleActionExecute = useCallback((
    recommendation: RecommendationWithActions,
    actionType: RecommendationAction['type'],
    data?: unknown
  ) => {
    const action: RecommendationAction = { type: actionType, data }
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
  const renderRecommendation = (recommendation: RecommendationWithActions, _index: number) => {
    const isExpanded = expandedRecommendation === recommendation.id
    const config = typeConfig[recommendation.type]
    const priorityConf = priorityConfig[recommendation.priority]
    const effortConf = effortConfig[recommendation.effort]
    const Icon = config.icon

    const detailsId = `rec-details-${recommendation.id}`

    const formatPrice = (value: unknown) =>
      typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(2)}€` : 'N/A'

    return (
      <div
        key={recommendation.id}
        role="listitem"
        className="transition-all duration-200"
      >
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className={cn(
                  'p-2 rounded-lg',
                  config.bgClass,
                  config.textClass
                )}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg mb-1">{recommendation.title}</CardTitle>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] dark:text-[hsl(var(--muted-foreground))]">
                    {recommendation.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 ml-4">
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  aria-pressed={!!recommendation.bookmarked}
                  aria-label={recommendation.bookmarked ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                  title={recommendation.bookmarked ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                  onClick={() => handleBookmark(recommendation)}
                  className="p-2"
                >
                  {recommendation.bookmarked ?
                    <BookmarkCheck className="h-4 w-4" aria-hidden="true" /> :
                    <Bookmark className="h-4 w-4" aria-hidden="true" />
                  }
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  aria-label="Partager la recommandation"
                  title="Partager la recommandation"
                  onClick={() => onShare?.(recommendation.data)}
                  className="p-2"
                >
                  <ShareIcon className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {/* Métriques */}
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-sm text-[hsl(var(--muted-foreground))] mb-1">Confiance</div>
                <div className="font-semibold text-lg">
                  {(recommendation.confidence * 100).toFixed(0)}%
                </div>
                <Progress
                  value={recommendation.confidence * 100}
                  className="h-1 mt-1"
                  aria-label="Niveau de confiance"
                />
              </div>

              <div className="text-center">
                <div className="text-sm text-[hsl(var(--muted-foreground))] mb-1">Priorité</div>
                <Badge
                  variant={recommendation.priority === 'high' ? 'destructive' :
                         recommendation.priority === 'medium' ? 'default' : 'secondary'}
                  aria-label={`Priorité ${priorityConf.label}`}
                >
                  {priorityConf.label}
                </Badge>
              </div>

              <div className="text-center">
                <div className="text-sm text-[hsl(var(--muted-foreground))] mb-1">Effort</div>
                <div className="flex justify-center gap-1" aria-label={`Effort ${effortConf.label}`}>
                  {Array.from({ length: 3 }, (_, i) => (
                    <div
                      key={i}
                      className={cn(
                        'w-2 h-4 rounded-sm',
                        i < effortConf.bars
                          ? effortConf.barClass
                          : 'bg-[hsl(var(--muted))]'
                      )}
                      aria-hidden="true"
                    />
                  ))}
                </div>
              </div>

              <div className="text-center">
                <div className="text-sm text-[hsl(var(--muted-foreground))] mb-1">Délai</div>
                <div className="text-sm font-medium">{recommendation.timeline}</div>
              </div>
            </div>

            {/* Impact */}
            <div className="mb-4 p-3 bg-[hsl(var(--muted))] dark:bg-[hsl(var(--muted))] rounded-lg">
              <div className="text-sm font-medium mb-1">Impact attendu</div>
              <p className="text-sm text-[hsl(var(--muted-foreground))] dark:text-[hsl(var(--muted-foreground))]">
                {recommendation.impact}
              </p>
            </div>

            {/* Actions principales */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => handleActionExecute(recommendation, 'apply')}
                  className="flex items-center gap-2"
                  aria-label="Appliquer la recommandation"
                >
                  <Play className="h-4 w-4" aria-hidden="true" />
                  Appliquer
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleActionExecute(recommendation, 'schedule')}
                  className="flex items-center gap-2"
                  aria-label="Planifier la recommandation"
                >
                  <Calendar className="h-4 w-4" aria-hidden="true" />
                  Planifier
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => toggleExpanded(recommendation.id)}
                  aria-expanded={isExpanded}
                  aria-controls={detailsId}
                >
                  {isExpanded ? 'Moins' : 'Plus'} de détails
                </Button>
              </div>

              {/* Feedback */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  aria-pressed={recommendation.feedback === 'positive'}
                  aria-label="Retours positifs"
                  onClick={() => handleFeedback(recommendation, 'positive')}
                  className={cn(
                    'p-2',
                    recommendation.feedback === 'positive' && 'text-[hsl(var(--success-foreground))] bg-[hsl(var(--success))]'
                  )}
                >
                  <ThumbsUp className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  aria-pressed={recommendation.feedback === 'negative'}
                  aria-label="Retours négatifs"
                  onClick={() => handleFeedback(recommendation, 'negative')}
                  className={cn(
                    'p-2',
                    recommendation.feedback === 'negative' && 'text-[hsl(var(--destructive-foreground))] bg-[hsl(var(--destructive))]'
                  )}
                >
                  <ThumbsDown className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>

            {/* Détails étendus */}
              {isExpanded && (
                <div
                  id={detailsId}
                  className="transition-all duration-300 ease-in-out"
                  style={{ opacity: isExpanded ? 1 : 0, height: isExpanded ? 'auto' : 0 }}
                >
                  <Separator className="mb-4" />

                  {/* Détails spécifiques par type */}
                  {recommendation.type === 'pricing' && (
                    <div className="space-y-3">
                      <div>
                        <h5 className="font-medium mb-2">Détails de prix</h5>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-[hsl(var(--muted-foreground))]">Prix optimal:</span>
                            <span className="ml-2 font-medium">
                              {formatPrice((recommendation as RecommendationWithActions<'pricing'>).data?.optimalPrice)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[hsl(var(--muted-foreground))]">Fourchette:</span>
                            <span className="ml-2 font-medium">
                              {formatPrice((recommendation as RecommendationWithActions<'pricing'>).data?.priceRange?.min)} - {formatPrice((recommendation as RecommendationWithActions<'pricing'>).data?.priceRange?.max)}
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
                          {((recommendation as RecommendationWithActions<'marketing'>).data?.channels ?? []).map((channel: string, idx: number) => (
                            <Badge key={idx} variant="outline">
                              {channel}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h5 className="font-medium mb-1">Audience cible</h5>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">
                          {(recommendation as RecommendationWithActions<'marketing'>).data?.targetAudience ?? 'N/A'}
                        </p>
                      </div>
                    </div>
                  )}

                  {recommendation.type === 'opportunity' && (
                    <div className="space-y-3">
                      <div>
                        <h5 className="font-medium mb-2">Étapes d'action</h5>
                        <ul className="text-sm space-y-1">
                          {((recommendation as RecommendationWithActions<'opportunity'>).data?.actionSteps ?? []).map((step: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-[hsl(var(--primary-foreground))] mt-0.5">•</span>
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
                          {((recommendation as RecommendationWithActions<'risk'>).data?.preventionSteps ?? []).map((step: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-[hsl(var(--destructive-foreground))] mt-0.5">•</span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Actions secondaires */}
                  <div className="flex gap-2 mt-4 pt-4 border-t border-[hsl(var(--border))] dark:border-[hsl(var(--border))]">
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={() => handleActionExecute(recommendation, 'modify')}
                      className="flex items-center gap-2"
                      aria-label="Modifier la recommandation"
                    >
                      <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                      Modifier
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={() => handleActionExecute(recommendation, 'export')}
                      className="flex items-center gap-2"
                      aria-label="Exporter la recommandation"
                    >
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      Exporter
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={() => handleActionExecute(recommendation, 'learn-more')}
                      className="flex items-center gap-2"
                      aria-label="En savoir plus sur la recommandation"
                    >
                      <MessageSquare className="h-4 w-4" aria-hidden="true" />
                      En savoir plus
                    </Button>
                  </div>
                </div>
              )}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!recommendations || unifiedRecommendations.length === 0) {
    return (
      <Card className={className ?? ''}>
        <CardContent className="text-center py-8">
          <Target className="h-12 w-12 text-[hsl(var(--muted-foreground))] mx-auto mb-4" aria-hidden="true" />
          <h3 className="text-lg font-medium text-[hsl(var(--muted-foreground))] dark:text-[hsl(var(--muted-foreground))] mb-2">
            Aucune recommandation disponible
          </h3>
          <p className="text-[hsl(var(--muted-foreground))] dark:text-[hsl(var(--muted-foreground))]">
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
              <div className="text-2xl font-bold text-[hsl(var(--primary-foreground))]">{stats.total}</div>
              <div className="text-sm text-[hsl(var(--muted-foreground))]">Total</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-[hsl(var(--destructive-foreground))]">{stats.highPriority}</div>
              <div className="text-sm text-[hsl(var(--muted-foreground))]">Haute priorité</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-[hsl(var(--accent-foreground))]">{stats.bookmarked}</div>
              <div className="text-sm text-[hsl(var(--muted-foreground))]">Favoris</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-[hsl(var(--success-foreground))]">
                {(stats.avgConfidence * 100).toFixed(0)}%
              </div>
              <div className="text-sm text-[hsl(var(--muted-foreground))]">Confiance moy.</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Onglets */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full" aria-label="Filtres de recommandations">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">Toutes ({stats.total})</TabsTrigger>
          <TabsTrigger value="pricing">Prix ({unifiedRecommendations.filter(r => r.type === 'pricing').length})</TabsTrigger>
          <TabsTrigger value="marketing">Marketing ({unifiedRecommendations.filter(r => r.type === 'marketing').length})</TabsTrigger>
          <TabsTrigger value="opportunity">Opportunités ({unifiedRecommendations.filter(r => r.type === 'opportunity').length})</TabsTrigger>
          <TabsTrigger value="risk">Risques ({unifiedRecommendations.filter(r => r.type === 'risk').length})</TabsTrigger>
          <TabsTrigger value="bookmarked">Favoris ({stats.bookmarked})</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <div className="space-y-4" role="list" aria-label="Liste des recommandations">
              {filteredRecommendations.map((recommendation, _index) =>
                renderRecommendation(recommendation, _index)
              )}
          </div>
        </div>
      </Tabs>

      {/* Plan d'action global */}
      {recommendations?.actionPlan && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" aria-hidden="true" />
              Plan d'action global
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="immediate" className="w-full" aria-label="Plan d'action">
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
                  {recommendations.actionPlan.immediate.map((action, _index) => (
                    <div key={_index} className="flex items-center justify-between p-3 bg-[hsl(var(--muted))] dark:bg-[hsl(var(--muted))] rounded-lg">
                      <div className="flex-1">
                        <h5 className="font-medium">{action.action}</h5>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">{action.expectedImpact}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={action.priority === 'high' ? 'destructive' : 'default'}>
                          {action.priority}
                        </Badge>
                        <Button size="sm" type="button" aria-label={`Démarrer: ${action.action}`}>Démarrer</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="shortTerm" className="mt-4">
                <div className="space-y-2">
                  {recommendations.actionPlan.shortTerm.map((action, _index) => (
                    <div key={_index} className="flex items-center justify-between p-3 bg-[hsl(var(--muted))] dark:bg-[hsl(var(--muted))] rounded-lg">
                      <div className="flex-1">
                        <h5 className="font-medium">{action.action}</h5>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">{action.expectedOutcome}</p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">{action.timeline}</p>
                      </div>
                      <Button size="sm" variant="outline" type="button" aria-label={`Planifier: ${action.action}`}>Planifier</Button>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="longTerm" className="mt-4">
                <div className="space-y-2">
                  {recommendations.actionPlan.longTerm.map((action, _index) => (
                    <div key={_index} className="flex items-center justify-between p-3 bg-[hsl(var(--muted))] dark:bg-[hsl(var(--muted))] rounded-lg">
                      <div className="flex-1">
                        <h5 className="font-medium">{action.strategy}</h5>
                        <div className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                          <div>Objectifs: {(action.goals ?? []).join(', ')}</div>
                          <div>Métriques: {(action.metrics ?? []).join(', ')}</div>
                        </div>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">{action.timeline}</p>
                      </div>
                      <Button size="sm" variant="outline" type="button" aria-label={`Étudier: ${action.strategy}`}>Étudier</Button>
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