"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Heart, TrendingUp, ExternalLink, RefreshCw, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/shared/utils";

interface VintedStatsData {
    totalViews: number;
    totalFavourites: number;
    linkedProducts: number;
    avgInterestRate: number;
    topArticles: Array<{
        id: string;
        name: string;
        viewCount: number;
        favouriteCount: number;
        interestRate: number;
        url?: string;
    }>;
    articlesToOptimize: Array<{
        id: string;
        name: string;
        viewCount: number;
        favouriteCount: number;
        issue: string;
    }>;
}

async function fetchVintedStats(): Promise<VintedStatsData> {
    const res = await fetch('/api/v1/statistics/vinted');
    if (!res.ok) throw new Error('Failed to fetch Vinted stats');
    return res.json();
}

export function VintedStatsSection() {
    const { data, isLoading, refetch } = useQuery({
        queryKey: ['vinted-stats'],
        queryFn: fetchVintedStats,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    if (isLoading) {
        return (
            <Card className="animate-pulse">
                <CardHeader>
                    <div className="h-6 bg-muted rounded w-48" />
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-20 bg-muted rounded" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!data) {
        return (
            <Card className="border-dashed">
                <CardContent className="py-8 text-center text-muted-foreground">
                    <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Associez des produits à Vinted pour voir les statistiques</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-gradient-to-br from-blue-50/50 to-indigo-50/30 dark:from-blue-950/20 dark:to-indigo-950/10 border-blue-200/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                        <Sparkles className="h-4 w-4 text-blue-600" />
                    </div>
                    <CardTitle className="text-lg">Performance Vinted</CardTitle>
                    <Badge variant="secondary" className="text-xs">
                        {data.linkedProducts} produits liés
                    </Badge>
                </div>
                <Button variant="ghost" size="sm" onClick={() => refetch()}>
                    <RefreshCw className="h-4 w-4" />
                </Button>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Main metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-white/50 dark:bg-black/20 rounded-lg">
                        <Eye className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                        <div className="text-2xl font-bold">{data.totalViews.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">Vues totales</div>
                    </div>
                    <div className="text-center p-4 bg-white/50 dark:bg-black/20 rounded-lg">
                        <Heart className="h-5 w-5 mx-auto mb-1 text-red-400" />
                        <div className="text-2xl font-bold">{data.totalFavourites.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">Favoris totaux</div>
                    </div>
                    <div className="text-center p-4 bg-white/50 dark:bg-black/20 rounded-lg">
                        <TrendingUp className="h-5 w-5 mx-auto mb-1 text-green-500" />
                        <div className="text-2xl font-bold">{data.avgInterestRate.toFixed(1)}%</div>
                        <div className="text-xs text-muted-foreground">Taux d'intérêt moyen</div>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-lg">
                        <Sparkles className="h-5 w-5 mx-auto mb-1 text-blue-600" />
                        <div className="text-2xl font-bold text-blue-600">{data.linkedProducts}</div>
                        <div className="text-xs text-muted-foreground">Produits en ligne</div>
                    </div>
                </div>

                {/* Top articles */}
                {data.topArticles.length > 0 && (
                    <div>
                        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-green-500" />
                            Top 5 articles les plus vus
                        </h4>
                        <div className="space-y-2">
                            {data.topArticles.slice(0, 5).map((article, index) => (
                                <div
                                    key={article.id}
                                    className="flex items-center justify-between p-3 bg-white/50 dark:bg-black/20 rounded-lg"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                                            index === 0 ? "bg-yellow-100 text-yellow-700" :
                                                index === 1 ? "bg-gray-100 text-gray-600" :
                                                    index === 2 ? "bg-orange-100 text-orange-700" :
                                                        "bg-muted text-muted-foreground"
                                        )}>
                                            {index + 1}
                                        </div>
                                        <span className="font-medium text-sm truncate max-w-[200px]">
                                            {article.name}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm">
                                        <span className="text-muted-foreground">
                                            <Eye className="h-3 w-3 inline mr-1" />
                                            {article.viewCount}
                                        </span>
                                        <span className="text-muted-foreground">
                                            <Heart className="h-3 w-3 inline mr-1" />
                                            {article.favouriteCount}
                                        </span>
                                        <Badge variant="outline" className="text-xs">
                                            {article.interestRate.toFixed(1)}%
                                        </Badge>
                                        {article.url && (
                                            <a href={article.url} target="_blank" rel="noopener noreferrer">
                                                <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-primary" />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Articles to optimize */}
                {data.articlesToOptimize.length > 0 && (
                    <div>
                        <h4 className="text-sm font-medium mb-3 flex items-center gap-2 text-amber-600">
                            <TrendingUp className="h-4 w-4" />
                            Articles à optimiser
                        </h4>
                        <div className="space-y-2">
                            {data.articlesToOptimize.slice(0, 3).map(article => (
                                <div
                                    key={article.id}
                                    className="flex items-center justify-between p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-lg border border-amber-200/50"
                                >
                                    <span className="font-medium text-sm truncate max-w-[250px]">
                                        {article.name}
                                    </span>
                                    <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                                        {article.issue}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
