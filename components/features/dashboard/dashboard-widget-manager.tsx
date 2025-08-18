"use client"

import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { RefreshCw, Settings, Eye, EyeOff } from "lucide-react"
import { AnimatedButton } from "@/components/ui/animated-button"
import { EnhancedCard, EnhancedCardContent, EnhancedCardHeader, EnhancedCardTitle } from "@/components/ui/enhanced-card"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useWidgetRefreshManager } from "@/lib/hooks/use-dashboard-refresh"
import { DashboardGridSkeleton } from "./dashboard-skeletons"
import { cn } from "@/lib/utils"

interface DashboardWidget {
  id: string
  title: string
  component: React.ComponentType<any>
  props?: Record<string, any>
  enabled: boolean
  refreshable: boolean
  exportable: boolean
  order: number
  size?: "small" | "medium" | "large" | "full"
  category?: string
}

interface DashboardWidgetManagerProps {
  widgets: DashboardWidget[]
  onWidgetToggle?: (widgetId: string, enabled: boolean) => void
  onWidgetReorder?: (widgets: DashboardWidget[]) => void
  onRefreshAll?: () => Promise<void>
  loading?: boolean
  className?: string
  showControls?: boolean
  autoRefreshInterval?: number
}

export function DashboardWidgetManager({
  widgets,
  onWidgetToggle,
  onWidgetReorder,
  onRefreshAll,
  loading = false,
  className,
  showControls = true,
  autoRefreshInterval
}: DashboardWidgetManagerProps) {
  const [showSettings, setShowSettings] = React.useState(false)
  const [isRefreshingAll, setIsRefreshingAll] = React.useState(false)
  const { refreshWidget, getWidgetState, widgetStates } = useWidgetRefreshManager()

  // Filter and sort enabled widgets
  const enabledWidgets = widgets
    .filter(widget => widget.enabled)
    .sort((a, b) => a.order - b.order)

  // Handle refresh all
  const handleRefreshAll = async () => {
    if (isRefreshingAll) return

    setIsRefreshingAll(true)
    try {
      if (onRefreshAll) {
        await onRefreshAll()
      } else {
        // Refresh all refreshable widgets
        const refreshPromises = enabledWidgets
          .filter(widget => widget.refreshable)
          .map(widget => 
            refreshWidget(widget.id, async () => {
              // Simulate refresh - in real implementation, this would call the widget's refresh method
              await new Promise(resolve => setTimeout(resolve, 1000))
            })
          )
        
        await Promise.all(refreshPromises)
      }
    } finally {
      setTimeout(() => setIsRefreshingAll(false), 500)
    }
  }

  // Get grid classes based on widget sizes
  const getGridClasses = () => {
    return "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
  }

  // Get widget span classes based on size
  const getWidgetSpanClasses = (size?: string) => {
    switch (size) {
      case "small":
        return "col-span-1"
      case "medium":
        return "col-span-1 md:col-span-2"
      case "large":
        return "col-span-1 md:col-span-2 lg:col-span-3"
      case "full":
        return "col-span-full"
      default:
        return "col-span-1"
    }
  }

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  }

  const widgetVariants = {
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
        duration: 0.4,
        ease: "easeOut"
      }
    }
  }

  if (loading) {
    return <DashboardGridSkeleton className={className} />
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Dashboard Controls */}
      {showControls && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Tableau de bord</h2>
            <Badge variant="secondary" className="text-xs">
              {enabledWidgets.length} widget{enabledWidgets.length !== 1 ? 's' : ''}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {/* Auto-refresh indicator */}
            {autoRefreshInterval && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <RefreshCw className="h-3 w-3" />
                </motion.div>
                Auto: {Math.floor(autoRefreshInterval / 1000)}s
              </div>
            )}

            {/* Refresh all button */}
            <AnimatedButton
              variant="outline"
              size="sm"
              onClick={handleRefreshAll}
              disabled={isRefreshingAll}
              loading={isRefreshingAll}
              loadingText="Actualisation..."
              className="gap-2"
              ripple={true}
            >
              <motion.div
                animate={{ rotate: isRefreshingAll ? 360 : 0 }}
                transition={{ 
                  duration: 1, 
                  repeat: isRefreshingAll ? Infinity : 0,
                  ease: "linear"
                }}
              >
                <RefreshCw className="h-4 w-4" />
              </motion.div>
              Actualiser tout
            </AnimatedButton>

            {/* Settings dropdown */}
            <DropdownMenu open={showSettings} onOpenChange={setShowSettings}>
              <DropdownMenuTrigger asChild>
                <AnimatedButton variant="outline" size="sm" ripple={true}>
                  <Settings className="h-4 w-4" />
                </AnimatedButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Configuration des widgets</DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {widgets.map((widget) => (
                  <DropdownMenuItem key={widget.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {widget.enabled ? (
                        <Eye className="h-4 w-4 text-success" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm">{widget.title}</span>
                    </div>
                    <Switch
                      checked={widget.enabled}
                      onCheckedChange={(checked) => onWidgetToggle?.(widget.id, checked)}
                    />
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </motion.div>
      )}

      {/* Widgets Grid */}
      <AnimatePresence mode="wait">
        {enabledWidgets.length > 0 ? (
          <motion.div
            key="widgets-grid"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className={getGridClasses()}
          >
            {enabledWidgets.map((widget) => {
              const WidgetComponent = widget.component
              const widgetState = getWidgetState(widget.id)

              return (
                <motion.div
                  key={widget.id}
                  variants={widgetVariants}
                  layout
                  className={getWidgetSpanClasses(widget.size)}
                >
                  <WidgetComponent
                    {...widget.props}
                    loading={widgetState.isRefreshing}
                    onRefresh={widget.refreshable ? async () => {
                      await refreshWidget(widget.id, async () => {
                        // In real implementation, this would call the widget's specific refresh method
                        await new Promise(resolve => setTimeout(resolve, 1000))
                      })
                    } : undefined}
                  />
                </motion.div>
              )
            })}
          </motion.div>
        ) : (
          <motion.div
            key="no-widgets"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-12"
          >
            <EnhancedCard variant="default">
              <EnhancedCardHeader>
                <EnhancedCardTitle>Aucun widget activé</EnhancedCardTitle>
              </EnhancedCardHeader>
              <EnhancedCardContent>
                <p className="text-muted-foreground mb-4">
                  Activez des widgets pour afficher vos données.
                </p>
                <AnimatedButton
                  variant="outline"
                  onClick={() => setShowSettings(true)}
                  className="gap-2"
                  ripple={true}
                >
                  <Settings className="h-4 w-4" />
                  Configurer les widgets
                </AnimatedButton>
              </EnhancedCardContent>
            </EnhancedCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Refresh status indicator */}
      <AnimatePresence>
        {Object.values(widgetStates).some(state => state.isRefreshing) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-4 right-4 bg-background border rounded-lg shadow-enhanced-lg p-3 flex items-center gap-2 text-sm"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <RefreshCw className="h-4 w-4 text-primary" />
            </motion.div>
            <span>Actualisation en cours...</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}