"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

interface DistributionWidgetProps {
  title: string;
  data: Record<string, number>;
}

export default function DistributionWidget({
  title,
  data,
}: DistributionWidgetProps) {
  const chartData = data
    ? Object.entries(data)
        .map(([name, count]) => ({ name, count }))
        .sort(
          (
            a: { name: string; count: number },
            b: { name: string; count: number },
          ) => b.count - a.count,
        )
        .slice(0, 10)
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                width={80}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip cursor={{ fill: "hsl(var(--muted))" }} />
              <Bar
                dataKey="count"
                fill="hsl(var(--primary))"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-muted-foreground">
            Aucune donnée de distribution disponible.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
