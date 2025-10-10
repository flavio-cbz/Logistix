"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp } from "lucide-react";

interface RadarDataPoint {
  metric: string;
  value: number;
  fullMark: number;
}

interface RadarChartProps {
  data?: RadarDataPoint[];
  loading?: boolean;
  title?: string;
  description?: string;
  className?: string;
  colors?: string[];
}

const defaultData: RadarDataPoint[] = [
  { metric: "Rentabilité", value: 85, fullMark: 100 },
  { metric: "Rapidité vente", value: 72, fullMark: 100 },
  { metric: "Volume ventes", value: 90, fullMark: 100 },
  { metric: "Satisfaction client", value: 88, fullMark: 100 },
  { metric: "Diversité produits", value: 76, fullMark: 100 },
  { metric: "Facilité gestion", value: 82, fullMark: 100 },
];

export function RadarChart({
  data = defaultData,
  loading = false,
  title = "Performance Globale",
  description = "Vue d'ensemble des indicateurs clés",
  className,
}: RadarChartProps) {
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <Skeleton className="h-64 w-64 rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="relative w-64 h-64 mx-auto">
              {/* Grille radar simulée */}
              <svg viewBox="0 0 200 200" className="w-full h-full">
                {/* Grilles concentriques */}
                {[20, 40, 60, 80, 100].map((radius) => (
                  <polygon
                    key={radius}
                    points={data
                      .map((_, i) => {
                        const angle =
                          (i * 2 * Math.PI) / data.length - Math.PI / 2;
                        const x = 100 + radius * Math.cos(angle);
                        const y = 100 + radius * Math.sin(angle);
                        return `${x},${y}`;
                      })
                      .join(" ")}
                    fill="none"
                    stroke="hsl(var(--border))"
                    strokeWidth="1"
                  />
                ))}

                {/* Lignes depuis le centre */}
                {data.map((_, i) => {
                  const angle = (i * 2 * Math.PI) / data.length - Math.PI / 2;
                  const x = 100 + 100 * Math.cos(angle);
                  const y = 100 + 100 * Math.sin(angle);
                  return (
                    <line
                      key={i}
                      x1="100"
                      y1="100"
                      x2={x}
                      y2={y}
                      stroke="hsl(var(--border))"
                      strokeWidth="1"
                    />
                  );
                })}

                {/* Données */}
                <polygon
                  points={data
                    .map((item, i) => {
                      const angle =
                        (i * 2 * Math.PI) / data.length - Math.PI / 2;
                      const radius = item.value;
                      const x = 100 + radius * Math.cos(angle);
                      const y = 100 + radius * Math.sin(angle);
                      return `${x},${y}`;
                    })
                    .join(" ")}
                  fill="hsl(var(--primary))"
                  fillOpacity="0.3"
                  stroke="hsl(var(--primary))"
                  strokeWidth="2"
                />

                {/* Points de données */}
                {data.map((item, i) => {
                  const angle = (i * 2 * Math.PI) / data.length - Math.PI / 2;
                  const radius = item.value;
                  const x = 100 + radius * Math.cos(angle);
                  const y = 100 + radius * Math.sin(angle);
                  return (
                    <circle
                      key={i}
                      cx={x}
                      cy={y}
                      r="3"
                      fill="hsl(var(--primary))"
                      stroke="hsl(var(--background))"
                      strokeWidth="2"
                    />
                  );
                })}

                {/* Labels des métriques */}
                {data.map((item, i) => {
                  const angle = (i * 2 * Math.PI) / data.length - Math.PI / 2;
                  const x = 100 + 110 * Math.cos(angle);
                  const y = 100 + 110 * Math.sin(angle);
                  return (
                    <text
                      key={i}
                      x={x}
                      y={y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="text-xs fill-current text-muted-foreground"
                    >
                      {item.metric}
                    </text>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>

        {/* Légende des métriques */}
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          {data.map((item) => (
            <div
              key={item.metric}
              className="flex items-center justify-between"
            >
              <span className="text-muted-foreground">{item.metric}</span>
              <span className="font-mono font-medium">{item.value}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default RadarChart;
