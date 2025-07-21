"use client"

import { Suspense, useEffect, useState } from "react"
import { motion } from "framer-motion"
import { DollarSign, Package, TrendingUp, Users, BarChart, LineChart } from "lucide-react"
import { CardStats } from "@/components/ui/card-stats"
import { useStore } from "@/store/store"
import { VentesChart } from "@/components/features/statistiques/ventes-chart"
import { VentesBar } from "@/components/features/statistiques/ventes-bar"
import { ProduitsTable } from "@/components/features/statistiques/produits-table"
import { ParcellesTable } from "@/components/features/statistiques/parcelles-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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
      await initializeStore()
      setIsLoading(false)
    }
    loadData()
  }, [initializeStore])

  useEffect(() => {
    if (produits.length > 0 || parcelles.length > 0) {
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
        const produitsVendusDuMois = produits.filter(
          (p) => p.vendu && p.dateVente && new Date(p.dateVente) >= debut && new Date(p.dateVente) <= fin,
        )

        const ventes = produitsVendusDuMois.reduce((acc, p) => acc + (p.prixVente || 0), 0)
        const benefices = produitsVendusDuMois.reduce((acc, p) => acc + (p.benefices || 0), 0)
        
        return {
          mois,
          ventes: Number(ventes.toFixed(2)),
          benefices: Number(benefices.toFixed(2)),
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

  const produitsVendusData = produits
    .filter((p) => p.vendu && p.prixVente && p.benefices)
    .sort((a, b) => (b.benefices || 0) - (a.benefices || 0))
    .slice(0, 5)

  return (
    <div className="space-y-8 p-4 md:p-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="text-3xl font-bold tracking-tight">Tableau de Bord des Statistiques</h1>
        <p className="text-muted-foreground mt-2">Une vue d'ensemble de vos activités et performances de vente.</p>
      </motion.div>

      <motion.div
        variants={{
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: {
              staggerChildren: 0.1,
            },
          },
        }}
        initial="hidden"
        animate="show"
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      >
        <CardStats title="Ventes Totales" value={`${stats.ventesTotales.toFixed(2)} €`} icon={<DollarSign className="h-6 w-6 text-green-500" />} />
        <CardStats title="Produits Vendus" value={stats.produitsVendus} icon={<Package className="h-6 w-6 text-blue-500" />} />
        <CardStats title="Bénéfices" value={`${stats.beneficesTotaux.toFixed(2)} €`} icon={<TrendingUp className="h-6 w-6 text-purple-500" />} />
        <CardStats title="Parcelles" value={stats.nombreParcelles} icon={<Users className="h-6 w-6 text-orange-500" />} />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div
          className="lg:col-span-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <LineChart className="h-5 w-5 mr-2" />
                Évolution des Ventes et Bénéfices
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<LoadingComponent />}>
                <VentesChart data={ventesData} />
              </Suspense>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart className="h-5 w-5 mr-2" />
                Répartition Mensuelle
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<LoadingComponent />}>
                <VentesBar data={ventesData} />
              </Suspense>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Top 5 Produits Rentables</CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<LoadingComponent />}>
                <ProduitsTable produits={produitsVendusData} />
              </Suspense>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Détails des Parcelles</CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<LoadingComponent />}>
                <ParcellesTable parcelles={parcelles} />
              </Suspense>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
