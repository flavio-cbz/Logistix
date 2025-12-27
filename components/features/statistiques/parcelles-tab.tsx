"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/shared/utils";
import type { StatistiquesData } from "@/lib/hooks/useStatistiques";
import { Package } from "lucide-react";
import { useFormatting } from "@/lib/hooks/use-formatting";

interface ParcellesTabProps {
    data: StatistiquesData;
}

export function ParcellesTab({ data }: ParcellesTabProps) {
    const d = data;
    const { formatCurrency, formatWeight } = useFormatting();

    return (
        <div className="space-y-6">
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
                                            Coût: {formatCurrency(parcelle.coutTotal)}
                                        </span>
                                        <span className="text-muted-foreground">•</span>
                                        <span className="text-muted-foreground">
                                            Poids: {formatWeight(parcelle.poidsTotal)}
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
                                            +{formatCurrency(parcelle.beneficesTotal)}
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
        </div>
    );
}
