"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { AnimatedButton } from "@/components/ui/animated-button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useMobileNavigation } from "@/lib/hooks/use-mobile-navigation"
import { 
  LayoutGrid, 
  Package, 
  Map, 
  BarChart, 
  Shield, 
  Search,
  X,
  Menu
} from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"

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
  {
    href: "/validation",
    label: "Validation",
    icon: Shield,
    adminOnly: true,
  },
]

interface MobileSidebarProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  className?: string
}

export function MobileSidebar({ open, onOpenChange, className }: MobileSidebarProps) {
  const pathname = usePathname()
  const { user } = useAuth()
  const [mounted, setMounted] = useState(false)

  const { 
    isMobile, 
    swipeRef, 
    getTouchTargetSize, 
    getTouchSpacing 
  } = useMobileNavigation({
    enableSwipeGestures: true,
    onSwipeLeft: () => onOpenChange(false),
    onSwipeRight: () => onOpenChange(true)
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  // Close sidebar when route changes on mobile
  useEffect(() => {
    if (isMobile && open) {
      onOpenChange(false)
    }
  }, [pathname, isMobile, open, onOpenChange])

  if (!mounted) return null

  const renderNavigationItem = (item: NavigationItem, index: number) => {
    if (item.adminOnly && !user?.isAdmin) return null

    const isActive = pathname === item.href
    const Icon = item.icon

    return (
      <motion.div
        key={item.href}
        initial={{ opacity: 0, x: -20 }}
        animate={{ 
          opacity: 1, 
          x: 0,
          transition: {
            delay: index * 0.05,
            duration: 0.3,
            ease: [0.4, 0, 0.2, 1]
          }
        }}
        exit={{ 
          opacity: 0, 
          x: -20,
          transition: {
            duration: 0.2
          }
        }}
      >
        <AnimatedButton
          variant="ghost"
          className={cn(
            "w-full justify-start gap-4 text-left font-medium",
            getTouchTargetSize(),
            "hover:bg-accent/70 hover:text-accent-foreground",
            "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
            "transition-all duration-200 group relative overflow-hidden",
            isActive && "bg-primary/10 text-primary border-l-2 border-primary"
          )}
          asChild
          ripple={true}
          haptic={true}
          screenReaderDescription={`Naviguer vers ${item.label}`}
        >
          <Link href={item.href} onClick={() => onOpenChange(false)}>
            {/* Hover background effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-primary/5 to-primary/10 opacity-0 group-hover:opacity-100"
              initial={{ x: "-100%" }}
              whileHover={{ 
                x: "0%",
                transition: { duration: 0.3, ease: "easeOut" }
              }}
            />
            
            <div className="flex items-center gap-4 w-full relative z-10">
              <motion.div
                whileHover={{ 
                  scale: 1.1,
                  rotate: isActive ? 0 : 5,
                  transition: { duration: 0.2 }
                }}
                whileTap={{ scale: 0.95 }}
              >
                <Icon className={cn(
                  "h-6 w-6 shrink-0 transition-colors duration-200",
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary/80"
                )} />
              </motion.div>
              
              <span className="text-base font-medium truncate transition-colors duration-200 group-hover:text-foreground">
                {item.label}
              </span>
              
              {/* Badge */}
              {item.badge && (
                <motion.span
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ 
                    scale: 1, 
                    opacity: 1,
                    transition: {
                      type: "spring",
                      stiffness: 500,
                      damping: 30,
                      delay: index * 0.05 + 0.2
                    }
                  }}
                  whileHover={{
                    scale: 1.1,
                    transition: { duration: 0.2 }
                  }}
                  className="bg-primary text-primary-foreground text-sm rounded-full px-2 py-1 min-w-[24px] text-center font-medium ml-auto shadow-sm border border-primary/20"
                >
                  {item.badge > 99 ? "99+" : item.badge}
                </motion.span>
              )}
            </div>
          </Link>
        </AnimatedButton>
      </motion.div>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="left" 
        className={cn(
          "w-80 p-0 border-r-0 shadow-2xl",
          "bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80",
          className
        )}
        ref={swipeRef}
      >
        {/* Header */}
        <SheetHeader className="border-b border-border/50 p-6 pb-4">
          <div className="flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ 
                opacity: 1, 
                scale: 1,
                transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
              }}
              className="flex items-center gap-3"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-primary-foreground font-bold text-lg">L</span>
              </div>
              <SheetTitle className="text-xl font-semibold">Logistix</SheetTitle>
            </motion.div>
            
            <AnimatedButton
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className={cn(
                getTouchTargetSize(),
                "hover:bg-accent/70 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              )}
              ripple={true}
              haptic={true}
              screenReaderDescription="Fermer la navigation"
            >
              <X className="h-5 w-5" />
            </AnimatedButton>
          </div>
        </SheetHeader>

        {/* Navigation */}
        <nav className={cn("flex-1 overflow-auto", getTouchSpacing())} role="menubar">
          <motion.div
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={{
              visible: {
                transition: {
                  staggerChildren: 0.05,
                  delayChildren: 0.1
                }
              },
              hidden: {
                transition: {
                  staggerChildren: 0.02,
                  staggerDirection: -1
                }
              }
            }}
            className="space-y-2"
          >
            {navigationItems.map((item, index) => renderNavigationItem(item, index))}
          </motion.div>
        </nav>

        {/* Footer */}
        <div className="border-t border-border/50 p-6 pt-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ 
              opacity: 1, 
              y: 0,
              transition: { 
                delay: 0.4, 
                duration: 0.3,
                ease: [0.4, 0, 0.2, 1]
              }
            }}
            className="text-center"
          >
            <p className="text-sm text-muted-foreground font-medium">Logistix v1.0</p>
            <p className="text-xs text-muted-foreground/70 mt-1">© 2025</p>
          </motion.div>
        </div>

        {/* Swipe indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ 
            opacity: [0, 0.5, 0],
            transition: {
              duration: 2,
              repeat: 2,
              delay: 1
            }
          }}
          className="absolute top-1/2 right-4 transform -translate-y-1/2 pointer-events-none"
        >
          <div className="flex items-center gap-1 text-muted-foreground/50">
            <div className="w-1 h-8 bg-current rounded-full opacity-30" />
            <div className="w-1 h-6 bg-current rounded-full opacity-50" />
            <div className="w-1 h-4 bg-current rounded-full opacity-70" />
          </div>
        </motion.div>
      </SheetContent>
    </Sheet>
  )
}

// Mobile sidebar trigger button
interface MobileSidebarTriggerProps {
  onClick: () => void
  className?: string
}

export function MobileSidebarTrigger({ onClick, className }: MobileSidebarTriggerProps) {
  const { getTouchTargetSize } = useMobileNavigation()

  return (
    <AnimatedButton
      variant="ghost"
      size="icon"
      onClick={onClick}
      className={cn(
        getTouchTargetSize(),
        "hover:bg-accent/70 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        "transition-all duration-200",
        className
      )}
      ripple={true}
      haptic={true}
      screenReaderDescription="Ouvrir la navigation"
    >
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Menu className="h-6 w-6" />
      </motion.div>
    </AnimatedButton>
  )
}