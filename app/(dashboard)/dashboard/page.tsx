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
  const [isLoading, setIsLoading] = useState(true)
  const { parcelles, produits, dashboardConfig, initializeStore } = useStore()

  useEffect(() => {
    // Initialiser le store et synchroniser avec la base de données
    const loadData = async () => {
      await initializeStore()

      // Simuler un chargement pour laisser le temps aux données de s'initialiser
      const timer = setTimeout(() => {
        setIsLoading(false)
      }, 500)

      return () => clearTimeout(timer)
    }

    loadData()
  }, [initializeStore])

  // Calcul des statistiques générales
  const produitsVendus = produits.filter((p) => p.vendu).length
  const ventesTotales = produits.filter((p) => p.vendu && p.prixVente).reduce((acc, p) => acc + (p.prixVente || 0), 0)
  const beneficesTotaux = produits.filter((p) => p.vendu && p.benefices).reduce((acc, p) => acc + (p.benefices || 0), 0)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
          />
          <p>Chargement des données...</p>
        </motion.div>
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
    <motion.div className="grid gap-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <motion.div
        className="flex items-center justify-between"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold tracking-tight">Tableau de bord</h1>
        <DashboardConfig config={dashboardConfig} />
      </motion.div>

      <div className={`grid gap-4 md:grid-cols-${gridCols.md} lg:grid-cols-${gridCols.lg}`}>
        {activeWidgets.map((widget, index) => (
          <motion.div
            key={widget.id}
            className="col-span-1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            {widget.component}
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
