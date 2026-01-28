"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  TrendingUp,
  Package,
  DollarSign,
  AlertTriangle,
  Target,
  RefreshCw,
  Plus
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MetricCard, AlertCard, QuickAction } from "@/components/features/dashboard/metric-cards";
import { InteractiveChart, ChartGrid } from "@/components/features/dashboard/interactive-charts";
import { useOptimizedDashboard, useRealTimeAlerts } from "@/lib/hooks/useDashboardData";
import { cn } from "@/lib/shared/utils";
import { useFormatting } from "@/lib/hooks/use-formatting";

import { PageLoading } from "@/components/ui/loading-state";

export default function RevolutionaryDashboard() {
  const router = useRouter();
  const { formatCurrency } = useFormatting();
  const {
    data,
    loading,
    error,
    refresh,
    isRealtime
  } = useOptimizedDashboard();

  const { alerts, criticalCount, highCount } = useRealTimeAlerts();
  const [isFullscreen] = useState(false);

  if (loading) {
    return (
      <PageLoading
        title="Chargement du Dashboard Intelligence"
        message="Préparation des métriques temps réel..."
        icon={<Activity className="w-6 h-6" />}
      />
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              <CardTitle>Erreur de Connexion</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={() => refresh()} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Réessayer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  // Use server-side calculated trends (fallback to 0 if not available)
  const trends = data.trends || { revenue: 0, orders: 0, profit: 0, conversion: 0 };


  const quickActions = [
    {
      title: "Nouveau Produit",
      description: "Ajouter un produit au catalogue",
      icon: <Plus className="w-5 h-5" />,
      onClick: () => router.push('/produits?action=nouveau'),
      variant: "primary" as const
    },
    {
      title: "Analyser Ventes",
      description: "Rapport détaillé des performances",
      icon: <TrendingUp className="w-5 h-5" />,
      onClick: () => router.push('/statistiques'),
      badge: "Nouveau"
    },
    {
      title: "Gérer Stock",
      description: "Inventaire et réapprovisionnement",
      icon: <Package className="w-5 h-5" />,
      onClick: () => router.push('/produits?filter=stock'),
      badge: `${criticalCount + highCount}`
    }
  ];

  const chartData = [
    {
      id: 'revenue',
      title: 'Évolution du Chiffre d\'Affaires',
      data: data.performanceJournaliere.map(d => ({ name: d.date, value: d.ventes })),
      type: 'area' as const,
      dataKey: 'value',
      xAxisKey: 'name',
      description: 'Revenus journaliers des 7 derniers jours',
      color: '#0088FE'
    },
    {
      id: 'orders',
      title: 'Commandes par Jour',
      data: data.performanceJournaliere.map(d => ({ name: d.date, value: d.commandes })),
      type: 'bar' as const,
      dataKey: 'value',
      xAxisKey: 'name',
      description: 'Nombre de commandes quotidiennes',
      color: '#00C49F'
    },
    {
      id: 'products',
      title: 'Top Produits',
      // value = nombre d'unités vendues (ventesCount), on inclut le CA (ventesRevenue) dans le payload
      data: data.topProduits.map(p => ({ name: p.nom, value: p.ventesCount, ventesRevenue: p.ventesRevenue })),
      type: 'pie' as const,
      dataKey: 'value',
      xAxisKey: 'name',
      description: 'Répartition des unités vendues par produit',
      color: '#FFBB28'
    }
  ];

  return (
    <div className={cn(
      "space-y-6 transition-all duration-300",
      isFullscreen && "fixed inset-0 z-50 p-6 bg-background overflow-auto"
    )}>
      {/* Header harmonisé */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Dashboard Intelligence
            </h1>
            {isRealtime && (
              <Badge variant="secondary" className="animate-pulse">
                <Activity className="w-3 h-3 mr-1" />
                Temps Réel
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            Vue d'ensemble intelligente de vos performances logistiques
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refresh()}>
            <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
            Actualiser
          </Button>
        </div>
      </div>
      {/* Contenu harmonisé sans vue détaillée/globale */}
      <div className="space-y-6">
        {/* Métriques principales */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Valeur du Stock"
            value={formatCurrency(data.rotationStock?.valeurStockTotal || 0)}
            change={0}
            trend="stable"
            icon={<Package className="w-4 h-4 text-blue-500" />}
            description="Actifs en inventaire"
            className="border-blue-500/20"
          />
          <MetricCard
            title="Produits Vendus"
            value={data.produitsVendus}
            change={trends.orders}
            trend={trends.orders > 0 ? 'up' : trends.orders < 0 ? 'down' : 'stable'}
            icon={<Target className="w-4 h-4 text-orange-500" />}
            description="Unités vendues"
          />
          <MetricCard
            title="Chiffre d'Affaires"
            value={formatCurrency(data.ventesTotales || 0)}
            change={trends.revenue}
            trend={trends.revenue > 0 ? 'up' : trends.revenue < 0 ? 'down' : 'stable'}
            icon={<Activity className="w-4 h-4 text-purple-500" />}
            description="Revenus totaux"
          />
          <MetricCard
            title="Bénéfices Net"
            value={formatCurrency(data.beneficesTotaux || 0)}
            change={trends.profit}
            trend={trends.profit > 0 ? 'up' : trends.profit < 0 ? 'down' : 'stable'}
            icon={<DollarSign className="w-5 h-5 text-white" />}
            description="Marge nette après coûts"
            className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/20 shadow-lg"
          />
        </div>
        {/* Actions rapides */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Actions Rapides</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {quickActions.map((action, index) => (
              <QuickAction key={index} {...action} />
            ))}
          </div>
        </div>
        {/* Graphiques */}
        <ChartGrid charts={chartData} />
        {/* Analytics avancées */}
        <InteractiveChart
          title="Analyse Complète des Performances"
          data={data.performanceJournaliere.map(d => ({
            name: d.date,
            value: d.ventes
          }))}
          type="area"
          dataKey="ventes"
          height={400}
          description="Performance détaillée sur la période sélectionnée"
        />
        {/* Top produits et métriques avancées */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Top Produits Performance</CardTitle>
              <CardDescription>Produits les plus performants</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.topProduits.map((produit, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="space-y-1">
                      <p className="font-medium">{produit.nom}</p>
                      <p className="text-sm text-muted-foreground">
                        {produit.ventesCount} unités • {formatCurrency(produit.ventesRevenue)} CA • {formatCurrency(produit.benefices)} bénéfices
                      </p>
                    </div>
                    <Badge variant={produit.stock < 5 ? "destructive" : "secondary"}>
                      Stock: {produit.stock}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Métriques Avancées</CardTitle>
              <CardDescription>Indicateurs clés de performance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Panier Moyen</span>
                  <span className="text-xl font-bold">{formatCurrency(data.panierMoyen)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Bénéfices Totaux</span>
                  <span className="text-xl font-bold">{formatCurrency(data.beneficesTotaux)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Colis Actifs</span>
                  <span className="text-xl font-bold">{data.nombreColis}</span>
                </div>
                {data.rotationStock && (
                  <>
                    <div className="flex justify-between items-center border-t pt-4 mt-4">
                      <span className="text-sm font-medium">Stock Total</span>
                      <span className="text-xl font-bold">{data.rotationStock.stockTotal}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Valeur Stock</span>
                      <span className="text-xl font-bold">{formatCurrency(data.rotationStock.valeurStockTotal)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Âge Moyen</span>
                      <span className="text-xl font-bold">{data.rotationStock.ageStockMoyen.toFixed(1)}j</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Taux Rotation</span>
                      <span className={cn(
                        "text-xl font-bold",
                        data.rotationStock.tauxRotation > 100 ? "text-green-600" :
                          data.rotationStock.tauxRotation > 50 ? "text-orange-600" : "text-red-600"
                      )}>
                        {data.rotationStock.tauxRotation.toFixed(1)}%
                      </span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance des Parcelles */}
        {data.statsParcelles && data.statsParcelles.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Performance des Parcelles</CardTitle>
              <CardDescription>ROI et bénéfices par parcelle</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.statsParcelles.slice(0, 5).map((parcelle, index) => (
                  <div key={parcelle.parcelleId} className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-muted-foreground">#{index + 1}</span>
                        <div>
                          <p className="font-semibold">{parcelle.numero}</p>
                          <p className="text-sm text-muted-foreground">{parcelle.nom}</p>
                        </div>
                      </div>
                      <div className="flex gap-4 text-sm">
                        <span className="text-muted-foreground">
                          {parcelle.nbVendus}/{parcelle.nbProduits} vendus ({parcelle.tauxVente.toFixed(1)}%)
                        </span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-muted-foreground">
                          Coût: {formatCurrency(parcelle.coutTotal)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">ROI</p>
                        <p className={cn(
                          "text-2xl font-bold",
                          parcelle.ROI > 50 ? "text-green-600" :
                            parcelle.ROI > 20 ? "text-blue-600" :
                              parcelle.ROI > 0 ? "text-orange-600" : "text-red-600"
                        )}>
                          {parcelle.ROI.toFixed(1)}%
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Bénéfices</p>
                        <p className="text-xl font-bold text-green-600">
                          +{formatCurrency(parcelle.benefices)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Alertes */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Alertes</h2>
          <div className="grid gap-4">
            {alerts.map((alert) => (
              <AlertCard
                key={alert.id}
                title={alert.title}
                message={alert.message}
                severity={
                  alert.severity === 'critical' ? 'error' :
                    alert.severity === 'high' ? 'warning' :
                      alert.severity === 'medium' ? 'info' : 'success'
                }
                actionLabel="Voir Détails"
                onAction={() => { }}
              />
            ))}
            {alerts.length === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <Target className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Tout va bien !</h3>
                  <p className="text-muted-foreground">Aucune alerte critique à signaler</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
