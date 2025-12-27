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

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

interface ChartData {
  name: string;
  value: number;
  date?: string;
  category?: string;
  [key: string]: any;
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

function getValueFromItem(item: Record<string, any>, key: string) {
  if (!item) return 0;
  return item[key] ?? 0;
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

    const current = filteredData[filteredData.length - 1]?.[dataKey] || 0;
    const previous = filteredData[filteredData.length - 2]?.[dataKey] || 0;

    if (previous === 0) return { direction: 'stable', percentage: 0 };

    const percentage = ((current - previous) / previous) * 100;
    const direction = percentage > 0 ? 'up' : percentage < 0 ? 'down' : 'stable';

    return { direction, percentage: Math.abs(percentage) };
  }, [filteredData, dataKey]);

  const renderChart = () => {
    const commonProps = {
      data: filteredData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
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
              />
              <YAxis
                className="text-xs"
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
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
              <XAxis dataKey={xAxisKey} className="text-xs" tickLine={false} axisLine={false} />
              <YAxis className="text-xs" tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
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
              <XAxis dataKey={xAxisKey} className="text-xs" tickLine={false} axisLine={false} />
              <YAxis className="text-xs" tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
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
                cy="45%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey={dataKey}
                label={({ percentage }: { percentage: number }) => `${(percentage || 0).toFixed(1)}%`}
                labelLine={false}
              >
                {pieDataWithPercentages.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string, props: any) => {
                  const ventes = formatNumber(value, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
                  const ca = props.payload?.['ventesRevenue'] ? ` — ${formatCurrency(props.payload['ventesRevenue'])}` : '';
                  const pct = props.payload?.['percentage'] ? ` (${props.payload['percentage'].toFixed(1)}%)` : '';
                  return [`${ventes} ventes${ca}${pct}`, name];
                }}
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.98)',
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                  borderRadius: '8px',
                  padding: '12px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  color: '#000'
                }}
                labelStyle={{ color: '#000', fontWeight: 600, marginBottom: '4px' }}
                itemStyle={{ color: '#666', fontSize: '13px' }}
              />
              <Legend
                formatter={(value: string, entry: any) => {
                  const percentage = entry.payload?.['percentage']?.toFixed(1) || '0.0';
                  const displayValue = value || '';
                  const shortName = displayValue.length > 18 ? `${displayValue.slice(0, 15)}...` : displayValue;
                  return `${shortName} (${percentage}%)`;
                }}
                wrapperStyle={{
                  paddingTop: '16px',
                  fontSize: '11px',
                  lineHeight: '1.8'
                }}
                iconType="circle"
                iconSize={10}
                layout="horizontal"
                align="center"
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
        return <LineChartIcon className="w-4 h-4" />;
      case 'bar':
        return <BarChart3 className="w-4 h-4" />;
      case 'pie':
        return <PieChartIcon className="w-4 h-4" />;
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
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getTypeIcon()}
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              {description && (
                <CardDescription>{description}</CardDescription>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Trend indicator */}
            {trend.direction !== 'stable' && (
              <Badge variant={trend.direction === 'up' ? 'default' : 'destructive'}>
                {trend.direction === 'up' ? (
                  <TrendingUp className="w-3 h-3 mr-1" />
                ) : (
                  <TrendingDown className="w-3 h-3 mr-1" />
                )}
                {trend.percentage.toFixed(1)}%
              </Badge>
            )}

            {/* Actions */}
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
            </div>
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