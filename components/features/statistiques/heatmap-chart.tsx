"use client";

import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";

interface HeatmapData {
  jour: string;
  heure: number;
  valeur: number;
  intensite: number;
}

interface HeatmapChartProps {
  data?: HeatmapData[];
  loading?: boolean;
  className?: string;
}

export function HeatmapChart({
  data = [],
  loading = false,
  className,
}: HeatmapChartProps) {
  const heures = Array.from({ length: 24 }, (_, i) => i);
  const jours = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  const heatmapGrid = useMemo(() => {
    const grid: Record<string, Record<number, HeatmapData | null>> = {};

    jours.forEach((jour) => {
      grid[jour] = {};
      heures.forEach((heure) => {
        grid[jour][heure] =
          data.find((d) => d.jour === jour && d.heure === heure) || null;
      });
    });

    return grid;
  }, [data]);

  const getIntensiteColor = (intensite: number) => {
    if (intensite === 0) return "bg-gray-100";
    if (intensite <= 0.25) return "bg-blue-100";
    if (intensite <= 0.5) return "bg-blue-200";
    if (intensite <= 0.75) return "bg-blue-400";
    return "bg-blue-600";
  };

  const getStats = () => {
    if (data.length === 0)
      return { max: 0, min: 0, avg: 0, trend: "stable" as const };

    const valeurs = data.map((d) => d.valeur);
    const max = Math.max(...valeurs);
    const min = Math.min(...valeurs);
    const avg = valeurs.reduce((a, b) => a + b, 0) / valeurs.length;

    // Calcul de tendance simple
    const firstHalf = valeurs.slice(0, Math.floor(valeurs.length / 2));
    const secondHalf = valeurs.slice(Math.floor(valeurs.length / 2));
    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const trend =
      avgSecond > avgFirst * 1.05
        ? "up"
        : avgSecond < avgFirst * 0.95
          ? "down"
          : "stable";

    return { max, min, avg, trend };
  };

  const stats = getStats();

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Carte de Chaleur des Ventes</CardTitle>
              <CardDescription>
                Activité par jour et heure de la semaine
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-1">
              {stats.trend === "up" && (
                <TrendingUp className="h-4 w-4 text-green-500" />
              )}
              {stats.trend === "down" && (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <span className="font-medium">Moy: {stats.avg.toFixed(1)}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Aucune donnée d'activité disponible
          </div>
        ) : (
          <div className="space-y-4">
            {/* Légende */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Faible activité</span>
              <div className="flex space-x-1">
                <div className="w-3 h-3 bg-gray-100 border rounded"></div>
                <div className="w-3 h-3 bg-blue-100 rounded"></div>
                <div className="w-3 h-3 bg-blue-200 rounded"></div>
                <div className="w-3 h-3 bg-blue-400 rounded"></div>
                <div className="w-3 h-3 bg-blue-600 rounded"></div>
              </div>
              <span>Forte activité</span>
            </div>

            {/* Grille heatmap */}
            <div className="relative">
              {/* En-têtes des heures */}
              <div className="grid grid-cols-25 gap-1 mb-2">
                <div></div> {/* Espace pour les jours */}
                {heures.map((heure) => (
                  <div
                    key={heure}
                    className="text-xs text-center text-muted-foreground"
                  >
                    {heure}h
                  </div>
                ))}
              </div>

              {/* Grille principale */}
              {jours.map((jour) => (
                <div key={jour} className="grid grid-cols-25 gap-1 mb-1">
                  <div className="text-xs text-right pr-2 flex items-center text-muted-foreground">
                    {jour}
                  </div>
                  {heures.map((heure) => {
                    const cellData = heatmapGrid[jour][heure];
                    return (
                      <div
                        key={`${jour}-${heure}`}
                        className={`
                          h-6 rounded-sm border border-gray-200 
                          ${cellData ? getIntensiteColor(cellData.intensite) : "bg-gray-50"}
                          hover:ring-2 hover:ring-blue-300 hover:ring-opacity-50
                          cursor-pointer transition-all duration-200
                        `}
                        title={
                          cellData
                            ? `${jour} ${heure}h: ${cellData.valeur} ventes`
                            : `${jour} ${heure}h: Aucune données`
                        }
                      />
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Statistiques */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {stats.max.toFixed(0)}
                </div>
                <div className="text-xs text-muted-foreground">Pic maximum</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {stats.avg.toFixed(1)}
                </div>
                <div className="text-xs text-muted-foreground">Moyenne</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {stats.min.toFixed(0)}
                </div>
                <div className="text-xs text-muted-foreground">Minimum</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default HeatmapChart;
