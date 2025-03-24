"use client"

import { Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface VentesData {
  mois: string
  ventes: number
  benefices: number
}

interface VentesChartProps {
  data: VentesData[]
}

export function VentesChart({ data }: VentesChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Évolution des ventes</CardTitle>
        <CardDescription>Comparaison des ventes et bénéfices mensuels</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mois" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="ventes" name="Ventes" stroke="#8884d8" activeDot={{ r: 8 }} />
              <Line type="monotone" dataKey="benefices" name="Bénéfices" stroke="#82ca9d" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

