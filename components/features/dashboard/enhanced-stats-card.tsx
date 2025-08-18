"use client"

import React from "react"
import { motion } from "framer-motion"
import { TrendingUp, TrendingDown, Minus, MoreHorizontal } from "lucide-react"
import { EnhancedCard, EnhancedCardContent, EnhancedCardHeader } from "@/components/ui/enhanced-card"
import { cn } from "@/lib/utils"
import { createStatsDescription, generateId } from "@/lib/utils/accessibility"
import { useLiveRegionContext } from "@/components/ui/live-region"

// Simple sparkline component using SVG
interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  color?: string
  strokeWidth?: number
}

function Sparkline({ data, width = 80, height = 20, color = "currentColor", strokeWidth = 1.5 }: SparklineProps) {
  if (!data || data.length < 2) {
    return (
      <div 
        className={`w-[${width}px] h-[${height}px]`}
        role="img"
        aria-label="Aucune donnée de tendance disponible"
      />
    )
  }

  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const trend = data[data.length - 1] > data[0] ? 'croissante' : 
               data[data.length - 1] < data[0] ? 'décroissante' : 'stable'

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width
    const y = height - ((value - min) / range) * height
    return `${x},${y}`
  }).join(' ')

  const sparklineDescription = `Graphique de tendance avec ${data.length} points de données. ` +
    `Valeur minimale: ${min.toLocaleString('fr-FR')}, ` +
    `valeur maximale: ${max.toLocaleString('fr-FR')}, ` +
    `tendance: ${trend}.`

  return (
    <svg 
      width={width} 
      height={height} 
      className="overflow-visible"
      role="img"
      aria-label={sparklineDescription}
    >
      <title>{sparklineDescription}</title>
      <motion.polyline
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        points={points}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1, ease: "easeInOut" }}
        className="drop-shadow-sm"
      />
    </svg>
  )
}

// Trend indicator component
interface TrendIndicatorProps {
  value: number
  label?: string
  showIcon?: boolean
  className?: string
}

function TrendIndicator({ value, label, showIcon = true, className }: TrendIndicatorProps) {
  const isPositive = value > 0
  const isNeutral = value === 0
  
  const Icon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown
  const colorClass = isNeutral 
    ? "text-muted-foreground" 
    : isPositive 
      ? "text-success" 
      : "text-destructive"

  const trendDescription = isNeutral 
    ? "Tendance stable" 
    : isPositive 
      ? `Tendance positive de ${value.toFixed(1)}%` 
      : `Tendance négative de ${Math.abs(value).toFixed(1)}%`

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className={cn("flex items-center gap-1 text-xs font-medium", colorClass, className)}
      role="status"
      aria-label={`${trendDescription}${label ? ` ${label}` : ''}`}
    >
      {showIcon && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.2, delay: 0.4 }}
          aria-hidden="true"
        >
          <Icon className="h-3 w-3" />
        </motion.div>
      )}
      <span aria-hidden="true">
        {isPositive && "+"}
        {value.toFixed(1)}%
      </span>
      {label && <span className="text-muted-foreground ml-1" aria-hidden="true">{label}</span>}
    </motion.div>
  )
}

// Main enhanced stats card component
export interface EnhancedStatsCardProps {
  title: string
  value: string | number
  description?: string
  icon?: React.ReactNode
  trend?: {
    value: number
    label?: string
  }
  sparklineData?: number[]
  variant?: "default" | "gradient" | "glass" | "elevated"
  className?: string
  loading?: boolean
  interactive?: boolean
  onHover?: () => void
  additionalDetails?: {
    label: string
    value: string | number
  }[]
}

export function EnhancedStatsCard({
  title,
  value,
  description,
  icon,
  trend,
  sparklineData,
  variant = "default",
  className,
  loading = false,
  interactive = false,
  onHover,
  additionalDetails
}: EnhancedStatsCardProps) {
  const [isHovered, setIsHovered] = React.useState(false)
  const { announce } = useLiveRegionContext()
  const cardId = React.useMemo(() => generateId(), [])
  const descriptionId = React.useMemo(() => generateId(), [])

  const handleMouseEnter = () => {
    setIsHovered(true)
    onHover?.()
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
  }

  // Generate comprehensive description for screen readers
  const cardDescription = React.useMemo(() => {
    return createStatsDescription(title, value, trend, description)
  }, [title, value, trend, description])

  // Announce changes when data updates
  React.useEffect(() => {
    if (!loading && value) {
      announce(`Statistique mise à jour: ${cardDescription}`, 'polite')
    }
  }, [value, loading, cardDescription, announce])

  if (loading) {
    return (
      <EnhancedCard 
        skeleton={true}
        className={className}
        accessibility={{
          label: `Chargement des statistiques pour ${title}`,
          description: "Chargement en cours des données statistiques"
        }}
      />
    )
  }

  return (
    <EnhancedCard
      id={cardId}
      variant={variant}
      interactive={interactive}
      className={cn("group relative overflow-hidden", className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      accessibility={{
        label: cardDescription,
        description: description
      }}
    >
      <EnhancedCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <motion.h3
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="typography-body font-medium text-muted-foreground"
          id={`${cardId}-title`}
        >
          {title}
        </motion.h3>
        <div className="flex items-center gap-2">
          {sparklineData && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="text-primary"
            >
              <Sparkline 
                data={sparklineData} 
                color="hsl(var(--primary))"
                width={60}
                height={16}
              />
            </motion.div>
          )}
          {icon && (
            <motion.div
              initial={{ opacity: 0, rotate: -10 }}
              animate={{ opacity: 1, rotate: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="text-muted-foreground"
              aria-hidden="true"
            >
              {icon}
            </motion.div>
          )}
        </div>
      </EnhancedCardHeader>

      <EnhancedCardContent>
        <div className="space-y-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="typography-display text-2xl font-bold"
            aria-labelledby={`${cardId}-title`}
          >
            {value}
          </motion.div>

          <div className="flex items-center justify-between">
            {trend && (
              <TrendIndicator 
                value={trend.value} 
                label={trend.label}
              />
            )}
            
            {additionalDetails && isHovered && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <MoreHorizontal className="h-4 w-4" />
              </motion.button>
            )}
          </div>

          {description && (
            <motion.p
              id={descriptionId}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.3 }}
              className="typography-small text-muted-foreground"
            >
              {description}
            </motion.p>
          )}
        </div>

        {/* Additional details on hover */}
        {additionalDetails && isHovered && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-4 pt-4 border-t border-border/50 space-y-2"
          >
            {additionalDetails.map((detail, index) => (
              <motion.div
                key={detail.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: index * 0.1 }}
                className="flex justify-between items-center text-xs"
              >
                <span className="text-muted-foreground">{detail.label}</span>
                <span className="font-medium">{detail.value}</span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </EnhancedCardContent>

      {/* Hover effect overlay */}
      {interactive && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 pointer-events-none"
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        />
      )}
    </EnhancedCard>
  )
}