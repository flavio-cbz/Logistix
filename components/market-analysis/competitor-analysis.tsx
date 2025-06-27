"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Star, TrendingUp, TrendingDown, Minus } from "lucide-react"

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

interface CompetitorAnalysisProps {
  product: MarketData
}

interface Competitor {
  id: string
  name: string
  price: number
  rating: number
  sales: number
  marketShare: number
  trend: 'up' | 'down' | 'stable'
  trendPercentage: number
  position: 'leader' | 'challenger' | 'follower'
}

export function CompetitorAnalysis({ product }: CompetitorAnalysisProps) {
  // Génération de données de concurrents simulées
  const generateCompetitors = (): Competitor[] => {
    const competitors: Competitor[] = []
    const basePrice = product.avgPrice
    
    const competitorNames = [
      "MarketLeader Pro", "PriceKing", "QualityFirst", "BestValue Store", 
      "Premium Choice", "EconoMax", "TrendSetter", "ValueMaster",
      "TopSeller", "SmartBuy", "EliteGoods", "BargainHunter"
    ]

    for (let i = 0; i < Math.min(product.competitorCount, 12); i++) {
      const priceVariation = (Math.random() - 0.5) * 0.4
      const price = basePrice * (1 + priceVariation)
      const rating = 3 + Math.random() * 2
      const sales = Math.floor(Math.random() * 1000) + 100
      const marketShare = Math.random() * 15 + 1
      const trends = ['up', 'down', 'stable'] as const
      const trend = trends[Math.floor(Math.random() * trends.length)]
      const trendPercentage = Math.random() * 20 - 10
      
      let position: 'leader' | 'challenger' | 'follower'
      if (marketShare > 10) position = 'leader'
      else if (marketShare > 5) position = 'challenger'
      else position = 'follower'

      competitors.push({
        id: `comp-${i}`,
        name: competitorNames[i] || `Concurrent ${i + 1}`,
        price: parseFloat(price.toFixed(2)),
        rating: parseFloat(rating.toFixed(1)),
        sales,
        marketShare: parseFloat(marketShare.toFixed(1)),
        trend,
        trendPercentage: parseFloat(trendPercentage.toFixed(1)),
        position
      })
    }

    return competitors.sort((a, b) => b.marketShare - a.marketShare)
  }

  const competitors = generateCompetitors()

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-500" />
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-500" />
    return <Minus className="h-4 w-4 text-gray-500" />
  }

  const getPositionBadge = (position: string) => {
    const variants = {
      leader: "default",
      challenger: "secondary",
      follower: "outline"
    } as const

    const labels = {
      leader: "Leader",
      challenger: "Challenger", 
      follower: "Suiveur"
    }

    return (
      <Badge variant={variants[position as keyof typeof variants]}>
        {labels[position as keyof typeof labels]}
      </Badge>
    )
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-3 w-3 ${
              star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
            }`}
          />
        ))}
        <span className="text-xs text-muted-foreground ml-1">({rating})</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Résumé de la concurrence */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Prix le plus bas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {Math.min(...competitors.map(c => c.price)).toFixed(2)} €
            </div>
            <p className="text-xs text-muted-foreground">
              {((Math.min(...competitors.map(c => c.price)) / product.avgPrice - 1) * 100).toFixed(1)}% 
              sous la moyenne
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Prix le plus élevé</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {Math.max(...competitors.map(c => c.price)).toFixed(2)} €
            </div>
            <p className="text-xs text-muted-foreground">
              +{((Math.max(...competitors.map(c => c.price)) / product.avgPrice - 1) * 100).toFixed(1)}% 
              au-dessus de la moyenne
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Note moyenne</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(competitors.reduce((sum, c) => sum + c.rating, 0) / competitors.length).toFixed(1)}
            </div>
            <div className="flex items-center mt-1">
              {renderStars(competitors.reduce((sum, c) => sum + c.rating, 0) / competitors.length)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tableau détaillé des concurrents */}
      <Card>
        <CardHeader>
          <CardTitle>Analyse Détaillée des Concurrents</CardTitle>
          <CardDescription>
            Comparaison avec les principaux acteurs du marché pour {product.productName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Concurrent</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Prix</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead>Ventes</TableHead>
                  <TableHead>Part de marché</TableHead>
                  <TableHead>Tendance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {competitors.map((competitor, index) => (
                  <TableRow key={competitor.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs bg-muted rounded px-2 py-1">#{index + 1}</span>
                        <span>{competitor.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getPositionBadge(competitor.position)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{competitor.price.toFixed(2)} €</span>
                        <span className={`text-xs ${
                          competitor.price < product.avgPrice ? 'text-green-600' : 
                          competitor.price > product.avgPrice ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {competitor.price < product.avgPrice ? '-' : '+'}
                          {Math.abs(((competitor.price / product.avgPrice - 1) * 100)).toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{renderStars(competitor.rating)}</TableCell>
                    <TableCell>{competitor.sales.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex flex-col space-y-1">
                        <span className="text-sm font-medium">{competitor.marketShare}%</span>
                        <Progress value={competitor.marketShare} className="h-1" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        {getTrendIcon(competitor.trend)}
                        <span className={`text-sm ${
                          competitor.trend === 'up' ? 'text-green-600' : 
                          competitor.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {competitor.trendPercentage > 0 ? '+' : ''}{competitor.trendPercentage}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}