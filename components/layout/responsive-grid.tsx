"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { useMobileNavigation } from "@/lib/hooks/use-mobile-navigation"

interface ResponsiveGridProps {
  children: React.ReactNode
  className?: string
  variant?: 'dashboard' | 'cards' | 'list' | 'gallery'
  minItemWidth?: number
  gap?: 'sm' | 'md' | 'lg'
}

export function ResponsiveGrid({
  children,
  className,
  variant = 'dashboard',
  minItemWidth = 280,
  gap = 'md'
}: ResponsiveGridProps) {
  const { isMobile, isTablet, deviceType } = useMobileNavigation()

  const getGridClasses = () => {
    const gapClasses = {
      sm: 'gap-2',
      md: 'gap-4',
      lg: 'gap-6'
    }

    const baseClasses = `grid ${gapClasses[gap]}`

    switch (variant) {
      case 'dashboard':
        if (isMobile) {
          return `${baseClasses} grid-cols-1`
        } else if (isTablet) {
          return `${baseClasses} grid-cols-2 lg:grid-cols-3`
        } else {
          return `${baseClasses} grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`
        }

      case 'cards':
        if (isMobile) {
          return `${baseClasses} grid-cols-1`
        } else if (isTablet) {
          return `${baseClasses} grid-cols-2`
        } else {
          return `${baseClasses} grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
        }

      case 'list':
        if (isMobile) {
          return `${baseClasses} grid-cols-1`
        } else if (isTablet) {
          return `${baseClasses} grid-cols-1`
        } else {
          return `${baseClasses} grid-cols-1 lg:grid-cols-2`
        }

      case 'gallery':
        if (isMobile) {
          return `${baseClasses} grid-cols-2`
        } else if (isTablet) {
          return `${baseClasses} grid-cols-3 lg:grid-cols-4`
        } else {
          return `${baseClasses} grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6`
        }

      default:
        return `${baseClasses} grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
    }
  }

  const getAutoFitClasses = () => {
    if (variant === 'dashboard' && minItemWidth) {
      return `grid-cols-[repeat(auto-fit,minmax(${minItemWidth}px,1fr))]`
    }
    return ''
  }

  return (
    <div
      className={cn(
        getGridClasses(),
        getAutoFitClasses(),
        className
      )}
      style={{
        '--min-item-width': `${minItemWidth}px`
      } as React.CSSProperties}
    >
      {children}
    </div>
  )
}

// Responsive container for different screen sizes
interface ResponsiveContainerProps {
  children: React.ReactNode
  className?: string
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export function ResponsiveContainer({
  children,
  className,
  maxWidth = 'full',
  padding = 'md'
}: ResponsiveContainerProps) {
  const { isMobile, isTablet } = useMobileNavigation()

  const getMaxWidthClass = () => {
    const maxWidthClasses = {
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-lg',
      xl: 'max-w-xl',
      '2xl': 'max-w-2xl',
      full: 'max-w-full'
    }
    return maxWidthClasses[maxWidth]
  }

  const getPaddingClass = () => {
    if (padding === 'none') return ''
    
    const paddingClasses = {
      sm: isMobile ? 'px-2 py-2' : isTablet ? 'px-3 py-3' : 'px-4 py-4',
      md: isMobile ? 'px-4 py-4' : isTablet ? 'px-6 py-6' : 'px-8 py-8',
      lg: isMobile ? 'px-6 py-6' : isTablet ? 'px-8 py-8' : 'px-12 py-12'
    }
    return paddingClasses[padding]
  }

  return (
    <div
      className={cn(
        'mx-auto w-full',
        getMaxWidthClass(),
        getPaddingClass(),
        className
      )}
    >
      {children}
    </div>
  )
}

import { EnhancedCard } from "@/components/ui/enhanced-card"

// Responsive card component optimized for different screen sizes
interface ResponsiveCardProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'compact' | 'expanded'
  interactive?: boolean
}

export function ResponsiveCard({
  children,
  className,
  variant = 'default',
  interactive = false,
  ...props
}: ResponsiveCardProps & React.HTMLAttributes<HTMLDivElement>) {
  const { isMobile, isTablet, getTouchSpacing } = useMobileNavigation()

  const getPaddingClasses = () => {
    const variantClasses = {
      default: isMobile ? 'p-4' : isTablet ? 'p-5' : 'p-6',
      compact: isMobile ? 'p-3' : isTablet ? 'p-4' : 'p-5',
      expanded: isMobile ? 'p-6' : isTablet ? 'p-8' : 'p-10'
    }
    return variantClasses[variant]
  }

  // Map responsive variants to EnhancedCard variants
  const getEnhancedVariant = () => {
    if (interactive) return 'elevated'
    return 'default'
  }

  return (
    <EnhancedCard 
      variant={getEnhancedVariant()}
      interactive={interactive}
      className={cn(getPaddingClasses(), className)}
      {...props}
    >
      {children}
    </EnhancedCard>
  )
}

// Responsive typography component
interface ResponsiveTypographyProps {
  children: React.ReactNode
  variant: 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'caption'
  className?: string
  as?: keyof JSX.IntrinsicElements
}

export function ResponsiveTypography({
  children,
  variant,
  className,
  as
}: ResponsiveTypographyProps) {
  const { isMobile, isTablet } = useMobileNavigation()

  const getTypographyClasses = () => {
    const variants = {
      h1: {
        mobile: 'text-2xl font-bold leading-tight',
        tablet: 'text-3xl font-bold leading-tight',
        desktop: 'text-4xl font-bold leading-tight'
      },
      h2: {
        mobile: 'text-xl font-semibold leading-tight',
        tablet: 'text-2xl font-semibold leading-tight',
        desktop: 'text-3xl font-semibold leading-tight'
      },
      h3: {
        mobile: 'text-lg font-semibold leading-snug',
        tablet: 'text-xl font-semibold leading-snug',
        desktop: 'text-2xl font-semibold leading-snug'
      },
      h4: {
        mobile: 'text-base font-medium leading-snug',
        tablet: 'text-lg font-medium leading-snug',
        desktop: 'text-xl font-medium leading-snug'
      },
      body: {
        mobile: 'text-sm leading-relaxed',
        tablet: 'text-base leading-relaxed',
        desktop: 'text-base leading-relaxed'
      },
      caption: {
        mobile: 'text-xs leading-normal',
        tablet: 'text-sm leading-normal',
        desktop: 'text-sm leading-normal'
      }
    }

    if (isMobile) return variants[variant].mobile
    if (isTablet) return variants[variant].tablet
    return variants[variant].desktop
  }

  const getDefaultElement = () => {
    const elementMap = {
      h1: 'h1',
      h2: 'h2',
      h3: 'h3',
      h4: 'h4',
      body: 'p',
      caption: 'span'
    }
    return elementMap[variant] as keyof JSX.IntrinsicElements
  }

  const Component = as || getDefaultElement()

  return (
    <Component className={cn(getTypographyClasses(), className)}>
      {children}
    </Component>
  )
}