"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { useTheme } from "next-themes"

interface VentesData {
  mois: string
  ventes: number
  benefices: number
}

interface VentesBarProps {
  data: VentesData[]
}

export function VentesBar({ data }: VentesBarProps) {
  const { theme } = useTheme()

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer>
        <BarChart data={data}>
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
          <Bar dataKey="ventes" name="Ventes" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="benefices" name="Bénéfices" fill="#84cc16" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
