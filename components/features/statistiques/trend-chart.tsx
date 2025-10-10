"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";

interface TrendPoint {
  date: string;
  value: number;
  label?: string;
}

interface TrendChartProps {
  data?: TrendPoint[];
  loading?: boolean;
  title?: string;
  description?: string;
  className?: string;
  color?: string;
  showTrend?: boolean;
  formatValue?: (value: number) => string;
}

const defaultData: TrendPoint[] = [
  { date: "Jan", value: 120, label: "Janvier" },
  { date: "Fév", value: 135, label: "Février" },
  { date: "Mar", value: 180, label: "Mars" },
  { date: "Avr", value: 165, label: "Avril" },
  { date: "Mai", value: 220, label: "Mai" },
  { date: "Jun", value: 250, label: "Juin" },
  { date: "Jul", value: 280, label: "Juillet" },
  { date: "Aoû", value: 260, label: "Août" },
  { date: "Sep", value: 300, label: "Septembre" },
  { date: "Oct", value: 290, label: "Octobre" },
  { date: "Nov", value: 320, label: "Novembre" },
  { date: "Déc", value: 350, label: "Décembre" },
];

export function TrendChart({
  data = defaultData,
  loading = false,
  title = "Tendance des Ventes",
  description = "Évolution mensuelle du chiffre d'affaires",
  className,
  color = "hsl(var(--primary))",
  showTrend = true,
  formatValue = (value: number) => `${value}€`,
}: TrendChartProps) {
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <Skeleton className="h-64 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculer la tendance générale
  const firstValue = data[0]?.value || 0;
  const lastValue = data[data.length - 1]?.value || 0;
  const trendPercentage =
    firstValue > 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;
  const isPositiveTrend = trendPercentage > 0;

  // Normaliser les données pour l'affichage (0-100)
  const maxValue = Math.max(...data.map((d) => d.value));
  const minValue = Math.min(...data.map((d) => d.value));
  const range = maxValue - minValue;

  const normalizedData = data.map((point) => ({
    ...point,
    normalizedValue:
      range > 0 ? ((point.value - minValue) / range) * 80 + 10 : 50,
  }));

  // Créer le path SVG
  const createPath = (points: typeof normalizedData) => {
    if (points.length === 0) return "";

    const pathData = points
      .map((point, index) => {
        const x = (index / (points.length - 1)) * 100;
        const y = 100 - point.normalizedValue;
        return `${index === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");

    return pathData;
  };

  const path = createPath(normalizedData);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
          {showTrend && (
            <div className="flex items-center space-x-2">
              {isPositiveTrend ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <Badge variant={isPositiveTrend ? "default" : "destructive"}>
                {isPositiveTrend ? "+" : ""}
                {trendPercentage.toFixed(1)}%
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full">
          {/* Graphique principal */}
          <div className="relative h-64 w-full">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              {/* Grille horizontale */}
              {[20, 40, 60, 80].map((y) => (
                <line
                  key={y}
                  x1="0"
                  y1={y}
                  x2="100"
                  y2={y}
                  stroke="hsl(var(--border))"
                  strokeWidth="0.5"
                  opacity="0.3"
                />
              ))}

              {/* Grille verticale */}
              {normalizedData.map((_, index) => {
                if (index % 2 === 0) {
                  const x = (index / (normalizedData.length - 1)) * 100;
                  return (
                    <line
                      key={index}
                      x1={x}
                      y1="0"
                      x2={x}
                      y2="100"
                      stroke="hsl(var(--border))"
                      strokeWidth="0.5"
                      opacity="0.3"
                    />
                  );
                }
                return null;
              })}

              {/* Zone sous la courbe */}
              <path
                d={`${path} L 100 100 L 0 100 Z`}
                fill={color}
                fillOpacity="0.1"
              />

              {/* Ligne de tendance */}
              <path
                d={path}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Points de données */}
              {normalizedData.map((point, index) => {
                const x = (index / (normalizedData.length - 1)) * 100;
                const y = 100 - point.normalizedValue;
                return (
                  <circle
                    key={index}
                    cx={x}
                    cy={y}
                    r="2"
                    fill={color}
                    stroke="hsl(var(--background))"
                    strokeWidth="2"
                    className="hover:r-3 transition-all cursor-pointer"
                  />
                );
              })}
            </svg>

            {/* Labels des axes */}
            <div className="absolute -bottom-6 left-0 right-0 flex justify-between text-xs text-muted-foreground">
              {data.map((point, index) => {
                if (index % 2 === 0 || index === data.length - 1) {
                  return (
                    <span key={index} className="text-center">
                      {point.date}
                    </span>
                  );
                }
                return null;
              })}
            </div>
          </div>

          {/* Statistiques résumées */}
          <div className="mt-6 grid grid-cols-3 gap-4 text-center">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Minimum</p>
              <p className="font-mono font-bold text-lg">
                {formatValue(minValue)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Moyenne</p>
              <p className="font-mono font-bold text-lg">
                {formatValue(
                  data.reduce((sum, point) => sum + point.value, 0) /
                    data.length,
                )}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Maximum</p>
              <p className="font-mono font-bold text-lg">
                {formatValue(maxValue)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default TrendChart;
