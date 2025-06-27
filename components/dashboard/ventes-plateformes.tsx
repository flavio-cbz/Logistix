"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"
import type { Produit } from "@/types"

interface VentesPlateformesProps {
  produits: Produit[]
}

export function VentesPlateformes({ produits }: VentesPlateformesProps) {
  // Agrégation des ventes par plateforme
  const ventesParPlateforme = produits.reduce(
    (acc, produit) => {
      const plateforme = produit.plateforme || "Autre"
      const montant = produit.prixVente || 0
      acc[plateforme] = (acc[plateforme] || 0) + montant
      return acc
    },
    {} as Record<string, number>,
  )

  const data = Object.entries(ventesParPlateforme).map(([plateforme, montant]) => ({
    plateforme,
    montant: Number(montant.toFixed(2)),
  }))

  const COLORS = [
    "hsl(var(--primary))",
    "hsl(var(--destructive))",
    "hsl(var(--secondary))",
    "hsl(var(--accent))",
    "hsl(var(--muted))",
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Répartition par plateforme</CardTitle>
        <CardDescription>Distribution des ventes selon les plateformes</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="montant"
                nameKey="plateforme"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ plateforme, percent }) => `${plateforme} (${(percent * 100).toFixed(0)}%)`}
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `${value.toFixed(2)} €`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

