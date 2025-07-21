"use client"

import type React from "react"
import { useEffect, useState, Suspense, lazy } from "react" // Ajout de lazy et Suspense
import { CardStats } from "@/components/ui/card-stats"
import { Package, Map, TrendingUp, ShoppingBag } from "lucide-react"
import { useStore } from "@/store/store"
import { DashboardConfig } from "@/components/dashboard/dashboard-config" // Garder l'import direct pour ce composant léger
import { motion } from "framer-motion"

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

// Chargement paresseux des composants lourds
const MargeMensuelle = lazy(() => import("@/components/dashboard/marge-mensuelle").then(mod => ({ default: mod.MargeMensuelle })));
const PerformanceChart = lazy(() => import("@/components/dashboard/performance-chart").then(mod => ({ default: mod.PerformanceChart })));
const TopProduits = lazy(() => import("@/components/dashboard/top-produits").then(mod => ({ default: mod.TopProduits })));
const VentesPlateformes = lazy(() => import("@/components/dashboard/ventes-plateformes").then(mod => ({ default: mod.VentesPlateformes })));
const TempsVente = lazy(() => import("@/components/dashboard/temps-vente").then(mod => ({ default: mod.TempsVente })));
const CoutPoids = lazy(() => import("@/components/dashboard/cout-poids").then(mod => ({ default: mod.CoutPoids })));
const TopParcelles = lazy(() => import("@/components/dashboard/top-parcelles").then(mod => ({ default: mod.TopParcelles })));
const TendancesVente = lazy(() => import("@/components/dashboard/tendances-vente").then(mod => ({ default: mod.TendancesVente })));


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

  // Composants de dashboard disponibles
  const dashboardComponents: Record<string, React.ReactNode> = {
    stats: (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <CardStats
            title="Total Parcelles"
            value={parcelles.length}
            icon={<Map className="h-4 w-4 text-muted-foreground" />}
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <CardStats
            title="Produits Vendus"
            value={produitsVendus}
            icon={<Package className="h-4 w-4 text-muted-foreground" />}
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <CardStats
            title="Ventes Totales"
            value={`${ventesTotales.toFixed(2)} €`}
            icon={<ShoppingBag className="h-4 w-4 text-muted-foreground" />}
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <CardStats
            title="Bénéfices Totaux"
            value={`${beneficesTotaux.toFixed(2)} €`}
            icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
          />
        </motion.div>
      </div>
    ),
    performance: <Suspense fallback={<LoadingComponent />}><PerformanceChart produits={produits} /></Suspense>,
    plateformes: <Suspense fallback={<LoadingComponent />}><VentesPlateformes produits={produits} /></Suspense>,
    "top-produits": <Suspense fallback={<LoadingComponent />}><TopProduits produits={produits} /></Suspense>,
    "temps-vente": <Suspense fallback={<LoadingComponent />}><TempsVente produits={produits} /></Suspense>,
    "marge-mensuelle": <Suspense fallback={<LoadingComponent />}><MargeMensuelle produits={produits} /></Suspense>,
    "top-parcelles": <Suspense fallback={<LoadingComponent />}><TopParcelles parcelles={parcelles} produits={produits} /></Suspense>,
    "cout-poids": <Suspense fallback={<LoadingComponent />}><CoutPoids parcelles={parcelles} /></Suspense>,
    tendances: <Suspense fallback={<LoadingComponent />}><TendancesVente produits={produits} /></Suspense>,
  }

  // Obtenir la grille de colonnes à partir de la configuration
  const gridCols = {
    lg: dashboardConfig.gridLayout?.lg || 2,
    md: dashboardConfig.gridLayout?.md || 1,
  }

  // Filtrer les composants actifs selon la configuration
  const activeWidgets = dashboardConfig.cards
    .filter((card) => card.enabled)
    .sort((a, b) => a.order - b.order)
    .map((card) => ({
      id: card.id,
      title: card.title,
      component: dashboardComponents[card.id],
    }))

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
