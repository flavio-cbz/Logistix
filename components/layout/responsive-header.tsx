"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Menu, X } from "lucide-react"
import { AnimatedButton } from "@/components/ui/animated-button"
import { AppHeader } from "./app-header"
import { cn } from "@/lib/utils"

interface ResponsiveHeaderProps {
  className?: string
  showMobileMenu?: boolean
  onMobileMenuToggle?: (open: boolean) => void
}

export function ResponsiveHeader({ 
  className,
  showMobileMenu = false,
  onMobileMenuToggle
}: ResponsiveHeaderProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const toggleMobileMenu = () => {
    const newState = !mobileMenuOpen
    setMobileMenuOpen(newState)
    onMobileMenuToggle?.(newState)
  }

  return (
    <div className={cn("relative", className)}>
      {/* Mobile Header */}
      <div className="block md:hidden">
        <div className="flex items-center justify-between py-4">
          {/* Mobile Menu Button */}
          {showMobileMenu && (
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <AnimatedButton
                variant="ghost"
                size="icon"
                onClick={toggleMobileMenu}
                className="h-10 w-10"
                ripple={true}
                haptic={true}
                screenReaderDescription={mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
              >
                <AnimatePresence mode="wait">
                  {mobileMenuOpen ? (
                    <motion.div
                      key="close"
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <X className="h-5 w-5" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="menu"
                      initial={{ rotate: 90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: -90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Menu className="h-5 w-5" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </AnimatedButton>
            </motion.div>
          )}

          {/* Compact Header */}
          <div className="flex-1">
            <AppHeader variant="compact" showBreadcrumb={true} />
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden border-t bg-background/95 backdrop-blur"
            >
              <div className="p-4">
                <p className="text-sm text-muted-foreground">
                  Menu mobile - Contenu à définir selon les besoins
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Tablet Header */}
      <div className="hidden md:block lg:hidden">
        <AppHeader variant="compact" showBreadcrumb={true} />
      </div>

      {/* Desktop Header */}
      <div className="hidden lg:block">
        <AppHeader variant="default" showBreadcrumb={true} />
      </div>
    </div>
  )
}

// Hook for responsive header behavior
export function useResponsiveHeader() {
  const [screenSize, setScreenSize] = useState<'mobile' | 'tablet' | 'desktop'>('desktop')

  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth
      if (width < 768) {
        setScreenSize('mobile')
      } else if (width < 1024) {
        setScreenSize('tablet')
      } else {
        setScreenSize('desktop')
      }
    }

    updateScreenSize()
    window.addEventListener('resize', updateScreenSize)
    return () => window.removeEventListener('resize', updateScreenSize)
  }, [])

  return {
    screenSize,
    isMobile: screenSize === 'mobile',
    isTablet: screenSize === 'tablet',
    isDesktop: screenSize === 'desktop'
  }
}