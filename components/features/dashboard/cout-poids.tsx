"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  CartesianGrid,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
  Legend,
} from "recharts"
import type { Parcelle } from "@/types/database"

interface CoutPoidsProps {
  parcelles: Parcelle[]
  title?: string
}

export default function CoutPoids({ parcelles, title = "Coût par poids" }: CoutPoidsProps) {
  // Préparation des données pour le graphique
  const data = parcelles.map((parcelle) => ({
    name: parcelle.numero,
    poids: parcelle.poids,
    prixTotal: parcelle.prixTotal,
    prixParGramme: parcelle.prixParGramme,
    transporteur: parcelle.transporteur,
  }))

  // Traitement pour grouper par transporteur
  const transporteurs = [...new Set(parcelles.map((p) => p.transporteur))]
  const dataByTransporteur = transporteurs.map((transporteur) => {
    const filteredData = data.filter((item) => item.transporteur === transporteur)
    return {
      transporteur,
      data: filteredData,
    }
  })

  // Personnalisation du tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-background border p-2 rounded shadow-md">
          <p className="font-bold">{data.name}</p>
          <p>Transporteur: {data.transporteur}</p>
          <p>Poids: {data.poids}g</p>
          <p>Prix total: {data.prixTotal.toFixed(2)}€</p>
          <p>Prix/g: {data.prixParGramme.toFixed(3)}€</p>
        </div>
      )
    }
    return null
  }

  // Couleurs par transporteur
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
        <CardDescription>Relation entre le poids et le coût total des parcelles</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart
              margin={{
                top: 20,
                right: 20,
                bottom: 20,
                left: 20,
              }}
            >
              <CartesianGrid />
              <XAxis type="number" dataKey="poids" name="Poids" unit="g" domain={["dataMin", "dataMax"]} />
              <YAxis type="number" dataKey="prixTotal" name="Prix Total" unit="€" domain={["dataMin", "dataMax"]} />
              <ZAxis type="number" dataKey="prixParGramme" range={[20, 100]} name="Prix/g" unit="€/g" />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} content={<CustomTooltip />} />
              <Legend />

              {dataByTransporteur.map((group, index) => (
                <Scatter key={group.transporteur} name={group.transporteur} data={group.data} fill={getColor(index)} />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

