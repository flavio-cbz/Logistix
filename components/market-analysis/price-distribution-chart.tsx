"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"

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

interface PriceDistributionChartProps {
  product: MarketData
}

export function PriceDistributionChart({ product }: PriceDistributionChartProps) {
  // Génération de la distribution des prix
  const generatePriceDistribution = () => {
    const priceRange = product.maxPrice - product.minPrice
    const stepSize = priceRange / 8
    const data = []

    for (let i = 0; i < 8; i++) {
      const rangeStart = product.minPrice + (i * stepSize)
      const rangeEnd = rangeStart + stepSize
      const rangeMid = (rangeStart + rangeEnd) / 2
      
      // Simulation d'une distribution normale autour du prix moyen
      const distanceFromAvg = Math.abs(rangeMid - product.avgPrice)
      const maxDistance = priceRange / 2
      const normalizedDistance = distanceFromAvg / maxDistance
      const frequency = Math.max(1, Math.floor(50 * (1 - normalizedDistance) + Math.random() * 20))

      data.push({
        range: `${rangeStart.toFixed(0)}-${rangeEnd.toFixed(0)}€`,
        frequency: frequency,
        midPrice: rangeMid,
        isRecommended: rangeMid >= product.recommendedPrice - stepSize/2 && 
                      rangeMid <= product.recommendedPrice + stepSize/2
      })
    }

    return data
  }

  const data = generatePriceDistribution()

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg p-3 shadow-md">
          <p className="font-medium">Gamme: {label}</p>
          <p style={{ color: payload[0].color }}>
            Fréquence: {payload[0].value} produits
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribution des Prix du Marché</CardTitle>
        <CardDescription>
          Répartition des prix pratiqués par les concurrents
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="range" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                label={{ value: 'Nombre de produits', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="frequency" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.isRecommended ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex items-center justify-center space-x-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-primary rounded"></div>
            <span>Zone de prix recommandée</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-muted-foreground rounded"></div>
            <span>Autres gammes de prix</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}