"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Target, AlertTriangle, CheckCircle, BarChart3, Users } from "lucide-react"
import { memo, useEffect, useMemo, useState, useCallback } from "react" // Removed React import

import type { VintedAnalysisResult } from '@/types/vinted-market-analysis'

interface PriceRecommendationProps {
  analysis: VintedAnalysisResult
}

type RiskLevel = "low" | "medium" | "high"

interface PricingStrategyData {
  price: number
  description: string
  pros: string[]
  cons: string[]
  risk: RiskLevel
  expectedVolume: number
  expectedMargin: number
}

type StrategiesMap = Record<"competitive" | "premium" | "optimal" | "dynamic" | "historical", PricingStrategyData>

interface AdaptedProduct {
  productName: string
  priceMetrics: {
    avgPrice: number
    minPrice: number
    maxPrice: number
  }
  volumeMetrics: {
    salesVolume: number
    competitorCount: number
  }
}

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(
    Number.isFinite(value) ? value : 0
  )

const formatInteger = (value: number): string =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Number.isFinite(value) ? value : 0)

// Adaptateur pour compatibilité avec l'ancien code
const createProductAdapter = (analysis: VintedAnalysisResult): AdaptedProduct => ({
  productName: "Produit analysé",
  priceMetrics: {
    avgPrice: analysis.avgPrice,
    minPrice: (analysis.priceRange?.min ?? 0),
    maxPrice: (analysis.priceRange?.max ?? 0),
  },
  volumeMetrics: {
    salesVolume: analysis.salesVolume,
    competitorCount: Math.max(5, Math.floor(analysis.salesVolume / 10)),
  },
})

function getPositionAnalysis(price: number, minPrice: number, maxPrice: number): { position: string; color: string; risk: "Faible" | "Moyen" | "Élevé" } {
  const range = Math.max(0, (maxPrice ?? 0) - (minPrice ?? 0))
  const percentile = range > 0 ? ((price - (minPrice ?? 0)) / range) * 100 : 50

  if (percentile < 25) return { position: "Bas de gamme", color: "text-[hsl(var(--success-foreground))]", risk: "Faible" }
  if (percentile < 50) return { position: "Milieu de gamme", color: "text-[hsl(var(--primary-foreground))]", risk: "Faible" }
  if (percentile < 75) return { position: "Haut de gamme", color: "text-[hsl(var(--warning-foreground))]", risk: "Moyen" }
  return { position: "Premium", color: "text-[hsl(var(--destructive-foreground))]", risk: "Élevé" }
}

function getRiskBadge(risk: RiskLevel) {
  const variants = {
    low: "default",
    medium: "secondary",
    high: "destructive",
  } as const

  const labels = {
    low: "Faible",
    medium: "Moyen",
    high: "Élevé",
  } as const

  return (
    <Badge variant={variants[risk]} aria-label={`Risque ${labels[risk]}`}> {/* Removed ! */}
      Risque {labels[risk]} {/* Removed ! */}
    </Badge>
  )
}

