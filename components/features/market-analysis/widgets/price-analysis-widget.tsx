"use client";

import { memo, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { BarChart3, TrendingUp, TrendingDown } from "lucide-react";
import type { VintedAnalysisResult } from "@/types/vinted-market-analysis";

interface PriceAnalysisWidgetProps {
  analysis: VintedAnalysisResult;
}

// Helpers de formatage avec garde stricte
const formatPrice = (price: number): string => {
  const value = Number.isFinite(price) ? price : 0;
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const clampToFinite = (value: number): number =>
  Number.isFinite(value) ? value : 0;

export default memo(function PriceAnalysisWidget({
  analysis,
}: Readonly<PriceAnalysisWidgetProps>) {
  // Calcule les métriques dérivées avec garde contre NaN/undefined
  const {
    minPrice,
    maxPrice,
    priceRange,
    averageVsMinPct,
    averageVsMaxPct,
    isAvgBelowMidpoint,
  } = useMemo(() => {
    const min = clampToFinite(Number(analysis?.priceRange?.min));
    const max = clampToFinite(Number(analysis?.priceRange?.max));
    const avg = clampToFinite(Number(analysis?.avgPrice));

    const range = Math.max(0, max - min);
    const vsMin = min > 0 ? ((avg - min) / min) * 100 : 0;
    const vsMax = max > 0 ? ((max - avg) / max) * 100 : 0;
    const midpoint = (min + max) / 2;

    return {
      minPrice: min,
      maxPrice: max,
      avgPrice: avg,
      priceRange: range,
      averageVsMinPct: clampToFinite(vsMin),
      averageVsMaxPct: clampToFinite(vsMax),
      isAvgBelowMidpoint: avg < midpoint,
    };
  }, [
    analysis?.avgPrice,
    analysis?.priceRange?.min,
    analysis?.priceRange?.max,
  ]);

  const averageVsMinLabel = `+${Math.round(averageVsMinPct)}% vs min`;
  const averageVsMaxLabel = `-${Math.round(averageVsMaxPct)}% vs max`;

  return (
    <Card role="region" aria-label="Analyse des prix">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" aria-hidden="true" focusable="false" />
          <span>Analyse des prix</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm">Fourchette de prix</span>
            <Badge
              variant="outline"
              aria-label={`Fourchette: ${formatPrice(minPrice)} à ${formatPrice(maxPrice)} (${formatPrice(priceRange)} d'écart)`}
              title={`De ${formatPrice(minPrice)} à ${formatPrice(maxPrice)}`}
            >
              {formatPrice(priceRange)} d'écart
            </Badge>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm">Position du prix moyen</span>
            <div className="flex gap-2">
              <Badge
                variant={averageVsMinPct < 50 ? "default" : "secondary"}
                aria-label={`Prix moyen ${averageVsMinLabel}`}
                title={averageVsMinLabel}
              >
                {averageVsMinLabel}
              </Badge>
              <Badge
                variant={averageVsMaxPct < 50 ? "default" : "secondary"}
                aria-label={`Prix moyen ${averageVsMaxLabel}`}
                title={averageVsMaxLabel}
              >
                {averageVsMaxLabel}
              </Badge>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <h4 className="text-sm font-medium">Recommandation de prix</h4>
          <div className="text-sm text-muted-foreground">
            {isAvgBelowMidpoint ? (
              <div className="flex items-center gap-2 text-[hsl(var(--success-foreground))]">
                <TrendingUp
                  className="h-4 w-4"
                  aria-hidden="true"
                  focusable="false"
                />
                <span>Prix moyen plutôt bas, potentiel d'augmentation</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-[hsl(var(--warning-foreground))]">
                <TrendingDown
                  className="h-4 w-4"
                  aria-hidden="true"
                  focusable="false"
                />
                <span>Prix moyen élevé, marché compétitif</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
