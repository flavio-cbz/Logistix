"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import type { Produit } from "@/types"

interface TempsVenteProps {
  produits: Produit[]
}

export function TempsVente({ produits }: TempsVenteProps) {
  // Distribution des temps de vente
  const distribution = produits.reduce(
    (acc, produit) => {
      if (!produit.tempsEnLigne) return acc

      const jours = Number.parseInt(produit.tempsEnLigne.split(" ")[0])
      let categorie = "0-3 jours"

      if (jours > 3 && jours <= 7) categorie = "4-7 jours"
      else if (jours > 7 && jours <= 14) categorie = "8-14 jours"
      else if (jours > 14 && jours <= 30) categorie = "15-30 jours"
      else if (jours > 30) categorie = "30+ jours"

      acc[categorie] = (acc[categorie] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  const data = [
    { periode: "0-3 jours", nombre: distribution["0-3 jours"] || 0 },
    { periode: "4-7 jours", nombre: distribution["4-7 jours"] || 0 },
    { periode: "8-14 jours", nombre: distribution["8-14 jours"] || 0 },
    { periode: "15-30 jours", nombre: distribution["15-30 jours"] || 0 },
    { periode: "30+ jours", nombre: distribution["30+ jours"] || 0 },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Temps de vente</CardTitle>
        <CardDescription>Distribution du temps nécessaire pour vendre</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="periode" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="nombre" name="Nombre de produits" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

