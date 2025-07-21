"use client"

import {
  Radar,
  RadarChart as RechartsRadarChart, // Renommage pour éviter le conflit
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts"
import { useTheme } from "next-themes"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface RadarData {
  subject: string;
  A: number;
  fullMark: number;
}

interface RadarChartProps {
  data: RadarData[];
}

export function RadarChart({ data }: RadarChartProps) {
  const { theme } = useTheme()

  if (!data || data.length === 0) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Performances Générales (Radar)</CardTitle>
            </CardHeader>
            <CardContent>
                <p>Pas de données de performance disponibles.</p>
            </CardContent>
        </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performances Générales (Radar)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer>
            <RechartsRadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
              <PolarGrid stroke={theme === 'dark' ? "#4A4A4A" : "#D4D4D4"} />
              <PolarAngleAxis dataKey="subject" stroke={theme === 'dark' ? "#E0E0E0" : "#333333"} />
              <PolarRadiusAxis 
                angle={90} 
                domain={[0, Math.max(...data.map(d => d.fullMark))]} 
                stroke={theme === 'dark' ? "#E0E0E0" : "#333333"} 
                tickFormatter={(value) => `${value}`}
              />
              <Radar name="Performance" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: theme === 'dark' ? '#333' : '#fff',
                  borderColor: theme === 'dark' ? '#555' : '#ccc'
                }}
              />
            </RechartsRadarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}