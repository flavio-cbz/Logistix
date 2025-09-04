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
              <PolarGrid stroke={`hsl(var(--chart-grid))`} />
              <PolarAngleAxis dataKey="subject" stroke={`hsl(var(--chart-text))`} />
              <PolarRadiusAxis 
                angle={90} 
                domain={[0, Math.max(...data.map(d => d.fullMark))]} 
                stroke={`hsl(var(--chart-text))`} 
                tickFormatter={(value) => `${value}`}
              />
              <Radar name="Performance" dataKey="A" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: `hsl(var(--chart-tooltip-bg))`,
                  borderColor: `hsl(var(--chart-tooltip-text))`
                }}
              />
            </RechartsRadarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}