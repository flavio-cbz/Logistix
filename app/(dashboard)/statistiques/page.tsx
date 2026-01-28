"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart3,
  TrendingUp,
  Activity,
  Target,
  RefreshCw,
  CheckCircle2,
  FileText,
  Package,
  Boxes,
  ShoppingBag
} from "lucide-react";
import { PageLoading } from "@/components/ui/loading-state";
import { useStatistiques, type PeriodType, type GroupByType } from "@/lib/hooks/useStatistiques";
import { OverviewTab, ParcellesTab, ProduitsTab } from "@/components/features/statistiques";
import { cn } from "@/lib/shared/utils";
import { useFormatting } from "@/lib/hooks/use-formatting";


export default function StatistiquesPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('30d');
  const [selectedGroupBy, setSelectedGroupBy] = useState<GroupByType>('day');
  const { formatCurrency } = useFormatting();

  const { data, isLoading, isError, error, refetch } = useStatistiques(
    selectedPeriod,
    selectedGroupBy,
    {
      enabled: true,
      refetchInterval: 60000,
    }
  );

  // Loading state
  if (isLoading) {
    return (
      <PageLoading
        title="Chargement des Statistiques"
        message="Récupération des données..."
        icon={<Activity className="w-6 h-6" />}
      />
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md">
            <CardHeader>
              <div className="flex items-center gap-2 text-red-600">
                <FileText className="w-5 h-5" />
                <CardTitle>Erreur</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {error?.message || 'Impossible de charger les statistiques'}
              </p>
              <Button onClick={() => refetch()} className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Réessayer
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <PageLoading
        title="Récupération des statistiques"
        message="Connexion interrompue — tentative de reconnexion…"
        icon={<Activity className="w-6 h-6" />}
      />
    );
  }

  const d = data;

  // Calcul du ROI moyen
  const roiMoyen = d.performanceParcelle.length > 0
    ? d.performanceParcelle.reduce((sum, p) => sum + p.ROI, 0) / d.performanceParcelle.length
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="space-y-6 p-6 max-w-screen-xl mx-auto">
        {/* Page Header - Style Premium */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Statistiques Avancées
              </h1>
              <Badge variant="secondary" className="animate-pulse">
                <Activity className="w-3 h-3 mr-1" />
                Temps Réel
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Analyses complètes • Performance en temps réel • Insights intelligents
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="shrink-0"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
        </div>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Produits</p>
              <p className="font-semibold">{d.vueEnsemble.totalProduits}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <ShoppingBag className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Vendus</p>
              <p className="font-semibold">{d.vueEnsemble.produitsVendus}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Target className="w-4 h-4 text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Taux Vente</p>
              <p className="font-semibold">{d.vueEnsemble.tauxVente.toFixed(1)}%</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <TrendingUp className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">ROI Moyen</p>
              <p className={cn(
                "font-semibold",
                roiMoyen >= 50 ? "text-emerald-500" : roiMoyen >= 20 ? "text-blue-500" : "text-amber-500"
              )}>
                {roiMoyen.toFixed(1)}%
              </p>
            </div>
          </div>
          <div className="hidden lg:flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20">
            <div className="p-2 rounded-lg bg-emerald-500/20">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Bénéfices</p>
              <p className="font-semibold text-emerald-500">
                +{formatCurrency(d.vueEnsemble.beneficesTotal)}
              </p>
            </div>
          </div>
        </div>

        {/* Contrôles de période et groupement */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={selectedPeriod} onValueChange={(value: PeriodType) => setSelectedPeriod(value)}>
              <SelectTrigger className="w-36 bg-muted/30 border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7 Jours</SelectItem>
                <SelectItem value="30d">30 Jours</SelectItem>
                <SelectItem value="90d">3 Mois</SelectItem>
                <SelectItem value="1y">1 An</SelectItem>
                <SelectItem value="all">Tout</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedGroupBy} onValueChange={(value: GroupByType) => setSelectedGroupBy(value)}>
              <SelectTrigger className="w-36 bg-muted/30 border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Par Jour</SelectItem>
                <SelectItem value="week">Par Semaine</SelectItem>
                <SelectItem value="month">Par Mois</SelectItem>
              </SelectContent>
            </Select>
          </div>


        </div>

        {/* Tabs avec design premium */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-12 p-1 bg-muted/50">
            <TabsTrigger
              value="overview"
              className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Vue d'Ensemble</span>
              <span className="sm:hidden">Aperçu</span>
            </TabsTrigger>
            <TabsTrigger
              value="parcelles"
              className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Boxes className="w-4 h-4" />
              Parcelles
            </TabsTrigger>
            <TabsTrigger
              value="produits"
              className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Package className="w-4 h-4" />
              Produits
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            <OverviewTab data={d} selectedPeriod={selectedPeriod} />
          </TabsContent>

          <TabsContent value="parcelles" className="space-y-6 mt-6">
            <ParcellesTab data={d} />
          </TabsContent>

          <TabsContent value="produits" className="space-y-6 mt-6">
            <ProduitsTab data={d} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
