"use client"

import React from "react"
import { RefreshCw, MoreVertical, Maximize2, Download } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface InteractiveDashboardWidgetProps {
  title: string
  description?: string
  children: React.ReactNode
  loading?: boolean
  onRefresh?: () => void
  onExport?: () => void
  onMaximize?: () => void
  className?: string
  variant?: "default" | "elevated" | "glass"
  showActions?: boolean
  customActions?: React.ReactNode
}

export function InteractiveDashboardWidget({
  title,
  description,
  children,
  loading = false,
  onRefresh,
  onExport,
  onMaximize,
  className,
  variant = "default",
  showActions = true,
  customActions
}: InteractiveDashboardWidgetProps) {
  const [isHovered, setIsHovered] = React.useState(false)
  const [isRefreshing, setIsRefreshing] = React.useState(false)

  const handleRefresh = async () => {
    if (onRefresh && !isRefreshing) {
      setIsRefreshing(true)
      try {
        await onRefresh()
      } finally {
        setTimeout(() => setIsRefreshing(false), 500)
      }
    }
  }

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn("relative group", className)}
    >
      <Card className={cn(
        "h-full transition-all duration-300 overflow-hidden",
        variant === "glass" && "glass-effect backdrop-blur-sm bg-background/80",
        variant === "elevated" && "border-primary/20",
        "hover:border-primary/30",
        isHovered && variant === "elevated" ? "shadow-lg scale-[1.02] -translate-y-1" : "",
        isHovered && variant !== "elevated" ? "shadow-md scale-[1.01] -translate-y-[2px]" : ""
      )}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle className="text-base font-medium">{title}</CardTitle>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>

          {/* Action buttons - appear on hover */}
          {(isHovered || isRefreshing) && showActions && (
              <div
                className="flex items-center gap-1 transition-opacity duration-200 ease-out"
                style={{ opacity: (isHovered || isRefreshing) ? 1 : 0 }}
              >
                {onRefresh && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="h-8 w-8 p-0 hover:bg-primary/10"
                  >
                    <div
                      className={isRefreshing ? "animate-spin" : ""}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </div>
                  </Button>
                )}

                {customActions}

                {(onExport || onMaximize) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-primary/10"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {onMaximize && (
                        <DropdownMenuItem onClick={onMaximize}>
                          <Maximize2 className="h-4 w-4 mr-2" />
                          Agrandir
                        </DropdownMenuItem>
                      )}
                      {onExport && (
                        <DropdownMenuItem onClick={onExport}>
                          <Download className="h-4 w-4 mr-2" />
                          Exporter
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            )}
        </CardHeader>

        <CardContent className="pt-0">
          {loading ? (
              <div
                key="loading"
              >
                <WidgetSkeleton />
              </div>
            ) : (
              <div
                key="content"
              >
                {children}
              </div>
            )}
        </CardContent>

        {/* Refresh indicator overlay */}
          {isRefreshing && (
            <div
              className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center transition-opacity duration-200"
              style={{ opacity: isRefreshing ? 1 : 0 }}
            >
              <div
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <div
                  className="animate-spin"
                >
                  <RefreshCw className="h-4 w-4" />
                </div>
                Actualisation...
              </div>
            </div>
          )}

        {/* Hover effect overlay */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none transition-opacity duration-300"
          style={{ opacity: isHovered ? 1 : 0 }}
        />
      </Card>
    </div>
  )
}

// Widget skeleton component for loading states
function WidgetSkeleton() {
  return (
    <div className="space-y-4">
      {/* Chart/content area skeleton */}
      <div className="h-48 bg-muted rounded-md animate-shimmer bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%]" />
      
      {/* Stats row skeleton */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <div className="h-4 w-24 bg-muted rounded animate-shimmer bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%]" />
          <div className="h-3 w-16 bg-muted rounded animate-shimmer bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%]" />
        </div>
        <div className="h-8 w-16 bg-muted rounded animate-shimmer bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%]" />
      </div>

      {/* Additional content skeleton */}
      <div className="space-y-2">
        <div className="h-3 w-full bg-muted rounded animate-shimmer bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%]" />
        <div className="h-3 w-3/4 bg-muted rounded animate-shimmer bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%]" />
        <div className="h-3 w-1/2 bg-muted rounded animate-shimmer bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%]" />
      </div>
    </div>
  )
}