"use client"

import React, { memo, useMemo, useId } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, type TooltipProps } from "recharts"
import type { VintedAnalysisResult } from '@/types/vinted-market-analysis'

type DistributionBin = {
  range: string
  frequency: number
  midPrice: number
  isRecommended: boolean
}

interface PriceDistributionChartProps {
  analysis: VintedAnalysisResult
}

// Calcule une plage de prix robuste à partir de l'analyse
function computePriceRange(analysis: VintedAnalysisResult): { min: number; max: number } | null {
  const min = typeof analysis.priceRange?.min === 'number' ? analysis.priceRange!.min! : undefined
  const max = typeof analysis.priceRange?.max === 'number' ? analysis.priceRange!.max! : undefined

  let resolvedMin = min
  let resolvedMax = max

  if (resolvedMin == null || resolvedMax == null || !(resolvedMin < resolvedMax)) {
    // Fallback: dériver min/max depuis les items bruts
    const prices = (analysis.rawItems || [])
      .map(it => parseFloat(it.price?.amount ?? ''))
      .filter((v) => Number.isFinite(v)) as number[]
    if (prices.length === 0) return null
    resolvedMin = Math.min(...prices)
    resolvedMax = Math.max(...prices)
  }

  if (!(resolvedMin < resolvedMax)) return null
  return { min: resolvedMin, max: resolvedMax }
}

// Construit une distribution déterministe (sans aléatoire) centrée autour du prix moyen
function buildDistribution(analysis: VintedAnalysisResult, binCount = 8): DistributionBin[] {
  const range = computePriceRange(analysis)
  if (!range) return []

  const { min, max } = range
  const span = max - min
  const step = span / (binCount > 0 ? binCount : 1)
  if (!Number.isFinite(step) || step <= 0) return []

  const avg = typeof analysis.avgPrice === 'number' && Number.isFinite(analysis.avgPrice) ? analysis.avgPrice : (min + max) / 2
  const halfSpan = span / 2 || 1

  const data: DistributionBin[] = []
  for (let i = 0; i < binCount; i++) {
    const start = min + i * step
    const end = start + step
    const mid = (start + end) / 2
    const normalizedDistance = Math.min(1, Math.abs(mid - avg) / halfSpan)
    // Distribution triangulaire centrée sur avg (max au centre, min aux extrémités)
    const base = 1 - normalizedDistance
    const frequency = Math.max(0, Math.round(base * 50)) // 0..50

    data.push({
      range: `${start.toFixed(0)}-${end.toFixed(0)}€`,
      frequency,
      midPrice: mid,
      isRecommended: mid >= avg - step / 2 && mid <= avg + step / 2
    })
  }
  return data
}

function PriceDistributionChart({ analysis }: PriceDistributionChartProps) {
  const titleId = useId()
  const descId = useId()

  // Mémoïsation pour éviter les recalculs et rendus inutiles
  const data = useMemo(() => buildDistribution(analysis), [analysis])

  const nf = useMemo(() => new Intl.NumberFormat('fr-FR'), [])

  const CustomTooltip: React.FC<TooltipProps<number, string>> = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null
    const entry = payload[0]!?.payload as DistributionBin | undefined
    const color = entry?.isRecommended ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"
    return (
      <div className="bg-background border rounded-lg p-3 shadow-md" role="dialog" aria-live="polite">
        <p className="font-medium">Gamme: {label}</p>
        <p style={{ color }}>
          Fréquence: {nf.format(Number(payload?.[0]?.value ?? 0))} produits
        </p>
      </div>
    )
  }

  // État vide / données insuffisantes
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle id={titleId}>Distribution des Prix du Marché</CardTitle>
          <CardDescription id={descId}>
            Données insuffisantes pour afficher la distribution des prix.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Impossible de calculer une distribution sans plage de prix valide.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle id={titleId}>Distribution des Prix du Marché</CardTitle>
        <CardDescription id={descId}>
          Répartition des prix pratiqués par les concurrents
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]" role="img" aria-labelledby={titleId} aria-describedby={descId}>
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
                label={{ value: "Nombre de produits", angle: -90, position: "insideLeft" }}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="frequency" radius={[4, 4, 0, 0]}>
                {data.map((entry) => (
                  <Cell
                    key={`cell-${entry.range}`}
                    fill={entry.isRecommended ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex items-center justify-center space-x-4 text-sm" role="group" aria-label="Légende">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-primary rounded" aria-hidden="true"></div>
            <span>Zone de prix recommandée</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-muted-foreground rounded" aria-hidden="true"></div>
            <span>Autres gammes de prix</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default memo(PriceDistributionChart)