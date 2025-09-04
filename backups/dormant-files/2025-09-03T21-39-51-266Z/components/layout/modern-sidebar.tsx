"use client"

import React, { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { AnimatedButton } from "@/components/ui/animated-button"
import { useLiveRegionContext } from "@/components/ui/live-region"
import { 
  LayoutGrid, 
  Package, 
  Map, 
  BarChart, 
  Search,
  Menu,
  ChevronLeft,
} from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useMobileNavigation } from "@/lib/hooks/use-mobile-navigation"
import { MobileSidebarTrigger, MobileSidebar } from "@/components/layout/mobile-sidebar"

export interface ModernSidebarProps {
  variant?: 'default' | 'floating' | 'minimal'
  showLabels?: boolean
  collapsible?: boolean
  activeIndicator?: 'line' | 'background' | 'pill'
  className?: string
}

interface NavigationItem {
  href: string
  label: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement> & { className?: string | undefined }>
  adminOnly?: boolean
  badge?: number
}

const navigationItems: NavigationItem[] = [
  {
    href: "/dashboard",
    label: "Tableau de bord",
    icon: LayoutGrid,
  },
  {
    href: "/parcelles",
    label: "Parcelles",
    icon: Map,
  },
  {
    href: "/produits",
    label: "Produits",
    icon: Package,
  },
  {
    href: "/statistiques",
    label: "Statistiques",
    icon: BarChart,
  },
  {
    href: "/analyse-marche",
    label: "Analyse de Marché",
    icon: Search,
  },
]

