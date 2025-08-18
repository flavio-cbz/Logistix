"use client"

import React from "react"
import { motion } from "framer-motion"
import { EnhancedStatsCard, type EnhancedStatsCardProps } from "./enhanced-stats-card"
import { cn } from "@/lib/utils"

interface EnhancedStatsGridProps {
  cards: EnhancedStatsCardProps[]
  columns?: {
    default?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
  }
  gap?: number
  className?: string
  staggerDelay?: number
}

export function EnhancedStatsGrid({
  cards,
  columns = {
    default: 1,
    sm: 2,
    md: 2,
    lg: 4,
    xl: 4
  },
  gap = 4,
  className,
  staggerDelay = 0.1
}: EnhancedStatsGridProps) {
  // Generate grid classes based on columns configuration
  const gridClasses = [
    `grid-cols-${columns.default || 1}`,
    columns.sm && `sm:grid-cols-${columns.sm}`,
    columns.md && `md:grid-cols-${columns.md}`,
    columns.lg && `lg:grid-cols-${columns.lg}`,
    columns.xl && `xl:grid-cols-${columns.xl}`,
    `gap-${gap}`
  ].filter(Boolean).join(' ')

  // Container animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: 0.1
      }
    }
  }

  // Individual card animation variants
  const cardVariants = {
    hidden: { 
      opacity: 0, 
      y: 20,
      scale: 0.95
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn("grid", gridClasses, className)}
    >
      {cards.map((card, index) => (
        <motion.div
          key={`${card.title}-${index}`}
          variants={cardVariants}
          whileHover={{ 
            scale: 1.02,
            transition: { duration: 0.2 }
          }}
          whileTap={{ 
            scale: 0.98,
            transition: { duration: 0.1 }
          }}
        >
          <EnhancedStatsCard
            {...card}
            interactive={true}
            className={cn("h-full", card.className)}
          />
        </motion.div>
      ))}
    </motion.div>
  )
}

// Utility function to generate sample sparkline data
export function generateSparklineData(length: number = 7, trend: 'up' | 'down' | 'neutral' = 'neutral'): number[] {
  const data: number[] = []
  let baseValue = 50
  
  for (let i = 0; i < length; i++) {
    const randomVariation = (Math.random() - 0.5) * 20
    
    if (trend === 'up') {
      baseValue += Math.random() * 5 + randomVariation * 0.3
    } else if (trend === 'down') {
      baseValue -= Math.random() * 5 + randomVariation * 0.3
    } else {
      baseValue += randomVariation
    }
    
    data.push(Math.max(0, baseValue))
  }
  
  return data
}

// Utility function to calculate trend from sparkline data
export function calculateTrend(data: number[]): number {
  if (!data || data.length < 2) return 0
  
  const first = data[0]
  const last = data[data.length - 1]
  
  if (first === 0) return 0
  
  return ((last - first) / first) * 100
}