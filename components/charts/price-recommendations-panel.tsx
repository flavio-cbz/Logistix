"use client"

import React, { useState, useCallback, useMemo } from 'react'
import { useAccessibility } from '@/lib/contexts/accessibility-context'
import { cn } from '@/lib/utils'
import { PriceRecommendationCard } from './price-recommendation-card'
import { PriceRecommendation, RecommendationContext, PricingStrategy } from '@/lib/analytics/price-recommendation-engine'

export interface PriceRecommendationsPanelProps {
  recommendations: PriceRecommendation[]
  context?: Partial<RecommendationContext>
  onRecommendationSelect?: (recommendation: PriceRecommendation) => void
  onRecommendationApply?: (recommendation: PriceRecommendation) => void
  onContextChange?: (context: Partial<RecommendationContext>) => void
  showContextControls?: boolean
  className?: string
}

const priorityOptions = [
  { value: 'speed', label: 'Vente rapide', icon: '⚡' },
  { value: 'profit', label: 'Maximiser profit', icon: '💰' },
  { value: 'market_share', label: 'Part de marché', icon: '📈' }
] as const

const timeframeOptions = [
  { value: 'immediate', label: 'Immédiat (< 1 semaine)', icon: '🚨' },
  { value: 'short_term', label: 'Court terme (1-4 semaines)', icon: '📅' },
  { value: 'long_term', label: 'Long terme (> 1 mois)', icon: '📆' }
] as const

const riskToleranceOptions = [
  { value: 'conservative', label: 'Conservateur', icon: '🛡️' },
  { value: 'moderate', label: 'Modéré', icon: '⚖️' },
  { value: 'aggressive', label: 'Agressif', icon: '🎯' }
] as const

const conditionOptions = [
  { value: 'new', label: 'Neuf', icon: '✨' },
  { value: 'excellent', label: 'Excellent', icon: '⭐' },
  { value: 'good', label: 'Bon', icon: '👍' },
  { value: 'fair', label: 'Correct', icon: '👌' },
  { value: 'poor', label: 'Usé', icon: '👎' }
] as const

const seasonalityOptions = [
  { value: 'peak', label: 'Haute saison', icon: '🔥' },
  { value: 'normal', label: 'Saison normale', icon: '📊' },
  { value: 'low', label: 'Basse saison', icon: '❄️' }
] as const

const urgencyOptions = [
  { value: 'low', label: 'Pas pressé', icon: '🐌' },
  { value: 'medium', label: 'Modérée', icon: '🚶' },
  { value: 'high', label: 'Urgent', icon: '🏃' }
] as const

