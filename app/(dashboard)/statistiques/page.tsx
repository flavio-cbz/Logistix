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
<<<<<<< HEAD
=======
import { cn } from "@/lib/utils";
>>>>>>> ad32518644f2ab77a7c59429e3df905bfcc3ef94
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
<<<<<<< HEAD
      refetchInterval: 60000,
    }
  );

  // Loading state
=======
      refetchInterval: 60000, // Refresh toutes les 60s (réduit pour performance)
    }
  );

  // Helper functions
  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <ArrowUpRight className="w-4 h-4 text-emerald-500" />;
    if (trend === 'down') return <ArrowDownRight className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-blue-500" />;
  };

  const getTrendColor = (trend: string) => {
    if (trend === 'up') return 'text-emerald-600';
    if (trend === 'down') return 'text-red-600';
    return 'text-blue-600';
  };

  const getChangeText = (change: number, trend: string) => {
    const sign = trend === 'down' ? '-' : '+';
    return `${sign}${change}%`;
  };

  // Fonction helper pour calculer tendance dynamique (simulation basée sur période)
  const calculateTrend = (currentValue: number, period: string) => {
    // Utilise currentValue pour réduire l'amplitude aléatoire sur de grandes valeurs
    const magnitude = Math.max(1, Math.log10(Math.abs(currentValue) + 1));
    const baseChange = period === '7d' ? 5 : period === '30d' ? 2 : 0;
    const raw = Math.random() * baseChange * (Math.random() > 0.5 ? 1 : -1);
    const change = raw / magnitude; // plus la valeur est grande, moins la variation simulée est importante
    const trend = change > 2 ? 'up' : change < -2 ? 'down' : 'stable';
    return { change: Math.abs(change), trend: trend as 'up' | 'down' | 'stable' };
  };

  // Loading state — n'affiche pas d'erreur pendant le chargement initial
>>>>>>> ad32518644f2ab77a7c59429e3df905bfcc3ef94
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

