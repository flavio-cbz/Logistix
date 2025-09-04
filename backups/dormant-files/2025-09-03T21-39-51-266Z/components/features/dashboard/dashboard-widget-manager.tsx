"use client"

import React from "react"
// import { motion, AnimatePresence, easeOut } from "framer-motion" // Removed framer-motion imports
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
  onRefreshAll?: () => Promise<void>
  loading?: boolean
  className?: string
  showControls?: boolean
  autoRefreshInterval?: number
}

export function DashboardWidgetManager({
  widgets,
  onWidgetToggle,
  onRefreshAll,
  loading = false,
  className,
  showControls = true,
  autoRefreshInterval,
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

  // Animation variants (removed)
  // const containerVariants = {
  //   hidden: { opacity: 0 },
  //   visible: {
  //     opacity: 1,
  //     transition: {
  //       staggerChildren: 0.1,
  //       delayChildren: 0.2
  //     }
  //   }
  // }

  // const widgetVariants = {
  //   hidden: { 
  //     opacity: 0, 
  //     y: 20,
  //     scale: 0.95
  //   },
  //   visible: { 
  //     opacity: 1, 
  //     y: 0,
  //     scale: 1,
  //     transition: {
  //       duration: 0.4,
  //       ease: easeOut
  //     }
  //   }
  // }

  if (loading) {
    return <DashboardGridSkeleton className={className ?? ''} />
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Dashboard Controls */}
      {showControls && (
        <div // Replaced motion.div
          // initial={{ opacity: 0, y: -10 }} // Removed motion props
          // animate={{ opacity: 1, y: 0 }} // Removed motion props
          // transition={{ duration: 0.3 }} // Removed motion props
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
                <div // Replaced motion.div
                  // animate={{ rotate: 360 }} // Removed motion props
                  // transition={{ duration: 2, repeat: Infinity, ease: "linear" }} // Removed motion props
                >
                  <RefreshCw className="h-3 w-3" />
                </div>
                Auto: {Math.floor(autoRefreshInterval / 1000)}s
              </div>
            )}

            {/* Refresh all button */}
            <AnimatedButton
              variant="outline"
              size="sm"
              onClick={handleRefreshAll!}
              disabled={isRefreshingAll}
              loading={isRefreshingAll}
              loadingText="Actualisation..."
              className="gap-2"
              ripple={true}
            >
              <div // Replaced motion.div
                // animate={{ rotate: isRefreshingAll ? 360 : 0 }} // Removed motion props
                // transition={{ 
                //   duration: 1, 
                //   repeat: isRefreshingAll ? Infinity : 0,
                //   ease: "linear"
                // }} // Removed motion props
              >
                <RefreshCw className="h-4 w-4" />
              </div>
              Actualiser tout
            </AnimatedButton>

            {/* Settings dropdown */}
            <DropdownMenu open={showSettings} onOpenChange={setShowSettings!}>
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
        </div>
      )}

      {/* Widgets Grid */}
      {/* <AnimatePresence mode="wait"> // Removed AnimatePresence */}
        {enabledWidgets.length > 0 ? (
          <div // Replaced motion.div
            // key="widgets-grid" // Removed key
            // variants={containerVariants} // Removed motion props
            // initial="hidden" // Removed motion props
            // animate="visible" // Removed motion props
            // exit="hidden" // Removed motion props
            className={getGridClasses()}
          >
            {enabledWidgets.map((widget) => {
              const WidgetComponent = widget.component
              const widgetState = getWidgetState(widget.id)

              return (
                <div // Replaced motion.div
                  key={widget.id}
                  // variants={widgetVariants} // Removed motion props
                  // layout // Removed layout prop
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
                </div>
              )
            })}
          </div>
        ) : (
          <div // Replaced motion.div
            // key="no-widgets" // Removed key
            // initial={{ opacity: 0 }} // Removed motion props
            // animate={{ opacity: 1 }} // Removed motion props
            // exit={{ opacity: 0 }} // Removed motion props
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
          </div>
        )}
      {/* </AnimatePresence> // Removed AnimatePresence */}

      {/* Refresh status indicator */}
      {/* <AnimatePresence> // Removed AnimatePresence */}
        {Object.values(widgetStates).some(state => state.isRefreshing) && (
          <div // Replaced motion.div
            // initial={{ opacity: 0, y: 10 }} // Removed motion props
            // animate={{ opacity: 1, y: 0 }} // Removed motion props
            // exit={{ opacity: 0, y: 10 }} // Removed motion props
            className="fixed bottom-4 right-4 bg-background border rounded-lg shadow-enhanced-lg p-3 flex items-center gap-2 text-sm"
          >
            <div // Replaced motion.div
              // animate={{ rotate: 360 }} // Removed motion props
              // transition={{ duration: 1, repeat: Infinity, ease: "linear" }} // Removed motion props
            >
              <RefreshCw className="h-4 w-4 text-primary" />
            </div>
            <span>Actualisation en cours...</span>
          </div>
        )}
      {/* </AnimatePresence> // Removed AnimatePresence */}
    </div>
  )
}