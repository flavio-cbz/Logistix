"use client"

import React from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface SkeletonProps {
  className?: string
}

// Base skeleton component with shimmer effect
function SkeletonBase({ className }: SkeletonProps) {
  return (
    <div 
      className={cn(
        "bg-muted rounded animate-shimmer bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%]",
        className
      )} 
    />
  )
}

// Chart skeleton for performance charts, line charts, etc.
export function ChartSkeleton({ className }: SkeletonProps) {
  return (
    <Card className={cn("h-full", className)}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <SkeletonBase className="h-5 w-48" />
            <SkeletonBase className="h-3 w-32" />
          </div>
          <div className="flex gap-2">
            <SkeletonBase className="h-8 w-8 rounded" />
            <SkeletonBase className="h-8 w-8 rounded" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Chart area */}
          <div className="h-64 relative">
            <SkeletonBase className="absolute inset-0 rounded-lg" />
            {/* Simulate chart lines */}
            <div className="absolute inset-4 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scaleX: 0 }}
                  animate={{ opacity: 0.3, scaleX: 1 }}
                  transition={{ duration: 0.8, delay: i * 0.1 }}
                  className="h-px bg-muted-foreground/20 origin-left"
                />
              ))}
            </div>
          </div>
          
          {/* Legend */}
          <div className="flex justify-center gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <SkeletonBase className="h-3 w-3 rounded-full" />
                <SkeletonBase className="h-3 w-16" />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Table skeleton for top products, rankings, etc.
export function TableSkeleton({ className, rows = 5 }: SkeletonProps & { rows?: number }) {
  return (
    <Card className={cn("h-full", className)}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <SkeletonBase className="h-5 w-40" />
            <SkeletonBase className="h-3 w-28" />
          </div>
          <div className="flex gap-2">
            <SkeletonBase className="h-8 w-8 rounded" />
            <SkeletonBase className="h-8 w-8 rounded" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: rows }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="flex items-center justify-between p-3 rounded-lg border border-muted"
            >
              <div className="flex items-center gap-3 flex-1">
                <SkeletonBase className="h-6 w-6 rounded-full" />
                <div className="space-y-1 flex-1">
                  <SkeletonBase className="h-4 w-full max-w-48" />
                  <SkeletonBase className="h-3 w-32" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <SkeletonBase className="h-6 w-16 rounded-full" />
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Stats card skeleton for KPI cards
export function StatsCardSkeleton({ className }: SkeletonProps) {
  return (
    <Card className={cn("h-full", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <SkeletonBase className="h-4 w-32" />
        <div className="flex items-center gap-2">
          <SkeletonBase className="h-4 w-16" />
          <SkeletonBase className="h-4 w-4 rounded" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <SkeletonBase className="h-8 w-24" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <SkeletonBase className="h-3 w-3 rounded" />
              <SkeletonBase className="h-3 w-12" />
            </div>
            <SkeletonBase className="h-4 w-4 rounded" />
          </div>
          <SkeletonBase className="h-3 w-full" />
        </div>
      </CardContent>
    </Card>
  )
}

// Grid skeleton for dashboard layouts
export function DashboardGridSkeleton({ 
  className,
  columns = 4,
  rows = 2 
}: SkeletonProps & { columns?: number; rows?: number }) {
  const totalItems = columns * rows

  return (
    <div className={cn(
      "grid gap-4",
      columns === 1 && "grid-cols-1",
      columns === 2 && "grid-cols-1 md:grid-cols-2",
      columns === 3 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
      columns === 4 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
      className
    )}>
      {Array.from({ length: totalItems }).map((_, i) => {
        const isChart = i % 4 === 0 || i % 4 === 3
        const isTable = i % 4 === 1
        const isStats = i % 4 === 2

        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
          >
            {isChart && <ChartSkeleton />}
            {isTable && <TableSkeleton />}
            {isStats && <StatsCardSkeleton />}
          </motion.div>
        )
      })}
    </div>
  )
}

// Specialized skeleton for different widget types
export function WidgetSkeleton({ 
  type = "generic",
  className 
}: SkeletonProps & { 
  type?: "generic" | "chart" | "table" | "stats" | "grid"
}) {
  switch (type) {
    case "chart":
      return <ChartSkeleton className={className} />
    case "table":
      return <TableSkeleton className={className} />
    case "stats":
      return <StatsCardSkeleton className={className} />
    case "grid":
      return <DashboardGridSkeleton className={className} />
    default:
      return (
        <Card className={cn("h-full", className)}>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <SkeletonBase className="h-5 w-40" />
                <SkeletonBase className="h-3 w-28" />
              </div>
              <SkeletonBase className="h-8 w-8 rounded" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <SkeletonBase className="h-32 rounded-lg" />
              <div className="space-y-2">
                <SkeletonBase className="h-3 w-full" />
                <SkeletonBase className="h-3 w-3/4" />
                <SkeletonBase className="h-3 w-1/2" />
              </div>
            </div>
          </CardContent>
        </Card>
      )
  }
}