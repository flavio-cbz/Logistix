"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { CardStats } from "@/components/ui/card-stats"
import { Package, Map, TrendingUp, ShoppingBag } from "lucide-react"
import { useStore } from "@/lib/store"
import { MargeMensuelle } from "@/components/dashboard/marge-mensuelle"
import { PerformanceChart } from "@/components/dashboard/performance-chart"
import { TopProduits } from "@/components/dashboard/top-produits"
import { VentesPlateformes } from "@/components/dashboard/ventes-plateformes"
import { TempsVente } from "@/components/dashboard/temps-vente"
import { DashboardConfig } from "@/components/dashboard/dashboard-config"
import { CoutPoids } from "@/components/dashboard/cout-poids"
import { TopParcelles } from "@/components/dashboard/top-parcelles"
import { TendancesVente } from "@/components/dashboard/tendances-vente"
import { motion } from "framer-motion"

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
    performance: <PerformanceChart produits={produits} />,
    plateformes: <VentesPlateformes produits={produits} />,
    "top-produits": <TopProduits produits={produits} />,
    "temps-vente": <TempsVente produits={produits} />,
    "marge-mensuelle": <MargeMensuelle produits={produits} />,
    "top-parcelles": <TopParcelles parcelles={parcelles} produits={produits} />,
    "cout-poids": <CoutPoids parcelles={parcelles} />,
    tendances: <TendancesVente produits={produits} />,
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

