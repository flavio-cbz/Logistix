"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  TrendingUp, 
  TrendingDown, 
  Target,
  Brain,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Eye,
  RefreshCw,
  BarChart3,
  Activity,
  Globe,
  Calendar,
  Sparkles,
  Lightbulb,
  Shield,
  ArrowRight,
  Play,
  Pause
} from "lucide-react";
import { InteractiveChart } from "@/components/features/dashboard/interactive-charts";
import { cn } from "@/lib/utils";
import { AppHeader } from "@/components/layout/app-header";

interface MarketTrend {
  id: string;
  category: string;
  product: string;
  trend: 'bullish' | 'bearish' | 'stable';
  changePercent: number;
  volume: number;
  confidence: number;
  prediction: string;
  signals: string[];
  marketCap: number;
  competition: 'low' | 'medium' | 'high';
}

interface MLPrediction {
  timeframe: '24h' | '7d' | '30d' | '90d';
  category: string;
  probability: number;
  expectedGrowth: number;
  riskLevel: 'low' | 'medium' | 'high';
  keyFactors: string[];
  confidence: number;
  recommendation: 'buy' | 'hold' | 'sell' | 'watch';
}

export default function RevolutionaryMarketAnalysisPage() {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'24h' | '7d' | '30d' | '90d'>('7d');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Données de marché simulées avec ML
  const marketTrends: MarketTrend[] = [
    {
      id: "1",
      category: "Électronique",
      product: "Smartphones Premium", 
      trend: "bullish",
      changePercent: 15.7,
      volume: 2.4e6,
      confidence: 87,
      prediction: "Forte croissance attendue Q1 2025",
      signals: ["Innovation 5G", "Nouveaux modèles", "Demande enterprise"],
      marketCap: 45.2e9,
      competition: "high"
    },
    {
      id: "2", 
      category: "Mode",
      product: "Vêtements Durables",
      trend: "bullish",
      changePercent: 22.3,
      volume: 890000,
      confidence: 92,
      prediction: "Tendance écoresponsable en expansion",
      signals: ["Conscience écologique", "Réglementations", "Millennials/GenZ"],
      marketCap: 12.8e9,
      competition: "medium"
    },
    {
      id: "3",
      category: "Tech",
      product: "IA & Automation",
      trend: "bullish", 
      changePercent: 45.1,
      volume: 1.2e6,
      confidence: 95,
      prediction: "Révolution IA en cours - Adoption massive",
      signals: ["ChatGPT boom", "Enterprise adoption", "Investissements VC"],
      marketCap: 78.3e9,
      competition: "high"
    },
    {
      id: "4",
      category: "Santé",
      product: "Télémédecine",
      trend: "stable",
      changePercent: 3.2,
      volume: 567000,
      confidence: 78,
      prediction: "Croissance modérée post-COVID",
      signals: ["Normalisation post-pandémie", "Régulation", "Habitudes acquises"],
      marketCap: 23.1e9,
      competition: "medium"
    },
    {
      id: "5",
      category: "Crypto",
      product: "NFT & Metaverse",
      trend: "bearish",
      changePercent: -18.9,
      volume: 234000,
      confidence: 82,
      prediction: "Correction après hype - Consolidation",
      signals: ["Bulle spéculative", "Régulation", "Réalité virtuelle naissante"],
      marketCap: 8.7e9,
      competition: "high"
    }
  ];

  const mlPredictions: MLPrediction[] = [
    {
      timeframe: "24h",
      category: "Électronique",
      probability: 78,
      expectedGrowth: 2.1,
      riskLevel: "low",
      keyFactors: ["Nouvelles sorties", "Black Friday proche", "Stocks optimaux"],
      confidence: 85,
      recommendation: "buy"
    },
    {
      timeframe: "7d", 
      category: "Mode",
      probability: 85,
      expectedGrowth: 8.4,
      riskLevel: "medium",
      keyFactors: ["Saison hivernale", "Promotions", "Tendances durables"],
      confidence: 91,
      recommendation: "buy"
    },
    {
      timeframe: "30d",
      category: "Tech",
      probability: 92,
      expectedGrowth: 15.7,
      riskLevel: "medium", 
      keyFactors: ["Cycle d'innovation", "Adoption enterprise", "Capital disponible"],
      confidence: 94,
      recommendation: "buy"
    },
    {
      timeframe: "90d",
      category: "Santé",
      probability: 71,
      expectedGrowth: 4.2,
      riskLevel: "low",
      keyFactors: ["Vieillissement population", "Innovations", "Remboursements"],
      confidence: 76,
      recommendation: "hold"
    }
  ];

  // Données pour les graphiques
  const chartData = {
    marketEvolution: [
      { date: "Jan", electronics: 2400, fashion: 1800, tech: 3200, health: 1600 },
      { date: "Feb", electronics: 2600, fashion: 2100, tech: 3800, health: 1700 },
      { date: "Mar", electronics: 2800, fashion: 1950, tech: 4100, health: 1800 },
      { date: "Apr", electronics: 3100, fashion: 2300, tech: 4500, health: 1900 },
      { date: "May", electronics: 2900, fashion: 2600, tech: 5200, health: 2000 },
      { date: "Jun", electronics: 3400, fashion: 2400, tech: 5800, health: 2100 }
    ],
    competitorAnalysis: [
      { name: "Apple", marketShare: 28, growth: 12.5, innovation: 95 },
      { name: "Samsung", marketShare: 22, growth: 8.3, innovation: 87 },
      { name: "Google", marketShare: 18, growth: 15.7, innovation: 92 },
      { name: "Microsoft", marketShare: 15, growth: 11.2, innovation: 89 },
      { name: "Amazon", marketShare: 17, growth: 9.8, innovation: 85 }
    ]
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'bullish': return <TrendingUp className="w-5 h-5 text-emerald-500" />;
      case 'bearish': return <TrendingDown className="w-5 h-5 text-red-500" />;
      default: return <Activity className="w-5 h-5 text-blue-500" />;
    }
  };

  const getRecommendationBadge = (rec: string) => {
    const variants = {
      buy: "bg-emerald-100 text-emerald-700 border-emerald-200",
      hold: "bg-blue-100 text-blue-700 border-blue-200", 
      sell: "bg-red-100 text-red-700 border-red-200",
      watch: "bg-amber-100 text-amber-700 border-amber-200"
    };
    
    const labels = {
      buy: "ACHETER",
      hold: "CONSERVER", 
      sell: "VENDRE",
      watch: "SURVEILLER"
    };

    return (
      <Badge className={cn("font-semibold", variants[rec as keyof typeof variants])}>
        {labels[rec as keyof typeof labels]}
      </Badge>
    );
  };

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'low': return <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">Faible</Badge>;
      case 'medium': return <Badge variant="secondary" className="bg-amber-100 text-amber-700">Modéré</Badge>;  
      case 'high': return <Badge variant="secondary" className="bg-red-100 text-red-700">Élevé</Badge>;
      default: return <Badge variant="outline">-</Badge>;
    }
  };

  const categories = ['all', ...new Set(marketTrends.map(t => t.category))];

  const filteredTrends = useMemo(() => {
    return selectedCategory === 'all' 
      ? marketTrends 
      : marketTrends.filter(t => t.category === selectedCategory);
  }, [selectedCategory]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        // Simuler la mise à jour temps réel
        console.log('Refresh des données marché...');
      }, 5000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [autoRefresh]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="space-y-6 p-6 max-w-screen-xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="typography-display text-foreground">
              Analyse de Marché
            </h1>
            <p className="typography-body text-muted-foreground mt-2">
              Analytics IA • Prédictions ML • Insights temps réel
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={cn(
                "gap-2",
                autoRefresh
                  ? "bg-emerald-50 border-emerald-200"
                  : ""
              )}
            >
              {autoRefresh ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              Temps Réel
            </Button>
          </div>
        </div>

        {/* Status indicators */}
        <div className="flex flex-wrap items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400 mr-1" />
            <span className="text-muted-foreground">Modèle IA v3.2 • Précision <span className="font-bold text-foreground">94%</span></span>
          </div>
          <div className="flex items-center gap-2">
            <Activity className={cn("w-5 h-5 mr-1 transition-colors", autoRefresh ? "text-emerald-500" : "text-gray-400")} />
            <span className="text-muted-foreground">{autoRefresh ? "Mise à jour automatique" : "Mode statique"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-300 mr-1" />
            <span className="text-muted-foreground">Sources multiples • Big Data</span>
          </div>
        </div>

        {/* Contrôles */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <Select value={selectedTimeframe} onValueChange={(value: any) => setSelectedTimeframe(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">24 Heures</SelectItem>
                <SelectItem value="7d">7 Jours</SelectItem>
                <SelectItem value="30d">30 Jours</SelectItem>
                <SelectItem value="90d">90 Jours</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes Catégories</SelectItem>
                {categories.filter(c => c !== 'all').map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
              <Activity className="w-3 h-3 mr-1" />
              {filteredTrends.length} Marchés Analysés
            </Badge>
            <Button variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualiser
            </Button>
          </div>
        </div>

      {/* Contrôles et filtres */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select value={selectedTimeframe} onValueChange={(value: any) => setSelectedTimeframe(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">24 Heures</SelectItem>
              <SelectItem value="7d">7 Jours</SelectItem>
              <SelectItem value="30d">30 Jours</SelectItem>
              <SelectItem value="90d">90 Jours</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes Catégories</SelectItem>
              {categories.filter(c => c !== 'all').map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
            <Activity className="w-3 h-3 mr-1" />
            {filteredTrends.length} Marchés Analysés
          </Badge>
          <Button variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Vue Globale</TabsTrigger>
          <TabsTrigger value="predictions">Prédictions IA</TabsTrigger>
          <TabsTrigger value="trends">Tendances</TabsTrigger>
          <TabsTrigger value="competitors">Concurrence</TabsTrigger>
          <TabsTrigger value="insights">Insights ML</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Métriques IA */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Opportunités Détectées</p>
                    <p className="text-3xl font-bold text-foreground">23</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <TrendingUp className="w-3 h-3 text-emerald-500" />
                      <span>+12 cette semaine</span>
                    </div>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-xl">
                    <Target className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Prédictions Précises</p>
                    <p className="text-3xl font-bold text-foreground">94%</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      <span>Modèle IA optimisé</span>
                    </div>
                  </div>
                  <div className="p-3 bg-emerald-100 rounded-xl">
                    <Brain className="w-6 h-6 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Potentiel de Croissance</p>
                    <p className="text-3xl font-bold text-foreground">+18.7%</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Sparkles className="w-3 h-3 text-blue-500" />
                      <span>Prochains 30 jours</span>
                    </div>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <BarChart3 className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Alertes Risques</p>
                    <p className="text-3xl font-bold text-foreground">3</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <AlertTriangle className="w-3 h-3 text-amber-500" />
                      <span>Surveillance active</span>
                    </div>
                  </div>
                  <div className="p-3 bg-amber-100 rounded-xl">
                    <Shield className="w-6 h-6 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Graphique principal */}
          <InteractiveChart
            title="Évolution du Marché Multi-Catégories"
            data={chartData.marketEvolution as any}
            type="area"
            dataKey="electronics"
            height={400}
            description="Performance comparative des secteurs clés"
          />
        </TabsContent>

        <TabsContent value="predictions" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {mlPredictions.map((prediction, index) => (
              <Card key={index} className="relative overflow-hidden">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{prediction.category}</CardTitle>
                      <CardDescription>Prédiction {prediction.timeframe}</CardDescription>
                    </div>
                    <div className="text-right space-y-1">
                      {getRecommendationBadge(prediction.recommendation)}
                      {getRiskBadge(prediction.riskLevel)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-emerald-600">+{prediction.expectedGrowth}%</p>
                      <p className="text-sm text-muted-foreground">Croissance attendue</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{prediction.probability}%</p>
                      <p className="text-sm text-muted-foreground">Probabilité</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">{prediction.confidence}%</p>
                      <p className="text-sm text-muted-foreground">Confiance IA</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-2">Facteurs Clés :</p>
                    <div className="space-y-1">
                      {prediction.keyFactors.map((factor, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <ArrowRight className="w-3 h-3" />
                          <span>{factor}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="bg-muted/30 rounded-lg p-3">
                    <Progress value={prediction.confidence} className="h-2 mb-2" />
                    <p className="text-xs text-muted-foreground">
                      Modèle basé sur {Math.floor(Math.random() * 50 + 20)} sources de données
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <div className="grid gap-4">
            {filteredTrends.map((trend) => (
              <Card key={trend.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        {getTrendIcon(trend.trend)}
                        <div>
                          <h3 className="font-semibold text-lg">{trend.product}</h3>
                          <p className="text-sm text-muted-foreground">{trend.category}</p>
                        </div>
                        <Badge variant="outline" className="ml-auto">
                          Confiance {trend.confidence}%
                        </Badge>
                      </div>

                      <div className="grid grid-cols-4 gap-6">
                        <div>
                          <p className="text-sm text-muted-foreground">Variation</p>
                          <p className={cn(
                            "text-xl font-bold",
                            trend.changePercent > 0 ? "text-emerald-600" : "text-red-600"
                          )}>
                            {trend.changePercent > 0 ? '+' : ''}{trend.changePercent}%
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Volume</p>
                          <p className="text-xl font-bold">{(trend.volume / 1000).toFixed(0)}K</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Market Cap</p>
                          <p className="text-xl font-bold">{(trend.marketCap / 1e9).toFixed(1)}B€</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Concurrence</p>
                          <Badge variant={
                            trend.competition === 'high' ? 'destructive' :
                            trend.competition === 'medium' ? 'secondary' : 'outline'
                          }>
                            {trend.competition === 'high' ? 'Élevée' :
                             trend.competition === 'medium' ? 'Modérée' : 'Faible'}
                          </Badge>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="font-medium text-sm">Prédiction IA :</p>
                        <p className="text-sm text-muted-foreground">{trend.prediction}</p>
                      </div>

                      <div className="space-y-2">
                        <p className="font-medium text-sm">Signaux Détectés :</p>
                        <div className="flex flex-wrap gap-2">
                          {trend.signals.map((signal, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {signal}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="competitors" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Analyse Concurrentielle Intelligence</CardTitle>
              <CardDescription>Positionnement marché et opportunités</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {chartData.competitorAnalysis.map((competitor, index) => (
                  <div key={index} className="grid grid-cols-4 items-center gap-4 p-4 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="font-semibold text-sm">{competitor.name.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="font-semibold">{competitor.name}</p>
                        <p className="text-sm text-muted-foreground">Tech Giant</p>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>Part de marché</span>
                        <span className="font-semibold">{competitor.marketShare}%</span>
                      </div>
                      <Progress value={competitor.marketShare} className="h-2" />
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>Croissance</span>
                        <span className="font-semibold text-emerald-600">+{competitor.growth}%</span>
                      </div>
                      <Progress value={competitor.growth * 5} className="h-2" />
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>Innovation</span>
                        <span className="font-semibold">{competitor.innovation}/100</span>
                      </div>
                      <Progress value={competitor.innovation} className="h-2" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-blue-500" />
                  <CardTitle className="text-lg">Insights IA - Opportunités</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                    <p className="font-medium text-emerald-800">Tech IA en expansion</p>
                    <p className="text-sm text-emerald-600">
                      L'adoption de l'IA générative montre une croissance de 45% - 
                      opportunité d'investissement majeure détectée.
                    </p>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                    <p className="font-medium text-blue-800">Mode durable émergente</p>
                    <p className="text-sm text-blue-600">
                      Le marché de la mode écoresponsable croît 3x plus vite que 
                      la mode traditionnelle - niche à exploiter.
                    </p>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
                    <p className="font-medium text-purple-800">Smartphones premium</p>
                    <p className="text-sm text-purple-600">
                      Cycle de renouvellement accéléré détecté - demande en hausse 
                      pour Q4 2024.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  <CardTitle className="text-lg">Alertes & Risques</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                    <p className="font-medium text-red-800">Bulle NFT/Crypto</p>
                    <p className="text-sm text-red-600">
                      Signaux de correction majeure détectés - réduction d'exposition 
                      recommandée sur ce segment.
                    </p>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                    <p className="font-medium text-amber-800">Saturation télémédecine</p>
                    <p className="text-sm text-amber-600">
                      Croissance post-COVID se normalise - prudence sur les 
                      nouveaux investissements secteur.
                    </p>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-orange-50 border border-orange-200">
                    <p className="font-medium text-orange-800">Inflation matières premières</p>
                    <p className="text-sm text-orange-600">
                      Impact sur marges détecté - ajustement pricing requis 
                      pour maintenir profitabilité.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recommendations IA */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Zap className="w-6 h-6 text-primary" />
                <CardTitle className="text-lg">Recommandations IA Personnalisées</CardTitle>
              </div>
              <CardDescription>
                Actions suggérées basées sur votre profil et les tendances détectées
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-5 h-5 text-emerald-600" />
                    <span className="font-semibold text-emerald-800">Action Immédiate</span>
                  </div>
                  <p className="text-sm text-emerald-700">
                    Augmenter stock produits IA/automation avant Q4. 
                    Prédiction: +25% demande dans 30 jours.
                  </p>
                </div>
                
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold text-blue-800">Moyen Terme</span>
                  </div>
                  <p className="text-sm text-blue-700">
                    Explorer partenariats mode durable. Marché émergent 
                    avec potentiel 3x croissance standard.
                  </p>
                </div>
                
                <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="w-5 h-5 text-purple-600" />
                    <span className="font-semibold text-purple-800">Veille Stratégique</span>
                  </div>
                  <p className="text-sm text-purple-700">
                    Surveiller évolution réglementation crypto/NFT. 
                    Impact potentiel sur valorisations à court terme.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}
