"use client"

import type React from "react"
import { Suspense, useEffect, useState, memo, useMemo } from "react"
import dynamic from "next/dynamic"
import { Package, Map, TrendingUp, ShoppingBag } from "lucide-react"
import { useStore } from "@/lib/store"
import { Motion, fadeInUp, staggerContainer, staggerItem } from "@/components/ui/motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

// Lazy load heavy dashboard components
const CardStats = dynamic(() => import("@/components/ui/card-stats").then(mod => ({ default: mod.CardStats })), {
  loading: () => <Card className="h-32"><CardContent className="p-6"><Skeleton className="h-16 w-full" /></CardContent></Card>,
  ssr: false
})

const MargeMensuelle = dynamic(() => import("@/components/dashboard/marge-mensuelle").then(mod => ({ default: mod.MargeMensuelle })), {
  loading: () => <Card className="h-80"><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>,
  ssr: false
})

const PerformanceChart = dynamic(() => import("@/components/dashboard/performance-chart").then(mod => ({ default: mod.PerformanceChart })), {
  loading: () => <Card className="h-80"><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>,
  ssr: false
})

const TopProduits = dynamic(() => import("@/components/dashboard/top-produits").then(mod => ({ default: mod.TopProduits })), {
  loading: () => <Card className="h-80"><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>,
  ssr: false
})

const VentesPlateformes = dynamic(() => import("@/components/dashboard/ventes-plateformes").then(mod => ({ default: mod.VentesPlateformes })), {
  loading: () => <Card className="h-80"><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>,
  ssr: false
})

const TempsVente = dynamic(() => import("@/components/dashboard/temps-vente").then(mod => ({ default: mod.TempsVente })), {
  loading: () => <Card className="h-80"><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>,
  ssr: false
})

const DashboardConfig = dynamic(() => import("@/components/dashboard/dashboard-config").then(mod => ({ default: mod.DashboardConfig })), {
  loading: () => <Skeleton className="h-10 w-32" />,
  ssr: false
})

const CoutPoids = dynamic(() => import("@/components/dashboard/cout-poids").then(mod => ({ default: mod.CoutPoids })), {
  loading: () => <Card className="h-80"><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>,
  ssr: false
})

const TopParcelles = dynamic(() => import("@/components/dashboard/top-parcelles").then(mod => ({ default: mod.TopParcelles })), {
  loading: () => <Card className="h-80"><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>,
  ssr: false
})

const TendancesVente = dynamic(() => import("@/components/dashboard/tendances-vente").then(mod => ({ default: mod.TendancesVente })), {
  loading: () => <Card className="h-80"><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>,
  ssr: false
})

// Memoized component for stats cards to prevent unnecessary re-renders
const StatsSection = memo(({ parcelles, produits, produitsVendus, chiffreAffaires }: {
  parcelles: any[]
  produits: any[]
  produitsVendus: any[]
  chiffreAffaires: number
}) => {
  const stats = useMemo(() => [
    {
      title: "Parcelles",
      value: parcelles.length.toString(),
      description: "Parcelles totales",
      icon: Package,
      trend: parcelles.length > 0 ? "+12%" : "0%",
    },
    {
      title: "Produits",
      value: produits.length.toString(),
      description: "Produits au total",
      icon: ShoppingBag,
      trend: produits.length > 0 ? "+5%" : "0%",
    },
    {
      title: "Vendus",
      value: produitsVendus.length.toString(),
      description: "Produits vendus",
      icon: TrendingUp,
      trend: produitsVendus.length > 0 ? "+8%" : "0%",
    },
    {
      title: "CA Total",
      value: `€${chiffreAffaires.toFixed(2)}`,
      description: "Chiffre d'affaires",
      icon: Map,
      trend: chiffreAffaires > 0 ? "+15%" : "0%",
    },
  ], [parcelles.length, produits.length, produitsVendus.length, chiffreAffaires])

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <Motion key={stat.title} {...staggerItem}>
          <Suspense fallback={<Skeleton className="h-32 w-full" />}>
            <CardStats {...stat} />
          </Suspense>
        </Motion>
      ))}
    </div>
  )
})

StatsSection.displayName = "StatsSection"

// Component registry for dynamic rendering
const componentRegistry = {
  MainStats: StatsSection,
  PerformanceChart,
  VentesPlateformes,
  TopProduits,
  TempsVente,
  MargeMensuelle,
  TopParcelles,
  CoutPoids,
  TendancesVente,
}

export default function DashboardPage() {
  const { parcelles, produits, dashboardConfig, loadParcelles, loadProduits, loadDashboardConfig } = useStore()
  const [isLoading, setIsLoading] = useState(true)

  // Memoized calculations to prevent recalculation on every render
  const { produitsVendus, chiffreAffaires, enabledCards, sortedCards } = useMemo(() => {
    const vendus = produits.filter(p => p.vendu)
    const ca = vendus.reduce((sum, p) => sum + (p.prixVente || 0), 0)
    const enabled = dashboardConfig.cards.filter(card => card.enabled)
    const sorted = enabled.sort((a, b) => a.order - b.order)
    
    return {
      produitsVendus: vendus,
      chiffreAffaires: ca,
      enabledCards: enabled,
      sortedCards: sorted,
    }
  }, [produits, dashboardConfig.cards])

  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([
          loadParcelles(),
          loadProduits(),
          loadDashboardConfig(),
        ])
      } catch (error) {
        console.error("Erreur lors du chargement des données:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [loadParcelles, loadProduits, loadDashboardConfig])

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-80 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <Motion {...staggerContainer} className="container mx-auto px-4 py-8 space-y-8">
      <Motion {...fadeInUp} className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <Suspense fallback={<Skeleton className="h-10 w-32" />}>
          <DashboardConfig />
        </Suspense>
      </Motion>

      {/* Stats Section */}
      <Motion {...staggerItem}>
        <StatsSection 
          parcelles={parcelles}
          produits={produits}
          produitsVendus={produitsVendus}
          chiffreAffaires={chiffreAffaires}
        />
      </Motion>

      {/* Dynamic Dashboard Cards */}
      <Motion {...staggerContainer} className="grid gap-6 md:grid-cols-2">
        {sortedCards.map((card, index) => {
          const Component = componentRegistry[card.component as keyof typeof componentRegistry]
          
          if (!Component || card.component === 'MainStats') return null

          return (
            <Motion key={card.id} {...staggerItem} style={{ animationDelay: `${index * 0.1}s` }}>
              <Suspense fallback={
                <Card className="h-80">
                  <CardHeader>
                    <CardTitle><Skeleton className="h-6 w-32" /></CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-64 w-full" />
                  </CardContent>
                </Card>
              }>
                <Component />
              </Suspense>
            </Motion>
          )
        })}
      </Motion>
    </Motion>
  )
}

