"use client"

import { Suspense, useEffect, useState } from "react"
import { motion } from "framer-motion"
import { DollarSign, Package, TrendingUp, Users, FileText, FileSpreadsheet } from "lucide-react" // Import des icônes
import { CardStats } from "@/components/ui/card-stats"
import { useStore } from "@/lib/services/store"
import { ProduitsTable } from "@/components/statistiques/produits-table"
import { ParcellesTable } from "@/components/statistiques/parcelles-table"
import { RoiTable } from "@/components/features/statistiques/roi-table"
import { TempsMoyenVenteTable } from "@/components/features/statistiques/temps-moyen-vente-table"
import { HeatmapChart } from "@/components/features/statistiques/heatmap-chart"
import { PlateformesRentabiliteTable } from "@/components/features/statistiques/plateformes-rentabilite-table"
import { RadarChart } from "@/components/features/statistiques/radar-chart"
import { TendancesSaisonnieresTable } from "@/components/features/statistiques/tendances-saisonnieres-table"
import { TrendChart } from "@/components/features/statistiques/trend-chart"
import { PrevisionsVentesTable } from "@/components/features/statistiques/previsions-ventes-table"
import { Button } from "@/components/ui/button" // Import du composant Button

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
  const [advancedStats, setAdvancedStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        await initializeStore()
        
        const response = await fetch("/api/v1/statistiques")
        if (!response.ok) {
          throw new Error("Erreur lors de la récupération des statistiques avancées")
        }
        const data = await response.json()
        setAdvancedStats(data)

      } catch (error) {
        console.error(error)
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

  if (isLoading || !advancedStats) {
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

  const produitsVendusData = produits
    .filter((p) => p.vendu && p.prixVente && p.benefices)
    .sort((a, b) => (b.benefices || 0) - (a.benefices || 0))
    .slice(0, 5)

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

      {/* Tables existantes */}
      <div className="grid gap-4 md:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 1.0 }}>
          <Suspense fallback={<LoadingComponent />}>
            <ProduitsTable produits={produitsVendusData} />
          </Suspense>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 1.1 }}>
          <Suspense fallback={<LoadingComponent />}>
            <ParcellesTable parcelles={parcelles} />
          </Suspense>
        </motion.div>
      </div>
    </div>
  )
}
