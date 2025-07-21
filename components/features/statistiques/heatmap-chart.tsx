"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface HeatmapData {
  day: number;
  hour: number;
  value: number;
}

interface HeatmapChartProps {
  data: HeatmapData[];
}

const jours = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const heures = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));

export function HeatmapChart({ data }: HeatmapChartProps) {
  if (!data || data.length === 0) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Heatmap des Ventes</CardTitle>
            </CardHeader>
            <CardContent>
                <p>Pas de données de ventes disponibles.</p>
            </CardContent>
        </Card>
    );
  }
  
  const maxValue = Math.max(...data.map(d => d.value), 0);

  const getColor = (value: number) => {
    if (value === 0) return "bg-gray-200 dark:bg-gray-800";
    const intensity = Math.min(value / (maxValue || 1), 1);
    if (intensity < 0.2) return "bg-blue-200 dark:bg-blue-900";
    if (intensity < 0.4) return "bg-blue-300 dark:bg-blue-800";
    if (intensity < 0.6) return "bg-blue-400 dark:bg-blue-700";
    if (intensity < 0.8) return "bg-blue-500 dark:bg-blue-600";
    return "bg-blue-600 dark:bg-blue-500";
  };

  const gridData: (HeatmapData | undefined)[][] = Array(7).fill(0).map(() => Array(24).fill(undefined));
  data.forEach(item => {
      if(item.day >= 0 && item.day < 7 && item.hour >= 0 && item.hour < 24) {
        gridData[item.day][item.hour] = item;
      }
  });


  return (
    <Card>
      <CardHeader>
        <CardTitle>Heatmap des Ventes par Jour/Heure</CardTitle>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
            <div className="flex">
                <div className="flex flex-col mr-2 text-xs text-muted-foreground">
                    {jours.map(jour => <div key={jour} className="h-5 flex items-center">{jour}</div>)}
                </div>
                <div className="grid grid-flow-col grid-rows-7 gap-1">
                {gridData.flat().map((item, index) => (
                    <Tooltip key={index}>
                    <TooltipTrigger>
                        <div className={`w-5 h-5 rounded-sm ${getColor(item?.value || 0)}`}></div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{item ? `${item.value} vente(s)` : '0 vente'}</p>
                        <p className="text-xs text-muted-foreground">
                            {jours[index % 7]}, {heures[Math.floor(index/7)]}h
                        </p>
                    </TooltipContent>
                    </Tooltip>
                ))}
                </div>
            </div>
            <div className="flex ml-[24px] mt-1">
                {heures.map((h, i) => (i%3 === 0 && <div key={h} className="w-[68px] text-xs text-muted-foreground">{h}h</div>))}
            </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  )
}