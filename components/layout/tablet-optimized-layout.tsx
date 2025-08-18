"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { useMobileNavigation } from "@/lib/hooks/use-mobile-navigation"
import { ResponsiveGrid, ResponsiveContainer, ResponsiveTypography } from "./responsive-grid"
import { EnhancedCard, EnhancedCardContent } from "@/components/ui/enhanced-card"

interface TabletOptimizedLayoutProps {
  children: React.ReactNode
  className?: string
  title?: string
  subtitle?: string
  actions?: React.ReactNode
}

export function TabletOptimizedLayout({
  children,
  className,
  title,
  subtitle,
  actions
}: TabletOptimizedLayoutProps) {
  const { isMobile, isTablet, getTouchSpacing } = useMobileNavigation()

  return (
    <ResponsiveContainer className={cn("min-h-screen", className)}>
      {/* Header Section */}
      {(title || subtitle || actions) && (
        <div className={cn(
          "flex flex-col border-b border-border pb-4 mb-6",
          isTablet ? "md:flex-row md:items-center md:justify-between" : "lg:flex-row lg:items-center lg:justify-between"
        )}>
          <div className="flex-1">
            {title && (
              <ResponsiveTypography variant="h1" className="text-foreground mb-2">
                {title}
              </ResponsiveTypography>
            )}
            {subtitle && (
              <ResponsiveTypography variant="body" className="text-muted-foreground">
                {subtitle}
              </ResponsiveTypography>
            )}
          </div>
          {actions && (
            <div className={cn(
              "flex items-center",
              getTouchSpacing(),
              isMobile ? "mt-4" : isTablet ? "mt-3 md:mt-0" : "mt-2 lg:mt-0"
            )}>
              {actions}
            </div>
          )}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1">
        {children}
      </div>
    </ResponsiveContainer>
  )
}

// Dashboard stats grid optimized for tablets
interface TabletStatsGridProps {
  stats: Array<{
    id: string
    title: string
    value: string | number
    change?: {
      value: number
      type: 'increase' | 'decrease' | 'neutral'
    }
    icon?: React.ComponentType<{ className?: string }>
    description?: string
  }>
  className?: string
}

export function TabletStatsGrid({ stats, className }: TabletStatsGridProps) {
  const { isMobile, isTablet } = useMobileNavigation()

  return (
    <ResponsiveGrid
      variant="dashboard"
      gap={isMobile ? "sm" : isTablet ? "md" : "lg"}
      className={className}
    >
      {stats.map((stat) => (
        <EnhancedCard
          key={stat.id}
          variant="elevated"
          interactive
          className="hover:shadow-enhanced-lg transition-all duration-300"
          accessibility={{
            label: `Statistique: ${stat.title}`,
            description: `${stat.title}: ${stat.value}${stat.description ? `. ${stat.description}` : ''}`
          }}
        >
          <EnhancedCardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <ResponsiveTypography
                  variant="caption"
                  className="text-muted-foreground font-medium uppercase tracking-wide"
                >
                  {stat.title}
                </ResponsiveTypography>
                <ResponsiveTypography
                  variant="h2"
                  className="text-foreground font-bold mt-2"
                >
                  {stat.value}
                </ResponsiveTypography>
                {stat.description && (
                  <ResponsiveTypography
                    variant="caption"
                    className="text-muted-foreground mt-1"
                  >
                    {stat.description}
                  </ResponsiveTypography>
                )}
              </div>
              {stat.icon && (
                <div className="flex-shrink-0 ml-4">
                  <div className={cn(
                    "rounded-lg bg-gradient-subtle p-2 shadow-enhanced-sm",
                    isMobile ? "p-2" : isTablet ? "p-3" : "p-3"
                  )}>
                    <stat.icon className={cn(
                      "text-primary",
                      isMobile ? "h-5 w-5" : isTablet ? "h-6 w-6" : "h-6 w-6"
                    )} />
                  </div>
                </div>
              )}
            </div>
            {stat.change && (
              <div className="flex items-center mt-4 pt-4 border-t border-border">
                <div className={cn(
                  "flex items-center text-sm font-medium",
                  stat.change.type === 'increase' && "text-green-600",
                  stat.change.type === 'decrease' && "text-red-600",
                  stat.change.type === 'neutral' && "text-muted-foreground"
                )}>
                  <span className="mr-1">
                    {stat.change.type === 'increase' && '↗'}
                    {stat.change.type === 'decrease' && '↘'}
                    {stat.change.type === 'neutral' && '→'}
                  </span>
                  {Math.abs(stat.change.value)}%
                </div>
                <ResponsiveTypography
                  variant="caption"
                  className="text-muted-foreground ml-2"
                >
                  vs mois dernier
                </ResponsiveTypography>
              </div>
            )}
          </EnhancedCardContent>
        </EnhancedCard>
      ))}
    </ResponsiveGrid>
  )
}

// Tablet-optimized card layout for content sections
interface TabletCardLayoutProps {
  children: React.ReactNode
  title?: string
  description?: string
  actions?: React.ReactNode
  className?: string
  variant?: 'default' | 'compact' | 'expanded'
}

export function TabletCardLayout({
  children,
  title,
  description,
  actions,
  className,
  variant = 'default'
}: TabletCardLayoutProps) {
  const { isMobile, isTablet, getTouchSpacing } = useMobileNavigation()

  return (
    <EnhancedCard 
      variant="default" 
      className={className}
      accessibility={{
        label: title ? `Section: ${title}` : undefined,
        description: description
      }}
    >
      <EnhancedCardContent className="p-6">
        {/* Card Header */}
        {(title || description || actions) && (
          <div className={cn(
            "flex flex-col border-b border-border pb-4 mb-4",
            isTablet ? "md:flex-row md:items-start md:justify-between" : "lg:flex-row lg:items-start lg:justify-between"
          )}>
            <div className="flex-1">
              {title && (
                <ResponsiveTypography variant="h3" className="text-foreground mb-1">
                  {title}
                </ResponsiveTypography>
              )}
              {description && (
                <ResponsiveTypography variant="body" className="text-muted-foreground">
                  {description}
                </ResponsiveTypography>
              )}
            </div>
            {actions && (
              <div className={cn(
                "flex items-center",
                getTouchSpacing(),
                isMobile ? "mt-3" : isTablet ? "mt-2 md:mt-0" : "mt-1 lg:mt-0"
              )}>
                {actions}
              </div>
            )}
          </div>
        )}

        {/* Card Content */}
        <div className="flex-1">
          {children}
        </div>
      </EnhancedCardContent>
    </EnhancedCard>
  )
}

// Responsive table wrapper for tablets
interface TabletTableWrapperProps {
  children: React.ReactNode
  className?: string
  scrollable?: boolean
}

export function TabletTableWrapper({
  children,
  className,
  scrollable = true
}: TabletTableWrapperProps) {
  const { isMobile, isTablet } = useMobileNavigation()

  if (isMobile) {
    // On mobile, convert table to card layout
    return (
      <div className={cn("space-y-3", className)}>
        {children}
      </div>
    )
  }

  return (
    <div className={cn(
      "relative",
      scrollable && "overflow-x-auto",
      isTablet && "rounded-lg border border-border",
      className
    )}>
      <div className={cn(
        scrollable && "min-w-full",
        isTablet && "text-sm"
      )}>
        {children}
      </div>
    </div>
  )
}

// Tablet-optimized button group
interface TabletButtonGroupProps {
  children: React.ReactNode
  className?: string
  orientation?: 'horizontal' | 'vertical' | 'auto'
  spacing?: 'sm' | 'md' | 'lg'
}

export function TabletButtonGroup({
  children,
  className,
  orientation = 'auto',
  spacing = 'md'
}: TabletButtonGroupProps) {
  const { isMobile, isTablet, getTouchSpacing } = useMobileNavigation()

  const getOrientation = () => {
    if (orientation === 'auto') {
      return isMobile ? 'vertical' : 'horizontal'
    }
    return orientation
  }

  const getSpacingClass = () => {
    const spacingClasses = {
      sm: getOrientation() === 'horizontal' ? 'space-x-2' : 'space-y-2',
      md: getOrientation() === 'horizontal' ? 'space-x-3' : 'space-y-3',
      lg: getOrientation() === 'horizontal' ? 'space-x-4' : 'space-y-4'
    }
    return spacingClasses[spacing]
  }

  return (
    <div className={cn(
      "flex",
      getOrientation() === 'horizontal' ? "flex-row items-center" : "flex-col",
      getSpacingClass(),
      className
    )}>
      {children}
    </div>
  )
}