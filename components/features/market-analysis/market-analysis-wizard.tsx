"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, CheckCircle2, ShoppingBag, ExternalLink, RefreshCw, AlertCircle } from "lucide-react";
import { cn } from "@/lib/shared/utils";
import { useMarketAnalysis } from "@/lib/hooks/useMarketAnalysis";
import { useFormatting } from "@/lib/hooks/use-formatting";

export function MarketAnalysisWizard() {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [query, setQuery] = useState("");
    const { formatCurrency } = useFormatting();

    const {
        isSearching,
        isAnalyzing,
        searchResults,
        analysis,
        searchProducts,
        analyzeProduct,
        resetAnalysis
    } = useMarketAnalysis();

    const handleSearch = async () => {
        if (!query.trim()) return;
        await searchProducts(query);
        setStep(2);
    };

    const handleSelect = async (id: string) => {
        await analyzeProduct(id);
        setStep(3);
    };

    const reset = () => {
        setStep(1);
        setQuery("");
        resetAnalysis();
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Stepper */}
            <div className="flex items-center justify-center gap-4">
                <div className={cn("flex items-center gap-2", step >= 1 ? "text-primary" : "text-muted-foreground")}>
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center border-2 font-bold transition-colors", step >= 1 ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground")}>1</div>
                    <span className="font-medium hidden sm:inline">Recherche</span>
                </div>
                <div className="w-12 h-0.5 bg-muted" />
                <div className={cn("flex items-center gap-2", step >= 2 ? "text-primary" : "text-muted-foreground")}>
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center border-2 font-bold transition-colors", step >= 2 ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground")}>2</div>
                    <span className="font-medium hidden sm:inline">Sélection</span>
                </div>
                <div className="w-12 h-0.5 bg-muted" />
                <div className={cn("flex items-center gap-2", step >= 3 ? "text-primary" : "text-muted-foreground")}>
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center border-2 font-bold transition-colors", step >= 3 ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground")}>3</div>
                    <span className="font-medium hidden sm:inline">Analyse</span>
                </div>
            </div>

            {/* Step 1: Search */}
            {step === 1 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Quel produit souhaitez-vous analyser ?</CardTitle>
                        <CardDescription>Entrez le nom de la marque et du modèle pour commencer.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-4">
                            <Input
                                placeholder="Ex: Nike Air Force 1, iPhone 12, etc."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                className="text-lg py-6"
                                disabled={isSearching}
                            />
                            <Button size="lg" onClick={handleSearch} disabled={!query.trim() || isSearching}>
                                {isSearching ? <RefreshCw className="w-5 h-5 animate-spin mr-2" /> : <Search className="w-5 h-5 mr-2" />}
                                Rechercher
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Step 2: Selection */}
            {step === 2 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold">
                            {isSearching ? "Recherche en cours..." : `Résultats pour "${query}"`}
                        </h2>
                        <Button variant="ghost" onClick={reset} disabled={isAnalyzing}>Nouvelle recherche</Button>
                    </div>

                    {isSearching ? (
                        <div className="flex justify-center py-12">
                            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                        </div>
                    ) : searchResults.length > 0 ? (
                        <div className="grid gap-4 md:grid-cols-3">
                            {searchResults.map((item) => (
                                <Card
                                    key={item.id}
                                    className="cursor-pointer hover:border-primary transition-all hover:shadow-md group"
                                    onClick={() => handleSelect(item.id)}
                                >
                                    <CardContent className="p-6 text-center space-y-4">
                                        <div className="text-4xl group-hover:scale-110 transition-transform">{item.imageUrl}</div>
                                        <div>
                                            <h3 className="font-bold truncate" title={item.title}>{item.title}</h3>
                                            <p className="text-sm text-muted-foreground">{item.condition}</p>
                                        </div>
                                        <div className="text-lg font-bold text-primary">{item.price} {item.currency}</div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <Card className="border-dashed">
                            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                <AlertCircle className="w-12 h-12 mb-4 opacity-50" />
                                <p>Aucun produit trouvé pour cette recherche.</p>
                                <Button variant="link" onClick={reset}>Essayer une autre recherche</Button>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* Loading State for Analysis */}
            {isAnalyzing && (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <p className="text-lg font-medium text-muted-foreground">Analyse du marché en cours...</p>
                </div>
            )}

            {/* Step 3: Analysis Results */}
            {step === 3 && analysis && !isAnalyzing && (
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
                                <div className="text-3xl font-bold text-blue-600">{analysis.bestPlatform}</div>
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
            )}
        </div>
    );
}
