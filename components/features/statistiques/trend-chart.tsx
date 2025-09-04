"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceArea } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface TrendData {
  mois: string;
  valeur: number;
  min: number;
  max: number;
}

interface TrendChartProps {
  data: TrendData[];
}

export function TrendChart({ data }: TrendChartProps) {

  if (!data || data.length === 0) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Courbe de Tendance des Ventes</CardTitle>
            </CardHeader>
            <CardContent>
                <p>Pas de données de tendance disponibles.</p>
            </CardContent>
        </Card>
    );
  }

  const predictionStartIndex = data.length > 3 ? data.length - 3 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Courbe de Tendance des Ventes avec Prévisions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer>
            <LineChart
              data={data}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
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
              <Line type="monotone" dataKey="valeur" stroke={`hsl(var(--chart-1))`} name="Ventes Réelles/Prévisions" activeDot={{ r: 8 }} />

              {/* Bande de confiance */}
              <Line type="monotone" dataKey="max" stroke={`hsl(var(--chart-2))`} strokeDasharray="5 5" name="Max (Confiance)" dot={false} />
              <Line type="monotone" dataKey="min" stroke={`hsl(var(--chart-3))`} strokeDasharray="5 5" name="Min (Confiance)" dot={false} />

              {/* Zone de prévision */}
              {predictionStartIndex > 0 && (
                <ReferenceArea
                  x1={data[predictionStartIndex]!!!.mois}
                  x2={data[data.length - 1]!!!.mois}
                  strokeOpacity={0.3}
                  fill={`hsl(var(--chart-grid))`}
                  label={{
                    value: "Prévision",
                    position: "top",
                    fill: `hsl(var(--chart-text))`
                  }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}