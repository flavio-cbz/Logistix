"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { BarChart3, TrendingUp, TrendingDown } from "lucide-react"
import type { VintedAnalysisResult } from "@/types/vinted-market-analysis"

interface PriceAnalysisWidgetProps {
  analysis: VintedAnalysisResult;
}

const formatPrice = (price: number) => `${price.toFixed(2)} €`

export default function PriceAnalysisWidget({ analysis }: PriceAnalysisWidgetProps) {
  const priceRange = analysis.priceRange.max - analysis.priceRange.min
  const averageVsMin = ((analysis.avgPrice - analysis.priceRange.min) / analysis.priceRange.min * 100)
  const averageVsMax = ((analysis.priceRange.max - analysis.avgPrice) / analysis.priceRange.max * 100)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Analyse des prix
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm">Fourchette de prix</span>
            <Badge variant="outline">
              {formatPrice(priceRange)} d'écart
            </Badge>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm">Position du prix moyen</span>
            <div className="flex gap-2">
              <Badge variant={averageVsMin < 50 ? "default" : "secondary"}>
                +{averageVsMin.toFixed(0)}% vs min
              </Badge>
              <Badge variant={averageVsMax < 50 ? "default" : "secondary"}>
                -{averageVsMax.toFixed(0)}% vs max
              </Badge>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <h4 className="text-sm font-medium">Recommandation de prix</h4>
          <div className="text-sm text-muted-foreground">
            {analysis.avgPrice < (analysis.priceRange.min + analysis.priceRange.max) / 2 ? (
              <div className="flex items-center gap-2 text-green-600">
                <TrendingUp className="h-4 w-4" />
                Prix moyen plutôt bas, potentiel d'augmentation
              </div>
            ) : (
              <div className="flex items-center gap-2 text-orange-600">
                <TrendingDown className="h-4 w-4" />
                Prix moyen élevé, marché compétitif
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}