"use client"

import { Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts"

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
    <div className="h-[300px] w-full">
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={`hsl(var(--chart-grid))`} strokeOpacity={0.6} />
          <XAxis dataKey="mois" stroke={`hsl(var(--chart-text))`} />
          <YAxis stroke={`hsl(var(--chart-text))`} />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: `hsl(var(--chart-tooltip-bg))`,
              borderColor: `hsl(var(--chart-tooltip-text))`
            }}
          />
          <Legend />
          <Line type="monotone" dataKey="ventes" name="Ventes" stroke="hsl(var(--primary))" strokeWidth={2} activeDot={{ r: 8 }} />
          <Line type="monotone" dataKey="benefices" name="Bénéfices" stroke={`hsl(var(--success))`} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}