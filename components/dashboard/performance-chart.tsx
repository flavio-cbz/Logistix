"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts"
import type { Produit } from "@/types"

interface PerformanceChartProps {
  produits: Produit[]
}

export function PerformanceChart({ produits }: PerformanceChartProps) {
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

    const ventes = produitsVendus.reduce((acc, p) => acc + (p.prixVente || 0), 0)
    const benefices = produitsVendus.reduce((acc, p) => acc + ((p.prixVente || 0) - p.prixArticle - p.prixLivraison), 0)
    const marge = ventes > 0 ? (benefices / ventes) * 100 : 0

    return {
      mois,
      ventes: Number(ventes.toFixed(2)),
      benefices: Number(benefices.toFixed(2)),
      marge: Number(marge.toFixed(1)),
    }
  })

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
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mois" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
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