export const PriceRecommendationsPanel: React.FC<PriceRecommendationsPanelProps> = ({
  recommendations,
  context = {},
  onRecommendationSelect,
  onRecommendationApply,
  onContextChange,
  showContextControls = true,
  className
}) => {
  const { announceToScreenReader } = useAccessibility()
  const [selectedStrategy, setSelectedStrategy] = useState<PricingStrategy | null>(null)
  const [sortBy, setSortBy] = useState<'confidence' | 'price' | 'speed' | 'risk'>('confidence')
  const [showAllDetails, setShowAllDetails] = useState(false)

  // Contexte par défaut
  const defaultContext: RecommendationContext = {
    userGoals: {
      priority: 'profit',
      timeframe: 'short_term',
      riskTolerance: 'moderate'
    },
    itemCondition: 'good',
    seasonality: 'normal',
    inventory: {
      quantity: 1,
      urgency: 'medium'
    }
  }

  const currentContext = { ...defaultContext, ...context }

  // Tri des recommandations
  const sortedRecommendations = useMemo(() => {
    const sorted = [...recommendations].sort((a, b) => {
      switch (sortBy) {
        case 'confidence':
          return b.confidence - a.confidence
        case 'price':
          return b.recommendedPrice - a.recommendedPrice
        case 'speed':
          return a.expectedSaleTime - b.expectedSaleTime
        case 'risk':
          const riskOrder = { low: 0, medium: 1, high: 2 }
          return riskOrder[a.riskAssessment.level] - riskOrder[b.riskAssessment.level]
        default:
          return 0
      }
    })
    return sorted
  }, [recommendations, sortBy])

  // Gestionnaires d'événements
  const handleRecommendationSelect = useCallback((recommendation: PriceRecommendation) => {
    setSelectedStrategy(recommendation.strategy)
    onRecommendationSelect?.(recommendation)
  }, [onRecommendationSelect])

  const handleContextChange = useCallback((field: string, value: any) => {
    const newContext = { ...currentContext }
    
    // Navigation dans l'objet imbriqué
    const keys = field.split('.')
    let current = newContext as any
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {}
      current = current[keys[i]]
    }
    
    current[keys[keys.length - 1]] = value
    
    onContextChange?.(newContext)
    announceToScreenReader(`Contexte mis à jour: ${field} = ${value}`)
  }, [currentContext, onContextChange, announceToScreenReader])

  const handleSortChange = useCallback((newSortBy: typeof sortBy) => {
    setSortBy(newSortBy)
    announceToScreenReader(`Tri changé: ${newSortBy}`)
  }, [announceToScreenReader])

  // Statistiques des recommandations
  const stats = useMemo(() => {
    if (recommendations.length === 0) return null

    const prices = recommendations.map(r => r.recommendedPrice)
    const confidences = recommendations.map(r => r.confidence)
    const saleTimes = recommendations.map(r => r.expectedSaleTime)

    return {
      priceRange: {
        min: Math.min(...prices),
        max: Math.max(...prices)
      },
      avgConfidence: confidences.reduce((sum, c) => sum + c, 0) / confidences.length,
      avgSaleTime: saleTimes.reduce((sum, t) => sum + t, 0) / saleTimes.length
    }
  }, [recommendations])

  return (
    <div className={cn('price-recommendations-panel', className)}>
      {/* En-tête avec statistiques */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">
            Recommandations de prix
          </h2>
          
          {stats && (
            <div className="text-sm text-gray-600">
              {recommendations.length} stratégies • 
              {stats.priceRange.min.toFixed(2)}€ - {stats.priceRange.max.toFixed(2)}€
            </div>
          )}
        </div>

        {/* Statistiques globales */}
        {stats && (
          <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {stats.priceRange.min.toFixed(0)}€ - {stats.priceRange.max.toFixed(0)}€
              </div>
              <div className="text-sm text-gray-600">Fourchette de prix</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {(stats.avgConfidence * 100).toFixed(0)}%
              </div>
              <div className="text-sm text-gray-600">Confiance moyenne</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {Math.round(stats.avgSaleTime)}j
              </div>
              <div className="text-sm text-gray-600">Délai moyen</div>
            </div>
          </div>
        )}
      </div>

      {/* Contrôles de contexte */}
      {showContextControls && (
        <div className="mb-6 p-4 bg-white border border-gray-200 rounded-lg">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            ⚙️ Personnaliser les recommandations
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Priorité */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Priorité principale
              </label>
              <select
                value={currentContext.userGoals.priority}
                onChange={(e) => handleContextChange('userGoals.priority', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {priorityOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.icon} {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Horizon temporel */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Horizon de vente
              </label>
              <select
                value={currentContext.userGoals.timeframe}
                onChange={(e) => handleContextChange('userGoals.timeframe', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {timeframeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.icon} {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Tolérance au risque */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Tolérance au risque
              </label>
              <select
                value={currentContext.userGoals.riskTolerance}
                onChange={(e) => handleContextChange('userGoals.riskTolerance', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {riskToleranceOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.icon} {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* État de l'article */}
            <div>
              <label className="block text-sm font-medium mb-2">
                État de l'article
              </label>
              <select
                value={currentContext.itemCondition}
                onChange={(e) => handleContextChange('itemCondition', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {conditionOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.icon} {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Saisonnalité */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Période de vente
              </label>
              <select
                value={currentContext.seasonality}
                onChange={(e) => handleContextChange('seasonality', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {seasonalityOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.icon} {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Urgence */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Urgence de vente
              </label>
              <select
                value={currentContext.inventory.urgency}
                onChange={(e) => handleContextChange('inventory.urgency', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {urgencyOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.icon} {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Contrôles de tri et d'affichage */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium">Trier par:</label>
          <select
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value as typeof sortBy)}
            className="px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="confidence">Confiance</option>
            <option value="price">Prix (décroissant)</option>
            <option value="speed">Rapidité de vente</option>
            <option value="risk">Niveau de risque</option>
          </select>
        </div>

        <button
          onClick={() => setShowAllDetails(!showAllDetails)}
          className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
        >
          {showAllDetails ? 'Masquer' : 'Afficher'} tous les détails
        </button>
      </div>

      {/* Liste des recommandations */}
      <div className="space-y-4">
        {sortedRecommendations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">📊</div>
            <p>Aucune recommandation disponible</p>
            <p className="text-sm">Vérifiez que les données d'analyse sont complètes</p>
          </div>
        ) : (
          sortedRecommendations.map((recommendation, index) => (
            <PriceRecommendationCard
              key={recommendation.strategy}
              recommendation={recommendation}
              isSelected={selectedStrategy === recommendation.strategy}
              onSelect={handleRecommendationSelect}
              onApply={onRecommendationApply}
              showDetails={showAllDetails}
              className={index === 0 ? 'ring-2 ring-blue-200' : ''}
            />
          ))
        )}
      </div>

      {/* Conseils généraux */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
          💡 Conseils pour optimiser vos prix
        </h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Surveillez régulièrement les prix de la concurrence</li>
          <li>• Ajustez vos prix selon la saisonnalité de votre catégorie</li>
          <li>• Testez différentes stratégies pour trouver ce qui fonctionne</li>
          <li>• Considérez l'état réel de vos articles dans le pricing</li>
          <li>• N'hésitez pas à négocier si un acheteur montre de l'intérêt</li>
        </ul>
      </div>

      {/* Informations d'accessibilité */}
      <div className="sr-only" aria-live="polite">
        {recommendations.length} recommandations de prix disponibles, 
        triées par {sortBy}. 
        {selectedStrategy && `Stratégie ${selectedStrategy} sélectionnée.`}
      </div>
    </div>
  )
}

export default PriceRecommendationsPanel