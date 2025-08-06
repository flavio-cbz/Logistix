"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { type VintedAnalysisResult, type MarketAnalysisHistoryItem } from "@/types/vinted-market-analysis"

interface MarketAnalysisChartProps {
  currentAnalysis: VintedAnalysisResult
  historicalData?: MarketAnalysisHistoryItem[]
}

export default function MarketAnalysisChart({ currentAnalysis, historicalData = [] }: MarketAnalysisChartProps) {
  // Génération de données historiques basées sur les vraies données
  const generateChartData = () => {
    const data = []
    
    // Ajouter les données historiques si disponibles
    const completedHistorical = historicalData
      .filter(item => item.status === 'completed')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(-10) // Garder les 10 dernières analyses
    
    completedHistorical.forEach(item => {
      data.push({
        date: new Date(item.createdAt).toLocaleDateString('fr-FR', { 
          month: 'short', 
          day: 'numeric' 
        }),
        prix: item.avgPrice,
        volume: item.salesVolume,
        type: 'historical'
      })
    })
    
    // Ajouter l'analyse actuelle
    data.push({
      date: new Date(currentAnalysis.analysisDate).toLocaleDateString('fr-FR', { 
        month: 'short', 
        day: 'numeric' 
      }),
      prix: currentAnalysis.avgPrice,
      volume: currentAnalysis.salesVolume,
      type: 'current'
    })
    
    // Si pas assez de données historiques, générer quelques points simulés pour le contexte
    if (data.length < 5) {
      const basePrice = currentAnalysis.avgPrice
      const baseVolume = currentAnalysis.salesVolume
      
      for (let i = 4; i >= 1; i--) {
        const date = new Date()
        date.setDate(date.getDate() - (i * 7)) // Une semaine d'intervalle
        
        // Variation légère autour des valeurs actuelles
        const priceVariation = (Math.random() - 0.5) * 0.15 // ±15%
        const volumeVariation = (Math.random() - 0.5) * 0.3 // ±30%
        
        data.unshift({
          date: date.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }),
          prix: parseFloat((basePrice * (1 + priceVariation)).toFixed(2)),
          volume: Math.max(1, Math.floor(baseVolume * (1 + volumeVariation))),
          type: 'simulated'
        })
      }
    }
    
    return data
  }

  const data = generateChartData()

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0]?.payload
      return (
        <div className="bg-background border rounded-lg p-3 shadow-md">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.name === 'Prix' ? `${entry.value} €` : entry.value}
            </p>
          ))}
          {dataPoint?.type === 'simulated' && (
            <p className="text-xs text-muted-foreground mt-1">
              * Données simulées
            </p>
          )}
          {dataPoint?.type === 'current' && (
            <p className="text-xs text-green-600 mt-1">
              * Analyse actuelle
            </p>
          )}
        </div>
      )
    }
    return null
  }

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props
    if (payload.type === 'current') {
      return (
        <circle 
          cx={cx} 
          cy={cy} 
          r={6} 
          fill="hsl(var(--primary))" 
          stroke="white" 
          strokeWidth={2}
        />
      )
    }
    return <circle cx={cx} cy={cy} r={3} fill={props.fill} />
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Évolution des Prix - Historique</CardTitle>
        <CardDescription>
          Historique des prix et volume des ventes pour les analyses de ce produit
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
                dot={<CustomDot />}
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
        
        {data.some(d => d.type === 'simulated') && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">
              * Les données simulées sont générées pour fournir un contexte visuel. 
              Effectuez plus d'analyses pour obtenir un historique réel.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}