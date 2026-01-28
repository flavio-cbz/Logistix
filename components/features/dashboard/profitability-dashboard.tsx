"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    Percent,
    ShoppingBag,
    Award,
    AlertTriangle,
    BarChart3,
    PieChart,
    Star,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { apiFetch } from "@/lib/utils/api-fetch";
import { useFormatting } from "@/lib/hooks/use-formatting";
import { cn } from "@/lib/utils";

// Types for profitability data
interface ProfitabilityData {
    summary: {
        totalRevenue: number;
        totalCosts: number;
        totalProfit: number;
        averageMargin: number;
        totalSales: number;
        profitableSales: number;
        lossingSales: number;
        bestMonth: { month: string; profit: number } | null;
        bestCategory: { category: string; profit: number } | null;
        bestBrand: { brand: string; profit: number } | null;
    };
    byMonth: Array<{
        month: string;
        revenue: number;
        costs: number;
        profit: number;
        margin: number;
        salesCount: number;
    }>;
    byCategory: Array<{
        category: string;
        revenue: number;
        profit: number;
        margin: number;
        salesCount: number;
    }>;
    byBrand: Array<{
        brand: string;
        revenue: number;
        profit: number;
        margin: number;
        salesCount: number;
    }>;
    topProducts: Array<{
        id: string;
        name: string;
        brand: string | null;
        category: string | null;
        purchasePrice: number;
        shippingCost: number;
        sellingPrice: number;
        profit: number;
        margin: number;
    }>;
    lossProducts: Array<{
        id: string;
        name: string;
        brand: string | null;
        purchasePrice: number;
        shippingCost: number;
        sellingPrice: number;
        loss: number;
    }>;
}

function useProfitabilityData() {
    return useQuery<ProfitabilityData>({
        queryKey: ["profitability"],
        queryFn: async () => {
            const response = await apiFetch<{ success: boolean; data: ProfitabilityData }>(
                "/api/v1/dashboard/profitability"
            );
            return response.data;
        },
        staleTime: 2 * 60 * 1000, // 2 minutes
    });
}

