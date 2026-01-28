"use client";

import { useQuery } from "@tanstack/react-query";
import {
    Clock,
    AlertTriangle,
    AlertCircle,
    TrendingDown,
    Zap,
    ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/utils/api-fetch";
import { useFormatting } from "@/lib/hooks/use-formatting";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface PredictionData {
    summary: {
        total: number;
        critical: number;
        high: number;
        medium: number;
        estimatedStuckValue: number;
    };
    atRiskProducts: Array<{
        productId: string;
        productName: string;
        brand: string | null;
        category: string | null;
        daysInStock: number;
        estimatedDaysToSell: number | null;
        riskLevel: "low" | "medium" | "high" | "critical";
        suggestedAction: string;
    }>;
    categoryVelocity: Array<{
        category: string;
        avgDaysToSell: number;
        salesCount: number;
    }>;
}

function usePredictions() {
    return useQuery<PredictionData>({
        queryKey: ["predictions"],
        queryFn: async () => {
            const response = await apiFetch<{ success: boolean; data: PredictionData }>(
                "/api/v1/dashboard/predictions"
            );
            return response.data;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

function getRiskIcon(riskLevel: string) {
    switch (riskLevel) {
        case "critical":
            return AlertCircle;
        case "high":
            return AlertTriangle;
        case "medium":
            return Clock;
        default:
            return Clock;
    }
}

function getRiskColor(riskLevel: string) {
    switch (riskLevel) {
        case "critical":
            return "text-red-500 bg-red-100 dark:bg-red-900/30";
        case "high":
            return "text-orange-500 bg-orange-100 dark:bg-orange-900/30";
        case "medium":
            return "text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30";
        default:
            return "text-gray-500 bg-gray-100 dark:bg-gray-900/30";
    }
}

/**
 * Compact alert widget for the main dashboard
 */
export function SlowMovingAlert() {
    const { data, isLoading, error } = usePredictions();
    const { formatCurrency } = useFormatting();

    if (isLoading) {
        return <Skeleton className="h-24 w-full" />;
    }

    if (error || !data) return null;

    const { summary } = data;
    const totalAtRisk = summary.critical + summary.high + summary.medium;

    if (totalAtRisk === 0) {
        return (
            <Card className="border-green-200 dark:border-green-900">
                <CardContent className="pt-4 flex items-center gap-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                        <Zap className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                        <p className="font-medium text-green-600">Stock en bonne santé !</p>
                        <p className="text-sm text-muted-foreground">
                            Tous vos produits se vendent normalement
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={cn("border-orange-200 dark:border-orange-900")}>
            <CardContent className="pt-4">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                            <TrendingDown className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                            <p className="font-medium">
                                {totalAtRisk} produit{totalAtRisk > 1 ? "s" : ""} à surveiller
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                                {summary.critical > 0 && (
                                    <Badge variant="destructive" className="text-xs">
                                        {summary.critical} critique{summary.critical > 1 ? "s" : ""}
                                    </Badge>
                                )}
                                {summary.high > 0 && (
                                    <Badge className="text-xs bg-orange-500">
                                        {summary.high} urgent{summary.high > 1 ? "s" : ""}
                                    </Badge>
                                )}
                                {summary.medium > 0 && (
                                    <Badge variant="secondary" className="text-xs">
                                        {summary.medium} en attente
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-muted-foreground">Valeur à risque</p>
                        <p className="font-bold text-orange-600">
                            {formatCurrency(summary.estimatedStuckValue)}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

/**
 * Full predictions panel for detailed view
 */
export function PredictionsPanel() {
    const { data, isLoading, error } = usePredictions();
    const { formatCurrency } = useFormatting();

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-32" />
                <Skeleton className="h-64" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                    <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
                    <h3 className="text-lg font-medium">Erreur de chargement</h3>
                    <p className="text-muted-foreground">Impossible de charger les prédictions</p>
                </CardContent>
            </Card>
        );
    }

    const { summary, atRiskProducts, categoryVelocity } = data;

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-4">
                        <p className="text-sm text-muted-foreground">Stock total</p>
                        <p className="text-2xl font-bold">{summary.total}</p>
                        <p className="text-xs text-muted-foreground">produits en vente</p>
                    </CardContent>
                </Card>
                <Card className={summary.critical > 0 ? "border-red-200 dark:border-red-900" : ""}>
                    <CardContent className="pt-4">
                        <p className="text-sm text-muted-foreground">Critiques</p>
                        <p className="text-2xl font-bold text-red-500">{summary.critical}</p>
                        <p className="text-xs text-muted-foreground">action urgente</p>
                    </CardContent>
                </Card>
                <Card className={summary.high > 0 ? "border-orange-200 dark:border-orange-900" : ""}>
                    <CardContent className="pt-4">
                        <p className="text-sm text-muted-foreground">Urgents</p>
                        <p className="text-2xl font-bold text-orange-500">{summary.high}</p>
                        <p className="text-xs text-muted-foreground">à optimiser</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4">
                        <p className="text-sm text-muted-foreground">Valeur à risque</p>
                        <p className="text-2xl font-bold">{formatCurrency(summary.estimatedStuckValue)}</p>
                        <p className="text-xs text-muted-foreground">capital immobilisé</p>
                    </CardContent>
                </Card>
            </div>

            {/* Category Velocity */}
            {categoryVelocity.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Vitesse de vente par catégorie</CardTitle>
                        <CardDescription>Temps moyen pour vendre un produit</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {categoryVelocity.slice(0, 5).map((cat) => (
                                <div key={cat.category} className="flex items-center justify-between py-2 border-b last:border-0">
                                    <span className="font-medium">{cat.category}</span>
                                    <div className="flex items-center gap-4">
                                        <span className="text-sm text-muted-foreground">
                                            {cat.salesCount} ventes
                                        </span>
                                        <Badge variant={cat.avgDaysToSell <= 14 ? "default" : cat.avgDaysToSell <= 30 ? "secondary" : "outline"}>
                                            ~{Math.round(cat.avgDaysToSell)} jours
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* At-Risk Products */}
            {atRiskProducts.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-orange-500" />
                            Produits à surveiller
                        </CardTitle>
                        <CardDescription>
                            Ces produits mettent plus de temps que la moyenne à se vendre
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {atRiskProducts.slice(0, 10).map((product) => {
                                const Icon = getRiskIcon(product.riskLevel);
                                const colorClass = getRiskColor(product.riskLevel);

                                return (
                                    <div
                                        key={product.productId}
                                        className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                                    >
                                        <div className={cn("p-2 rounded-lg shrink-0", colorClass)}>
                                            <Icon className="h-4 w-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium truncate">{product.productName}</p>
                                                <Badge variant="outline" className="text-xs shrink-0">
                                                    {product.daysInStock}j
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {product.brand || "Sans marque"} · {product.category || "Non catégorisé"}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                💡 {product.suggestedAction}
                                            </p>
                                        </div>
                                        <Link href={`/produits?id=${product.productId}`}>
                                            <Button variant="ghost" size="icon" className="shrink-0">
                                                <ArrowRight className="h-4 w-4" />
                                            </Button>
                                        </Link>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

            {atRiskProducts.length === 0 && (
                <Card className="border-green-200 dark:border-green-900">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Zap className="h-12 w-12 text-green-500 mb-4" />
                        <h3 className="text-lg font-medium text-green-600">Excellent !</h3>
                        <p className="text-muted-foreground text-center">
                            Tous vos produits se vendent à un rythme normal.
                            <br />
                            Continuez comme ça !
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
