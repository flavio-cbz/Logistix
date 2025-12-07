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
  FileText
} from "lucide-react";
import { useStatistiques, type PeriodType, type GroupByType } from "@/lib/hooks/useStatistiques";
import { OverviewTab, ParcellesTab, ProduitsTab } from "@/components/features/statistiques";


export default function StatistiquesPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('30d');
  const [selectedGroupBy, setSelectedGroupBy] = useState<GroupByType>('day');

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
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
              <Activity className="w-6 h-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Chargement des Statistiques</h3>
              <p className="text-muted-foreground">Récupération des données...</p>
            </div>
          </div>
        </div>
      </div>
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
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
              <Activity className="w-5 h-5 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Récupération des statistiques</h3>
              <p className="text-muted-foreground">Connexion interrompue — tentative de reconnexion…</p>
              <Button onClick={() => refetch()} className="mt-2">Réessayer</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const d = data;

  return (
    <div className="min-h-screen bg-background">
      <div className="space-y-6 p-6 max-w-screen-xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">
              Statistiques Avancées
            </h1>
            <p className="text-muted-foreground mt-2">
              Analyses complètes • Performance en temps réel • Insights intelligents
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="animate-pulse">
              <Activity className="w-3 h-3 mr-1" />
              Mise à jour auto (60s)
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualiser
            </Button>
          </div>
        </div>

        {/* Status indicators */}
        <div className="flex flex-wrap items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="text-muted-foreground">
              {d.vueEnsemble.totalProduits} produits • {d.vueEnsemble.produitsVendus} vendus
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-500" />
            <span className="text-muted-foreground">
              Taux de vente: {d.vueEnsemble.tauxVente.toFixed(1)}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-500" />
            <span className="text-muted-foreground">
              ROI moyen: {d.performanceParcelle.length > 0
                ? (d.performanceParcelle.reduce((sum, p) => sum + p.ROI, 0) / d.performanceParcelle.length).toFixed(1)
                : 0}%
            </span>
          </div>
        </div>

        {/* Contrôles de période et groupement */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <Select value={selectedPeriod} onValueChange={(value: PeriodType) => setSelectedPeriod(value)}>
              <SelectTrigger className="w-40">
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
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Par Jour</SelectItem>
                <SelectItem value="week">Par Semaine</SelectItem>
                <SelectItem value="month">Par Mois</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
            <BarChart3 className="w-3 h-3 mr-1" />
            Période : {d.periode} • Groupé par : {d.groupBy}
          </Badge>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Vue d'Ensemble</TabsTrigger>
            <TabsTrigger value="parcelles">Parcelles</TabsTrigger>
            <TabsTrigger value="produits">Produits</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <OverviewTab data={d} selectedPeriod={selectedPeriod} />
          </TabsContent>

          <TabsContent value="parcelles" className="space-y-6">
            <ParcellesTab data={d} />
          </TabsContent>

          <TabsContent value="produits" className="space-y-6">
            <ProduitsTab data={d} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
