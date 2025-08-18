"use client"

import React from "react"
import { motion, AnimatePresence } from "framer-motion"
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
  refreshing?: boolean
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
  refreshing = false,
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
        // Add a minimum delay for visual feedback
        setTimeout(() => setIsRefreshing(false), 500)
      }
    }
  }

  const cardVariants = {
    default: {
      scale: 1,
      y: 0,
      boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)"
    },
    hovered: {
      scale: 1.02,
      y: -4,
      boxShadow: variant === "elevated" 
        ? "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)"
        : "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)"
    }
  }

  const actionButtonVariants = {
    hidden: { opacity: 0, scale: 0.8, y: -10 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: { duration: 0.2, ease: "easeOut" }
    }
  }

  return (
    <motion.div
      variants={cardVariants}
      initial="default"
      animate={isHovered ? "hovered" : "default"}
      transition={{ duration: 0.3, ease: "easeOut" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn("relative group", className)}
    >
      <Card className={cn(
        "h-full transition-all duration-300 overflow-hidden",
        variant === "glass" && "glass-effect backdrop-blur-sm bg-background/80",
        variant === "elevated" && "border-primary/20",
        "hover:border-primary/30"
      )}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle className="text-base font-medium">{title}</CardTitle>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>

          {/* Action buttons - appear on hover */}
          <AnimatePresence>
            {(isHovered || isRefreshing) && showActions && (
              <motion.div
                variants={actionButtonVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className="flex items-center gap-1"
              >
                {onRefresh && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="h-8 w-8 p-0 hover:bg-primary/10"
                  >
                    <motion.div
                      animate={{ rotate: isRefreshing ? 360 : 0 }}
                      transition={{ 
                        duration: 1, 
                        repeat: isRefreshing ? Infinity : 0,
                        ease: "linear"
                      }}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </motion.div>
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
              </motion.div>
            )}
          </AnimatePresence>
        </CardHeader>

        <CardContent className="pt-0">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <WidgetSkeleton />
              </motion.div>
            ) : (
              <motion.div
                key="content"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                {children}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>

        {/* Refresh indicator overlay */}
        <AnimatePresence>
          {isRefreshing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <RefreshCw className="h-4 w-4" />
                </motion.div>
                Actualisation...
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hover effect overlay */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 pointer-events-none"
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        />
      </Card>
    </motion.div>
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