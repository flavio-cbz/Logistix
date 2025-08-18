"use client"

import { useTheme } from "next-themes"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import { Package2, Sparkles } from "lucide-react"
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts"
import { NotificationCenter } from "@/components/features/notifications/notification-center"
import { GlobalSearch } from "@/components/search/global-search"
import { cn } from "@/lib/utils"

interface AppHeaderProps {
  className?: string
  variant?: 'default' | 'compact' | 'minimal'
  showBreadcrumb?: boolean
}

export function AppHeader({ 
  className,
  variant = 'default',
  showBreadcrumb = true
}: AppHeaderProps) {
  const { theme } = useTheme()
  const pathname = usePathname()

  // Get page title from pathname
  const getPageTitle = (path: string) => {
    const segments = path.split('/').filter(Boolean)
    const lastSegment = segments[segments.length - 1] || 'dashboard'
    
    const titles: Record<string, string> = {
      'dashboard': 'Tableau de bord',
      'parcelles': 'Parcelles',
      'produits': 'Produits',
      'statistiques': 'Statistiques',
      'analyse-marche': 'Analyse de Marché',
      'validation': 'Validation',
      'profile': 'Profil'
    }
    
    return titles[lastSegment] || 'Logistix'
  }

  const pageTitle = getPageTitle(pathname)
  const isCompact = variant === 'compact'
  const isMinimal = variant === 'minimal'

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        "flex items-center justify-between transition-all duration-300",
        isMinimal ? "py-4" : isCompact ? "py-6" : "py-8",
        className
      )}
    >
      {/* Logo and Title Section */}
      <div className="flex items-center gap-3">
        {/* Enhanced Logo */}
        <motion.div 
          whileHover={{ 
            scale: 1.05,
            rotate: 2,
            transition: { duration: 0.2 }
          }}
          whileTap={{ scale: 0.95 }}
          className={cn(
            "relative flex items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg",
            "before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-br before:from-white/20 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300",
            isMinimal ? "w-8 h-8" : isCompact ? "w-10 h-10" : "w-12 h-12"
          )}
        >
          <Package2 className={cn(
            "relative z-10 transition-transform duration-300",
            isMinimal ? "w-4 h-4" : isCompact ? "w-5 h-5" : "w-6 h-6"
          )} />
          
          {/* Sparkle effect */}
          <motion.div
            className="absolute -top-1 -right-1"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ 
              scale: [0, 1, 0],
              opacity: [0, 1, 0],
              rotate: [0, 180, 360]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatDelay: 3,
              ease: "easeInOut"
            }}
          >
            <Sparkles className="w-3 h-3 text-yellow-400" />
          </motion.div>
        </motion.div>

        {/* Title and Description */}
        {!isMinimal && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <div className="flex items-center gap-2">
              <h1 className={cn(
                "font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent",
                isCompact ? "text-xl" : "text-2xl"
              )}>
                Logistix
              </h1>
              
              {/* Page indicator */}
              {showBreadcrumb && pageTitle !== 'Logistix' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                  className="flex items-center gap-1"
                >
                  <span className="text-muted-foreground">•</span>
                  <span className={cn(
                    "font-medium text-primary",
                    isCompact ? "text-sm" : "text-base"
                  )}>
                    {pageTitle}
                  </span>
                </motion.div>
              )}
            </div>
            
            {!isCompact && (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="text-sm text-muted-foreground mt-0.5"
              >
                Gestion intelligente de vos parcelles et produits
              </motion.p>
            )}
          </motion.div>
        )}
      </div>

      {/* Actions Section */}
      <motion.div 
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex items-center gap-2"
      >
        {/* Enhanced Search */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <GlobalSearch />
        </motion.div>

        {/* Enhanced Notification Center */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <NotificationCenter />
        </motion.div>

        {/* Enhanced Keyboard Shortcuts */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <KeyboardShortcuts />
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

