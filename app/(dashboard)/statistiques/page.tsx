"use client"

import { Suspense, useEffect, useState, useMemo } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { DollarSign, Package, TrendingUp, Users, FileText, FileSpreadsheet } from "lucide-react"
import { CardStats } from "@/components/ui/card-stats"
import { useStore } from "@/lib/services/admin/store"
import { ProduitsTable } from "../../../components/features/statistiques/produits-table"
import { ParcellesTable } from "../../../components/features/statistiques/parcelles-table"
import { RoiTable } from "@/components/features/statistiques/roi-table"
import { TempsMoyenVenteTable } from "@/components/features/statistiques/temps-moyen-vente-table"
import { HeatmapChart } from "@/components/features/statistiques/heatmap-chart"
import { PlateformesRentabiliteTable } from "@/components/features/statistiques/plateformes-rentabilite-table"
import { RadarChart } from "@/components/features/statistiques/radar-chart"
import { TendancesSaisonnieresTable } from "@/components/features/statistiques/tendances-saisonnieres-table"
import dynamic from "next/dynamic"
const TrendChart = dynamic(() => import("@/components/features/statistiques/trend-chart").then(mod => mod.TrendChart), { ssr: false })
import { PrevisionsVentesTable } from "@/components/features/statistiques/previsions-ventes-table"
import { Button } from "@/components/ui/button"

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

type AnimatedItemProps = {
  children: React.ReactNode
  delay?: number
}

const fadeUpVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

function AnimatedItem({ children, delay = 0 }: AnimatedItemProps) {
  const reduce = useReducedMotion()
  if (reduce) return <div>{children}</div>

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeUpVariants}
      transition={{ duration: 0.5, delay }}
    >
      {children}
    </motion.div>
  )
}

export default function StatistiquesPage() {
  const { parcelles, produits, initializeStore } = useStore()
  const [advancedStats, setAdvancedStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        await initializeStore()
        
        const response = await fetch("/api/v1/statistiques")
        if (!response.ok) {
          if (response.status === 401) {
            window.location.href = "/login"
            return
          }
          const errorData = await response.json().catch(() => ({}))
          const message = errorData?.message || "Erreur lors de la récupération des statistiques avancées"
          setError(message)
          return
        }
        const data = await response.json()
        setAdvancedStats(data)

      } catch (err: any) {
        console.error(err)
        setError(err?.message || "Erreur inattendue lors du chargement des statistiques")
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [initializeStore])

  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      const response = await fetch(`/api/v1/statistiques?format=${format}`);
      if (!response.ok) {
        const errorData = await response.json();
        alert(`Erreur lors de l'export ${format.toUpperCase()} : ${errorData.message}`);
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `statistiques.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(`Erreur lors de l'export ${format.toUpperCase()}:`, error);
      alert(`Une erreur inattendue est survenue lors de l'export ${format.toUpperCase()}.`);
    }
  };

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
          <p className="text-muted-foreground">Chargement des statistiques avancées...</p>
        </motion.div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="text-center">
          <p className="text-red-500 mb-2">Erreur : {error}</p>
          <Button onClick={() => { setError(null); setIsLoading(true); (async ()=>{ await initializeStore(); setIsLoading(false) })(); }} variant="outline">Réessayer</Button>
        </div>
      </div>
    )
  }

  if (!advancedStats) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <p className="text-muted-foreground">Aucune statistique disponible.</p>
      </div>
    )
  }

  const produitsVendusData = useMemo(() => {
    if (!Array.isArray(produits)) return []
    return produits
      .filter((p) => p?.vendu && p?.prixVente != null && p?.benefices != null)
      .sort((a, b) => (b.benefices || 0) - (a.benefices || 0))
      .slice(0, 5)
  }, [produits])

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Statistiques Avancées</h3>
          <p className="text-sm text-muted-foreground">Vue d'overview des performances et analyses détaillées.</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={() => handleExport('csv')} variant="outline" size="sm">
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Button onClick={() => handleExport('pdf')} variant="outline" size="sm">
            <FileText className="mr-2 h-4 w-4" /> Export PDF
          </Button>
        </div>
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
            value={`${advancedStats.ventesTotales.toFixed(2)} €`}
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
            value={advancedStats.produitsVendus}
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
            value={`${advancedStats.beneficesTotaux.toFixed(2)} €`}
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
            value={advancedStats.nombreParcelles}
            icon={<Users className="h-4 w-4 text-muted-foreground" />}
          />
        </motion.div>
      </motion.div>
      
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
        <HeatmapChart data={advancedStats.heatmapVentes} />
      </motion.div>

      <div className="grid gap-4 md:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
           <RoiTable data={advancedStats.roiParProduit} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
           <TempsMoyenVenteTable data={advancedStats.tempsMoyenVente} />
        </motion.div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}>
           <PlateformesRentabiliteTable data={advancedStats.meilleuresPlateformes} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }}>
           <RadarChart data={advancedStats.radarPerformances} />
        </motion.div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.6 }}>
           <TendancesSaisonnieresTable data={advancedStats.tendancesSaisonnieres} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.7 }}>
           <TrendChart data={advancedStats.courbeTendance} />
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.8 }}>
         <PrevisionsVentesTable data={advancedStats.previsionsVentes} />
      </motion.div>

      <div className="grid gap-4 md:grid-cols-2">
        <AnimatedItem delay={1.0}>
          <Suspense fallback={<LoadingComponent />}>
            <ProduitsTable produits={produitsVendusData} />
          </Suspense>
        </AnimatedItem>
        <AnimatedItem delay={1.1}>
          <Suspense fallback={<LoadingComponent />}>
            <ParcellesTable parcelles={Array.isArray(parcelles) ? parcelles : []} />
          </Suspense>
        </AnimatedItem>
      </div>
    </div>
  )
}