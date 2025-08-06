"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import type { Produit } from "@/types/database"

interface TendancesVenteProps {
  produits: Produit[]
  title?: string
}

export default function TendancesVente({ produits, title = "Tendances de vente" }: TendancesVenteProps) {
  // Préparer les données pour le graphique
  const derniers6Mois = Array.from({ length: 6 }, (_, i) => {
    const date = new Date()
    date.setMonth(date.getMonth() - i)
    return {
      mois: date.toLocaleString("fr-FR", { month: "short" }),
      annee: date.getFullYear(),
      debut: new Date(date.getFullYear(), date.getMonth(), 1),
      fin: new Date(date.getFullYear(), date.getMonth() + 1, 0),
    }
  }).reverse()

  // Compter le nombre de produits vendus par plateforme et par mois
  const plateformes = [...new Set(produits.filter((p) => p.vendu && p.plateforme).map((p) => p.plateforme))]

  const data = derniers6Mois.map(({ mois, annee, debut, fin }) => {
    const base = {
      mois: `${mois} ${annee}`,
      total: 0,
    }

    plateformes.forEach((plateforme) => {
      if (!plateforme) return

      const ventesPlateforme = produits.filter(
        (p) =>
          p.vendu &&
          p.dateVente &&
          p.plateforme === plateforme &&
          new Date(p.dateVente) >= debut &&
          new Date(p.dateVente) <= fin,
      ).length

      base[plateforme as string] = ventesPlateforme
      base.total += ventesPlateforme
    })

    return base
  })

  // Définir des couleurs pour les plateformes
  const getColor = (index: number) => {
    const colors = [
      "hsl(var(--primary))",
      "hsl(var(--destructive))",
      "hsl(var(--secondary))",
      "hsl(var(--accent))",
      "hsl(var(--muted))",
    ]
    return colors[index % colors.length]
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Évolution des ventes par plateforme</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{
                top: 10,
                right: 30,
                left: 0,
                bottom: 0,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mois" />
              <YAxis />
              <Tooltip />
              <Legend />
              {plateformes.map(
                (plateforme, index) =>
                  plateforme && (
                    <Area
                      key={plateforme}
                      type="monotone"
                      dataKey={plateforme}
                      stackId="1"
                      stroke={getColor(index)}
                      fill={getColor(index)}
                      name={plateforme}
                    />
                  ),
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

