"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { MetricCard } from "@/components/features/dashboard/metric-cards";
import type { StatistiquesData } from "@/lib/hooks/useStatistiques";
import {
    DollarSign,
    Package,
    Percent,
    Target,
    CreditCard,
    Wallet
} from "lucide-react";
import { useFormatting } from "@/lib/hooks/use-formatting";

interface OverviewTabProps {
    data: StatistiquesData;
    selectedPeriod: string;
}

interface StatMetric {
    id: string;
    title: string;
    value: string | number;
    change: number;
    trend: 'up' | 'down' | 'stable';
    period: string;
    description: string;
    icon: React.ReactNode;
}

export function OverviewTab({ data, selectedPeriod }: OverviewTabProps) {
    const d = data;
    const { formatCurrency } = useFormatting();

    const metrics: StatMetric[] = [
        {
            id: 'revenue',
            title: 'Chiffre d\'Affaires',
            value: formatCurrency(d.vueEnsemble.chiffreAffaires),
            change: d.vueEnsemble.trends?.chiffreAffaires || 0,
            trend: (d.vueEnsemble.trends?.chiffreAffaires || 0) >= 0 ? 'up' : 'down',
            period: selectedPeriod,
            description: 'Revenus totaux générés',
            icon: <DollarSign className="w-4 h-4 text-primary" />
        },
        {
            id: 'products',
            title: 'Produits Vendus',
            value: d.vueEnsemble.produitsVendus,
            change: d.vueEnsemble.trends?.produitsVendus || 0,
            trend: (d.vueEnsemble.trends?.produitsVendus || 0) >= 0 ? 'up' : 'down',
            period: selectedPeriod,
            description: `${d.vueEnsemble.produitsVendus} sur ${d.vueEnsemble.totalProduits} produits`,
            icon: <Package className="w-4 h-4 text-primary" />
        },
        {
            id: 'margin',
            title: 'Marge Moyenne',
            value: `${d.vueEnsemble.margeMoyenne.toFixed(1)}%`,
            change: d.vueEnsemble.trends?.margeMoyenne || 0,
            trend: (d.vueEnsemble.trends?.margeMoyenne || 0) >= 0 ? 'up' : 'down',
            period: selectedPeriod,
            description: 'Marge bénéficiaire moyenne',
            icon: <Percent className="w-4 h-4 text-primary" />
        },
        {
            id: 'conversion',
            title: 'Taux de Vente',
            value: `${d.vueEnsemble.tauxVente.toFixed(1)}%`,
            change: d.vueEnsemble.trends?.tauxVente || 0,
            trend: (d.vueEnsemble.trends?.tauxVente || 0) >= 0 ? 'up' : 'down',
            period: selectedPeriod,
            description: 'Produits vendus / Total produits',
            icon: <Target className="w-4 h-4 text-primary" />
        },
        {
            id: 'avgprice',
            title: 'Prix Moyen Vente',
            value: formatCurrency(d.vueEnsemble.prixMoyenVente),
            change: d.vueEnsemble.trends?.prixMoyenVente || 0,
            trend: (d.vueEnsemble.trends?.prixMoyenVente || 0) >= 0 ? 'up' : 'down',
            period: selectedPeriod,
            description: 'Prix de vente moyen',
            icon: <CreditCard className="w-4 h-4 text-primary" />
        },
        {
            id: 'benefits',
            title: 'Bénéfices Totaux',
            value: formatCurrency(d.vueEnsemble.beneficesTotal),
            change: d.vueEnsemble.trends?.beneficesTotal || 0,
            trend: (d.vueEnsemble.trends?.beneficesTotal || 0) >= 0 ? 'up' : 'down',
            period: selectedPeriod,
            description: 'Bénéfices nets',
            icon: <Wallet className="w-4 h-4 text-primary" />
        }
    ];

    return (
        <div className="space-y-6">
            {/* Métriques principales */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {metrics.map((metric) => (
                    <MetricCard
                        key={metric.id}
                        title={metric.title}
                        value={metric.value}
                        change={metric.change}
                        trend={metric.trend}
                        icon={metric.icon}
                        description={metric.description}
                    />
                ))}
            </div>

            {/* Performance par Plateforme */}
            <Card>
                <CardHeader>
                    <CardTitle>Performance par Plateforme</CardTitle>
                    <CardDescription>Ventes et bénéfices par plateforme</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {d.performancePlateforme.map((plateforme, index) => (
                            <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-semibold">{plateforme.plateforme}</span>
                                        <span className="text-sm text-muted-foreground">
                                            {plateforme.nbVentes} ventes ({plateforme.partMarche.toFixed(1)}% du marché)
                                        </span>
                                    </div>
                                    <Progress value={plateforme.partMarche} className="h-2" />
                                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                                        <span>CA: {formatCurrency(plateforme.chiffreAffaires)}</span>
                                        <span>Bénéfices: {formatCurrency(plateforme.benefices)}</span>
                                        <span>Prix moyen: {formatCurrency(plateforme.prixMoyenVente)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Analyse des Coûts */}
            <div className="grid gap-6 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Coût Achat Total</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(d.analyseCouts.coutAchatTotal)}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Moyen: {formatCurrency(d.analyseCouts.coutMoyenParProduit)}/produit
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Coût Livraison Total</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(d.analyseCouts.coutLivraisonTotal)}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Moyen: {formatCurrency(d.analyseCouts.coutMoyenLivraison)}/produit
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Investissement Total</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(d.analyseCouts.coutTotalInvesti)}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {d.analyseCouts.nbParcelles} parcelle(s)
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
