"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts"
import type { Produit } from "@/types"
import { useTheme } from "next-themes"

interface PerformanceChartProps {
  produits: Produit[]
}

export function PerformanceChart({ produits }: PerformanceChartProps) {
  const { theme } = useTheme()
  const isDark = theme === "dark"

  // Préparation des données par mois
  const derniers6Mois = Array.from({ length: 6 }, (_, i) => {
    const date = new Date()
    date.setMonth(date.getMonth() - i)
    return {
      mois: date.toLocaleString("fr-FR", { month: "short" }),
      debut: new Date(date.getFullYear(), date.getMonth(), 1),
      fin: new Date(date.getFullYear(), date.getMonth() + 1, 0),
    }
  }).reverse()

  const data = derniers6Mois.map(({ mois, debut, fin }) => {
    const produitsVendus = produits.filter(
      (p) => p.vendu && p.dateVente && new Date(p.dateVente) >= debut && new Date(p.dateVente) <= fin,
    )

    // Ajout de vérifications pour éviter les valeurs undefined
    const ventes = produitsVendus.reduce((acc, p) => acc + (p.prixVente || 0), 0)
    const benefices = produitsVendus.reduce((acc, p) => {
      // Vérifier que toutes les valeurs nécessaires existent
      if (p.prixVente === undefined || p.prixArticle === undefined || p.prixLivraison === undefined) {
        return acc
      }
      return acc + (p.prixVente - p.prixArticle - p.prixLivraison)
    }, 0)
    const marge = ventes > 0 ? (benefices / ventes) * 100 : 0

    return {
      mois,
      ventes: Number(ventes.toFixed(2)),
      benefices: Number(benefices.toFixed(2)),
      marge: Number(marge.toFixed(1)),
    }
  })

  // Style personnalisé pour le tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          className={`p-3 rounded-md shadow-md ${isDark ? "bg-gray-800 text-white" : "bg-white text-gray-800"} border ${isDark ? "border-gray-700" : "border-gray-200"}`}
        >
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={`item-${index}`} style={{ color: entry.color }}>
              {entry.name}: {entry.value} {entry.dataKey === "marge" ? "%" : "€"}
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
        <CardTitle>Performance des ventes</CardTitle>
        <CardDescription>Evolution des ventes et bénéfices sur 6 mois</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} />
              <XAxis dataKey="mois" stroke={isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)"} />
              <YAxis yAxisId="left" stroke={isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)"} />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke={isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)"}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="ventes"
                name="Ventes (€)"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="benefices"
                name="Bénéfices (€)"
                stroke="hsl(var(--destructive))"
                strokeWidth={2}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="marge"
                name="Marge (%)"
                stroke="hsl(var(--secondary))"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

