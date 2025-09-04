"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChevronRight, Filter, RefreshCw, Sparkles, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import { logger } from "@/lib/utils/logging/logger"
import type { AIRecommendations, PricingRecommendation, MarketingRecommendation, OpportunityRecommendation, RiskMitigation } from "@/types/vinted-market-analysis"
import { PriceRecommendationCard } from "./price-recommendation-card"
import { AnimatedButton } from "@/components/ui/animated-button"
import { ScrollArea } from "@/components/ui/scroll-area"

interface PriceRecommendationsPanelProps {
  recommendations: AIRecommendations
  onApplyRecommendation?: (recommendation: PricingRecommendation | MarketingRecommendation | OpportunityRecommendation | RiskMitigation) => void
  onRefreshRecommendations?: () => void
  isLoading?: boolean
}

export function PriceRecommendationsPanel({
  recommendations,
  onApplyRecommendation,
  onRefreshRecommendations,
  isLoading = false,
}: PriceRecommendationsPanelProps) {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("pricing")

  const tabs = useMemo(() => {
    const availableTabs = []
    if (recommendations.pricing && recommendations.pricing.length > 0) {
      availableTabs.push({ id: "pricing", title: "Prix" })
    }
    if (recommendations.marketing && recommendations.marketing.length > 0) {
      availableTabs.push({ id: "marketing", title: "Marketing" })
    }
    if (recommendations.opportunities && recommendations.opportunities.length > 0) {
      availableTabs.push({ id: "opportunities", title: "Opportunités" })
    }
    if (recommendations.risks && recommendations.risks.length > 0) {
      availableTabs.push({ id: "risks", title: "Risques" })
    }
    return availableTabs
  }, [recommendations])

  // Set active tab to the first available tab if the current one is empty
  // This helps when switching between analyses where some tabs might be empty
  useEffect(() => {
    if (tabs.length > 0 && !tabs.some(tab => tab.id === activeTab)) {
      setActiveTab(tabs[0]!.id)
    }
  }, [tabs, activeTab])

  const handleApply = useCallback(
    (recommendation: PricingRecommendation | MarketingRecommendation | OpportunityRecommendation | RiskMitigation) => {
      logger.info("Applying recommendation:", recommendation)
      onApplyRecommendation?.(recommendation)
      toast({
        title: "Recommandation appliquée",
        description: "La recommandation a été transmise pour application.",
      })
    },
    [onApplyRecommendation, toast],
  )

  const renderContent = useCallback(() => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center p-8">
          <Sparkles className="h-12 w-12 animate-pulse text-primary" />
          <p className="mt-4 text-muted-foreground">Génération des recommandations AI...</p>
        </div>
      )
    }

    switch (activeTab) {
      case "pricing":
        return recommendations.pricing.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {recommendations.pricing.map((rec, index) => (
              <PriceRecommendationCard
                key={index}
                recommendation={rec as any}
                onApply={() => handleApply(rec)}
              />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">Aucune recommandation de prix disponible.</p>
        )
      case "marketing":
        return recommendations.marketing.length > 0 ? (
          <div className="grid gap-4">
            {recommendations.marketing.map((rec, index) => (
              <Card key={index} className="p-4">
                <CardTitle className="text-base">{rec.strategy}</CardTitle>
                <CardDescription className="mt-2">{rec.expectedOutcome}</CardDescription>
                <div className="mt-4 flex flex-wrap gap-2">
                  {rec.channels.map((channel) => (
                    <span key={channel} className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800">
                      {channel}
                    </span>
                  ))}
                </div>
                <Button size="sm" className="mt-4" onClick={() => handleApply(rec)}>
                  Appliquer
                </Button>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">Aucune recommandation marketing disponible.</p>
        )
      case "opportunities":
        return recommendations.opportunities.length > 0 ? (
          <div className="grid gap-4">
            {recommendations.opportunities.map((rec, index) => (
              <Card key={index} className="p-4">
                <CardTitle className="text-base">{rec.opportunity}</CardTitle>
                <CardDescription className="mt-2">{rec.description}</CardDescription>
                <div className="mt-4 text-sm text-muted-foreground">
                  <p>Potentiel de profit: {rec.profitPotential}</p>
                  <p>Effort estimé: {rec.effort}</p>
                  <p>Délais: {rec.timeline}</p>
                </div>
                <Button size="sm" className="mt-4" onClick={() => handleApply(rec)}>
                  Appliquer
                </Button>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">Aucune opportunité détectée.</p>
        )
      case "risks":
        return recommendations.risks.length > 0 ? (
          <div className="grid gap-4">
            {recommendations.risks.map((rec, index) => (
              <Card key={index} className="p-4">
                <CardTitle className="text-base">{rec.risk}</CardTitle>
                <CardDescription className="mt-2">{rec.mitigation}</CardDescription>
                <div className="mt-4 text-sm text-muted-foreground">
                  <p>Sévérité: {rec.severity}</p>
                </div>
                <Button size="sm" className="mt-4" onClick={() => handleApply(rec)}>
                  Appliquer
                </Button>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">Aucun risque détecté.</p>
        )
      default:
        return <p className="text-muted-foreground">Sélectionnez un type de recommandation.</p>
    }
  }, [activeTab, recommendations, isLoading, handleApply])

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex flex-col">
          <CardTitle className="text-xl font-semibold">Recommandations AI</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            {"Résumé non disponible."}
          </CardDescription>
        </div>
        <div className="flex items-center space-x-2">
          {onRefreshRecommendations && (
            <AnimatedButton variant="outline" size="sm" onClick={onRefreshRecommendations} disabled={isLoading}>
              <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
              Actualiser
            </AnimatedButton>
          )}
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Options
          </Button>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="flex flex-1 flex-col p-6">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value)} className="flex flex-1 flex-col">
          <ScrollArea className="pb-4">
            <TabsList className="grid h-auto w-full grid-flow-col justify-start gap-2">
              {tabs.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id} className="min-w-[120px] whitespace-nowrap">
                  {tab.title} ({Array.isArray(recommendations[tab.id as keyof AIRecommendations]) ? (recommendations[tab.id as keyof AIRecommendations] as any[]).length : 0})
                </TabsTrigger>
              ))}
            </TabsList>
          </ScrollArea>
          <div className="mt-4 flex-1 overflow-y-auto">
            {tabs.map((tab) => (
              <TabsContent key={tab.id} value={tab.id} className="mt-0">
                <div
                  key={tab.id}
                  className="transition-opacity duration-300 transform translate-y-0 opacity-100" // Simulate framer-motion animations
                >
                  {renderContent()}
                </div>
              </TabsContent>
            ))}
          </div>
        </Tabs>
        <div className="mt-6 text-right text-xs text-muted-foreground">
          Dernière mise à jour: {new Date(recommendations.lastUpdated).toLocaleString()}
        </div>
        <div className="mt-2 flex items-center justify-end text-xs text-muted-foreground">
          Confiance AI: {(recommendations.confidence * 100).toFixed(0)}%
          <TrendingUp className="ml-1 h-3 w-3" />
        </div>
        <div className="mt-4 flex justify-end">
          <AnimatedButton variant="ghost">
            Voir le plan d'action complet <ChevronRight className="ml-1 h-4 w-4" />
          </AnimatedButton>
        </div>
      </CardContent>
    </Card>
  )
}