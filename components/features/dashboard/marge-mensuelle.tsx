"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts"
import type { Produit } from "@/types/database"

interface MargeMensuelleProps {
  produits: Produit[]
  title?: string
}

export default function MargeMensuelle({ produits, title = "Évolution des marges" }: MargeMensuelleProps) {
  // Préparation des données par mois
  const derniers12Mois = Array.from({ length: 12 }, (_, i) => {
    const date = new Date()
    date.setMonth(date.getMonth() - i)
    return {
      mois: date.toLocaleString("fr-FR", { month: "short" }),
      debut: new Date(date.getFullYear(), date.getMonth(), 1),
      fin: new Date(date.getFullYear(), date.getMonth() + 1, 0),
    }
  }).reverse()

  const data = derniers12Mois.map(({ mois, debut, fin }) => {
    const produitsVendus = produits.filter(
      (p) => p.vendu && p.dateVente && new Date(p.dateVente) >= debut && new Date(p.dateVente) <= fin,
    )

    const ventes = produitsVendus.reduce((acc, p) => acc + (p.prixVente || 0), 0)
    const couts = produitsVendus.reduce((acc, p) => acc + p.prixArticle + p.prixLivraison, 0)
    const benefices = produitsVendus.reduce((acc, p) => acc + (p.benefices || 0), 0)

    // Calculer la marge en pourcentage
    const marge = ventes > 0 ? (benefices / ventes) * 100 : 0

    return {
      mois,
      ventes: Number(ventes.toFixed(2)),
      couts: Number(couts.toFixed(2)),
      marge: Number(marge.toFixed(1)),
    }
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Taux de marge (bénéfice/prix de vente) mensuel</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mois" />
              <YAxis yAxisId="left" orientation="left" />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
              <Tooltip
                formatter={(value, name) => {
                  if (name === "marge") return [`${value}%`, "Marge"]
                  return [`${value} €`, name === "ventes" ? "Ventes" : "Coûts"]
                }}
              />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="ventes"
                name="Ventes (€)"
                stroke="hsl(var(--primary))"
                activeDot={{ r: 8 }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="couts"
                name="Coûts (€)"
                stroke="hsl(var(--secondary))"
                activeDot={{ r: 8 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="marge"
                name="Marge (%)"
                stroke="hsl(var(--destructive))"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

