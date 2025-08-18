"use client"

import { useEffect, useState, useMemo } from "react"
import { Package, Map, TrendingUp, ShoppingBag } from "lucide-react"
import { useHydrationSafeStore } from "@/lib/hooks/use-hydration-safe-store"
import { 
  TabletOptimizedLayout, 
  TabletStatsGrid, 
} from "@/components/layout/tablet-optimized-layout"
import { useMobileNavigation } from "@/lib/hooks/use-mobile-navigation"

// Composant de chargement générique
function LoadingComponent() {
  return (
    <div className="h-[300px] w-full flex items-center justify-center">
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
        <p className="text-muted-foreground">Chargement du composant...</p>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { produits, initializeStore } = useHydrationSafeStore()
  const [isLoading, setIsLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  
  useMobileNavigation()

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 100)
    
    return () => clearTimeout(timer)
  }, [])

  // Initialize store after mount to prevent hydration issues
  useEffect(() => {
    if (mounted) {
      initializeStore()
    }
  }, [mounted, initializeStore])

  // Memoized calculations to prevent recalculation on every render
  const { produitsVendus, chiffreAffaires, ventesTotales, beneficesTotaux } = useMemo(() => {
    if (!mounted || !produits.length) {
      return {
        produitsVendus: 0,
        chiffreAffaires: 0,
        ventesTotales: 0,
        beneficesTotaux: 0,
      }
    }

    const vendus = produits.filter(p => p.vendu)
    const ca = vendus.reduce((sum, p) => sum + (p.prixVente || 0), 0)
    const ventes = vendus.length
    const benefices = vendus.reduce((sum, p) => sum + (p.benefices || 0), 0)
    
    return {
      produitsVendus: ventes,
      chiffreAffaires: ca,
      ventesTotales: ventes,
      beneficesTotaux: benefices,
    }
  }, [produits, mounted])

  // Prevent hydration mismatch by not rendering dynamic content until mounted
  if (!mounted) {
    return (
      <TabletOptimizedLayout title="Tableau de bord" subtitle="Vue synthétique de l'activité">
        <LoadingComponent />
      </TabletOptimizedLayout>
    )
  }

  const tabletStatsCards = [
    {
      id: "produits-vendus",
      title: "Produits vendus",
      value: produitsVendus,
      icon: ShoppingBag as React.ComponentType<{ className?: string }>,
      description: "Nombre total de produits vendus ce mois-ci"
    },
    {
      id: "chiffre-affaires",
      title: "Chiffre d'affaires",
      value: chiffreAffaires + " €",
      icon: TrendingUp as React.ComponentType<{ className?: string }>,
      description: "Chiffre d'affaires généré ce mois-ci"
    },
    {
      id: "ventes-totales",
      title: "Ventes totales",
      value: ventesTotales,
      icon: Package as React.ComponentType<{ className?: string }>,
      description: "Nombre total de ventes réalisées"
    },
    {
      id: "benefices-totaux",
      title: "Bénéfices totaux",
      value: beneficesTotaux + " €",
      icon: Map as React.ComponentType<{ className?: string }>,
      description: "Bénéfices nets sur la période"
    }
  ]

  return (
    <TabletOptimizedLayout title="Tableau de bord" subtitle="Vue synthétique de l'activité">
      {isLoading ? (
        <LoadingComponent />
      ) : (
        <TabletStatsGrid stats={tabletStatsCards} />
      )}
    </TabletOptimizedLayout>
  )
}