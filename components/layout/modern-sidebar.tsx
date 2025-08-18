"use client"

import React, { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { AnimatedButton } from "@/components/ui/animated-button"
import { useLiveRegionContext } from "@/components/ui/live-region"
import { 
  LayoutGrid, 
  Package, 
  Map, 
  BarChart, 
  Shield, 
  Search,
  ChevronLeft,
  ChevronRight,
  Menu
} from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useMobileNavigation } from "@/lib/hooks/use-mobile-navigation"
import { MobileSidebar, MobileSidebarTrigger } from "./mobile-sidebar"

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
  icon: React.ComponentType<{ className?: string }>
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
    swipeRef, 
    getTouchTargetSize, 
    getTouchSpacing 
  } = useMobileNavigation({
    enableSwipeGestures: true,
    onSwipeRight: () => setMobileOpen(true),
    onSwipeLeft: () => setMobileOpen(false)
  })

  // Handle responsive behavior
  useEffect(() => {
    if (isMobile && !isCollapsed) {
      setIsCollapsed(true)
    }
  }, [isMobile, isCollapsed])

  // Keyboard navigation
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

  const sidebarVariants = {
    expanded: {
      width: variant === 'minimal' ? 200 : 240,
      transition: {
        duration: 0.4,
        ease: [0.4, 0, 0.2, 1],
        staggerChildren: 0.05,
        delayChildren: 0.1
      }
    },
    collapsed: {
      width: 64,
      transition: {
        duration: 0.4,
        ease: [0.4, 0, 0.2, 1],
        staggerChildren: 0.02,
        staggerDirection: -1
      }
    }
  }

  const contentVariants = {
    expanded: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: {
        duration: 0.3,
        delay: 0.15,
        ease: [0.4, 0, 0.2, 1]
      }
    },
    collapsed: {
      opacity: 0,
      x: -20,
      scale: 0.95,
      transition: {
        duration: 0.2,
        ease: [0.4, 0, 0.2, 1]
      }
    }
  }

  const itemVariants = {
    expanded: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1]
      }
    },
    collapsed: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1]
      }
    }
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

  const renderNavigationItem = (item: NavigationItem) => {
    if (item.adminOnly && !user?.isAdmin) return null

    const isActive = pathname === item.href
    const Icon = item.icon

    const buttonContent = (
      <motion.div
        whileHover={{ 
          scale: 1.02,
          transition: { duration: 0.2, ease: "easeOut" }
        }}
        whileTap={{ 
          scale: 0.98,
          transition: { duration: 0.1 }
        }}
      >
        <AnimatedButton
          variant="ghost"
          className={cn(
            "w-full justify-start",
            "group relative overflow-hidden",
            isTablet ? "h-12 px-3" : "h-10 px-3",
            isCollapsed ? "px-2" : "px-3",
            getActiveIndicatorClasses(isActive)
          )}
          asChild
          ripple={true}
          haptic={true}
        >
          <Link 
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            aria-describedby={item.badge ? `badge-${item.href}` : undefined}
          >
            {/* Hover background effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-primary/5 to-primary/10 opacity-0 group-hover:opacity-100"
              initial={{ x: "-100%" }}
              whileHover={{ 
                x: "0%",
                transition: { duration: 0.3, ease: "easeOut" }
              }}
            />
            
            <div className={cn(
              "flex items-center w-full relative z-10",
              isTablet ? "gap-4" : "gap-3"
            )}>
              <motion.div
                whileHover={{ 
                  rotate: isActive ? 0 : 5,
                  transition: { duration: 0.2 }
                }}
              >
                <Icon 
                  className={cn(
                    "shrink-0 transition-all duration-300",
                    isTablet ? "h-6 w-6" : "h-5 w-5",
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary/80"
                  )}
                  aria-hidden="true"
                />
              </motion.div>
              
              <AnimatePresence mode="wait">
                {!isCollapsed && showLabels && (
                  <motion.span
                    variants={contentVariants}
                    initial="collapsed"
                    animate="expanded"
                    exit="collapsed"
                    className={cn(
                      "font-medium truncate transition-colors duration-300 group-hover:text-foreground",
                      isTablet ? "text-base" : "text-sm"
                    )}
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              
              {/* Badge with enhanced animations */}
              <AnimatePresence>
                {item.badge && (
                  <motion.span
                    id={`badge-${item.href}`}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ 
                      scale: 1, 
                      opacity: 1,
                      transition: {
                        type: "spring",
                        stiffness: 500,
                        damping: 30
                      }
                    }}
                    exit={{ 
                      scale: 0, 
                      opacity: 0,
                      transition: { duration: 0.2 }
                    }}
                    whileHover={{
                      scale: 1.1,
                      transition: { duration: 0.2 }
                    }}
                    className={cn(
                      "bg-primary text-primary-foreground text-xs rounded-full px-2 py-1 min-w-[20px] text-center font-medium",
                      "shadow-sm border border-primary/20",
                      isCollapsed ? "absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center" : "ml-auto"
                    )}
                    aria-label={`${item.badge} notifications pour ${item.label}`}
                  >
                    <span aria-hidden="true">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </Link>
        </AnimatedButton>
      </motion.div>
    )

    if (isCollapsed) {
      return (
        <TooltipProvider key={item.href}>
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              {buttonContent}
            </TooltipTrigger>
            <TooltipContent side="right" className="ml-2">
              <p>{item.label}</p>
              {item.badge && (
                <span 
                  className="ml-2 bg-primary text-primary-foreground text-xs rounded-full px-2 py-1"
                  aria-label={`${item.badge} notifications`}
                >
                  {item.badge}
                </span>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    }

    return <div key={item.href}>{buttonContent}</div>
  }

  const sidebarClasses = cn(
    "flex flex-col bg-card border-r border-border shadow-enhanced-sm",
    "transition-all duration-300 ease-in-out",
    variant === 'floating' && "m-2 rounded-lg shadow-enhanced-lg",
    variant === 'minimal' && "border-none shadow-none",
    className
  )

  // On mobile, show mobile sidebar trigger instead of full sidebar
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
    <motion.div
      ref={sidebarRef}
      variants={sidebarVariants}
      animate={isCollapsed ? "collapsed" : "expanded"}
      className={sidebarClasses}
      role="navigation"
      aria-label="Navigation principale"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.div
              variants={contentVariants}
              initial="collapsed"
              animate="expanded"
              exit="collapsed"
              className="flex items-center gap-2"
            >
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">L</span>
              </div>
              <span className="font-semibold text-lg">Logistix</span>
            </motion.div>
          )}
        </AnimatePresence>
        
        {collapsible && (
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <AnimatedButton
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className={cn(
                getTouchTargetSize()
              )}
              aria-label={isCollapsed ? "Développer la sidebar" : "Réduire la sidebar"}
              ripple={true}
              haptic={true}
            >
              <motion.div
                animate={{ 
                  rotate: isCollapsed ? 180 : 0,
                  scale: isCollapsed ? 0.9 : 1
                }}
                transition={{ 
                  duration: 0.3,
                  ease: [0.4, 0, 0.2, 1]
                }}
              >
                {isMobile ? (
                  <Menu className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </motion.div>
            </AnimatedButton>
          </motion.div>
        )}
      </div>

      {/* Navigation */}
      <motion.nav 
        className={cn(
          "flex-1 space-y-1",
          getTouchSpacing()
        )} 
        role="menubar"
        variants={{
          expanded: {
            transition: {
              staggerChildren: 0.05,
              delayChildren: 0.1
            }
          },
          collapsed: {
            transition: {
              staggerChildren: 0.02,
              staggerDirection: -1
            }
          }
        }}
        initial={isCollapsed ? "collapsed" : "expanded"}
        animate={isCollapsed ? "collapsed" : "expanded"}
      >
        {navigationItems.map((item, index) => (
          <motion.div
            key={item.href}
            variants={itemVariants}
            custom={index}
          >
            {renderNavigationItem(item)}
          </motion.div>
        ))}
      </motion.nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.div
              variants={contentVariants}
              initial="collapsed"
              animate="expanded"
              exit="collapsed"
              className="text-xs text-muted-foreground text-center"
            >
              <p>Logistix v1.0</p>
              <p className="mt-1">© 2025</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}