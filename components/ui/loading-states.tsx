"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2, CheckCircle2, AlertCircle, Info } from "lucide-react"
import { cn } from "@/lib/utils/cn"
import { createLoadingDescription } from "@/lib/utils/accessibility"

// Enhanced Skeleton with shimmer effect
const skeletonVariants = cva(
  "animate-pulse rounded-md bg-muted relative overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-muted",
        shimmer: "bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%] animate-shimmer",
        pulse: "animate-pulse bg-muted",
      },
      size: {
        sm: "h-4",
        md: "h-6",
        lg: "h-8",
        xl: "h-12",
      },
    },
    defaultVariants: {
      variant: "shimmer",
      size: "md",
    },
  }
)

interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(skeletonVariants({ variant, size }), className)}
        {...props}
      />
    )
  }
)
Skeleton.displayName = "Skeleton"

// Loading Spinner variants
const spinnerVariants = cva(
  "animate-spin",
  {
    variants: {
      variant: {
        default: "text-primary",
        muted: "text-muted-foreground",
        success: "text-success",
        warning: "text-warning",
        destructive: "text-destructive",
      },
      size: {
        sm: "h-4 w-4",
        md: "h-6 w-6",
        lg: "h-8 w-8",
        xl: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
)

interface LoadingSpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {
  icon?: React.ComponentType<{ className?: string }>
}

const LoadingSpinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ className, variant, size, icon: Icon = Loader2, ...props }, ref) => {
    return (
      <div 
        ref={ref} 
        className={cn("flex items-center justify-center", className)} 
        role="status"
        aria-label="Chargement en cours"
        {...props}
      >
        <Icon 
          className={cn(spinnerVariants({ variant, size }))}
          aria-hidden="true"
        />
      </div>
    )
  }
)
LoadingSpinner.displayName = "LoadingSpinner"

// Progressive Loading Indicator
interface ProgressiveLoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  steps: string[]
  currentStep: number
  variant?: "default" | "minimal"
}

const ProgressiveLoader = React.forwardRef<HTMLDivElement, ProgressiveLoaderProps>(
  ({ className, steps, currentStep, variant = "default", ...props }, ref) => {
    const progressDescription = createLoadingDescription(
      steps[currentStep] || "composant", 
      Math.round((currentStep / steps.length) * 100)
    )

    return (
      <div 
        ref={ref} 
        className={cn("space-y-4", className)} 
        role="status"
        aria-label={progressDescription}
        aria-live="polite"
        {...props}
      >
        {variant === "default" && (
          <div className="flex items-center space-x-2">
            <LoadingSpinner size="sm" />
            <span className="text-sm text-muted-foreground">
              {steps[currentStep] || "Loading..."}
            </span>
          </div>
        )}
        
        <div className="space-y-2" role="progressbar" aria-valuenow={currentStep} aria-valuemax={steps.length}>
          {steps.map((step, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div 
                className={cn(
                  "h-2 w-2 rounded-full transition-colors",
                  index < currentStep ? "bg-success" : 
                  index === currentStep ? "bg-primary animate-pulse" : 
                  "bg-muted"
                )}
                aria-hidden="true"
              />
              <span 
                className={cn(
                  "text-xs transition-colors",
                  index < currentStep ? "text-success" : 
                  index === currentStep ? "text-foreground" : 
                  "text-muted-foreground"
                )}
                aria-current={index === currentStep ? "step" : undefined}
              >
                {step}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }
)
ProgressiveLoader.displayName = "ProgressiveLoader"

// Loading Overlay
interface LoadingOverlayProps extends React.HTMLAttributes<HTMLDivElement> {
  isLoading: boolean
  message?: string
  variant?: "default" | "blur" | "dark"
}

const LoadingOverlay = React.forwardRef<HTMLDivElement, LoadingOverlayProps>(
  ({ className, isLoading, message, variant = "default", children, ...props }, ref) => {
    if (!isLoading) return <>{children}</>

    return (
      <div ref={ref} className={cn("relative", className)} {...props}>
        {children}
        <div 
          className={cn(
            "absolute inset-0 z-50 flex items-center justify-center",
            variant === "blur" && "backdrop-blur-sm bg-background/80",
            variant === "dark" && "bg-background/90",
            variant === "default" && "bg-background/60"
          )}
          role="status"
          aria-label={message || "Chargement en cours"}
          aria-live="polite"
        >
          <div className="flex flex-col items-center space-y-2">
            <LoadingSpinner size="lg" />
            {message && (
              <p className="text-sm text-muted-foreground" aria-live="polite">
                {message}
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }
)
LoadingOverlay.displayName = "LoadingOverlay"

// Skeleton Templates for common UI patterns
const SkeletonCard = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("p-6 space-y-4", className)} {...props}>
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex space-x-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-16" />
        </div>
      </div>
    )
  }
)
SkeletonCard.displayName = "SkeletonCard"

const SkeletonTable = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & {
  rows?: number
  columns?: number
}>(
  ({ className, rows = 5, columns = 4, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("space-y-3", className)} {...props}>
        {/* Header */}
        <div className="flex space-x-4">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex space-x-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton key={colIndex} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    )
  }
)
SkeletonTable.displayName = "SkeletonTable"

const SkeletonChart = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("space-y-4", className)} {...props}>
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="h-64 flex items-end space-x-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton 
              key={i} 
              className="flex-1" 
              style={{ height: `${Math.random() * 80 + 20}%` }}
            />
          ))}
        </div>
      </div>
    )
  }
)
SkeletonChart.displayName = "SkeletonChart"

export {
  Skeleton,
  LoadingSpinner,
  ProgressiveLoader,
  LoadingOverlay,
  SkeletonCard,
  SkeletonTable,
  SkeletonChart,
  skeletonVariants,
  spinnerVariants,
  type SkeletonProps,
  type LoadingSpinnerProps,
  type ProgressiveLoaderProps,
  type LoadingOverlayProps,
}