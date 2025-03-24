"use client"

import { Suspense, lazy, useEffect, useState } from "react"
import { motion } from "framer-motion"
import { DollarSign, Package, TrendingUp, Users } from "lucide-react"
import { CardStats } from "@/components/ui/card-stats"
import { useStore } from "@/lib/store"

// Chargement dynamique des composants lourds
const VentesChart = lazy(() =>
  import("@/components/statistiques/ventes-chart").then((mod) => ({ default: mod.VentesChart })),
)
const VentesBar = lazy(() => import("@/components/statistiques/ventes-bar").then((mod) => ({ default: mod.VentesBar })))
const ProduitsTable = lazy(() =>
  import("@/components/statistiques/produits-table").then((mod) => ({ default: mod.ProduitsTable })),
)
const ParcellesTable = lazy(() =>
  import("@/components/statistiques/parcelles-table").then((mod) => ({ default: mod.ParcellesTable })),
)

// Composant de chargement
function LoadingComponent() {
  return <div className="h-[300px] w-full flex items-center justify-center">Chargement...</div>
}

export default function StatistiquesPage() {
  const { parcelles, produits, initializeStore } = useStore()
  const [ventesData, setVentesData] = useState<Array<{ mois: string; ventes: number; benefices: number }>>([])
  const [stats, setStats] = useState({
    produitsVendus: 0,
    ventesTotales: 0,
    beneficesTotaux: 0,
    nombreParcelles: 0,
  })

  useEffect(() => {
    initializeStore()
  }, [initializeStore])

  useEffect(() => {
    // Calcul des statistiques
    const produitsVendus = produits.filter((p) => p.vendu).length
    const ventesTotales = produits.filter((p) => p.vendu && p.prixVente).reduce((acc, p) => acc + (p.prixVente || 0), 0)
    const beneficesTotaux = produits
      .filter((p) => p.vendu && p.benefices)
      .reduce((acc, p) => acc + (p.benefices || 0), 0)

    setStats({
      produitsVendus,
      ventesTotales,
      beneficesTotaux,
      nombreParcelles: parcelles.length,
    })

    // Calcul des données de ventes par mois
    const ventesParMois = Array.from({ length: 6 }, (_, i) => {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const mois = date.toLocaleString("fr-FR", { month: "short" })
      const debut = new Date(date.getFullYear(), date.getMonth(), 1)
      const fin = new Date(date.getFullYear(), date.getMonth() + 1, 0)

      const ventesTotal = produits
        .filter(
          (p) =>
            p.vendu && p.dateVente && p.prixVente && new Date(p.dateVente) >= debut && new Date(p.dateVente) <= fin,
        )
        .reduce((acc, p) => acc + (p.prixVente || 0), 0)

      const beneficesTotal = produits
        .filter(
          (p) =>
            p.vendu && p.dateVente && p.benefices && new Date(p.dateVente) >= debut && new Date(p.dateVente) <= fin,
        )
        .reduce((acc, p) => acc + (p.benefices || 0), 0)

      return {
        mois,
        ventes: Number(ventesTotal.toFixed(2)),
        benefices: Number(beneficesTotal.toFixed(2)),
      }
    }).reverse()

    setVentesData(ventesParMois)
  }, [parcelles, produits])

  // Préparation des données pour les tableaux
  const topProduits = produits
    .filter((p) => p.vendu && p.benefices != null)
    .sort((a, b) => (b.benefices || 0) - (a.benefices || 0))
    .slice(0, 5)

  const topParcelles = [...parcelles].sort((a, b) => a.prixParGramme - b.prixParGramme).slice(0, 5)

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Statistiques</h3>
        <p className="text-sm text-muted-foreground">Vue d'ensemble des performances et analyses.</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      >
        <CardStats
          title="Ventes Totales"
          value={`${stats.ventesTotales.toFixed(2)} €`}
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
        />
        <CardStats
          title="Produits Vendus"
          value={stats.produitsVendus}
          icon={<Package className="h-4 w-4 text-muted-foreground" />}
        />
        <CardStats
          title="Bénéfices"
          value={`${stats.beneficesTotaux.toFixed(2)} €`}
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
        />
        <CardStats
          title="Parcelles"
          value={stats.nombreParcelles}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
        />
      </motion.div>

      <div className="grid gap-4 md:grid-cols-2">
        <Suspense fallback={<LoadingComponent />}>
          <VentesChart data={ventesData} />
        </Suspense>
        <Suspense fallback={<LoadingComponent />}>
          <VentesBar data={ventesData} />
        </Suspense>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Suspense fallback={<LoadingComponent />}>
          <ProduitsTable produits={topProduits} />
        </Suspense>
        <Suspense fallback={<LoadingComponent />}>
          <ParcellesTable parcelles={topParcelles} />
        </Suspense>
      </div>
    </div>
  )
}

