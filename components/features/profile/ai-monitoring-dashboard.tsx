"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Clock,
  CheckCircle,
} from "lucide-react";

interface AIMetricsSummary {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageProcessingTime: number;
  totalTokensUsed: number;
  totalCost: number;
  averageConfidence: number;
  cacheHitRate: number;
  errorsByType: Record<string, number>;
  requestsByType: Record<string, number>;
  costByProvider: Record<string, number>;
}

interface CostAlert {
  type: "warning" | "critical";
  message: string;
  currentCost: number;
  budgetLimit: number;
  percentage: number;
}

interface PerformanceAlert {
  type: "warning" | "critical";
  message: string;
  metric: string;
  value: number;
  threshold: number;
}

export function AIMonitoringDashboard() {
  const [metrics, setMetrics] = useState<AIMetricsSummary | null>(null);
  const [costAlerts, setCostAlerts] = useState<CostAlert[]>([]);
  const [performanceAlerts, setPerformanceAlerts] = useState<
    PerformanceAlert[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [timeframe, setTimeframe] = useState<"hour" | "day" | "week" | "month">(
    "day",
  );

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [timeframe]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/ai/metrics?timeframe=${timeframe}`);
      if (!response.ok) {
        throw new Error("Failed to fetch AI metrics");
      }
      const data = await response.json();
      setMetrics(data.metrics);
      setCostAlerts(data.costAlerts || []);
      setPerformanceAlerts(data.performanceAlerts || []);
      setError("");
    } catch (err: any) {
      setError(err.message || "Failed to load AI metrics");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(amount);
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const handleClearCache = async () => {
    setNotification(null);
    try {
      const response = await fetch("/api/v1/ai/metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear_cache" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to clear cache");
      setNotification({ type: "success", message: "Cache vidé avec succès!" });
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Erreur lors du vidage du cache",
      });
    }
  };

  const handleExportMetrics = async () => {
    setNotification(null);
    try {
      const response = await fetch("/api/v1/ai/metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "export_metrics" }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Failed to export metrics");

      const blob = new Blob([JSON.stringify(data._data, null, 2)], {
        type: "application/json",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = data.filename || "ai-metrics.json";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setNotification({
        type: "success",
        message: "Exportation des métriques réussie!",
      });
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Erreur lors de l'exportation",
      });
    }
  };

  const getSuccessRate = () => {
    if (!metrics || metrics.totalRequests === 0) return 0;
    return (metrics.successfulRequests / metrics.totalRequests) * 100;
  };

  const prepareErrorChartData = () => {
    if (!metrics?.errorsByType) return [];
    return Object.entries(metrics.errorsByType).map(([type, count]) => ({
      name: type,
      value: count,
    }));
  };

  const prepareRequestTypeChartData = () => {
    if (!metrics?.requestsByType) return [];
    return Object.entries(metrics.requestsByType).map(([type, count]) => ({
      name: type,
      value: count,
    }));
  };

  const prepareCostByProviderData = () => {
    if (!metrics?.costByProvider) return [];
    return Object.entries(metrics.costByProvider).map(([provider, cost]) => ({
      name: provider,
      cost: cost,
    }));
  };

  // Use chart tokens so colors follow the global theme (chart-1..chart-5 defined in design tokens)
  const COLORS = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
  ];

  if (loading && !metrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Monitoring IA</CardTitle>
          <CardDescription>Chargement des métriques...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--border))]"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Monitoring IA</CardTitle>
          <CardDescription>
            Erreur lors du chargement des métriques
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={fetchMetrics} className="mt-4">
            Réessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Monitoring IA
          </CardTitle>
          <CardDescription>
            Surveillance des performances et coûts de l'intelligence
            artificielle
          </CardDescription>
          <div className="flex gap-2">
            {(["hour", "day", "week", "month"] as const).map((tf) => (
              <Button
                key={tf}
                variant={timeframe === tf ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeframe(tf)}
              >
                {tf === "hour"
                  ? "1h"
                  : tf === "day"
                    ? "24h"
                    : tf === "week"
                      ? "7j"
                      : "30j"}
              </Button>
            ))}
          </div>
        </CardHeader>
      </Card>

      {notification && (
        <Alert
          variant={notification.type === "success" ? "default" : "destructive"}
        >
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            {notification.type === "success" ? "Succès" : "Erreur"}
          </AlertTitle>
          <AlertDescription>{notification.message}</AlertDescription>
        </Alert>
      )}

      {/* Alerts */}
      {(costAlerts.length > 0 || performanceAlerts.length > 0) && (
        <div className="space-y-4">
          {costAlerts.map((alert, index) => (
            <Alert
              key={`cost-${index}`}
              variant={alert.type === "critical" ? "destructive" : "default"}
            >
              <DollarSign className="h-4 w-4" />
              <AlertTitle>Alerte de coût</AlertTitle>
              <AlertDescription>
                {alert.message} ({alert.percentage.toFixed(1)}% du budget
                utilisé)
              </AlertDescription>
            </Alert>
          ))}
          {performanceAlerts.map((alert, index) => (
            <Alert
              key={`perf-${index}`}
              variant={alert.type === "critical" ? "destructive" : "default"}
            >
              <Clock className="h-4 w-4" />
              <AlertTitle>Alerte de performance</AlertTitle>
              <AlertDescription>
                {alert.message} ({alert.metric}: {alert.value} {">"}{" "}
                {alert.threshold})
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Requêtes totales
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.totalRequests || 0}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Badge
                variant={getSuccessRate() > 95 ? "default" : "destructive"}
              >
                {getSuccessRate().toFixed(1)}% succès
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Coût total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(metrics?.totalCost || 0)}
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              {metrics?.totalTokensUsed?.toLocaleString() || 0} tokens utilisés
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Temps de traitement
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(metrics?.averageProcessingTime || 0)}
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              Temps moyen de réponse
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((metrics?.cacheHitRate || 0) * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              Taux de succès du cache
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Charts */}
      <Tabs defaultValue="requests" className="space-y-4">
        <TabsList>
          <TabsTrigger value="requests">Types de requêtes</TabsTrigger>
          <TabsTrigger value="errors">Erreurs</TabsTrigger>
          <TabsTrigger value="costs">Coûts par fournisseur</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Répartition des types de requêtes</CardTitle>
              <CardDescription>
                Distribution des requêtes par type d'analyse IA
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={prepareRequestTypeChartData()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="hsl(var(--chart-1))"
                    dataKey="value"
                  >
                    {prepareRequestTypeChartData().map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Répartition des erreurs</CardTitle>
              <CardDescription>
                Types d'erreurs rencontrées dans les requêtes IA
              </CardDescription>
            </CardHeader>
            <CardContent>
              {prepareErrorChartData().length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={prepareErrorChartData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="hsl(var(--chart-4))" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  <div className="text-center">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                    <p>Aucune erreur détectée</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="costs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Coûts par fournisseur</CardTitle>
              <CardDescription>
                Répartition des coûts par fournisseur d'IA
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={prepareCostByProviderData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip
                    formatter={(value) => [
                      formatCurrency(value as number),
                      "Coût",
                    ]}
                  />
                  <Bar dataKey="cost" fill="hsl(var(--chart-2))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quality Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Métriques de qualité</CardTitle>
          <CardDescription>
            Indicateurs de qualité des analyses IA
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Confiance moyenne</span>
                <span>
                  {((metrics?.averageConfidence || 0) * 100).toFixed(1)}%
                </span>
              </div>
              <Progress
                value={(metrics?.averageConfidence || 0) * 100}
                className="h-2"
              />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Taux de succès</span>
                <span>{getSuccessRate().toFixed(1)}%</span>
              </div>
              <Progress value={getSuccessRate()} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Efficacité du cache</span>
                <span>{((metrics?.cacheHitRate || 0) * 100).toFixed(1)}%</span>
              </div>
              <Progress
                value={(metrics?.cacheHitRate || 0) * 100}
                className="h-2"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions de maintenance</CardTitle>
          <CardDescription>
            Outils de gestion et d'optimisation du système IA
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button variant="outline" onClick={fetchMetrics} disabled={loading}>
              {loading ? "Actualisation..." : "Actualiser les métriques"}
            </Button>
            <Button variant="outline" onClick={handleClearCache}>
              Vider le cache
            </Button>
            <Button variant="outline" onClick={handleExportMetrics}>
              Exporter les métriques
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
