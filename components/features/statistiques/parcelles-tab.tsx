"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/shared/utils";
import type { StatistiquesData } from "@/lib/hooks/useStatistiques";
import { Package, Clock, TrendingUp, Package2, Boxes, Timer, Calendar, Truck, Hash } from "lucide-react";
import { useFormatting } from "@/lib/hooks/use-formatting";

interface ParcellesTabProps {
    data: StatistiquesData;
}

// Mini jauge pour ROI
function ROIGauge({ value }: { value: number }) {

    const percentage = Math.min(Math.max((value / 150) * 100, 0), 100);

    return (
        <div className="flex flex-col items-center gap-1.5 min-w-[80px]">
            <div className="relative w-16 h-16">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <circle
                        cx="18"
                        cy="18"
                        r="15.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        className="text-muted/20"
                    />
                    <circle
                        cx="18"
                        cy="18"
                        r="15.5"
                        fill="none"
                        strokeWidth="3"
                        strokeDasharray={`${percentage} 100`}
                        strokeLinecap="round"
                        className={cn(
                            "transition-all duration-700 ease-out",
                            value > 50 ? "stroke-emerald-500" :
                                value > 20 ? "stroke-blue-500" :
                                    value > 0 ? "stroke-amber-500" : "stroke-red-500"
                        )}
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className={cn(
                        "text-sm font-bold",
                        value > 50 ? "text-emerald-500" :
                            value > 20 ? "text-blue-500" :
                                value > 0 ? "text-amber-500" : "text-red-500"
                    )}>
                        {value.toFixed(0)}%
                    </span>
                </div>
            </div>
            <span className="text-[10px] text-muted-foreground font-medium">ROI</span>
        </div>
    );
}