function PriceRecommendation({ analysis }: PriceRecommendationProps) {
  const product = useMemo(() => createProductAdapter(analysis), [analysis])
  const [historicalRecommendedPrice, setHistoricalRecommendedPrice] = useState<number | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    let active = true

    const fetchHistoricalRecommendedPrice = async () => {
      try {
        const response = await fetch(
          `/api/historical-prices?productName=${encodeURIComponent(product.productName)}`,
          { signal: controller.signal, credentials: "same-origin" }
        )
        if (!active) return

        if (response.ok) {
          const data: unknown = await response.json()
          const price = typeof (data as any)?.recommendedPrice === "number" ? (data as any).recommendedPrice : null
          setHistoricalRecommendedPrice(price)
        } else {
          console.error("Failed to fetch historical recommended price")
          setHistoricalRecommendedPrice(null)
        }
      } catch (error: any) {
        if (error?.name === "AbortError") return
        console.error("Error fetching historical recommended price:", error)
        setHistoricalRecommendedPrice(null)
      }
    }

    fetchHistoricalRecommendedPrice()
    return () => {
      active = false
      controller.abort()
    }
  }, [product.productName])

  const strategies = useMemo<StrategiesMap>(() => {
    const basePrice = product.priceMetrics.avgPrice || 0
    const sales = product.volumeMetrics.salesVolume || 0
    const MARGIN_BASE = 15 // base hypothétique

    return {
      competitive: {
        price: basePrice * 0.95,
        description: "Prix compétitif pour maximiser les ventes",
        pros: ["Volume de ventes élevé", "Pénétration rapide du marché", "Pression sur la concurrence"],
        cons: ["Marge réduite", "Guerre des prix possible", "Perception de qualité moindre"],
        risk: "low",
        expectedVolume: sales * 1.3,
        expectedMargin: MARGIN_BASE * 0.7,
      },
      premium: {
        price: basePrice * 1.15,
        description: "Prix premium pour une image de qualité",
        pros: ["Marge élevée", "Image de qualité", "Clientèle fidèle"],
        cons: ["Volume plus faible", "Concurrence accrue", "Sensibilité au prix"],
        risk: "medium",
        expectedVolume: sales * 0.8,
        expectedMargin: MARGIN_BASE * 1.4,
      },
      optimal: {
        price: basePrice,
        description: "Prix optimal basé sur votre marge cible",
        pros: ["Équilibre volume/marge", "Positionnement stable", "Rentabilité assurée"],
        cons: ["Moins différenciant", "Suivi de marché nécessaire"],
        risk: "low",
        expectedVolume: sales,
        expectedMargin: MARGIN_BASE,
      },
      dynamic: {
        price: basePrice * 1.02,
        description: "Prix adaptatif selon les tendances du marché",
        pros: ["Réactivité au marché", "Optimisation continue", "Adaptation aux cycles"],
        cons: ["Complexité de gestion", "Confusion client possible"],
        risk: "medium",
        expectedVolume: sales * 1.0,
        expectedMargin: MARGIN_BASE * 1.1,
      },
      historical: {
        price: historicalRecommendedPrice !== null ? historicalRecommendedPrice : basePrice,
        description: "Prix recommandé basé sur l'analyse des données historiques",
        pros: ["Basé sur des données réelles", "Prend en compte les performances passées", "Moins spéculatif"],
        cons: ["Dépend de la qualité des données historiques", "Peut ne pas refléter les changements récents du marché"],
        risk: "low",
        expectedVolume: sales,
        expectedMargin: MARGIN_BASE,
      },
    }
  }, [product.priceMetrics.avgPrice, product.volumeMetrics.salesVolume, historicalRecommendedPrice])

  const mainRecommendation: PricingStrategyData = useMemo(() => {
    if (historicalRecommendedPrice !== null) {
      return strategies.historical
    }
    return strategies.optimal
  }, [historicalRecommendedPrice, strategies])

  const positionAnalysis = useMemo(
    () =>
      getPositionAnalysis(
        mainRecommendation.price,
        product.priceMetrics.minPrice ?? 0,
        product.priceMetrics.maxPrice ?? 0
      ),
    [mainRecommendation.price, product.priceMetrics.minPrice, product.priceMetrics.maxPrice]
  )

  const computePerformance = useCallback(
    (strategy: PricingStrategyData): number => {
      const sales = product.volumeMetrics.salesVolume || 0
      const volumeFactor = sales > 0 ? strategy.expectedVolume / sales : 0
      const perf = Math.floor((strategy.expectedMargin / 15) * volumeFactor * 50)
      return Math.max(0, Math.min(100, perf))
    },
    [product.volumeMetrics.salesVolume]
  )

  return (
    <div className="space-y-6">
      {/* Recommandation principale */}
      <Card className="border-primary">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Target className="mr-2 h-5 w-5" aria-hidden="true" focusable="false" />
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
                {formatCurrency(mainRecommendation.price)}
              </div>
              <p className="text-sm text-muted-foreground">Prix recommandé</p>
            </div>
            <div className="text-center p-4 bg-[hsl(var(--success))] dark:bg-[hsl(var(--success))]/20 rounded-lg">
              <div className="text-2xl font-bold text-[hsl(var(--success-foreground))]">
                {mainRecommendation.expectedMargin.toFixed(1)}%
              </div>
              <p className="text-sm text-muted-foreground">Marge attendue</p>
            </div>
            <div className="text-center p-4 bg-[hsl(var(--primary))] dark:bg-[hsl(var(--primary))]/20 rounded-lg">
              <div className="text-2xl font-bold text-[hsl(var(--primary-foreground))]">
                {formatInteger(mainRecommendation.expectedVolume)}
              </div>
              <p className="text-sm text-muted-foreground">Volume estimé</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-medium text-[hsl(var(--success-foreground))] mb-2 flex items-center">
                <CheckCircle className="mr-1 h-4 w-4" aria-hidden="true" focusable="false" />
                Avantages
              </h4>
              <ul className="text-sm space-y-1">
                {mainRecommendation.pros.map((pro, _index) => (
                  <li key={`${pro}-${_index}`} className="flex items-start"> {/* Corrected index to _index */}
                    <span className="text-[hsl(var(--success-foreground))] mr-2">•</span>
                    {pro}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-[hsl(var(--warning-foreground))] mb-2 flex items-center">
                <AlertTriangle className="mr-1 h-4 w-4" aria-hidden="true" focusable="false" />
                Points d'attention
              </h4>
              <ul className="text-sm space-y-1">
                {mainRecommendation.cons.map((con, _index) => (
                  <li key={`${con}-${_index}`} className="flex items-start"> {/* Corrected index to _index */}
                    <span className="text-[hsl(var(--warning-foreground))] mr-2">•</span>
                    {con}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium">Positionnement:</span>
              <span className={`font-medium ${positionAnalysis.color}`}>{positionAnalysis.position}</span>
            </div>
            {getRiskBadge(mainRecommendation.risk)}
          </div>
        </CardContent>
      </Card>

      {/* Comparaison des stratégies */}
      <Card>
        <CardHeader>
          <CardTitle>Comparaison des Stratégies de Prix</CardTitle>
          <CardDescription>Analyse comparative des différentes approches de pricing</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {(Object.entries(strategies) as Array<[keyof StrategiesMap, PricingStrategyData]>).map(([key, strategy]) => (
              <Card key={key} className={key === "optimal" ? "border-primary/50" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base capitalize">
                      {key === "competitive"
                        ? "Compétitif"
                        : key === "premium"
                        ? "Premium"
                        : key === "optimal"
                        ? "Optimal"
                        : key === "dynamic"
                        ? "Dynamique"
                        : "Historique"}
                    </CardTitle>
                    {getRiskBadge(strategy.risk)}
                  </div>
                  <CardDescription className="text-xs">{strategy.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{formatCurrency(strategy.price)}</div>
                    <div className="text-xs text-muted-foreground">
                      {product.priceMetrics.avgPrice > 0
                        ? `${(((strategy.price / product.priceMetrics.avgPrice) - 1) * 100).toFixed(1)}% vs marché`
                        : "0,0% vs marché"}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Marge attendue:</span>
                      <span className="font-medium">{strategy.expectedMargin.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Volume estimé:</span>
                      <span className="text-sm font-medium">{formatInteger(strategy.expectedVolume)}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Performance globale</span>
                      <span>{computePerformance(strategy)}%</span>
                    </div>
                    <Progress value={computePerformance(strategy)} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Alertes et conseils */}
      <div className="space-y-4">
        {product.volumeMetrics.competitorCount > 15 && (
          <Alert>
            <Users className="h-4 w-4" aria-hidden="true" focusable="false" />
            <AlertDescription>
              Marché très concurrentiel ({product.volumeMetrics.competitorCount} concurrents). La différenciation par la
              qualité ou le service peut être plus efficace que la guerre des prix.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Conseils d'optimisation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="mr-2 h-5 w-5" aria-hidden="true" focusable="false" />
            Conseils d'Optimisation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-medium mb-3">Actions recommandées :</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start">
                  <CheckCircle className="mr-2 h-4 w-4 text-[hsl(var(--success-foreground))] mt-0.5" aria-hidden="true" focusable="false" />
                  Surveillez les prix concurrents hebdomadairement
                </li>
                <li className="flex items-start">
                  <CheckCircle className="mr-2 h-4 w-4 text-[hsl(var(--success-foreground))] mt-0.5" aria-hidden="true" focusable="false" />
                  Testez différents prix sur de petits volumes
                </li>
                <li className="flex items-start">
                  <CheckCircle className="mr-2 h-4 w-4 text-[hsl(var(--success-foreground))] mt-0.5" aria-hidden="true" focusable="false" />
                  Analysez l'élasticité prix de votre produit
                </li>
                <li className="flex items-start">
                  <CheckCircle className="mr-2 h-4 w-4 text-[hsl(var(--success-foreground))] mt-0.5" aria-hidden="true" focusable="false" />
                  Considérez des promotions temporaires
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-3">Métriques à suivre :</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start">
                  <BarChart3 className="mr-2 h-4 w-4 text-[hsl(var(--primary-foreground))] mt-0.5" aria-hidden="true" focusable="false" />
                  Taux de conversion par niveau de prix
                </li>
                <li className="flex items-start">
                  <BarChart3 className="mr-2 h-4 w-4 text-[hsl(var(--primary-foreground))] mt-0.5" aria-hidden="true" focusable="false" />
                  Évolution de la part de marché
                </li>
                <li className="flex items-start">
                  <BarChart3 className="mr-2 h-4 w-4 text-[hsl(var(--primary-foreground))] mt-0.5" aria-hidden="true" focusable="false" />
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

export default memo(PriceRecommendation)