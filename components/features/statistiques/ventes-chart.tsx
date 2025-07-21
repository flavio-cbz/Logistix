"use client"

import { Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { useTheme } from "next-themes"

interface VentesData {
  mois: string
  ventes: number
  benefices: number
}

interface VentesChartProps {
  data: VentesData[]
}

export function VentesChart({ data }: VentesChartProps) {
  const { theme } = useTheme()

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)"} />
          <XAxis dataKey="mois" stroke={theme === 'dark' ? "#fff" : "#000"} />
          <YAxis stroke={theme === 'dark' ? "#fff" : "#000"} />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: theme === 'dark' ? '#333' : '#fff',
              borderColor: theme === 'dark' ? '#555' : '#ccc'
            }}
          />
          <Legend />
          <Line type="monotone" dataKey="ventes" name="Ventes" stroke="#3b82f6" strokeWidth={2} activeDot={{ r: 8 }} />
          <Line type="monotone" dataKey="benefices" name="Bénéfices" stroke="#84cc16" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
