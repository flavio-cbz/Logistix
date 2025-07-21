"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from "recharts"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Calendar, BarChart3 } from "lucide-react"

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
  marketShare: number
  demandLevel: 'low' | 'medium' | 'high'
}

interface MarketTrendsProps {
  product: MarketData
}

export function MarketTrends({ product }: MarketTrendsProps) {
  // Génération de données de tendances historiques
  const generateTrendData = () => {
    const data = []
    const basePrice = product.avgPrice
    const baseVolume = product.salesVolume
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      
      // Simulation de tendances saisonnières
      const seasonalFactor = 1 + 0.2 * Math.sin((date.getMonth() / 12) * 2 * Math.PI)
      const trendFactor = 1 + (product.trendPercentage / 100) * (11 - i) / 11
      const randomFactor = 0.9 + Math.random() * 0.2
      
      const price = basePrice * seasonalFactor * trendFactor * randomFactor
      const volume = baseVolume * seasonalFactor * randomFactor
      const demand = Math.max(0, Math.min(100, 50 + (seasonalFactor - 1) * 100 + Math.random() * 20 - 10))
      
      data.push({
        month: date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
        prix: parseFloat(price.toFixed(2)),
        volume: Math.floor(volume),
        demande: Math.floor(demand),
        concurrence: Math.floor(product.competitorCount * (0.8 + Math.random() * 0.4))
      })
    }
    
    return data
  }

  // Génération de prédictions futures
  const generatePredictions = () => {
    const data = []
    const currentPrice = product.avgPrice
    const currentVolume = product.salesVolume
    
    for (let i = 1; i <= 6; i++) {
      const date = new Date()
      date.setMonth(date.getMonth() + i)
      
      // Prédiction basée sur la tendance actuelle
      const trendFactor = 1 + (product.trendPercentage / 100) * (i / 6)
      const seasonalFactor = 1 + 0.15 * Math.sin((date.getMonth() / 12) * 2 * Math.PI)
      const uncertainty = 0.95 + Math.random() * 0.1
      
      const predictedPrice = currentPrice * trendFactor * seasonalFactor * uncertainty
      const predictedVolume = currentVolume * trendFactor * seasonalFactor * uncertainty
      
      data.push({
        month: date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
        prix: parseFloat(predictedPrice.toFixed(2)),
        volume: Math.floor(predictedVolume),
        confidence: Math.max(60, 95 - i * 5) // Confiance décroissante
      })
    }
    
    return data
  }

  const historicalData = generateTrendData()
  const predictions = generatePredictions()

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg p-3 shadow-md">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {
                entry.name === 'Prix' ? `${entry.value} €` :
                entry.name === 'Confiance' ? `${entry.value}%` :
                entry.value
              }
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      {/* Indicateurs de tendance */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tendance Prix</CardTitle>
            {product.trend === 'up' ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : product.trend === 'down' ? (
              <TrendingDown className="h-4 w-4 text-red-500" />
            ) : (
              <BarChart3 className="h-4 w-4 text-gray-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              product.trend === 'up' ? 'text-green-600' : 
              product.trend === 'down' ? 'text-red-600' : 'text-gray-600'
            }`}>
              {product.trendPercentage > 0 ? '+' : ''}{product.trendPercentage}%
            </div>
            <p className="text-xs text-muted-foreground">
              Sur les 30 derniers jours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saisonnalité</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Date().getMonth() >= 9 || new Date().getMonth() <= 2 ? 'Haute' : 'Normale'}
            </div>
            <p className="text-xs text-muted-foreground">
              Période actuelle
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Volatilité</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.abs(product.trendPercentage) > 10 ? 'Élevée' : 
               Math.abs(product.trendPercentage) > 5 ? 'Moyenne' : 'Faible'}
            </div>
            <p className="text-xs text-muted-foreground">
              Stabilité des prix
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prédiction 6M</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {predictions[5]?.prix.toFixed(2)} €
            </div>
            <p className="text-xs text-muted-foreground">
              Prix estimé dans 6 mois
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Graphique des tendances historiques */}
      <Card>
        <CardHeader>
          <CardTitle>Tendances Historiques - 12 Derniers Mois</CardTitle>
          <CardDescription>
            Évolution des prix, volumes et niveau de demande
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historicalData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="prix"
                  name="Prix (€)"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="volume"
                  name="Volume"
                  stroke="hsl(var(--destructive))"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="demande"
                  name="Demande (%)"
                  stroke="hsl(var(--secondary))"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Prédictions futures */}
      <Card>
        <CardHeader>
          <CardTitle>Prédictions - 6 Prochains Mois</CardTitle>
          <CardDescription>
            Projections basées sur les tendances actuelles et l'analyse saisonnière
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={predictions}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="prix"
                  name="Prix Prédit (€)"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="confidence"
                  name="Confiance (%)"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={2}
                  strokeDasharray="3 3"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium mb-2">Notes sur les prédictions :</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Les prédictions sont basées sur l'analyse des tendances historiques</li>
              <li>• La confiance diminue avec l'horizon temporel</li>
              <li>• Les facteurs externes (économie, concurrence) peuvent influencer les résultats</li>
              <li>• Mise à jour recommandée toutes les 2 semaines</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}