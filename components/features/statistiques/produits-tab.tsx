"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { StatistiquesData } from "@/lib/hooks/useStatistiques";
import {
    Package,
    Trophy,
    TrendingDown,
    AlertTriangle,
    Clock,
    Medal,
    ArrowUpRight,
    ArrowDownRight,
    ShoppingBag
} from "lucide-react";
import { useFormatting } from "@/lib/hooks/use-formatting";
import { cn } from "@/lib/shared/utils";

interface ProduitsTabProps {
    data: StatistiquesData;
}

// Médaille composant
function ProductMedal({ rank }: { rank: number }) {
    if (rank === 1) {
        return (
            <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 via-amber-400 to-yellow-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                    <Trophy className="w-5 h-5 text-white" />
                </div>
                <span className="absolute -bottom-1 -right-1 text-xs font-bold bg-amber-600 text-white rounded-full w-5 h-5 flex items-center justify-center">
                    1
                </span>
            </div>
        );
    }
    if (rank === 2) {
        return (
            <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-300 via-gray-400 to-gray-300 flex items-center justify-center shadow-lg shadow-gray-400/30">
                    <Medal className="w-5 h-5 text-white" />
                </div>
                <span className="absolute -bottom-1 -right-1 text-xs font-bold bg-gray-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
                    2
                </span>
            </div>
        );
    }
    if (rank === 3) {
        return (
            <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-600 via-amber-700 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-700/30">
                    <Medal className="w-5 h-5 text-white" />
                </div>
                <span className="absolute -bottom-1 -right-1 text-xs font-bold bg-amber-800 text-white rounded-full w-5 h-5 flex items-center justify-center">
                    3
                </span>
            </div>
        );
    }
    return (
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <span className="text-sm font-bold text-muted-foreground">#{rank}</span>
        </div>
    );
}