function StatCard({
    icon: Icon,
    title,
    value,
    subtitle,
    colorClass = "text-primary",
    trend,
}: {
    icon: React.ElementType;
    title: string;
    value: string;
    subtitle?: string;
    colorClass?: string;
    trend?: { value: number; label: string };
}) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                <Icon className={cn("h-4 w-4", colorClass)} />
            </CardHeader>
            <CardContent>
                <div className={cn("text-2xl font-bold", colorClass)}>{value}</div>
                {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
                {trend && (
                    <div className="flex items-center gap-1 mt-1">
                        {trend.value >= 0 ? (
                            <TrendingUp className="h-3 w-3 text-green-500" />
                        ) : (
                            <TrendingDown className="h-3 w-3 text-red-500" />
                        )}
                        <span className={cn("text-xs", trend.value >= 0 ? "text-green-500" : "text-red-500")}>
                            {trend.value >= 0 ? "+" : ""}{trend.value}%
                        </span>
                        <span className="text-xs text-muted-foreground">{trend.label}</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function formatMonth(monthStr: string): string {
    const [year, month] = monthStr.split("-");
    const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
    const monthIndex = month ? parseInt(month, 10) - 1 : 0;
    return `${months[monthIndex] ?? "?"} ${year ?? ""}`;
}

export function ProfitabilityDashboard() {
    const { data, isLoading, error } = useProfitabilityData();
    const { formatCurrency } = useFormatting();

    // Simple bar chart using CSS
    const maxMonthProfit = useMemo(() => {
        if (!data?.byMonth?.length) return 1;
        return Math.max(...data.byMonth.map((m) => Math.abs(m.profit)), 1);
    }, [data?.byMonth]);

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-32" />
                    ))}
                </div>
                <Skeleton className="h-64" />
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
                    <p className="text-muted-foreground">Impossible de charger les données de rentabilité</p>
                </CardContent>
            </Card>
        );
    }

    const { summary, byMonth, byCategory, byBrand, topProducts, lossProducts } = data;

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                    icon={DollarSign}
                    title="Chiffre d'affaires"
                    value={formatCurrency(summary.totalRevenue)}
                    subtitle={`Coûts: ${formatCurrency(summary.totalCosts)}`}
                />
                <StatCard
                    icon={TrendingUp}
                    title="Bénéfice total"
                    value={`${summary.totalProfit >= 0 ? "+" : ""}${formatCurrency(summary.totalProfit)}`}
                    subtitle={`${summary.totalSales} ventes`}
                    colorClass={summary.totalProfit >= 0 ? "text-green-500" : "text-red-500"}
                />
                <StatCard
                    icon={Percent}
                    title="Marge moyenne"
                    value={`${summary.averageMargin}%`}
                    subtitle={`${summary.profitableSales} rentables / ${summary.lossingSales} à perte`}
                    colorClass={summary.averageMargin >= 20 ? "text-green-500" : summary.averageMargin >= 10 ? "text-yellow-500" : "text-red-500"}
                />
                <StatCard
                    icon={ShoppingBag}
                    title="Taux de succès"
                    value={`${summary.totalSales > 0 ? Math.round((summary.profitableSales / summary.totalSales) * 100) : 0}%`}
                    subtitle={`${summary.profitableSales} sur ${summary.totalSales} ventes`}
                    colorClass="text-blue-500"
                />
            </div>

            {/* Best Performers */}
            {(summary.bestMonth || summary.bestCategory || summary.bestBrand) && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {summary.bestMonth && (
                        <Card className="border-green-200 dark:border-green-900">
                            <CardContent className="pt-4 flex items-center gap-3">
                                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                    <Star className="h-5 w-5 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Meilleur mois</p>
                                    <p className="font-semibold">{formatMonth(summary.bestMonth.month)}</p>
                                    <p className="text-sm text-green-600">+{formatCurrency(summary.bestMonth.profit)}</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                    {summary.bestCategory && (
                        <Card className="border-blue-200 dark:border-blue-900">
                            <CardContent className="pt-4 flex items-center gap-3">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                    <Award className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Catégorie star</p>
                                    <p className="font-semibold">{summary.bestCategory.category}</p>
                                    <p className="text-sm text-blue-600">+{formatCurrency(summary.bestCategory.profit)}</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                    {summary.bestBrand && (
                        <Card className="border-purple-200 dark:border-purple-900">
                            <CardContent className="pt-4 flex items-center gap-3">
                                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                                    <Award className="h-5 w-5 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Marque star</p>
                                    <p className="font-semibold">{summary.bestBrand.brand}</p>
                                    <p className="text-sm text-purple-600">+{formatCurrency(summary.bestBrand.profit)}</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* Monthly Chart */}
            {byMonth.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5" />
                            Bénéfices mensuels
                        </CardTitle>
                        <CardDescription>Évolution des profits sur 12 mois</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {byMonth.map((month) => (
                                <div key={month.month} className="flex items-center gap-3">
                                    <span className="w-16 text-sm text-muted-foreground shrink-0">
                                        {formatMonth(month.month)}
                                    </span>
                                    <div className="flex-1 h-8 bg-muted rounded-lg overflow-hidden relative">
                                        <div
                                            className={cn(
                                                "h-full transition-all duration-500 flex items-center justify-end pr-2",
                                                month.profit >= 0 ? "bg-green-500" : "bg-red-500"
                                            )}
                                            style={{ width: `${Math.max((Math.abs(month.profit) / maxMonthProfit) * 100, 5)}%` }}
                                        >
                                            <span className="text-xs font-medium text-white">
                                                {month.profit >= 0 ? "+" : ""}{formatCurrency(month.profit)}
                                            </span>
                                        </div>
                                    </div>
                                    <span className="w-10 text-xs text-muted-foreground text-right">{month.salesCount}</span>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-end mt-2">
                            <span className="text-xs text-muted-foreground">Nombre de ventes →</span>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Category & Brand Distribution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* By Category */}
                {byCategory.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <PieChart className="h-5 w-5" />
                                Par catégorie
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Catégorie</TableHead>
                                        <TableHead className="text-right">Profit</TableHead>
                                        <TableHead className="text-right">Marge</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {byCategory.map((cat) => (
                                        <TableRow key={cat.category}>
                                            <TableCell className="font-medium">{cat.category}</TableCell>
                                            <TableCell className={cn("text-right tabular-nums", cat.profit >= 0 ? "text-green-500" : "text-red-500")}>
                                                {cat.profit >= 0 ? "+" : ""}{formatCurrency(cat.profit)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Badge variant={cat.margin >= 20 ? "default" : "secondary"} className="tabular-nums">
                                                    {cat.margin}%
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}

                {/* By Brand */}
                {byBrand.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Award className="h-5 w-5" />
                                Par marque
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Marque</TableHead>
                                        <TableHead className="text-right">Profit</TableHead>
                                        <TableHead className="text-right">Marge</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {byBrand.map((b) => (
                                        <TableRow key={b.brand}>
                                            <TableCell className="font-medium">{b.brand}</TableCell>
                                            <TableCell className={cn("text-right tabular-nums", b.profit >= 0 ? "text-green-500" : "text-red-500")}>
                                                {b.profit >= 0 ? "+" : ""}{formatCurrency(b.profit)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Badge variant={b.margin >= 20 ? "default" : "secondary"} className="tabular-nums">
                                                    {b.margin}%
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Top Profitable Products */}
            {topProducts.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-green-500" />
                            Top produits rentables
                        </CardTitle>
                        <CardDescription>Les produits qui ont généré le plus de bénéfices</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Produit</TableHead>
                                    <TableHead>Marque</TableHead>
                                    <TableHead className="text-right">Achat</TableHead>
                                    <TableHead className="text-right">Vente</TableHead>
                                    <TableHead className="text-right">Bénéfice</TableHead>
                                    <TableHead className="text-right">Marge</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {topProducts.map((product, idx) => (
                                    <TableRow key={product.id}>
                                        <TableCell className="flex items-center gap-2">
                                            <span className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 flex items-center justify-center text-xs font-bold">
                                                {idx + 1}
                                            </span>
                                            <span className="font-medium truncate max-w-[150px]">{product.name}</span>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{product.brand || "—"}</TableCell>
                                        <TableCell className="text-right tabular-nums">{formatCurrency(product.purchasePrice + product.shippingCost)}</TableCell>
                                        <TableCell className="text-right tabular-nums">{formatCurrency(product.sellingPrice)}</TableCell>
                                        <TableCell className="text-right tabular-nums font-bold text-green-500">
                                            +{formatCurrency(product.profit)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Badge className="tabular-nums bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                {product.margin}%
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {/* Products at Loss */}
            {lossProducts.length > 0 && (
                <Card className="border-red-200 dark:border-red-900">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-red-500">
                            <AlertTriangle className="h-5 w-5" />
                            Produits vendus à perte
                        </CardTitle>
                        <CardDescription>Ces produits ont généré des pertes</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Produit</TableHead>
                                    <TableHead>Marque</TableHead>
                                    <TableHead className="text-right">Coût total</TableHead>
                                    <TableHead className="text-right">Vendu à</TableHead>
                                    <TableHead className="text-right">Perte</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {lossProducts.map((product) => (
                                    <TableRow key={product.id}>
                                        <TableCell className="font-medium truncate max-w-[150px]">{product.name}</TableCell>
                                        <TableCell className="text-muted-foreground">{product.brand || "—"}</TableCell>
                                        <TableCell className="text-right tabular-nums">{formatCurrency(product.purchasePrice + product.shippingCost)}</TableCell>
                                        <TableCell className="text-right tabular-nums">{formatCurrency(product.sellingPrice)}</TableCell>
                                        <TableCell className="text-right tabular-nums font-bold text-red-500">
                                            -{formatCurrency(product.loss)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
