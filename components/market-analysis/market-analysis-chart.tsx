"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

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

interface MarketAnalysisChartProps {
  product: MarketData
}

export function MarketAnalysisChart({ product }: MarketAnalysisChartProps) {
  // Génération de données historiques simulées
  const generateHistoricalData = () => {
    const data = []
    const basePrice = product.avgPrice
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      
      // Simulation de variation de prix
      const variation = (Math.random() - 0.5) * 0.2
      const price = basePrice * (1 + variation)
      const volume = Math.floor(Math.random() * 200) + 50
      
      data.push({
        date: date.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }),
        prix: parseFloat(price.toFixed(2)),
        volume: volume,
        concurrents: Math.floor(Math.random() * 5) + product.competitorCount - 2
      })
    }
    
    return data
  }

  const data = generateHistoricalData()

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg p-3 shadow-md">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.name === 'Prix' ? `${entry.value} €` : entry.value}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Évolution des Prix - 30 Derniers Jours</CardTitle>
        <CardDescription>
          Historique des prix et volume des ventes pour {product.productName}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis 
                yAxisId="left"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `${value}€`}
              />
              <YAxis 
                yAxisId="right" 
                orientation="right"
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="prix"
                name="Prix"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="volume"
                name="Volume"
                stroke="hsl(var(--destructive))"
                strokeWidth={2}
                dot={{ r: 3 }}
                strokeDasharray="5 5"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}