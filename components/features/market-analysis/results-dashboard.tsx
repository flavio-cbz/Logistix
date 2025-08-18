"use client"

import { Button } from "@/components/ui/button"
import { RefreshCw, Loader2 } from "lucide-react"
import { type ResultsDashboardProps } from "@/types/vinted-market-analysis"
import { motion } from "framer-motion"

// Import des nouveaux widgets
import KeyMetricsWidget from "./widgets/key-metrics-widget"
import PriceAnalysisWidget from "./widgets/price-analysis-widget"
import ProductInfoWidget from "./widgets/product-info-widget"
import NextStepsWidget from "./widgets/next-steps-widget"

import AiReportWidget from "./widgets/ai-report-widget";
import DistributionWidget from "./widgets/distribution-widget";
// Import des graphiques existants
import MarketAnalysisChart from "./market-analysis-chart"
import MarketTrends from "./market-trends"
import SalesVolumeChart from "./sales-volume-chart"
import { useMarketAnalysisStore } from "@/lib/store"

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const widgetVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.5,
      ease: "easeOut"
    }
  })
};

export default function ResultsDashboard({
  analysis,
  onRefresh,
  isRefreshing = false
}: ResultsDashboardProps) {

  const { historicalData } = useMarketAnalysisStore();

  return (
    <div className="space-y-6">
      {/* En-tête avec titre et bouton refresh */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Résultats de l'analyse</h3>
            <p className="text-sm text-muted-foreground">
              Analysé le {formatDate(analysis.analysisDate)}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Actualiser
          </Button>
        </div>
      </motion.div>

      {/* Grille de widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Colonne principale (plus large) */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div custom={0} initial="hidden" animate="visible" variants={widgetVariants}>
            <KeyMetricsWidget analysis={analysis} />
          </motion.div>
          <motion.div custom={1} initial="hidden" animate="visible" variants={widgetVariants}>
            <MarketAnalysisChart currentAnalysis={analysis} historicalData={historicalData} />
          </motion.div>
          <div className="grid md:grid-cols-2 gap-6">
            <motion.div custom={2} initial="hidden" animate="visible" variants={widgetVariants}>
              <MarketTrends currentAnalysis={analysis} historicalData={historicalData} />
            </motion.div>
            <motion.div custom={3} initial="hidden" animate="visible" variants={widgetVariants}>
              <SalesVolumeChart analysis={analysis} />
<motion.div custom={4} initial="hidden" animate="visible" variants={widgetVariants}>
              <DistributionWidget title="Distribution par Marque" data={analysis.brandDistribution} />
            </motion.div>
            <motion.div custom={5} initial="hidden" animate="visible" variants={widgetVariants}>
              <DistributionWidget title="Distribution par Modèle" data={analysis.modelDistribution} />
            </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Colonne latérale */}
<motion.div custom={0.5} initial="hidden" animate="visible" variants={widgetVariants}>
            <AiReportWidget analysis={analysis} />
          </motion.div>
        <div className="space-y-6">
          <motion.div custom={1.5} initial="hidden" animate="visible" variants={widgetVariants}>
            <PriceAnalysisWidget analysis={analysis} />
          </motion.div>
          <motion.div custom={2.5} initial="hidden" animate="visible" variants={widgetVariants}>
            <ProductInfoWidget analysis={analysis} />
          </motion.div>
          <motion.div custom={3.5} initial="hidden" animate="visible" variants={widgetVariants}>
            <NextStepsWidget analysis={analysis} />
          </motion.div>
        </div>

      </div>
    </div>
  )
}