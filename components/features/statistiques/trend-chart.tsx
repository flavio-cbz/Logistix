"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceArea } from 'recharts';
import { useTheme } from "next-themes"
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
  const { theme } = useTheme();

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

  // Trouver l'index du premier mois de prévision (où i < 0 dans le calcul API)
  // Pour le moment, je vais assumer que les 3 derniers points sont des prévisions.
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
              <Line type="monotone" dataKey="valeur" stroke="#8884d8" name="Ventes Réelles/Prévisions" activeDot={{ r: 8 }} />
              
              {/* Bande de confiance */}
              <Line type="monotone" dataKey="max" stroke="#82ca9d" strokeDasharray="5 5" name="Max (Confiance)" dot={false} />
              <Line type="monotone" dataKey="min" stroke="#ffc658" strokeDasharray="5 5" name="Min (Confiance)" dot={false} />

              {/* Zone de prévision */}
              {predictionStartIndex > 0 && (
                <ReferenceArea
                  x1={data[predictionStartIndex].mois}
                  x2={data[data.length - 1].mois}
                  strokeOpacity={0.3}
                  fill="#ccc"
                  label={{
                    value: "Prévision",
                    position: "top",
                    fill: theme === 'dark' ? "#fff" : "#000"
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