// Card produit top
function TopProductCard({ produit, rank }: {
    produit: StatistiquesData['topProduits'][0];
    rank: number;
}) {
    const { formatCurrency } = useFormatting();

    return (
        <div className={cn(
            "relative p-4 rounded-xl transition-all duration-300 hover:shadow-lg group",
            "bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 border border-emerald-500/20",
            rank <= 3 && "ring-1 ring-emerald-500/30"
        )}>
            {/* Gradient overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />

            <div className="relative flex items-start gap-4">
                <ProductMedal rank={rank} />

                <div className="flex-1 min-w-0">
                    <h4 className="font-semibold truncate">{produit.nom}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {produit.plateforme} • {produit.dateVente ? new Date(produit.dateVente).toLocaleDateString('fr-FR') : 'Date inconnue'}
                    </p>

                    {/* Barre de marge */}
                    <div className="mt-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Marge</span>
                            <span className="font-medium text-emerald-500">{produit.margePercent.toFixed(1)}%</span>
                        </div>
                        <Progress
                            value={Math.min(produit.margePercent, 100)}
                            className="h-1.5 [&>div]:bg-emerald-500"
                        />
                    </div>
                </div>

                <div className="text-right shrink-0">
                    <div className="flex items-center gap-1 text-emerald-500 mb-1">
                        <ArrowUpRight className="w-4 h-4" />
                        <span className="text-lg font-bold">+{formatCurrency(produit.benefice)}</span>
                    </div>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                        <span>{formatCurrency(produit.prixAchat)}</span>
                        <span>→</span>
                        <span>{formatCurrency(produit.prixVente)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Card produit flop
<<<<<<< HEAD
function FlopProductCard({ produit, rank: _rank }: {
=======
function FlopProductCard({ produit, rank }: {
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
    produit: StatistiquesData['flopProduits'][0];
    rank: number;
}) {
    const { formatCurrency } = useFormatting();

    return (
        <div className={cn(
            "relative p-4 rounded-xl transition-all duration-300 hover:shadow-lg group",
            "bg-gradient-to-br from-red-500/5 to-red-500/10 border border-red-500/20"
        )}>
            <div className="relative flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                    <TrendingDown className="w-5 h-5 text-red-500" />
                </div>

                <div className="flex-1 min-w-0">
                    <h4 className="font-semibold truncate">{produit.nom}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {produit.plateforme} • {produit.dateVente ? new Date(produit.dateVente).toLocaleDateString('fr-FR') : 'Date inconnue'}
                    </p>

                    {/* Barre de marge */}
                    <div className="mt-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Marge</span>
                            <span className={cn(
                                "font-medium",
                                produit.margePercent >= 0 ? "text-amber-500" : "text-red-500"
                            )}>
                                {produit.margePercent.toFixed(1)}%
                            </span>
                        </div>
                        <Progress
                            value={Math.max(0, Math.min(produit.margePercent, 100))}
                            className="h-1.5 [&>div]:bg-red-500"
                        />
                    </div>
                </div>

                <div className="text-right shrink-0">
                    <div className="flex items-center gap-1 text-red-500 mb-1">
                        <ArrowDownRight className="w-4 h-4" />
                        <span className="text-lg font-bold">{formatCurrency(produit.benefice)}</span>
                    </div>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                        <span>{formatCurrency(produit.prixAchat)}</span>
                        <span>→</span>
                        <span>{formatCurrency(produit.prixVente)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Card produit non vendu
function UnsoldProductCard({ produit }: {
    produit: StatistiquesData['produitsNonVendus'][0];
}) {
    const { formatCurrency } = useFormatting();
    const totalCost = (produit.prixAchat || 0) + (produit.coutLivraison || 0);

    const getDaysColor = (days: number | null) => {
        if (!days) return "secondary";
        if (days > 60) return "destructive";
        if (days > 30) return "warning";
        return "secondary";
    };

    return (
        <div className="p-3 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{produit.nom}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Parcelle: {produit.parcelleNumero} • Coût: {formatCurrency(totalCost)}
                    </p>
                </div>
                <div className="shrink-0">
                    {produit.joursEnLigne !== null && produit.joursEnLigne > 0 ? (
                        <Badge
                            variant={getDaysColor(produit.joursEnLigne) as "secondary" | "destructive"}
                            className={cn(
                                "gap-1",
                                produit.joursEnLigne > 60 && "bg-red-500/10 text-red-500 border-red-500/20",
                                produit.joursEnLigne > 30 && produit.joursEnLigne <= 60 && "bg-amber-500/10 text-amber-500 border-amber-500/20"
                            )}
                        >
                            <Clock className="w-3 h-3" />
                            {produit.joursEnLigne}j en ligne
                        </Badge>
                    ) : (
                        <Badge variant="secondary" className="gap-1">
                            <Package className="w-3 h-3" />
                            Brouillon
                        </Badge>
                    )}
                </div>
            </div>
        </div>
    );
}

export function ProduitsTab({ data }: ProduitsTabProps) {
    const d = data;
    const { formatCurrency } = useFormatting();
    const [showAllUnsold, setShowAllUnsold] = useState(false);

    // Stats agrégées
    const totalBeneficesTop = d.topProduits.reduce((sum, p) => sum + p.benefice, 0);
    const avgMargeTop = d.topProduits.length > 0
        ? d.topProduits.reduce((sum, p) => sum + p.margePercent, 0) / d.topProduits.length
        : 0;

    // Produits à risque (plus de 60 jours en ligne)
    const produitsARisque = d.produitsNonVendus.filter(p => p.joursEnLigne && p.joursEnLigne > 60);

    // Limite d'affichage produits non vendus
    const displayedUnsold = showAllUnsold ? d.produitsNonVendus : d.produitsNonVendus.slice(0, 10);

    return (
        <div className="space-y-6">
            {/* Alerte produits à risque */}
            {produitsARisque.length > 0 && (
                <Card className="border-red-500/30 bg-red-500/5">
                    <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-red-500/10">
                                <AlertTriangle className="w-5 h-5 text-red-500" />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-semibold text-red-500">
                                    {produitsARisque.length} produit{produitsARisque.length > 1 ? 's' : ''} à risque
                                </h4>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Ces produits sont en ligne depuis plus de 60 jours. Envisagez une baisse de prix ou un retrait.
                                </p>
                            </div>
                            <Badge variant="destructive" className="shrink-0">
                                Stock dormant
                            </Badge>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Top/Flop Tabs */}
            <Card className="border-border/50">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-primary" />
                            <CardTitle className="text-base">Performance des Produits</CardTitle>
                        </div>
                        {d.topProduits.length > 0 && (
                            <div className="flex items-center gap-4 text-sm">
                                <span className="text-muted-foreground">
                                    Bénéfices Top 10:
                                    <span className="font-bold text-emerald-500 ml-1">
                                        +{formatCurrency(totalBeneficesTop)}
                                    </span>
                                </span>
                                <span className="text-muted-foreground">
                                    Marge moy:
                                    <span className="font-bold text-primary ml-1">
                                        {avgMargeTop.toFixed(1)}%
                                    </span>
                                </span>
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="top" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-4">
                            <TabsTrigger value="top" className="gap-2">
                                <Trophy className="w-4 h-4" />
                                Top 10 Produits
                            </TabsTrigger>
                            <TabsTrigger value="flop" className="gap-2">
                                <TrendingDown className="w-4 h-4" />
                                Flop Produits
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="top" className="space-y-3 mt-0">
                            {d.topProduits.length > 0 ? (
                                d.topProduits.map((produit, index) => (
                                    <TopProductCard
                                        key={produit.id}
                                        produit={produit}
                                        rank={index + 1}
                                    />
                                ))
                            ) : (
                                <div className="text-center py-12">
                                    <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                                    <h4 className="text-lg font-medium mb-2">Aucun produit vendu</h4>
                                    <p className="text-muted-foreground">
                                        Les meilleurs produits apparaîtront ici après vos premières ventes
                                    </p>
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="flop" className="space-y-3 mt-0">
                            {d.flopProduits && d.flopProduits.length > 0 ? (
                                d.flopProduits.map((produit, index) => (
                                    <FlopProductCard
                                        key={produit.id}
                                        produit={produit}
                                        rank={index + 1}
                                    />
                                ))
                            ) : (
                                <div className="text-center py-12">
                                    <Trophy className="w-12 h-12 text-emerald-500 mx-auto mb-4 opacity-70" />
                                    <h4 className="text-lg font-medium mb-2">Aucun flop !</h4>
                                    <p className="text-muted-foreground">
                                        Tous vos produits ont une marge positive
                                    </p>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            {/* Produits Non Vendus */}
            {d.produitsNonVendus.length > 0 && (
                <Card className="border-border/50">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Package className="w-5 h-5 text-amber-500" />
                                <CardTitle className="text-base">Stock Actuel</CardTitle>
                                <Badge variant="secondary">{d.produitsNonVendus.length} produits</Badge>
                            </div>
                            {d.produitsNonVendus.length > 10 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowAllUnsold(!showAllUnsold)}
                                >
                                    {showAllUnsold ? "Voir moins" : `Voir tout (${d.produitsNonVendus.length})`}
                                </Button>
                            )}
                        </div>
                        <CardDescription>Produits en attente de vente</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 max-h-[500px] overflow-y-auto scrollbar-thin">
                            {displayedUnsold.map((produit) => (
                                <UnsoldProductCard key={produit.id} produit={produit} />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