<<<<<<< HEAD
  if (isError) {
=======
  if ((isError)) {
>>>>>>> ad32518644f2ab77a7c59429e3df905bfcc3ef94
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

<<<<<<< HEAD
=======
  // Sécurité : si `data` est null (ex: requête annulée mais isLoading=false), afficher un état de reconnexion
>>>>>>> ad32518644f2ab77a7c59429e3df905bfcc3ef94
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

<<<<<<< HEAD
  const d = data;
=======
  // `d` est une alias non-nul de `data` (après la vérification ci-dessus)
  const d = data!;

  const metrics: StatMetric[] = [
    {
      id: 'revenue',
      title: 'Chiffre d\'Affaires',
      value: `${d.vueEnsemble.chiffreAffaires.toLocaleString('fr-FR')}€`,
      ...calculateTrend(d.vueEnsemble.chiffreAffaires, selectedPeriod),
      period: selectedPeriod,
      target: d.vueEnsemble.chiffreAffaires * 1.1, // Objectif : +10% du CA actuel
      description: 'Revenus totaux générés'
    },
    {
      id: 'products',
      title: 'Produits Vendus',
      value: d.vueEnsemble.produitsVendus,
      ...calculateTrend(d.vueEnsemble.produitsVendus, selectedPeriod),
      period: selectedPeriod,
      target: d.vueEnsemble.totalProduits * 0.8, // Objectif : 80% des produits vendus
      description: `${d.vueEnsemble.produitsVendus} sur ${d.vueEnsemble.totalProduits} produits`
    },
    {
      id: 'margin',
      title: 'Marge Moyenne',
      value: `${d.vueEnsemble.margeMoyenne.toFixed(1)}%`,
      ...calculateTrend(d.vueEnsemble.margeMoyenne, selectedPeriod),
      period: selectedPeriod,
      target: 35, // Objectif fixe : 35%
      description: 'Marge bénéficiaire moyenne'
    },
    {
      id: 'conversion',
      title: 'Taux de Vente',
      value: `${d.vueEnsemble.tauxVente.toFixed(1)}%`,
      ...calculateTrend(d.vueEnsemble.tauxVente, selectedPeriod),
      period: selectedPeriod,
      target: 60, // Objectif fixe : 60%
      description: 'Produits vendus / Total produits'
    },
    {
      id: 'avgprice',
      title: 'Prix Moyen Vente',
      value: `${d.vueEnsemble.prixMoyenVente.toFixed(2)}€`,
      ...calculateTrend(d.vueEnsemble.prixMoyenVente, selectedPeriod),
      period: selectedPeriod,
      // Pas de target pour cette métrique (supprimer la barre)
      description: 'Prix de vente moyen'
    },
    {
      id: 'benefits',
      title: 'Bénéfices Totaux',
      value: `${d.vueEnsemble.beneficesTotal.toLocaleString('fr-FR')}€`,
      ...calculateTrend(d.vueEnsemble.beneficesTotal, selectedPeriod),
      period: selectedPeriod,
      target: d.vueEnsemble.beneficesTotal > 0 ? d.vueEnsemble.beneficesTotal * 1.2 : 1000, // Objectif : +20% ou seuil minimum
      description: 'Bénéfices nets'
    }
  ];
>>>>>>> ad32518644f2ab77a7c59429e3df905bfcc3ef94

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
<<<<<<< HEAD
              ROI moyen: {d.performanceParcelle.length > 0
                ? (d.performanceParcelle.reduce((sum, p) => sum + p.ROI, 0) / d.performanceParcelle.length).toFixed(1)
                : 0}%
=======
              ROI moyen: {d.performanceParcelle.length > 0 
                ? (d.performanceParcelle.reduce((sum, p) => sum + p.ROI, 0) / d.performanceParcelle.length).toFixed(1)
                : 0}%  {/* Vérification ajoutée pour éviter division par zéro */}
>>>>>>> ad32518644f2ab77a7c59429e3df905bfcc3ef94
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
<<<<<<< HEAD
            <OverviewTab data={d} selectedPeriod={selectedPeriod} />
          </TabsContent>

          <TabsContent value="parcelles" className="space-y-6">
            <ParcellesTab data={d} />
          </TabsContent>

          <TabsContent value="produits" className="space-y-6">
            <ProduitsTab data={d} />
=======
            {/* Métriques principales */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {metrics.map((metric) => (
                <Card key={metric.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">{metric.title}</p>
                        <p className="text-3xl font-bold">{metric.value}</p>
                        <div className="flex items-center gap-2">
                          {getTrendIcon(metric.trend)}
                          <span className={cn("text-sm font-medium", getTrendColor(metric.trend))}>
                            {getChangeText(metric.change, metric.trend)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right space-y-2">
                        {metric.target !== undefined && metric.target > 0 && (
                          <>
                            <div className="text-xs text-muted-foreground">Objectif</div>
                            <div className="space-y-1">
                              <Progress value={Math.min((metric.value as number / metric.target) * 100, 100)} className="h-2 w-16" />  {/* Calcul relatif pour éviter coupure */}
                              <span className="text-xs font-medium">{((metric.value as number / metric.target) * 100).toFixed(0)}%</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-xs text-muted-foreground">{metric.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Performance par Plateforme */}
            <Card>
              <CardHeader>
                <CardTitle>Performance par Plateforme</CardTitle>
                <CardDescription>Ventes et bénéfices par plateforme</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {d.performancePlateforme.map((plateforme, index) => (
                    <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold">{plateforme.plateforme}</span>
                          <span className="text-sm text-muted-foreground">
                            {plateforme.nbVentes} ventes ({plateforme.partMarche.toFixed(1)}% du marché)
                          </span>
                        </div>
                        <Progress value={plateforme.partMarche} className="h-2" />
                        <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                          <span>CA: {plateforme.chiffreAffaires.toLocaleString()}€</span>
                          <span>Bénéfices: {plateforme.benefices.toLocaleString()}€</span>
                          <span>Prix moyen: {plateforme.prixMoyenVente ? plateforme.prixMoyenVente.toFixed(2) : '0'}€</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Analyse des Coûts */}
            <div className="grid gap-6 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Coût Achat Total</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{d.analyseCouts.coutAchatTotal.toLocaleString()}€</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Moyen: {d.analyseCouts.coutMoyenParProduit.toFixed(2)}€/produit
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Coût Livraison Total</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{d.analyseCouts.coutLivraisonTotal.toLocaleString()}€</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Moyen: {d.analyseCouts.coutMoyenLivraison.toFixed(2)}€/produit
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Investissement Total</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{d.analyseCouts.coutTotalInvesti.toLocaleString()}€</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {d.analyseCouts.nbParcelles} parcelle(s)
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="parcelles" className="space-y-6">
            {/* Performance des Parcelles */}
            <Card>
              <CardHeader>
                <CardTitle>Performance des Parcelles</CardTitle>
                <CardDescription>ROI, ventes et bénéfices par parcelle</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {d.performanceParcelle.map((parcelle, index) => (
                    <div key={parcelle.parcelleId} className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-muted-foreground">#{index + 1}</span>
                          <div>
                            <p className="font-semibold">{parcelle.parcelleNumero}</p>
                            <p className="text-sm text-muted-foreground">{parcelle.parcelleNom}</p>
                          </div>
                        </div>
                        <div className="flex gap-4 text-sm">
                          <span className="text-muted-foreground">
                            {parcelle.nbProduitsVendus}/{parcelle.nbProduitsTotal} vendus ({parcelle.tauxVente.toFixed(1)}%)
                          </span>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-muted-foreground">
                            Coût: {parcelle.coutTotal.toLocaleString()}€
                          </span>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-muted-foreground">
                            Poids: {parcelle.poidsTotal.toLocaleString()}g
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
                            +{parcelle.beneficesTotal.toLocaleString()}€
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {d.performanceParcelle.length === 0 && (
                    <div className="text-center py-12">
                      <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Aucune parcelle avec des produits</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Délais de Vente */}
            {d.delaisVente.nbProduitsAvecDelai && d.delaisVente.nbProduitsAvecDelai > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Délais de Vente</CardTitle>
                  <CardDescription>Statistiques sur le temps de vente</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="text-center p-4 rounded-lg bg-muted/30">
                      <p className="text-sm text-muted-foreground mb-1">Délai Moyen</p>
                      <p className="text-2xl font-bold">{d.delaisVente.delaiMoyen.toFixed(1)}j</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-muted/30">
                      <p className="text-sm text-muted-foreground mb-1">Délai Médian</p>
                      <p className="text-2xl font-bold">{d.delaisVente.delaiMedian.toFixed(1)}j</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-muted/30">
                      <p className="text-sm text-muted-foreground mb-1">Plus Rapide</p>
                      <p className="text-2xl font-bold text-green-600">{d.delaisVente.delaiMin}j</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-muted/30">
                      <p className="text-sm text-muted-foreground mb-1">Plus Long</p>
                      <p className="text-2xl font-bold text-red-600">{d.delaisVente.delaiMax}j</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="produits" className="space-y-6">
            {/* Top Produits */}
            <Card>
              <CardHeader>
                <CardTitle>Top 10 Produits</CardTitle>
                <CardDescription>Meilleurs performers par bénéfice</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {d.topProduits.map((produit, index) => (
                    <div key={produit.id} className="flex items-center justify-between p-3 rounded-lg bg-emerald-50/50 border border-emerald-100">
                      <div className="flex items-center gap-3 flex-1">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-600 text-white text-sm font-bold">
                          {index + 1}
                        </span>
                        <div className="flex-1">
                          <p className="font-medium">{produit.nom}</p>
                          <p className="text-xs text-muted-foreground">
                            {produit.plateforme} • Vendu le {produit.dateVente ? new Date(produit.dateVente).toLocaleDateString('fr-FR') : 'Date inconnue'}  {/* Vérification nulle ajoutée */}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-6 text-right">
                        <div>
                          <p className="text-xs text-muted-foreground">Achat</p>
                          <p className="text-sm font-medium">{produit.prixAchat}€</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Vente</p>
                          <p className="text-sm font-medium">{produit.prixVente}€</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Bénéfice</p>
                          <p className="text-lg font-bold text-emerald-600">+{produit.benefice.toFixed(2)}€</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Marge</p>
                          <p className="text-sm font-semibold">{produit.margePercent.toFixed(1)}%</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {d.topProduits.length === 0 && (
                    <div className="text-center py-12">
                      <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Aucun produit vendu</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Produits Non Vendus */}
            {d.produitsNonVendus.length > 0 && (
              <Card>
                  <CardHeader>
                  <CardTitle>Produits Non Vendus ({d.produitsNonVendus.length})</CardTitle>
                  <CardDescription>Stock actuel à écouler</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {d.produitsNonVendus.map((produit) => (
                      <div key={produit.id} className="flex items-center justify-between p-3 rounded-lg bg-orange-50/50 border border-orange-100">
                        <div className="flex-1">
                          <p className="font-medium">{produit.nom}</p>
                          <p className="text-xs text-muted-foreground">
                            Parcelle: {produit.parcelleNumero} • Coût total: {((produit.prixAchat || 0) + (produit.coutLivraison || 0)).toFixed(2)}€  {/* Vérifications nulles ajoutées */}
                          </p>
                        </div>
                        <div className="flex gap-4 text-right">
                          {produit.joursEnLigne !== null && produit.joursEnLigne > 0 ? (
                            <Badge variant="outline" className="bg-orange-100">
                              {produit.joursEnLigne}j en ligne
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Brouillon</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
>>>>>>> ad32518644f2ab77a7c59429e3df905bfcc3ef94
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
