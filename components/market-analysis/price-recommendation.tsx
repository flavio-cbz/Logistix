"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Target, 
  TrendingUp, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  DollarSign,
  BarChart3,
  Users
} from "lucide-react"

interface MarketData {
  id: string
  productName: string
  currentPrice: number
  minPrice: number
  maxPrice: number
  avgPrice: number
  salesVolume: number
  competitorCount: number
  trend: 'up' | 'down' | 'stable'
  trendPercentage: number
  lastUpdated: string
  recommendedPrice: number
  profitMargin: number
  marketShare: number
  demandLevel: 'low' | 'medium' | 'high'
}

interface PriceRecommendationProps {
  product: MarketData
  targetMargin: number
}

export function PriceRecommendation({ product, targetMargin }: PriceRecommendationProps) {
  // Calcul des différentes stratégies de prix
  const calculatePricingStrategies = () => {
    const basePrice = product.avgPrice
    
    return {
      competitive: {
        price: basePrice * 0.95,
        description: "Prix compétitif pour maximiser les ventes",
        pros: ["Volume de ventes élevé", "Pénétration rapide du marché", "Pression sur la concurrence"],
        cons: ["Marge réduite", "Guerre des prix possible", "Perception de qualité moindre"],
        risk: "low",
        expectedVolume: product.salesVolume * 1.3,
        expectedMargin: targetMargin * 0.7
      },
      premium: {
        price: basePrice * 1.15,
        description: "Prix premium pour une image de qualité",
        pros: ["Marge élevée", "Image de qualité", "Clientèle fidèle"],
        cons: ["Volume plus faible", "Concurrence accrue", "Sensibilité au prix"],
        risk: "medium",
        expectedVolume: product.salesVolume * 0.8,
        expectedMargin: targetMargin * 1.4
      },
      optimal: {
        price: basePrice * (1 + targetMargin / 100),
        description: "Prix optimal basé sur votre marge cible",
        pros: ["Équilibre volume/marge", "Positionnement stable", "Rentabilité assurée"],
        cons: ["Moins différenciant", "Suivi de marché nécessaire"],
        risk: "low",
        expectedVolume: product.salesVolume,
        expectedMargin: targetMargin
      },
      dynamic: {
        price: basePrice * (product.trend === 'up' ? 1.08 : 0.98),
        description: "Prix adaptatif selon les tendances du marché",
        pros: ["Réactivité au marché", "Optimisation continue", "Adaptation aux cycles"],
        cons: ["Complexité de gestion", "Confusion client possible"],
        risk: "medium",
        expectedVolume: product.salesVolume * (product.trend === 'up' ? 0.9 : 1.1),
        expectedMargin: targetMargin * (product.trend === 'up' ? 1.2 : 0.9)
      }
    }
  }

  const strategies = calculatePricingStrategies()

  // Analyse de positionnement
  const getPositionAnalysis = (price: number) => {
    const percentile = ((price - product.minPrice) / (product.maxPrice - product.minPrice)) * 100
    
    if (percentile < 25) return { position: "Bas de gamme", color: "text-green-600", risk: "Faible" }
    if (percentile < 50) return { position: "Milieu de gamme", color: "text-blue-600", risk: "Faible" }
    if (percentile < 75) return { position: "Haut de gamme", color: "text-orange-600", risk: "Moyen" }
    return { position: "Premium", color: "text-red-600", risk: "Élevé" }
  }

  // Recommandation principale
  const getMainRecommendation = () => {
    if (product.demandLevel === 'high' && product.trend === 'up') {
      return strategies.premium
    }
    if (product.demandLevel === 'low' || product.trend === 'down') {
      return strategies.competitive
    }
    return strategies.optimal
  }

  const mainRecommendation = getMainRecommendation()
  const positionAnalysis = getPositionAnalysis(mainRecommendation.price)

  const getRiskBadge = (risk: string) => {
    const variants = {
      low: "default",
      medium: "secondary",
      high: "destructive"
    } as const

    const labels = {
      low: "Faible",
      medium: "Moyen", 
      high: "Élevé"
    }

    return (
      <Badge variant={variants[risk as keyof typeof variants]}>
        Risque {labels[risk as keyof typeof labels]}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Recommandation principale */}
      <Card className="border-primary">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Target className="mr-2 h-5 w-5" />
              Recommandation Principale
            </CardTitle>
            <Badge variant="default">Recommandé</Badge>
          </div>
          <CardDescription>{mainRecommendation.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 bg-primary/5 rounded-lg">
              <div className="text-3xl font-bold text-primary">
                {mainRecommendation.price.toFixed(2)} €
              </div>
              <p className="text-sm text-muted-foreground">Prix recommandé</p>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {mainRecommendation.expectedMargin.toFixed(1)}%
              </div>
              <p className="text-sm text-muted-foreground">Marge attendue</p>
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {mainRecommendation.expectedVolume.toLocaleString()}
              </div>
              <p className="text-sm text-muted-foreground">Volume estimé</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-medium text-green-600 mb-2 flex items-center">
                <CheckCircle className="mr-1 h-4 w-4" />
                Avantages
              </h4>
              <ul className="text-sm space-y-1">
                {mainRecommendation.pros.map((pro, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-green-500 mr-2">•</span>
                    {pro}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-orange-600 mb-2 flex items-center">
                <AlertTriangle className="mr-1 h-4 w-4" />
                Points d'attention
              </h4>
              <ul className="text-sm space-y-1">
                {mainRecommendation.cons.map((con, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-orange-500 mr-2">•</span>
                    {con}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium">Positionnement:</span>
              <span className={`font-medium ${positionAnalysis.color}`}>
                {positionAnalysis.position}
              </span>
            </div>
            {getRiskBadge(mainRecommendation.risk)}
          </div>
        </CardContent>
      </Card>

      {/* Comparaison des stratégies */}
      <Card>
        <CardHeader>
          <CardTitle>Comparaison des Stratégies de Prix</CardTitle>
          <CardDescription>
            Analyse comparative des différentes approches de pricing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {Object.entries(strategies).map(([key, strategy]) => (
              <Card key={key} className={key === 'optimal' ? 'border-primary/50' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base capitalize">
                      {key === 'competitive' ? 'Compétitif' :
                       key === 'premium' ? 'Premium' :
                       key === 'optimal' ? 'Optimal' : 'Dynamique'}
                    </CardTitle>
                    {getRiskBadge(strategy.risk)}
                  </div>
                  <CardDescription className="text-xs">
                    {strategy.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {strategy.price.toFixed(2)} €
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {((strategy.price / product.avgPrice - 1) * 100).toFixed(1)}% vs marché
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Marge attendue:</span>
                      <span className="font-medium">{strategy.expectedMargin.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Volume estimé:</span>
                      <span className="font-medium">{strategy.expectedVolume.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Performance globale</span>
                      <span>{Math.floor((strategy.expectedMargin / targetMargin) * (strategy.expectedVolume / product.salesVolume) * 50)}%</span>
                    </div>
                    <Progress 
                      value={Math.floor((strategy.expectedMargin / targetMargin) * (strategy.expectedVolume / product.salesVolume) * 50)} 
                      className="h-2"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Alertes et conseils */}
      <div className="space-y-4">
        {product.trend === 'down' && (
          <Alert>
            <TrendingDown className="h-4 w-4" />
            <AlertDescription>
              Le marché est en baisse ({product.trendPercentage}%). Considérez une stratégie compétitive 
              pour maintenir votre part de marché.
            </AlertDescription>
          </Alert>
        )}

        {product.competitorCount > 15 && (
          <Alert>
            <Users className="h-4 w-4" />
            <AlertDescription>
              Marché très concurrentiel ({product.competitorCount} concurrents). 
              La différenciation par la qualité ou le service peut être plus efficace que la guerre des prix.
            </AlertDescription>
          </Alert>
        )}

        {product.demandLevel === 'high' && (
          <Alert>
            <TrendingUp className="h-4 w-4" />
            <AlertDescription>
              Forte demande détectée. C'est le moment idéal pour optimiser vos marges 
              avec une stratégie premium.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Conseils d'optimisation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="mr-2 h-5 w-5" />
            Conseils d'Optimisation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-medium mb-3">Actions recommandées :</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start">
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500 mt-0.5" />
                  Surveillez les prix concurrents hebdomadairement
                </li>
                <li className="flex items-start">
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500 mt-0.5" />
                  Testez différents prix sur de petits volumes
                </li>
                <li className="flex items-start">
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500 mt-0.5" />
                  Analysez l'élasticité prix de votre produit
                </li>
                <li className="flex items-start">
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500 mt-0.5" />
                  Considérez des promotions temporaires
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-3">Métriques à suivre :</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start">
                  <BarChart3 className="mr-2 h-4 w-4 text-blue-500 mt-0.5" />
                  Taux de conversion par niveau de prix
                </li>
                <li className="flex items-start">
                  <BarChart3 className="mr-2 h-4 w-4 text-blue-500 mt-0.5" />
                  Évolution de la part de marché
                </li>
                <li className="flex items-start">
                  <BarChart3 className="mr-2 h-4 w-4 text-blue-500 mt-0.5" />
                  Marge brute par produit
                </li>
                <li className="flex items-start">
                  <BarChart3 className="mr-2 h-4 w-4 text-blue-500 mt-0.5" />
                  Satisfaction client vs prix
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}