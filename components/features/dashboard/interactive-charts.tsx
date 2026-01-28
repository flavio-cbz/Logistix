"use client";

import { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  Maximize2
} from "lucide-react";
import { cn, formatNumber } from "@/lib/shared/utils";
import { useFormatting } from "@/lib/hooks/use-formatting";
import { EmptyState } from "@/components/ui/empty-state";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

interface ChartData {
  name: string;
  value: number;
  date?: string;
  category?: string;
  [key: string]: unknown;
}

interface InteractiveChartProps {
  title: string;
  data: ChartData[];
  type: 'area' | 'bar' | 'line' | 'pie';
  dataKey: string;
  xAxisKey?: string;
  height?: number;
  description?: string;
  className?: string;
  color?: string;
  gradient?: boolean;
}

function getValueFromItem(item: Record<string, unknown>, key: string): number {
  if (!item) return 0;
  const val = item[key];
  return typeof val === 'number' ? val : 0;
}

export function InteractiveChart({
  title,
  data,
  type,
  dataKey,
  xAxisKey = 'name',
  height = 300,
  description,
  className,
  color = '#0088FE',
  gradient = true
}: InteractiveChartProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { formatCurrency } = useFormatting();

  const filteredData = useMemo(() => data || [], [data]);

  const trend = useMemo(() => {
    if (filteredData.length < 2) return { direction: 'stable', percentage: 0 };

    const current = (filteredData[filteredData.length - 1] as ChartData)?.[dataKey] as number || 0;
    const previous = (filteredData[filteredData.length - 2] as ChartData)?.[dataKey] as number || 0;

    if (previous === 0) return { direction: 'stable', percentage: 0 };

    const percentage = ((current - previous) / previous) * 100;
    const direction = percentage > 0 ? 'up' : percentage < 0 ? 'down' : 'stable';

    return { direction, percentage: Math.abs(percentage) };
  }, [filteredData, dataKey]);

  const renderChart = () => {
    if (!filteredData || filteredData.length === 0) {
      return (
        <div
          className="w-full"
          style={{ height: height }}
        >
          <EmptyState
            icon={BarChart3}
            title="Aucune donnée"
            description="Aucune donnée disponible pour cette période"
            size="sm"
            className="h-full border-none bg-accent/5"
          />
        </div>
      );
    }

    const commonProps = {
      data: filteredData,
      margin: { top: 5, right: 10, left: 0, bottom: 5 } // Reduced margins for better fit
    };

    switch (type) {
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart {...commonProps}>
              <defs>
                {gradient && (
                  <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={color} stopOpacity={0.1} />
                  </linearGradient>
                )}
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey={xAxisKey}
                className="text-xs"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
                minTickGap={30}
              />
              <YAxis
                className="text-xs"
                tickLine={false}
                axisLine={false}
                width={35}
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
                labelFormatter={(value) => {
                  if (!value || value === 'Invalid Date') return 'Date inconnue';
                  return value;
                }}
              />
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke={color}
                fill={gradient ? `url(#gradient-${dataKey})` : color}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey={xAxisKey} className="text-xs" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <YAxis className="text-xs" tickLine={false} axisLine={false} width={35} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                labelFormatter={(value) => {
                  if (!value || value === 'Invalid Date') return 'Date inconnue';
                  return value;
                }}
              />
              <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey={xAxisKey} className="text-xs" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <YAxis className="text-xs" tickLine={false} axisLine={false} width={35} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                labelFormatter={(value) => {
                  if (!value || value === 'Invalid Date') return 'Date inconnue';
                  return value;
                }}
              />
              <Line
                type="monotone"
                dataKey={dataKey}
                stroke={color}
                strokeWidth={3}
                dot={{ fill: color, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: color }}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'pie':
        // Group into top 5 + others if necessary
        const sorted = [...filteredData].sort((a, b) => {
          const aVal = getValueFromItem(a, dataKey);
          const bVal = getValueFromItem(b, dataKey);
          return bVal - aVal;
        });
        const top = sorted.slice(0, 5);
        const others = sorted.slice(5);
        const othersTotal = others.reduce((sum, item) => sum + getValueFromItem(item, dataKey), 0);
        const pieData = others.length > 0 ? [...top, { name: 'Autres', [dataKey]: othersTotal }] : top;

        // Calculate total for percentages
        const total = pieData.reduce((sum, item) => sum + getValueFromItem(item, dataKey), 0);

        // Add percentage to each data point
        const pieDataWithPercentages = pieData.map(item => {
          const value = getValueFromItem(item, dataKey);
          return {
            ...item,
            percentage: total > 0 ? (value / total * 100) : 0
          };
        });

        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={pieDataWithPercentages}
                cx="50%"
                cy="50%"
                innerRadius={height * 0.25}
                outerRadius={height * 0.4}
                paddingAngle={2}
                dataKey={dataKey}
                label={({ percent }: { percent?: number }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {pieDataWithPercentages.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
<<<<<<< HEAD
                formatter={(value: number | undefined, name: string | undefined, props: { payload?: Record<string, unknown> }) => {
                  const payload = props.payload;
                  const ventes = formatNumber(value ?? 0, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
                  const safeName = name ?? "";
                  const ca = payload?.['ventesRevenue'] ? ` — ${formatCurrency(payload['ventesRevenue'] as number)}` : '';
                  const pct = payload?.['percentage'] ? ` (${(payload['percentage'] as number).toFixed(1)}%)` : '';
                  return [`${ventes} ventes${ca}${pct}`, safeName];
=======
                formatter={(value: number, name: string, props: { payload?: Record<string, unknown> }) => {
                  const payload = props.payload;
                  const ventes = formatNumber(value, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
                  const ca = payload?.['ventesRevenue'] ? ` — ${formatCurrency(payload['ventesRevenue'] as number)}` : '';
                  const pct = payload?.['percentage'] ? ` (${(payload['percentage'] as number).toFixed(1)}%)` : '';
                  return [`${ventes} ventes${ca}${pct}`, name];
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
                }}
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  padding: '12px',
                  boxShadow: 'var(--shadow-xl)',
                  color: 'hsl(var(--popover-foreground))'
                }}
                labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600, marginBottom: '4px' }}
                itemStyle={{ color: 'hsl(var(--muted-foreground))', fontSize: '13px' }}
              />
              <Legend
                formatter={(value: string, entry: { payload?: Record<string, unknown> }) => {
                  const payload = entry.payload;
                  const percentage = (payload?.['percentage'] as number)?.toFixed(1) || '0.0';
                  const displayValue = value || '';
                  const shortName = displayValue.length > 15 ? `${displayValue.slice(0, 12)}...` : displayValue;
                  return `${shortName} (${percentage}%)`;
                }}
                wrapperStyle={{
                  paddingTop: '8px',
                  fontSize: '11px',
                  lineHeight: '1.5'
                }}
                iconType="circle"
                iconSize={8}
                layout="horizontal"
                align="center"
                verticalAlign="bottom"
              />
            </PieChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  const getTypeIcon = () => {
    switch (type) {
      case 'area':
      case 'line':
        return <LineChartIcon className="w-4 h-4 text-muted-foreground" />;
      case 'bar':
        return <BarChart3 className="w-4 h-4 text-muted-foreground" />;
      case 'pie':
        return <PieChartIcon className="w-4 h-4 text-muted-foreground" />;
      default:
        return null;
    }
  };

  return (
    <Card className={cn(
      "transition-all duration-300 hover:shadow-md",
      isFullscreen && "fixed inset-4 z-50 h-auto",
      className
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0 pr-2">
            <div className="mt-1 shrink-0 p-1.5 bg-muted/50 rounded-md">
              {getTypeIcon()}
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base font-semibold truncate leading-tight py-0.5" title={title}>
                {title}
              </CardTitle>
              {description && (
                <CardDescription className="text-xs truncate" title={description}>
                  {description}
                </CardDescription>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Trend indicator */}
            {trend.direction !== 'stable' && (
              <Badge variant={trend.direction === 'up' ? 'default' : 'destructive'} className="h-6 px-1.5 text-[10px]">
                {trend.direction === 'up' ? (
                  <TrendingUp className="w-3 h-3 mr-1" />
                ) : (
                  <TrendingDown className="w-3 h-3 mr-1" />
                )}
                {trend.percentage.toFixed(0)}%
              </Badge>
            )}

            {/* Actions */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="w-full">
          {renderChart()}
        </div>
      </CardContent>
    </Card>
  );
}

interface ChartGridProps {
  charts: Array<{
    id: string;
    title: string;
    data: ChartData[];
    type: 'area' | 'bar' | 'line' | 'pie';
    dataKey: string;
    xAxisKey?: string;
    description?: string;
    color?: string;
  }>;
  className?: string;
}

export function ChartGrid({ charts, className }: ChartGridProps) {
  return (
    <div className={cn(
      "grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3",
      className
    )}>
      {charts.map((chart) => (
        <InteractiveChart
          key={chart.id}
          {...chart}
          height={250}
        />
      ))}
    </div>
  );
}