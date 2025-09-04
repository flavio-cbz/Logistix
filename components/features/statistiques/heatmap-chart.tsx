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
    if (value === 0) return "bg-[hsl(var(--muted))] dark:bg-[hsl(var(--muted))]";
    const intensity = Math.min(value / (maxValue || 1), 1);
    if (intensity < 0.2) return "bg-[hsl(var(--primary))] dark:bg-[hsl(var(--primary))]";
    if (intensity < 0.4) return "bg-[hsl(var(--primary))] dark:bg-[hsl(var(--primary))]";
    if (intensity < 0.6) return "bg-[hsl(var(--primary))] dark:bg-[hsl(var(--primary))]";
    if (intensity < 0.8) return "bg-[hsl(var(--primary))] dark:bg-[hsl(var(--primary))]";
    return "bg-[hsl(var(--primary))] dark:bg-[hsl(var(--primary))]";
  };

  const gridData: (HeatmapData | undefined)[][] = Array(7).fill(0).map(() => Array(24).fill(undefined));
  data.forEach(_item => {
      if(_item.day >= 0 && _item.day < 7 && _item.hour >= 0 && _item.hour < 24) {
        gridData[_item.day as number][_item.hour as number] = _item;
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
        {gridData.flat().map((_item, index) => (
          <Tooltip key={index}>
          <TooltipTrigger>
            <div className={`w-5 h-5 rounded-sm ${getColor(_item?.value || 0)}`}></div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{_item ? `${_item.value} vente(s)` : '0 vente'}</p>
            <p className="text-xs text-muted-foreground">
              {jours[index % 7]!}, {heures[Math.floor(index/7)]!}h
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