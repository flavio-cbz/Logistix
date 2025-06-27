"use client"

import { Suspense, useEffect, useState } from "react"
import { motion } from "framer-motion"
import { DollarSign, Package, TrendingUp, Users } from "lucide-react"
import { CardStats } from "@/components/ui/card-stats"
import { useStore } from "@/lib/store"
import { VentesChart } from "@/components/statistiques/ventes-chart"
import { VentesBar } from "@/components/statistiques/ventes-bar"
import { ProduitsTable } from "@/components/statistiques/produits-table"
import { ParcellesTable } from "@/components/statistiques/parcelles-table"

// Composant de chargement amélioré
function LoadingComponent() {
  return (
    <div className="h-[300px] w-full flex items-center justify-center">
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
        <p className="text-muted-foreground">Chargement des données...</p>
      </div>
    </div>
  )
}

export default function StatistiquesPage() {
  const { parcelles, produits, initializeStore } = useStore()
  const [stats, setStats] = useState({
    produitsVendus: 0,
    ventesTotales: 0,
    beneficesTotaux: 0,
    nombreParcelles: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [ventesData, setVentesData] = useState<any[]>([])

  useEffect(() => {
    const loadData = async () => {
      console.log("Initialisation des données statistiques...")
      await initializeStore()
      setIsLoading(false)
    }

    loadData()
  }, [initializeStore])

  useEffect(() => {
    if (produits.length > 0 || parcelles.length > 0) {
      console.log("Calcul des statistiques avec", produits.length, "produits et", parcelles.length, "parcelles")

      // Calcul des statistiques
      const produitsVendus = produits.filter((p) => p.vendu).length
      const ventesTotales = produits
        .filter((p) => p.vendu && p.prixVente)
        .reduce((acc, p) => acc + (p.prixVente || 0), 0)
      const beneficesTotaux = produits
        .filter((p) => p.vendu && p.benefices)
        .reduce((acc, p) => acc + (p.benefices || 0), 0)

      setStats({
        produitsVendus,
        ventesTotales,
        beneficesTotaux,
        nombreParcelles: parcelles.length,
      })

      // Préparation des données pour les graphiques
      const derniers6Mois = Array.from({ length: 6 }, (_, i) => {
        const date = new Date()
        date.setMonth(date.getMonth() - i)
        return {
          mois: date.toLocaleString("fr-FR", { month: "short" }),
          debut: new Date(date.getFullYear(), date.getMonth(), 1),
          fin: new Date(date.getFullYear(), date.getMonth() + 1, 0),
        }
      }).reverse()

      const data = derniers6Mois.map(({ mois, debut, fin }) => {
        const produitsVendus = produits.filter(
          (p) => p.vendu && p.dateVente && new Date(p.dateVente) >= debut && new Date(p.dateVente) <= fin,
        )

        // Ajout de vérifications pour éviter les valeurs undefined
        const ventes = produitsVendus.reduce((acc, p) => acc + (p.prixVente || 0), 0)
        const benefices = produitsVendus.reduce((acc, p) => {
          // Vérifier que toutes les valeurs nécessaires existent
          if (p.prixVente === undefined || p.prixArticle === undefined || p.prixLivraison === undefined) {
            return acc
          }
          return acc + (p.prixVente - p.prixArticle - p.prixLivraison)
        }, 0)
        const marge = ventes > 0 ? (benefices / ventes) * 100 : 0

        return {
          mois,
          ventes: Number(ventes.toFixed(2)),
          benefices: Number(benefices.toFixed(2)),
          marge: Number(marge.toFixed(1)),
        }
      })

      setVentesData(data)
    }
  }, [parcelles, produits])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center"
        >
          <motion.div
            className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
          />
          <p className="text-muted-foreground">Chargement des statistiques...</p>
        </motion.div>
      </div>
    )
  }

  // Filtrer les produits vendus pour les tableaux
  const produitsVendusData = produits
    .filter((p) => p.vendu && p.prixVente && p.benefices)
    .sort((a, b) => (b.benefices || 0) - (a.benefices || 0))
    .slice(0, 5)

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h3 className="text-lg font-medium">Statistiques</h3>
        <p className="text-sm text-muted-foreground">Vue d'ensemble des performances et analyses.</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <CardStats
            title="Ventes Totales"
            value={`${stats.ventesTotales.toFixed(2)} €`}
            icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <CardStats
            title="Produits Vendus"
            value={stats.produitsVendus}
            icon={<Package className="h-4 w-4 text-muted-foreground" />}
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <CardStats
            title="Bénéfices"
            value={`${stats.beneficesTotaux.toFixed(2)} €`}
            icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <CardStats
            title="Parcelles"
            value={stats.nombreParcelles}
            icon={<Users className="h-4 w-4 text-muted-foreground" />}
          />
        </motion.div>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Suspense fallback={<LoadingComponent />}>
            <VentesChart data={ventesData} />
          </Suspense>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Suspense fallback={<LoadingComponent />}>
            <VentesBar data={ventesData} />
          </Suspense>
        </motion.div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Suspense fallback={<LoadingComponent />}>
            <ProduitsTable produits={produitsVendusData} />
          </Suspense>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Suspense fallback={<LoadingComponent />}>
            <ParcellesTable parcelles={parcelles} />
          </Suspense>
        </motion.div>
      </div>
    </div>
  )
}

