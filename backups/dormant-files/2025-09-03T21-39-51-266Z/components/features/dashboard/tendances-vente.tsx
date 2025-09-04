"use client"

import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import type { Produit } from "@/types/database"

interface TendancesVenteProps {
  produits: Produit[]
  title?: string
}

type DataPoint = {
  mois: string
  total: number
} & Record<string, number | string>

type Series = {
  key: string
  name: string
  color: string
}

// Fonction utilitaire pour obtenir les derniers mois
function getLastMonths(count: number, locale: string): { label: string; month: number; year: number }[] {
  const result = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const date = new Date();
    date.setMonth(now.getMonth() - (count - 1 - i));
    result.push({
      label: date.toLocaleString(locale, { month: "short" }),
      month: date.getMonth(),
      year: date.getFullYear(),
    });
  }
  return result;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--destructive))",
  "hsl(var(--secondary))",
  "hsl(var(--accent))",
  "hsl(var(--muted))",
] as const

const isNonEmptyString = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0

function toDate(value: unknown): Date | null {
  try {
    const d = new Date(value as any)
    return Number.isNaN(d.getTime()) ? null : d
  } catch {
    return null
  }
}

function monthsDiff(a: Date, b: Date): number {
  return (a.getFullYear() - b.getFullYear()) * 12 + (a.getMonth() - b.getMonth())
}

function sanitizeKey(_key: string): string {
  const k = String(_key)
  if (k === "__proto__" || k === "constructor" || k === "prototype") return `key_${k}`
  return k
}

function toSlug(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
}

function getColorSafe(index: number): string { // Correction: index au lieu de _index
  return COLORS[index % COLORS.length]! ?? COLORS[0]!
}

export default function TendancesVente({ produits, title = "Tendances de vente" }: TendancesVenteProps) {
  const periods = useMemo(() => getLastMonths(6, "fr-FR"), [])
  const baseId = useMemo(() => `trend-${toSlug(title)}`, [title])

  const { data, series } = useMemo(() => {
    const result: DataPoint[] = periods.map((p: { label: string, month: number, year: number }) => ({ mois: p.label, total: 0 })) // Typage explicite de p
    const platformOrder: string[] = []
    const platformKeyMap = new Map<string, string>() // original -> sanitized
    const now = new Date()

    for (const p of produits ?? []) {
      if (!p?.vendu || !p?.dateVente || !isNonEmptyString((p as any).plateforme)) continue
      const d = toDate((p as any).dateVente)
      if (!d) continue

      const diff = monthsDiff(now, d)
      if (diff < 0 || diff >= periods.length) continue

      // periods are oldest->newest, diff 0 = current month (last index)
      const idx = periods.length - 1 - diff
      const item = result[idx]!
      if (!item) continue

      const name = ((p as any).plateforme as string).trim()
      if (!platformKeyMap.has(name)) {
        platformKeyMap.set(name, sanitizeKey(name))
        platformOrder.push(name)
      }
      const key = platformKeyMap.get(name)!
      let current: number = 0
      current = typeof (item as any)[key] === "number" ? (item[key] as number) : Number(item[key] ?? 0)
      ;(item as any)[key] = current + 1
      item.total += 1
    }

    const series: Series[] = platformOrder
      .sort((a, b) => a.localeCompare(b, "fr"))
      .map((name, i) => ({
        key: platformKeyMap.get(name)!,
        name,
        color: getColorSafe(i),
      }))

    return { data: result, series }
  }, [produits, periods])

  const hasData = data.some((d) => d.total > 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle id={`${baseId}-title`}>{title}</CardTitle>
        <CardDescription>Évolution des ventes par plateforme</CardDescription>
        <p id={`${baseId}-desc`} className="sr-only">
          Graphique d’aires empilées montrant le nombre de produits vendus par plateforme sur les 6 derniers mois.
        </p>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <div
            className="h-[300px]"
            role="img"
            aria-labelledby={`${baseId}-title`}
            aria-describedby={`${baseId}-desc`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mois" />
                <YAxis allowDecimals={false} />
                <Tooltip formatter={(value: unknown) => (typeof value === "number" ? `${value} ventes` : String(value))} />
                <Legend />
                {series.map((s) => (
                  <Area
                    key={`area-${s.key}`}
                    type="monotone"
                    dataKey={s.key}
                    stackId="1"
                    stroke={s.color}
                    fill={s.color}
                    name={s.name}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Aucune donnée de vente pour le moment.
          </div>
        )}
      </CardContent>
    </Card>
  )
}