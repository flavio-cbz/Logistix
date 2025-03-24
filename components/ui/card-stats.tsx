"use client"

import type React from "react"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface CardStatsProps {
  title: string
  value: string | number
  description?: string
  icon?: React.ReactNode
  className?: string
  trend?: {
    value: number
    label: string
  }
}

export function CardStats({ title, value, description, icon, className, trend }: CardStatsProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-2xl font-bold"
        >
          {value}
        </motion.div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        {trend && (
          <div
            className={cn(
              "text-xs mt-2",
              trend.value > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400",
            )}
          >
            <span className="font-medium">
              {trend.value > 0 ? "+" : ""}
              {trend.value}%
            </span>{" "}
            <span className="text-muted-foreground">{trend.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

