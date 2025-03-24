"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface VentesData {
  mois: string
  ventes: number
  benefices: number
}

interface VentesBarProps {
  data: VentesData[]
}

export function VentesBar({ data }: VentesBarProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Répartition des ventes</CardTitle>
        <CardDescription>Distribution des ventes par mois</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mois" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="ventes" name="Ventes" fill="#8884d8" />
              <Bar dataKey="benefices" name="Bénéfices" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

