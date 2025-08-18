"use client"

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from 'next-themes'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'
import { getChartColors, getModernTooltipConfig, formatChartValue } from '@/lib/utils/chart-utils'
import { cn } from '@/lib/utils'

export interface ModernChartProps {
  data: Array<Record<string, any>>
  type: 'line' | 'area' | 'bar' | 'pie'
  title?: string
  description?: string
  xAxisKey: string
  yAxisKey: string | string[]
  colors?: string[]
  enableAnimations?: boolean
  showGrid?: boolean
  showTooltip?: boolean
  showLegend?: boolean
  height?: number
  className?: string
  formatValue?: (value: number) => string
  responsive?: boolean
}

export const ModernChart: React.FC<ModernChartProps> = ({
  data,
  type,
  title,
  description,
  xAxisKey,
  yAxisKey,
  colors,
  enableAnimations = true,
  showGrid = true,
  showTooltip = true,
  showLegend = true,
  height = 400,
  className,
  formatValue = (value) => formatChartValue(value),
  responsive = true,
}) => {
  const { theme } = useTheme()
  const [isVisible, setIsVisible] = useState(false)
  const chartColors = getChartColors(theme)
  const finalColors = colors || chartColors.primary

  // Animation entrance effect
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  // Chart configuration
  const chartConfig = React.useMemo(() => {
    const keys = Array.isArray(yAxisKey) ? yAxisKey : [yAxisKey]
    return keys.reduce((config, key, index) => {
      config[key] = {
        label: key.charAt(0).toUpperCase() + key.slice(1),
        color: finalColors[index % finalColors.length],
      }
      return config
    }, {} as Record<string, { label: string; color: string }>)
  }, [yAxisKey, finalColors])

  // Modern tooltip formatter
  const customTooltipFormatter = (value: any, name: string) => [
    formatValue(value),
    chartConfig[name]?.label || name
  ]

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut",
        staggerChildren: 0.1
      }
    }
  }

  const titleVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { duration: 0.5, ease: "easeOut" }
    }
  }

  // Render different chart types
  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 20, right: 30, left: 20, bottom: 20 },
    }

    const axisProps = {
      axisLine: { stroke: chartColors.grid, strokeWidth: 1 },
      tickLine: { stroke: chartColors.grid, strokeWidth: 1 },
      tick: { 
        fill: chartColors.text, 
        fontSize: 12, 
        fontWeight: 500 
      },
    }

    const gridProps = showGrid ? {
      stroke: chartColors.grid,
      strokeWidth: 0.5,
      strokeOpacity: 0.6,
      strokeDasharray: "2 2",
    } : false

    const tooltipProps = showTooltip ? {
      content: (
        <ChartTooltipContent 
          formatter={customTooltipFormatter}
          modern={true}
        />
      )
    } : false

    switch (type) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            {showGrid && <CartesianGrid {...gridProps} />}
            <XAxis dataKey={xAxisKey} {...axisProps} />
            <YAxis {...axisProps} />
            {tooltipProps && <Tooltip {...tooltipProps} />}
            {showLegend && (
              <Legend 
                wrapperStyle={{ 
                  fontSize: '14px', 
                  fontWeight: '500',
                  color: chartColors.text 
                }}
              />
            )}
            {(Array.isArray(yAxisKey) ? yAxisKey : [yAxisKey]).map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={finalColors[index % finalColors.length]}
                strokeWidth={3}
                dot={{ 
                  fill: finalColors[index % finalColors.length], 
                  strokeWidth: 2,
                  stroke: chartColors.background,
                  r: 4
                }}
                activeDot={{ 
                  r: 6, 
                  stroke: finalColors[index % finalColors.length],
                  strokeWidth: 2,
                  fill: chartColors.background
                }}
                animationDuration={enableAnimations ? 1500 : 0}
                animationEasing="ease-out"
              />
            ))}
          </LineChart>
        )

      case 'area':
        return (
          <AreaChart {...commonProps}>
            {showGrid && <CartesianGrid {...gridProps} />}
            <XAxis dataKey={xAxisKey} {...axisProps} />
            <YAxis {...axisProps} />
            {tooltipProps && <Tooltip {...tooltipProps} />}
            {showLegend && (
              <Legend 
                wrapperStyle={{ 
                  fontSize: '14px', 
                  fontWeight: '500',
                  color: chartColors.text 
                }}
              />
            )}
            {(Array.isArray(yAxisKey) ? yAxisKey : [yAxisKey]).map((key, index) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stroke={finalColors[index % finalColors.length]}
                strokeWidth={2}
                fill={`url(#gradient-${index})`}
                animationDuration={enableAnimations ? 1500 : 0}
                animationEasing="ease-out"
              />
            ))}
            <defs>
              {(Array.isArray(yAxisKey) ? yAxisKey : [yAxisKey]).map((_, index) => (
                <linearGradient key={index} id={`gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                  <stop 
                    offset="5%" 
                    stopColor={finalColors[index % finalColors.length]} 
                    stopOpacity={0.3}
                  />
                  <stop 
                    offset="95%" 
                    stopColor={finalColors[index % finalColors.length]} 
                    stopOpacity={0.05}
                  />
                </linearGradient>
              ))}
            </defs>
          </AreaChart>
        )

      case 'bar':
        return (
          <BarChart {...commonProps}>
            {showGrid && <CartesianGrid {...gridProps} />}
            <XAxis dataKey={xAxisKey} {...axisProps} />
            <YAxis {...axisProps} />
            {tooltipProps && <Tooltip {...tooltipProps} />}
            {showLegend && (
              <Legend 
                wrapperStyle={{ 
                  fontSize: '14px', 
                  fontWeight: '500',
                  color: chartColors.text 
                }}
              />
            )}
            {(Array.isArray(yAxisKey) ? yAxisKey : [yAxisKey]).map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                fill={finalColors[index % finalColors.length]}
                radius={[4, 4, 0, 0]}
                animationDuration={enableAnimations ? 1000 : 0}
                animationEasing="ease-out"
              />
            ))}
          </BarChart>
        )

      case 'pie':
        return (
          <PieChart {...commonProps}>
            {tooltipProps && <Tooltip {...tooltipProps} />}
            {showLegend && (
              <Legend 
                wrapperStyle={{ 
                  fontSize: '14px', 
                  fontWeight: '500',
                  color: chartColors.text 
                }}
              />
            )}
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={120}
              innerRadius={40}
              paddingAngle={2}
              dataKey={Array.isArray(yAxisKey) ? yAxisKey[0] : yAxisKey}
              animationDuration={enableAnimations ? 1000 : 0}
              animationEasing="ease-out"
            >
              {data.map((_, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={finalColors[index % finalColors.length]}
                />
              ))}
            </Pie>
          </PieChart>
        )

      default:
        return null
    }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate={isVisible ? "visible" : "hidden"}
      className={cn("modern-chart w-full", className)}
    >
      {(title || description) && (
        <motion.div variants={titleVariants} className="mb-6">
          {title && (
            <h3 className="text-xl font-semibold text-chart-text mb-2">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-sm text-chart-text opacity-70">
              {description}
            </p>
          )}
        </motion.div>
      )}

      <motion.div
        variants={titleVariants}
        className="w-full"
        style={{ height: responsive ? 'auto' : height }}
      >
        <ChartContainer 
          config={chartConfig}
          enableAnimations={enableAnimations}
          className="w-full"
          style={{ height }}
        >
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </ChartContainer>
      </motion.div>
    </motion.div>
  )
}

export default ModernChart