// Card de parcelle avec design premium
function ParcelleCard({ parcelle, rank }: {
    parcelle: StatistiquesData['performanceParcelle'][0];
    rank: number;
}) {
    const { formatCurrency, formatWeight, formatDate } = useFormatting();

    const getMedalColor = (rank: number) => {
        if (rank === 1) return "bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-amber-500/30";
        if (rank === 2) return "bg-gradient-to-br from-gray-300 to-gray-400 text-white shadow-gray-400/30";
        if (rank === 3) return "bg-gradient-to-br from-amber-600 to-amber-700 text-white shadow-amber-700/30";
        return "bg-muted text-muted-foreground";
    };

    const getStatusColor = (status: string) => {
        const s = status.toLowerCase();
        if (s.includes('delivered') || s.includes('reçu') || s.includes('arrived')) return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
        if (s.includes('shipped') || s.includes('expédié') || s.includes('transit')) return "bg-blue-500/10 text-blue-500 border-blue-500/20";
        if (s.includes('pending') || s.includes('attente')) return "bg-amber-500/10 text-amber-500 border-amber-500/20";
        return "bg-muted text-muted-foreground border-border";
    };

    return (
        <Card className={cn(
            "relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.01] border-border/50",
            "bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-sm",
            rank <= 3 && "ring-1 ring-primary/20"
        )}>
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />

            <CardContent className="p-4">
                <div className="flex items-start gap-4">
                    {/* Rank badge */}
                    <div className={cn(
                        "flex items-center justify-center w-10 h-10 rounded-xl text-sm font-bold shadow-lg shrink-0",
                        getMedalColor(rank)
                    )}>
                        #{rank}
                    </div>

                    {/* Infos parcelle */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <h4 className="font-semibold text-base truncate">
                                        {parcelle.parcelleNumero || parcelle.trackingNumber || `Parcelle #${rank}`}
                                    </h4>
                                    {parcelle.status && (
                                        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5", getStatusColor(parcelle.status))}>
                                            {parcelle.status}
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-sm text-muted-foreground truncate">
                                    {parcelle.parcelleNom || parcelle.carrier || ""}
                                </p>

                                {/* Metadata grid */}
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                                    {parcelle.trackingNumber && (
                                        <div className="flex items-center gap-1.5" title="Numéro de suivi">
                                            <Hash className="w-3 h-3 text-primary/70" />
                                            <span className="font-medium font-mono truncate">{parcelle.trackingNumber}</span>
                                        </div>
                                    )}
                                    {parcelle.carrier && (
                                        <div className="flex items-center gap-1.5" title="Transporteur">
                                            <Truck className="w-3 h-3 text-primary/70" />
                                            <span className="truncate">{parcelle.carrier}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1.5" title="Date d'ajout">
                                        <Calendar className="w-3 h-3 text-primary/70" />
                                        <span>{formatDate(parcelle.createdAt)}</span>
                                    </div>
                                </div>
                            </div>
                            <ROIGauge value={parcelle.ROI} />
                        </div>

                        {/* Stats row */}
                        <div className="mt-4 grid grid-cols-3 gap-3">
                            <div className="text-center p-2 rounded-lg bg-muted/30">
                                <p className="text-xs text-muted-foreground">Vendus</p>
                                <p className="font-bold text-sm">
                                    {parcelle.nbProduitsVendus}/{parcelle.nbProduitsTotal}
                                </p>
                            </div>
                            <div className="text-center p-2 rounded-lg bg-muted/30">
                                <p className="text-xs text-muted-foreground">Coût</p>
                                <p className="font-bold text-sm">{formatCurrency(parcelle.coutTotal)}</p>
                            </div>
                            <div className="text-center p-2 rounded-lg bg-muted/30">
                                <p className="text-xs text-muted-foreground">Poids</p>
                                <p className="font-bold text-sm">{formatWeight(parcelle.poidsTotal)}</p>
                            </div>
                        </div>

                        {/* Progress bar taux de vente */}
                        <div className="mt-3">
                            <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-muted-foreground">Taux de vente</span>
                                <span className={cn(
                                    "font-medium",
                                    parcelle.tauxVente >= 75 ? "text-emerald-500" :
                                        parcelle.tauxVente >= 50 ? "text-blue-500" :
                                            parcelle.tauxVente >= 25 ? "text-amber-500" : "text-red-500"
                                )}>
                                    {parcelle.tauxVente.toFixed(1)}%
                                </span>
                            </div>
                            <Progress
                                value={parcelle.tauxVente}
                                className={cn(
                                    "h-2",
                                    parcelle.tauxVente >= 75 && "[&>[data-state=complete]]:bg-emerald-500 [&>div]:bg-emerald-500",
                                    parcelle.tauxVente >= 50 && parcelle.tauxVente < 75 && "[&>[data-state=complete]]:bg-blue-500 [&>div]:bg-blue-500",
                                    parcelle.tauxVente >= 25 && parcelle.tauxVente < 50 && "[&>[data-state=complete]]:bg-amber-500 [&>div]:bg-amber-500",
                                    parcelle.tauxVente < 25 && "[&>[data-state=complete]]:bg-red-500 [&>div]:bg-red-500"
                                )}
                            />
                        </div>

                        {/* Bénéfices */}
                        <div className="mt-3 flex items-center justify-between pt-3 border-t border-border/50">
                            <span className="text-sm text-muted-foreground">Bénéfices</span>
                            <span className={cn(
                                "text-lg font-bold",
                                parcelle.beneficesTotal >= 0 ? "text-emerald-500" : "text-red-500"
                            )}>
                                {parcelle.beneficesTotal >= 0 ? "+" : ""}{formatCurrency(parcelle.beneficesTotal)}
                            </span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export function ParcellesTab({ data }: ParcellesTabProps) {
    const d = data;
    const { formatCurrency } = useFormatting();

    // Stats agrégées
    const totalProduits = d.performanceParcelle.reduce((sum, p) => sum + p.nbProduitsTotal, 0);
    const totalVendus = d.performanceParcelle.reduce((sum, p) => sum + p.nbProduitsVendus, 0);
    const totalBenefices = d.performanceParcelle.reduce((sum, p) => sum + p.beneficesTotal, 0);
    const tauxVenteMoyen = totalProduits > 0 ? (totalVendus / totalProduits) * 100 : 0;

    return (
        <div className="space-y-6">
            {/* KPIs agrégés */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-border/50 hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-blue-500/10">
                                <Boxes className="w-5 h-5 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Total Parcelles</p>
                                <p className="text-2xl font-bold">{d.performanceParcelle.length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/50 hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-purple-500/10">
                                <Package2 className="w-5 h-5 text-purple-500" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Produits Total</p>
                                <p className="text-2xl font-bold">{totalProduits}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/50 hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-emerald-500/10">
                                <TrendingUp className="w-5 h-5 text-emerald-500" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Taux Vente Moy.</p>
                                <p className="text-2xl font-bold">{tauxVenteMoyen.toFixed(1)}%</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/50 hover:shadow-md transition-shadow bg-gradient-to-br from-emerald-500/10 to-emerald-500/5">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-emerald-500/20">
                                <TrendingUp className="w-5 h-5 text-emerald-500" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Bénéfices Total</p>
                                <p className={cn(
                                    "text-2xl font-bold",
                                    totalBenefices >= 0 ? "text-emerald-500" : "text-red-500"
                                )}>
                                    {totalBenefices >= 0 ? "+" : ""}{formatCurrency(totalBenefices)}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Grille des parcelles */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Package className="w-5 h-5 text-primary" />
                        Performance des Parcelles
                    </h3>
                    <Badge variant="secondary">
                        Classement par ROI
                    </Badge>
                </div>

                {d.performanceParcelle.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2">
                        {d.performanceParcelle
                            .sort((a, b) => b.ROI - a.ROI)
                            .map((parcelle, index) => (
                                <ParcelleCard
                                    key={parcelle.parcelleId}
                                    parcelle={parcelle}
                                    rank={index + 1}
                                />
                            ))
                        }
                    </div>
                ) : (
                    <Card className="border-border/50">
                        <CardContent className="text-center py-16">
                            <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                            <h4 className="text-lg font-medium mb-2">Aucune parcelle</h4>
                            <p className="text-muted-foreground">
                                Les données de performance des parcelles apparaîtront ici
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Délais de Vente */}
            {d.delaisVente.nbProduitsAvecDelai && d.delaisVente.nbProduitsAvecDelai > 0 && (
                <Card className="border-border/50">
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                            <Clock className="w-5 h-5 text-primary" />
                            <CardTitle className="text-base">Délais de Vente</CardTitle>
                        </div>
                        <CardDescription>
                            Analyse du temps de vente sur {d.delaisVente.nbProduitsAvecDelai} produits
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-4">
                            <div className="relative p-4 rounded-xl bg-muted/30 border border-border/50 overflow-hidden text-center group hover:bg-muted/50 transition-colors">
                                <div className="absolute -right-4 -top-4 w-12 h-12 bg-blue-500/10 blur-xl rounded-full" />
                                <Timer className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                                <p className="text-xs text-muted-foreground mb-1">Délai Moyen</p>
                                <p className="text-2xl font-bold">{d.delaisVente.delaiMoyen.toFixed(1)}<span className="text-sm font-normal text-muted-foreground ml-1">jours</span></p>
                            </div>
                            <div className="relative p-4 rounded-xl bg-muted/30 border border-border/50 overflow-hidden text-center group hover:bg-muted/50 transition-colors">
                                <div className="absolute -right-4 -top-4 w-12 h-12 bg-purple-500/10 blur-xl rounded-full" />
                                <Timer className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                                <p className="text-xs text-muted-foreground mb-1">Délai Médian</p>
                                <p className="text-2xl font-bold">{d.delaisVente.delaiMedian.toFixed(1)}<span className="text-sm font-normal text-muted-foreground ml-1">jours</span></p>
                            </div>
                            <div className="relative p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 overflow-hidden text-center group hover:bg-emerald-500/10 transition-colors">
                                <div className="absolute -right-4 -top-4 w-12 h-12 bg-emerald-500/20 blur-xl rounded-full" />
                                <Timer className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                                <p className="text-xs text-muted-foreground mb-1">Plus Rapide</p>
                                <p className="text-2xl font-bold text-emerald-500">{d.delaisVente.delaiMin}<span className="text-sm font-normal text-muted-foreground ml-1">jours</span></p>
                            </div>
                            <div className="relative p-4 rounded-xl bg-red-500/5 border border-red-500/20 overflow-hidden text-center group hover:bg-red-500/10 transition-colors">
                                <div className="absolute -right-4 -top-4 w-12 h-12 bg-red-500/20 blur-xl rounded-full" />
                                <Timer className="w-6 h-6 text-red-500 mx-auto mb-2" />
                                <p className="text-xs text-muted-foreground mb-1">Plus Long</p>
                                <p className="text-2xl font-bold text-red-500">{d.delaisVente.delaiMax}<span className="text-sm font-normal text-muted-foreground ml-1">jours</span></p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