export function ModernSidebar({
  variant = 'default',
  showLabels = true,
  collapsible = true,
  activeIndicator = 'line',
  className
}: ModernSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const { user } = useAuth()
  const sidebarRef = useRef<HTMLDivElement>(null)
  const { announce } = useLiveRegionContext()

  const { 
    isMobile, 
    isTablet, 
    getTouchTargetSize, 
    getTouchSpacing 
  } = useMobileNavigation({
    enableSwipeGestures: true,
    onSwipeRight: () => setMobileOpen(true),
    onSwipeLeft: () => setMobileOpen(false)
  })

  useEffect(() => {
    if (isMobile && !isCollapsed) {
      setIsCollapsed(true)
    }
  }, [isMobile, isCollapsed])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 'b') {
        event.preventDefault()
        setIsCollapsed(!isCollapsed)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isCollapsed])

  const toggleSidebar = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    announce(
      newState ? "Navigation réduite" : "Navigation étendue",
      'polite'
    )
  }

  const getActiveIndicatorClasses = (isActive: boolean) => {
    if (!isActive) return ""
    
    switch (activeIndicator) {
      case 'line':
        return "border-l-2 border-primary bg-primary/5"
      case 'background':
        return "bg-primary/10 text-primary"
      case 'pill':
        return "bg-primary text-primary-foreground rounded-lg"
      default:
        return "border-l-2 border-primary bg-primary/5"
    }
  }

  const renderNavigationItem = (_item: NavigationItem) => {
    if (_item.adminOnly && !user?.isAdmin) return null

    const isActive = pathname === _item.href
    const Icon = _item.icon

    const buttonContent = (
        <AnimatedButton
          variant="ghost"
          className={cn(
            "w-full justify-start",
            "group relative overflow-hidden transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]",
            isTablet ? "h-12 px-3" : "h-10 px-3",
            isCollapsed ? "px-2" : "px-3",
            getActiveIndicatorClasses(isActive)
          )}
          asChild
          ripple={true}
          haptic={true}
        >
          <Link 
            href={_item.href}
            aria-current={isActive ? "page" : undefined}
            aria-describedby={_item.badge ? `badge-${_item.href}` : undefined}
          >
            <div className={cn(
              "flex items-center w-full relative z-10",
              isTablet ? "gap-4" : "gap-3"
            )}>
                <Icon 
                  className={cn(
                    "shrink-0 transition-all duration-300",
                    isTablet ? "h-6 w-6" : "h-5 w-5",
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary/80"
                  )}
                  aria-hidden="true"
                />
              
                {!isCollapsed && showLabels && (
                    <span
                    className={cn(
                      "font-medium truncate transition-colors duration-300 group-hover:text-foreground",
                      isTablet ? "text-base" : "text-sm"
                    )}
                  >
                    {_item.label}
                  </span>
                )}
              
                {_item.badge && (
                    <span
                    id={`badge-${_item.href}`}
                    className={cn(
                      "bg-primary text-primary-foreground text-xs rounded-full px-2 py-1 min-w-[20px] text-center font-medium",
                      "shadow-sm border border-primary/20 transition-all duration-200 group-hover:scale-110",
                      isCollapsed ? "absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center" : "ml-auto"
                    )}
                    aria-label={`${_item.badge} notifications pour ${_item.label}`}
                  >
                    <span aria-hidden="true">
                      {_item.badge > 99 ? "99+" : _item.badge}
                    </span>
                  </span>
                )}
            </div>
          </Link>
        </AnimatedButton>
    )

    if (isCollapsed) {
      return (
        <TooltipProvider key={_item.href}>
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              {buttonContent}
            </TooltipTrigger>
            <TooltipContent side="right" className="ml-2">
              <p>{_item.label}</p>
              {_item.badge && (
                <span 
                  className="ml-2 bg-primary text-primary-foreground text-xs rounded-full px-2 py-1"
                  aria-label={`${_item.badge} notifications`}
                >
                  {_item.badge}
                </span>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    }

    return <div key={_item.href}>{buttonContent}</div>
  }

  const sidebarClasses = cn(
    "flex flex-col bg-card border-r border-border shadow-enhanced-sm",
    "transition-all duration-300 ease-in-out",
    variant === 'floating' && "m-2 rounded-lg shadow-enhanced-lg",
    variant === 'minimal' && "border-none shadow-none",
    isCollapsed ? "w-16" : (variant === 'minimal' ? "w-50" : "w-60"),
    className
  )

  if (isMobile) {
    return (
      <>
        <MobileSidebarTrigger 
          onClick={() => setMobileOpen(true)}
          className="fixed top-4 left-4 z-50 md:hidden"
        />
        <MobileSidebar 
          open={mobileOpen} 
          onOpenChange={setMobileOpen}
        />
      </>
    )
  }

  return (
    <div
      ref={sidebarRef}
      className={sidebarClasses ?? ''}
      role="navigation"
      aria-label="Navigation principale"
    >
      <div className="flex items-center justify-between p-4 border-b border-border">
          {!isCollapsed && (
            <div
              className="flex items-center gap-2 transition-all duration-300 ease-in-out"
            >
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">L</span>
              </div>
              <span className="font-semibold text-lg">Logistix</span>
            </div>
          )}
        
        {collapsible && (
          <div>
            <AnimatedButton
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className={cn(
                getTouchTargetSize(),
                "transition-transform duration-300 ease-in-out",
                isCollapsed ? "rotate-180 scale-90" : "rotate-0 scale-100"
              )}
              aria-label={isCollapsed ? "Développer la sidebar" : "Réduire la sidebar"}
              ripple={true}
              haptic={true}
            >
              {isMobile ? (
                  <Menu className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
            </AnimatedButton>
          </div>
        )}
      </div>

      <nav
        className={cn(
          "flex-1 space-y-1",
          getTouchSpacing()
        )}
        role="menubar"
      >
        {navigationItems.map((_item) => (
          <div key={_item.href}>
            {renderNavigationItem(_item)}
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-border">
          {!isCollapsed && (
            <div
              className="text-xs text-muted-foreground text-center transition-all duration-300 ease-in-out"
            >
              <p>Logistix v1.0</p>
              <p className="mt-1">© 2025</p>
            </div>
          )}
      </div>
    </div>
  )
}