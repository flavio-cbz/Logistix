"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { CheckCircle, AlertCircle, XCircle, Clock, Info, Zap } from "lucide-react"

const gradientBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-gradient-primary text-primary-foreground shadow-sm hover:shadow-md",
        success: "bg-gradient-success text-success-foreground shadow-sm hover:shadow-md",
        warning: "bg-gradient-warning text-warning-foreground shadow-sm hover:shadow-md",
        error: "bg-destructive text-destructive-foreground shadow-sm hover:shadow-md",
        info: "bg-gradient-info text-info-foreground shadow-sm hover:shadow-md",
        pending: "bg-gradient-subtle text-muted-foreground border border-border shadow-sm hover:shadow-md",
        active: "bg-gradient-success text-success-foreground shadow-sm hover:shadow-md animate-pulse",
        inactive: "bg-muted text-muted-foreground shadow-sm",
        premium: "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-sm hover:shadow-md",
        new: "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-sm hover:shadow-md animate-shimmer",
      },
      size: {
        sm: "px-2 py-0.5 text-xs",
        default: "px-3 py-1 text-xs",
        lg: "px-4 py-1.5 text-sm",
      },
      animated: {
        true: "animate-fade-in",
        false: "",
      },
      interactive: {
        true: "cursor-pointer hover:scale-105 active:scale-95",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      animated: false,
      interactive: false,
    },
  }
)

const statusIcons = {
  success: CheckCircle,
  warning: AlertCircle,
  error: XCircle,
  pending: Clock,
  info: Info,
  active: Zap,
  inactive: XCircle,
  premium: Zap,
  new: Info,
  default: undefined,
}

export interface GradientBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof gradientBadgeVariants> {
  showIcon?: boolean
  pulse?: boolean
  children: React.ReactNode
}

const GradientBadge = React.forwardRef<HTMLDivElement, GradientBadgeProps>(
  ({ 
    className, 
    variant, 
    size, 
    animated, 
    interactive, 
    showIcon = true, 
    pulse = false,
    children, 
    ...props 
  }, ref) => {
    const [isVisible, setIsVisible] = React.useState(false)
    const IconComponent = variant ? statusIcons[variant] : undefined

    // Animate in on mount if animated is true
    React.useEffect(() => {
      if (animated) {
        const timer = setTimeout(() => setIsVisible(true), 100)
        return () => clearTimeout(timer)
      } else {
        setIsVisible(true)
      }
    }, [animated])

    return (
      <div
        ref={ref}
        className={cn(
          gradientBadgeVariants({ 
            variant, 
            size, 
            animated: animated && isVisible, 
            interactive 
          }),
          pulse && "animate-pulse",
          !isVisible && animated && "opacity-0 scale-95",
          className
        )}
        role={interactive ? "button" : undefined}
        tabIndex={interactive ? 0 : undefined}
        aria-label={typeof children === 'string' ? children : undefined}
        {...props}
      >
        {showIcon && IconComponent && (
          <IconComponent 
            className={cn(
              "flex-shrink-0",
              size === "sm" ? "h-3 w-3" : size === "lg" ? "h-4 w-4" : "h-3.5 w-3.5"
            )} 
          />
        )}
        <span className="truncate">{children}</span>
      </div>
    )
  }
)

GradientBadge.displayName = "GradientBadge"

// Status Indicator Component
export interface StatusIndicatorProps {
  status: 'online' | 'offline' | 'away' | 'busy' | 'idle'
  size?: 'sm' | 'md' | 'lg'
  animated?: boolean
  showLabel?: boolean
  className?: string
}

const statusConfig = {
  online: {
    color: 'bg-green-500',
    label: 'Online',
    animated: 'animate-pulse',
  },
  offline: {
    color: 'bg-gray-400',
    label: 'Offline',
    animated: '',
  },
  away: {
    color: 'bg-yellow-500',
    label: 'Away',
    animated: 'animate-pulse',
  },
  busy: {
    color: 'bg-red-500',
    label: 'Busy',
    animated: '',
  },
  idle: {
    color: 'bg-orange-500',
    label: 'Idle',
    animated: 'animate-pulse',
  },
}

const StatusIndicator = React.forwardRef<HTMLDivElement, StatusIndicatorProps>(
  ({ status, size = 'md', animated = true, showLabel = false, className, ...props }, ref) => {
    const config = statusConfig[status]
    const sizeClasses = {
      sm: 'h-2 w-2',
      md: 'h-3 w-3',
      lg: 'h-4 w-4',
    }

    return (
      <div
        ref={ref}
        className={cn("inline-flex items-center gap-2", className)}
        aria-label={`Status: ${config.label}`}
        {...props}
      >
        <div
          className={cn(
            "rounded-full border-2 border-white shadow-sm transition-all duration-300",
            config.color,
            sizeClasses[size],
            animated && config.animated
          )}
        />
        {showLabel && (
          <span className="text-xs font-medium text-muted-foreground">
            {config.label}
          </span>
        )}
      </div>
    )
  }
)

StatusIndicator.displayName = "StatusIndicator"

// Notification Badge Component
export interface NotificationBadgeProps {
  count?: number
  max?: number
  showZero?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'destructive' | 'warning'
  className?: string
}

const NotificationBadge = React.forwardRef<HTMLDivElement, NotificationBadgeProps>(
  ({ 
    count = 0, 
    max = 99, 
    showZero = false, 
    size = 'md', 
    variant = 'destructive',
    className,
    ...props 
  }, ref) => {
    const shouldShow = count > 0 || showZero
    const displayCount = count > max ? `${max}+` : count.toString()
    
    const sizeClasses = {
      sm: 'h-4 w-4 text-xs min-w-4',
      md: 'h-5 w-5 text-xs min-w-5',
      lg: 'h-6 w-6 text-sm min-w-6',
    }

    const variantClasses = {
      default: 'bg-primary text-primary-foreground',
      destructive: 'bg-destructive text-destructive-foreground',
      warning: 'bg-warning text-warning-foreground',
    }

    if (!shouldShow) return null

    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-full font-medium shadow-sm animate-scale-in",
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
        aria-label={`${count} notifications`}
        {...props}
      >
        {displayCount}
      </div>
    )
  }
)

NotificationBadge.displayName = "NotificationBadge"

export { GradientBadge, StatusIndicator, NotificationBadge, gradientBadgeVariants }