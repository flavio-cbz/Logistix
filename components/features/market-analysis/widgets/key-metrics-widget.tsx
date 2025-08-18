"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ShoppingCart, Euro, TrendingDown, TrendingUp } from "lucide-react"
import type { VintedAnalysisResult } from "@/types/vinted-market-analysis"

interface KeyMetricsWidgetProps {
  analysis: VintedAnalysisResult;
}

const formatPrice = (price: number) => `${price.toFixed(2)} €`

export default function KeyMetricsWidget({ analysis }: KeyMetricsWidgetProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Volume de ventes</CardTitle>
          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{analysis.salesVolume}</div>
          <p className="text-xs text-muted-foreground">
            articles vendus analysés
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Prix moyen</CardTitle>
          <Euro className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatPrice(analysis.avgPrice)}</div>
          <p className="text-xs text-muted-foreground">
            prix de vente moyen
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Prix minimum</CardTitle>
          <TrendingDown className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {formatPrice(analysis.priceRange.min)}
          </div>
          <p className="text-xs text-muted-foreground">
            prix le plus bas
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Prix maximum</CardTitle>
          <TrendingUp className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            {formatPrice(analysis.priceRange.max)}
          </div>
          <p className="text-xs text-muted-foreground">
            prix le plus élevé
          </p>
        </CardContent>
      </Card>
    </div>
  )
}