"use client"

import React, { useState, useCallback } from 'react'
import { useAccessibility } from '@/lib/contexts/accessibility-context'
import { cn } from '@/lib/utils'
import { PriceRecommendation, PricingStrategy } from '@/lib/analytics/price-recommendation-engine'

export interface PriceRecommendationCardProps {
  recommendation: PriceRecommendation
  isSelected?: boolean
  onSelect?: (recommendation: PriceRecommendation) => void
  onApply?: (recommendation: PriceRecommendation) => void
  showDetails?: boolean
  className?: string
}

const strategyConfig = {
  competitive: {
    title: 'Compétitif',
    icon: '⚖️',
    color: 'blue',
    description: 'Prix aligné sur la concurrence'
  },
  premium: {
    title: 'Premium',
    icon: '💎',
    color: 'purple',
    description: 'Prix élevé pour maximiser la marge'
  },
  value: {
    title: 'Rapport qualité-prix',
    icon: '🎯',
    color: 'green',
    description: 'Équilibre entre prix et attractivité'
  },
  penetration: {
    title: 'Pénétration',
    icon: '🚀',
    color: 'orange',
    description: 'Prix bas pour une vente rapide'
  }
}

const riskConfig = {
  low: { label: 'Faible', color: 'green', icon: '🟢' },
  medium: { label: 'Modéré', color: 'yellow', icon: '🟡' },
  high: { label: 'Élevé', color: 'red', icon: '🔴' }
}

