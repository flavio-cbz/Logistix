"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { StatistiquesData } from "@/lib/hooks/useStatistiques";
import { Package } from "lucide-react";

interface ProduitsTabProps {
    data: StatistiquesData;
}

export function ProduitsTab({ data }: ProduitsTabProps) {
    const d = data;

    return (
        <div className="space-y-6">
            {/* Top Produits */}
            <Card>
                <CardHeader>
                    <CardTitle>Top 10 Produits</CardTitle>
                    <CardDescription>Meilleurs performers par bénéfice</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {d.topProduits.map((produit, index) => (
                            <div key={produit.id} className="flex items-center justify-between p-3 rounded-lg bg-emerald-50/50 border border-emerald-100">
                                <div className="flex items-center gap-3 flex-1">
                                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-600 text-white text-sm font-bold">
                                        {index + 1}
                                    </span>
                                    <div className="flex-1">
                                        <p className="font-medium">{produit.nom}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {produit.plateforme} • Vendu le {produit.dateVente ? new Date(produit.dateVente).toLocaleDateString('fr-FR') : 'Date inconnue'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-6 text-right">
                                    <div>
                                        <p className="text-xs text-muted-foreground">Achat</p>
                                        <p className="text-sm font-medium">{produit.prixAchat}€</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Vente</p>
                                        <p className="text-sm font-medium">{produit.prixVente}€</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Bénéfice</p>
                                        <p className="text-lg font-bold text-emerald-600">+{produit.benefice.toFixed(2)}€</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Marge</p>
                                        <p className="text-sm font-semibold">{produit.margePercent.toFixed(1)}%</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {d.topProduits.length === 0 && (
                            <div className="text-center py-12">
                                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                <p className="text-muted-foreground">Aucun produit vendu</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Produits Non Vendus */}
            {d.produitsNonVendus.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Produits Non Vendus ({d.produitsNonVendus.length})</CardTitle>
                        <CardDescription>Stock actuel à écouler</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3 max-h-[400px] overflow-y-auto">
                            {d.produitsNonVendus.map((produit) => (
                                <div key={produit.id} className="flex items-center justify-between p-3 rounded-lg bg-orange-50/50 border border-orange-100">
                                    <div className="flex-1">
                                        <p className="font-medium">{produit.nom}</p>
                                        <p className="text-xs text-muted-foreground">
                                            Parcelle: {produit.parcelleNumero} • Coût total: {((produit.prixAchat || 0) + (produit.coutLivraison || 0)).toFixed(2)}€
                                        </p>
                                    </div>
                                    <div className="flex gap-4 text-right">
                                        {produit.joursEnLigne !== null && produit.joursEnLigne > 0 ? (
                                            <Badge variant="outline" className="bg-orange-100">
                                                {produit.joursEnLigne}j en ligne
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary">Brouillon</Badge>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
