<<<<<<< HEAD

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ShoppingBag, ExternalLink } from "lucide-react";
import { cn } from "@/lib/shared/utils";
import { useFormatting } from "@/lib/hooks/use-formatting";
import { type MarketAnalysis } from "@/lib/types/market";

interface ResultsStepProps {
    analysis: MarketAnalysis;
    reset: () => void;
}

export function ResultsStep({ analysis, reset }: ResultsStepProps) {
    const { formatCurrency } = useFormatting();

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                    <div>
                        <h2 className="text-2xl font-bold">Analyse Terminée</h2>
                        <p className="text-muted-foreground">Basé sur {analysis.totalListings} annonces récentes</p>
                    </div>
                </div>
                <Button onClick={reset}>Analyser un autre produit</Button>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Prix Moyen</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{formatCurrency(analysis.averagePrice)}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Fourchette: {formatCurrency(analysis.minPrice)} - {formatCurrency(analysis.maxPrice)}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Demande</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={cn("text-3xl font-bold",
                            analysis.demandLevel === 'High' ? "text-green-600" :
                                analysis.demandLevel === 'Medium' ? "text-yellow-600" : "text-red-600"
                        )}>
                            {analysis.demandLevel === 'High' ? "Élevée" : analysis.demandLevel === 'Medium' ? "Moyenne" : "Faible"}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Volume de recherche estimé</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Meilleure Plateforme</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-primary">{analysis.bestPlatform}</div>
                        <p className="text-xs text-muted-foreground mt-1">Meilleur prix de vente moyen</p>
                    </CardContent>
                </Card>
            </div>

            {/* Recommendation Box */}
            <Card className="bg-primary/5 border-primary/20">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ShoppingBag className="w-5 h-5 text-primary" />
                        Recommandation de Prix
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-4xl font-bold text-primary">{formatCurrency(analysis.recommendation.suggestedPrice)}</div>
                            <p className="text-sm text-muted-foreground mt-2 max-w-lg">
                                {analysis.recommendation.reasoning}
                            </p>
                        </div>
                        <div className="text-right">
                            <div className="text-sm font-medium text-muted-foreground">Score de confiance</div>
                            <div className="text-2xl font-bold">{analysis.recommendation.confidenceScore}%</div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Distribution des Prix</CardTitle>
                    <CardDescription>Répartition des annonces par tranche de prix</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[200px] flex items-end gap-2 pt-4">
                        {analysis.priceDistribution.map((item, i) => {
                            const maxCount = Math.max(...analysis.priceDistribution.map(d => d.count));
                            const heightPercentage = (item.count / maxCount) * 100;

                            return (
                                <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                                    <div
                                        className="w-full bg-primary/20 hover:bg-primary transition-colors rounded-t-sm relative group cursor-help"
                                        style={{ height: `${heightPercentage}%` }}
                                    >
                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity shadow-sm border whitespace-nowrap z-10">
                                            {item.count} annonces
                                        </div>
                                    </div>
                                    <span className="text-xs text-muted-foreground rotate-0 whitespace-nowrap">{item.range}</span>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end gap-4">
                <Button variant="outline" className="gap-2">
                    <ExternalLink className="w-4 h-4" />
                    Voir sur {analysis.bestPlatform}
                </Button>
                <Button className="gap-2">
                    <ShoppingBag className="w-4 h-4" />
                    Créer une fiche produit
                </Button>
            </div>
        </div>
    );
}
=======

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ShoppingBag, ExternalLink } from "lucide-react";
import { cn } from "@/lib/shared/utils";
import { useFormatting } from "@/lib/hooks/use-formatting";
import { type MarketAnalysis } from "@/lib/types/market";

interface ResultsStepProps {
    analysis: MarketAnalysis;
    reset: () => void;
}

export function ResultsStep({ analysis, reset }: ResultsStepProps) {
    const { formatCurrency } = useFormatting();

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                    <div>
                        <h2 className="text-2xl font-bold">Analyse Terminée</h2>
                        <p className="text-muted-foreground">Basé sur {analysis.totalListings} annonces récentes</p>
                    </div>
                </div>
                <Button onClick={reset}>Analyser un autre produit</Button>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Prix Moyen</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{formatCurrency(analysis.averagePrice)}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Fourchette: {formatCurrency(analysis.minPrice)} - {formatCurrency(analysis.maxPrice)}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Demande</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={cn("text-3xl font-bold",
                            analysis.demandLevel === 'High' ? "text-green-600" :
                                analysis.demandLevel === 'Medium' ? "text-yellow-600" : "text-red-600"
                        )}>
                            {analysis.demandLevel === 'High' ? "Élevée" : analysis.demandLevel === 'Medium' ? "Moyenne" : "Faible"}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Volume de recherche estimé</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Meilleure Plateforme</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-primary">{analysis.bestPlatform}</div>
                        <p className="text-xs text-muted-foreground mt-1">Meilleur prix de vente moyen</p>
                    </CardContent>
                </Card>
            </div>

            {/* Recommendation Box */}
            <Card className="bg-primary/5 border-primary/20">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ShoppingBag className="w-5 h-5 text-primary" />
                        Recommandation de Prix
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-4xl font-bold text-primary">{formatCurrency(analysis.recommendation.suggestedPrice)}</div>
                            <p className="text-sm text-muted-foreground mt-2 max-w-lg">
                                {analysis.recommendation.reasoning}
                            </p>
                        </div>
                        <div className="text-right">
                            <div className="text-sm font-medium text-muted-foreground">Score de confiance</div>
                            <div className="text-2xl font-bold">{analysis.recommendation.confidenceScore}%</div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Distribution des Prix</CardTitle>
                    <CardDescription>Répartition des annonces par tranche de prix</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[200px] flex items-end gap-2 pt-4">
                        {analysis.priceDistribution.map((item, i) => {
                            const maxCount = Math.max(...analysis.priceDistribution.map(d => d.count));
                            const heightPercentage = (item.count / maxCount) * 100;

                            return (
                                <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                                    <div
                                        className="w-full bg-primary/20 hover:bg-primary transition-colors rounded-t-sm relative group cursor-help"
                                        style={{ height: `${heightPercentage}%` }}
                                    >
                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity shadow-sm border whitespace-nowrap z-10">
                                            {item.count} annonces
                                        </div>
                                    </div>
                                    <span className="text-xs text-muted-foreground rotate-0 whitespace-nowrap">{item.range}</span>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end gap-4">
                <Button variant="outline" className="gap-2">
                    <ExternalLink className="w-4 h-4" />
                    Voir sur {analysis.bestPlatform}
                </Button>
                <Button className="gap-2">
                    <ShoppingBag className="w-4 h-4" />
                    Créer une fiche produit
                </Button>
            </div>
        </div>
    );
}
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