export const PriceRecommendationCard: React.FC<PriceRecommendationCardProps> = ({
  recommendation,
  isSelected = false,
  onSelect,
  onApply,
  showDetails = false,
  className
}) => {
  const { announceToScreenReader, preferences } = useAccessibility()
  const [expanded, setExpanded] = useState(showDetails)
  const [showReasoning, setShowReasoning] = useState(false)

  const strategy = strategyConfig[recommendation.strategy]
  const risk = riskConfig[recommendation.riskAssessment.level]

  const handleSelect = useCallback(() => {
    onSelect?.(recommendation)
    announceToScreenReader(
      `Stratégie ${strategy.title} sélectionnée. Prix recommandé: ${recommendation.recommendedPrice}€`
    )
  }, [onSelect, recommendation, strategy.title, announceToScreenReader])

  const handleApply = useCallback(() => {
    onApply?.(recommendation)
    announceToScreenReader(
      `Stratégie ${strategy.title} appliquée avec le prix de ${recommendation.recommendedPrice}€`
    )
  }, [onApply, recommendation, strategy.title, announceToScreenReader])

  const handleToggleDetails = useCallback(() => {
    setExpanded(!expanded)
    announceToScreenReader(
      `Détails ${expanded ? 'masqués' : 'affichés'} pour la stratégie ${strategy.title}`
    )
  }, [expanded, strategy.title, announceToScreenReader])

  const handleToggleReasoning = useCallback(() => {
    setShowReasoning(!showReasoning)
    announceToScreenReader(
      `Explications ${showReasoning ? 'masquées' : 'affichées'}`
    )
  }, [showReasoning, announceToScreenReader])

  const getColorClasses = (color: string, variant: 'bg' | 'border' | 'text' = 'bg') => {
    const colorMap = {
      blue: {
        bg: 'bg-blue-50 hover:bg-blue-100',
        border: 'border-blue-200',
        text: 'text-blue-700'
      },
      purple: {
        bg: 'bg-purple-50 hover:bg-purple-100',
        border: 'border-purple-200',
        text: 'text-purple-700'
      },
      green: {
        bg: 'bg-green-50 hover:bg-green-100',
        border: 'border-green-200',
        text: 'text-green-700'
      },
      orange: {
        bg: 'bg-orange-50 hover:bg-orange-100',
        border: 'border-orange-200',
        text: 'text-orange-700'
      }
    }
    return colorMap[color as keyof typeof colorMap]?.[variant] || colorMap.blue[variant]
  }

  const formatPercentage = (value: number) => {
    const percentage = value * 100
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(1)}%`
  }

  const formatDays = (days: number) => {
    if (days === 1) return '1 jour'
    if (days < 7) return `${days} jours`
    if (days < 30) return `${Math.round(days / 7)} semaine${Math.round(days / 7) > 1 ? 's' : ''}`
    return `${Math.round(days / 30)} mois`
  }

  return (
    <div
      className={cn(
        'border rounded-lg p-4 transition-all duration-200',
        getColorClasses(strategy.color, 'bg'),
        getColorClasses(strategy.color, 'border'),
        isSelected && 'ring-2 ring-offset-2 ring-blue-500',
        'focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500',
        className
      )}
      role="article"
      aria-labelledby={`strategy-${recommendation.strategy}`}
      aria-describedby={`strategy-${recommendation.strategy}-description`}
    >
      {/* En-tête de la carte */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden="true">
            {strategy.icon}
          </span>
          <div>
            <h3 
              id={`strategy-${recommendation.strategy}`}
              className={cn('font-semibold text-lg', getColorClasses(strategy.color, 'text'))}
            >
              {strategy.title}
            </h3>
            <p 
              id={`strategy-${recommendation.strategy}-description`}
              className="text-sm text-gray-600"
            >
              {strategy.description}
            </p>
          </div>
        </div>

        {/* Indicateur de confiance */}
        <div className="text-right">
          <div className="text-xs text-gray-500 mb-1">Confiance</div>
          <div className="flex items-center gap-1">
            <div 
              className="w-12 h-2 bg-gray-200 rounded-full overflow-hidden"
              role="progressbar"
              aria-valuenow={recommendation.confidence * 100}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Niveau de confiance: ${(recommendation.confidence * 100).toFixed(0)}%`}
            >
              <div 
                className={cn(
                  'h-full transition-all duration-300',
                  recommendation.confidence > 0.7 ? 'bg-green-500' :
                  recommendation.confidence > 0.5 ? 'bg-yellow-500' : 'bg-red-500'
                )}
                style={{ width: `${recommendation.confidence * 100}%` }}
              />
            </div>
            <span className="text-xs font-medium">
              {(recommendation.confidence * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      </div>

      {/* Prix recommandé */}
      <div className="mb-4">
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-3xl font-bold text-gray-900">
            {recommendation.recommendedPrice.toFixed(2)}€
          </span>
          <span className="text-sm text-gray-500">
            recommandé
          </span>
        </div>

        {/* Fourchette de prix */}
        <div className="text-sm text-gray-600">
          Fourchette: {recommendation.priceRange.min.toFixed(2)}€ - {recommendation.priceRange.max.toFixed(2)}€
        </div>
      </div>

      {/* Métriques clés */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center p-2 bg-white bg-opacity-50 rounded">
          <div className="text-xs text-gray-500 mb-1">Vente estimée</div>
          <div className="font-semibold text-sm">
            {formatDays(recommendation.expectedSaleTime)}
          </div>
        </div>
        
        <div className="text-center p-2 bg-white bg-opacity-50 rounded">
          <div className="text-xs text-gray-500 mb-1">Part de marché</div>
          <div className="font-semibold text-sm">
            {(recommendation.marketShare * 100).toFixed(1)}%
          </div>
        </div>
        
        <div className="text-center p-2 bg-white bg-opacity-50 rounded">
          <div className="text-xs text-gray-500 mb-1">Risque</div>
          <div className="flex items-center justify-center gap-1">
            <span className="text-xs">{risk.icon}</span>
            <span className="font-semibold text-xs">{risk.label}</span>
          </div>
        </div>
      </div>

      {/* Position concurrentielle */}
      <div className="mb-4 p-3 bg-white bg-opacity-50 rounded">
        <h4 className="font-medium text-sm mb-2">Position concurrentielle</h4>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-gray-500">vs Moyenne:</span>
            <span className={cn(
              'ml-1 font-medium',
              recommendation.competitivePosition.vsAverage >= 0 ? 'text-green-600' : 'text-red-600'
            )}>
              {formatPercentage(recommendation.competitivePosition.vsAverage)}
            </span>
          </div>
          <div>
            <span className="text-gray-500">vs Médiane:</span>
            <span className={cn(
              'ml-1 font-medium',
              recommendation.competitivePosition.vsMedian >= 0 ? 'text-green-600' : 'text-red-600'
            )}>
              {formatPercentage(recommendation.competitivePosition.vsMedian)}
            </span>
          </div>
        </div>
        <div className="mt-2">
          <span className="text-gray-500">Percentile:</span>
          <span className="ml-1 font-medium">
            {(recommendation.competitivePosition.percentile * 100).toFixed(0)}e
          </span>
        </div>
      </div>

      {/* Boutons d'action */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={handleSelect}
          className={cn(
            'flex-1 px-3 py-2 text-sm font-medium rounded transition-colors',
            isSelected 
              ? 'bg-blue-600 text-white' 
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          )}
          aria-pressed={isSelected}
        >
          {isSelected ? 'Sélectionné' : 'Sélectionner'}
        </button>
        
        {onApply && (
          <button
            onClick={handleApply}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded transition-colors',
              getColorClasses(strategy.color, 'text'),
              'bg-white border border-current hover:bg-opacity-10 hover:bg-current'
            )}
          >
            Appliquer
          </button>
        )}
      </div>

      {/* Bouton pour afficher/masquer les détails */}
      <button
        onClick={handleToggleDetails}
        className="w-full text-sm text-gray-600 hover:text-gray-800 transition-colors"
        aria-expanded={expanded}
        aria-controls={`details-${recommendation.strategy}`}
      >
        {expanded ? '▼ Masquer les détails' : '▶ Voir les détails'}
      </button>

      {/* Détails étendus */}
      {expanded && (
        <div 
          id={`details-${recommendation.strategy}`}
          className="mt-4 pt-4 border-t border-gray-200"
          style={{
            transition: preferences.reducedMotion ? 'none' : 'all 0.3s ease'
          }}
        >
          {/* Facteurs de risque */}
          {recommendation.riskAssessment.factors.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                {risk.icon} Facteurs de risque
              </h4>
              <ul className="text-xs text-gray-600 space-y-1">
                {recommendation.riskAssessment.factors.map((factor, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-gray-400 mt-0.5">•</span>
                    <span>{factor}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Explications */}
          <div className="mb-4">
            <button
              onClick={handleToggleReasoning}
              className="font-medium text-sm mb-2 flex items-center gap-2 hover:text-gray-800 transition-colors"
              aria-expanded={showReasoning}
              aria-controls={`reasoning-${recommendation.strategy}`}
            >
              💡 Pourquoi ce prix ?
              <span className="text-xs">
                {showReasoning ? '▼' : '▶'}
              </span>
            </button>
            
            {showReasoning && (
              <div 
                id={`reasoning-${recommendation.strategy}`}
                className="bg-white bg-opacity-70 rounded p-3"
              >
                <ul className="text-xs text-gray-700 space-y-2">
                  {recommendation.reasoning.map((reason, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">✓</span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Recommandations d'usage */}
          <div className="text-xs text-gray-600 bg-white bg-opacity-70 rounded p-3">
            <h5 className="font-medium mb-1">💡 Conseil d'utilisation</h5>
            {recommendation.strategy === 'competitive' && (
              <p>Idéal pour un premier prix ou quand vous ne connaissez pas bien le marché.</p>
            )}
            {recommendation.strategy === 'premium' && (
              <p>Utilisez si votre article est en excellent état et que vous n'êtes pas pressé.</p>
            )}
            {recommendation.strategy === 'value' && (
              <p>Le meilleur compromis pour la plupart des situations de vente.</p>
            )}
            {recommendation.strategy === 'penetration' && (
              <p>Parfait pour écouler rapidement un stock ou en cas d'urgence financière.</p>
            )}
          </div>
        </div>
      )}

      {/* Informations d'accessibilité pour les lecteurs d'écran */}
      <div className="sr-only">
        Stratégie {strategy.title}: Prix recommandé {recommendation.recommendedPrice}€, 
        confiance {(recommendation.confidence * 100).toFixed(0)}%, 
        vente estimée en {formatDays(recommendation.expectedSaleTime)}, 
        risque {risk.label}.
      </div>
    </div>
  )
}

export default PriceRecommendationCard