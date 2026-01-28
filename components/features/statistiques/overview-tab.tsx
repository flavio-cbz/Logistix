"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { MetricCard } from "@/components/features/dashboard/metric-cards";
import { InteractiveChart } from "@/components/features/dashboard/interactive-charts";
import type { StatistiquesData } from "@/lib/hooks/useStatistiques";
import {
    DollarSign,
    Package,
    Percent,
    Target,
    CreditCard,
    Wallet,
    TrendingUp,
    TrendingDown,
    Activity,
    PieChart as PieChartIcon,
    BarChart3
} from "lucide-react";
import { useFormatting } from "@/lib/hooks/use-formatting";
import { cn } from "@/lib/shared/utils";
import { VintedStatsSection } from "./vinted-stats-section";

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

// Jauge visuelle pour afficher un pourcentage
function StatGauge({
    value,
    max = 100,
    label,
    color = "primary",
    size = "md"
}: {
    value: number;
    max?: number;
    label: string;
    color?: "primary" | "success" | "warning" | "destructive";
    size?: "sm" | "md" | "lg";
}) {
    const percentage = Math.min((value / max) * 100, 100);
    const radius = size === "sm" ? 30 : size === "md" ? 45 : 60;
    const strokeWidth = size === "sm" ? 6 : size === "md" ? 8 : 10;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    const colorClasses = {
        primary: "stroke-primary",
        success: "stroke-emerald-500",
        warning: "stroke-amber-500",
        destructive: "stroke-red-500"
    };

    const textSizes = {
        sm: "text-lg",
        md: "text-2xl",
        lg: "text-3xl"
    };

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="relative">
                <svg
                    width={(radius + strokeWidth) * 2}
                    height={(radius + strokeWidth) * 2}
                    className="transform -rotate-90"
                >
                    {/* Background circle */}
                    <circle
                        cx={radius + strokeWidth}
                        cy={radius + strokeWidth}
                        r={radius}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={strokeWidth}
                        className="text-muted/30"
                    />
                    {/* Progress circle */}
                    <circle
                        cx={radius + strokeWidth}
                        cy={radius + strokeWidth}
                        r={radius}
                        fill="none"
                        strokeWidth={strokeWidth}
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        className={cn(colorClasses[color], "transition-all duration-1000 ease-out")}
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className={cn("font-bold", textSizes[size])}>
                        {value.toFixed(1)}%
                    </span>
                </div>
            </div>
            <span className="text-sm text-muted-foreground font-medium">{label}</span>
        </div>
    );
}

// Indicateur de tendance visuel
function TrendIndicator({
    value,
    label,
    suffix = ""
}: {
    value: number;
    label: string;
    suffix?: string;
}) {
    const isPositive = value >= 0;

    return (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
            <div className={cn(
                "p-2 rounded-lg",
                isPositive ? "bg-emerald-500/10" : "bg-red-500/10"
            )}>
                {isPositive ? (
                    <TrendingUp className={cn("w-5 h-5", "text-emerald-500")} />
                ) : (
                    <TrendingDown className={cn("w-5 h-5", "text-red-500")} />
                )}
            </div>
            <div className="flex-1">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className={cn(
                    "text-lg font-bold",
                    isPositive ? "text-emerald-500" : "text-red-500"
                )}>
                    {isPositive ? "+" : ""}{value.toFixed(1)}{suffix}
                </p>
            </div>
        </div>
    );
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

    // Préparation des données pour les graphiques
    const evolutionChartData = d.evolutionTemporelle.map(point => {
        // Use proper date formatting based on available date string
        const dateLabel = formatCurrency(0).includes('€') // Hack to detect locale sort of, but better to use the date helper
            ? new Date(point.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
            : new Date(point.date).toLocaleDateString('en-US', { day: '2-digit', month: 'short' });

        return {
            name: dateLabel === "Invalid Date" ? "" : dateLabel,
            value: point.chiffreAffaires,
            benefices: point.benefices,
            ventes: point.ventes,
            produitsVendus: point.produitsVendus
        };
    });

    const plateformeChartData = d.performancePlateforme.map(p => ({
        name: p.plateforme,
        value: p.nbVentes,
        chiffreAffaires: p.chiffreAffaires,
        benefices: p.benefices
    }));

    // Calcul du ROI moyen
    const roiMoyen = d.performanceParcelle.length > 0
        ? d.performanceParcelle.reduce((sum, p) => sum + p.ROI, 0) / d.performanceParcelle.length
        : 0;

    // Score de santé financière (0-100)
    const healthScore = Math.min(100, Math.max(0,
        (d.vueEnsemble.tauxVente * 0.3) +
        (Math.min(d.vueEnsemble.margeMoyenne, 100) * 0.4) +
        (Math.min(roiMoyen, 100) * 0.3)
    ));

    const getHealthColor = (score: number): "success" | "warning" | "destructive" => {
        if (score >= 70) return "success";
        if (score >= 40) return "warning";
        return "destructive";
    };

    return (
        <div className="space-y-6">
            {/* Section Jauges Visuelles */}
            <Card className="glass-effect border-border/50">
                <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-primary" />
                        <CardTitle className="text-lg">Indicateurs de Performance</CardTitle>
                    </div>
                    <CardDescription>Vue synthétique de la santé de votre activité</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <StatGauge
                            value={healthScore}
                            label="Santé Globale"
                            color={getHealthColor(healthScore)}
                            size="lg"
                        />
                        <StatGauge
                            value={d.vueEnsemble.tauxVente}
                            label="Taux de Vente"
                            color={d.vueEnsemble.tauxVente >= 50 ? "success" : d.vueEnsemble.tauxVente >= 25 ? "warning" : "destructive"}
                        />
                        <StatGauge
                            value={d.vueEnsemble.margeMoyenne}
                            label="Marge Moyenne"
                            color={d.vueEnsemble.margeMoyenne >= 30 ? "success" : d.vueEnsemble.margeMoyenne >= 15 ? "warning" : "destructive"}
                        />
                        <StatGauge
                            value={roiMoyen}
                            max={150}
                            label="ROI Moyen"
                            color={roiMoyen >= 50 ? "success" : roiMoyen >= 20 ? "warning" : "destructive"}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Vinted Performance */}
            <VintedStatsSection />

            {/* Tendances période */}
            {d.vueEnsemble.trends && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    <TrendIndicator
                        value={d.vueEnsemble.trends.chiffreAffaires}
                        label="CA"
                        suffix="%"
                    />
                    <TrendIndicator
                        value={d.vueEnsemble.trends.produitsVendus}
                        label="Ventes"
                        suffix="%"
                    />
                    <TrendIndicator
                        value={d.vueEnsemble.trends.beneficesTotal}
                        label="Bénéfices"
                        suffix="%"
                    />
                    <TrendIndicator
                        value={d.vueEnsemble.trends.margeMoyenne}
                        label="Marge"
                        suffix="%"
                    />
                    <TrendIndicator
                        value={d.vueEnsemble.trends.prixMoyenVente}
                        label="Prix Moyen"
                        suffix="%"
                    />
                    <TrendIndicator
                        value={d.vueEnsemble.trends.tauxVente}
                        label="Taux Vente"
                        suffix="%"
                    />
                </div>
            )}

            {/* Métriques principales */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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

            {/* Graphiques d'évolution */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Évolution temporelle CA */}
                <InteractiveChart
                    title="Évolution du Chiffre d'Affaires"
                    data={evolutionChartData}
                    type="area"
                    dataKey="value"
                    xAxisKey="name"
                    height={280}
                    description="CA sur la période sélectionnée"
                    color="#0088FE"
                    gradient={true}
                />

                {/* Évolution temporelle Bénéfices */}
                <InteractiveChart
                    title="Évolution des Bénéfices"
                    data={evolutionChartData}
                    type="area"
                    dataKey="benefices"
                    xAxisKey="name"
                    height={280}
                    description="Bénéfices nets sur la période"
                    color="#00C49F"
                    gradient={true}
                />
            </div>

            {/* Répartition par plateforme */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Pie chart plateformes */}
                <InteractiveChart
                    title="Répartition par Plateforme"
                    data={plateformeChartData}
                    type="pie"
                    dataKey="value"
                    xAxisKey="name"
                    height={300}
                    description="Nombre de ventes par plateforme"
                />

                {/* Performance par Plateforme - Version améliorée */}
                <Card className="border-border/50">
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-primary" />
                            <CardTitle className="text-base">Détail par Plateforme</CardTitle>
                        </div>
                        <CardDescription>Ventes, CA et bénéfices détaillés</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {d.performancePlateforme.map((plateforme, index) => (
                                <div key={index} className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Badge
                                                variant="secondary"
                                                className="font-semibold"
                                            >
                                                {plateforme.plateforme}
                                            </Badge>
                                            <span className="text-sm text-muted-foreground">
                                                {plateforme.nbVentes} ventes
                                            </span>
                                        </div>
                                        <span className="text-sm font-bold text-emerald-500">
                                            +{formatCurrency(plateforme.benefices)}
                                        </span>
                                    </div>
                                    <Progress
                                        value={plateforme.partMarche}
                                        className="h-2"
                                    />
                                    <div className="flex gap-4 text-xs text-muted-foreground">
                                        <span>CA: {formatCurrency(plateforme.chiffreAffaires)}</span>
                                        <span>|</span>
                                        <span>Marge: {plateforme.margeMoyenne.toFixed(1)}%</span>
                                        <span>|</span>
                                        <span>Part: {plateforme.partMarche.toFixed(1)}%</span>
                                    </div>
                                </div>
                            ))}
                            {d.performancePlateforme.length === 0 && (
                                <div className="text-center py-8 text-muted-foreground">
                                    <PieChartIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p>Aucune donnée de plateforme</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Analyse des Coûts */}
            <Card className="border-border/50 bg-gradient-to-br from-card/80 to-card/40">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-primary" />
                        <CardTitle className="text-base">Analyse des Coûts</CardTitle>
                    </div>
                    <CardDescription>Répartition de vos investissements</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-6 md:grid-cols-3">
                        <div className="relative p-4 rounded-xl bg-muted/30 border border-border/50 overflow-hidden group hover:bg-muted/50 transition-colors">
                            <div className="absolute -right-4 -top-4 w-16 h-16 bg-blue-500/10 blur-2xl rounded-full" />
                            <p className="text-sm text-muted-foreground mb-1">Coût Achat Total</p>
                            <p className="text-2xl font-bold">{formatCurrency(d.analyseCouts.coutAchatTotal)}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                                Moy: {formatCurrency(d.analyseCouts.coutMoyenParProduit)}/produit
                            </p>
                        </div>
                        <div className="relative p-4 rounded-xl bg-muted/30 border border-border/50 overflow-hidden group hover:bg-muted/50 transition-colors">
                            <div className="absolute -right-4 -top-4 w-16 h-16 bg-amber-500/10 blur-2xl rounded-full" />
                            <p className="text-sm text-muted-foreground mb-1">Coût Livraison Total</p>
                            <p className="text-2xl font-bold">{formatCurrency(d.analyseCouts.coutLivraisonTotal)}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                                Moy: {formatCurrency(d.analyseCouts.coutMoyenLivraison)}/produit
                            </p>
                        </div>
                        <div className="relative p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 overflow-hidden group hover:from-primary/15 hover:to-primary/10 transition-colors">
                            <div className="absolute -right-4 -top-4 w-16 h-16 bg-primary/20 blur-2xl rounded-full" />
                            <p className="text-sm text-muted-foreground mb-1">Investissement Total</p>
                            <p className="text-2xl font-bold">{formatCurrency(d.analyseCouts.coutTotalInvesti)}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                                {d.analyseCouts.nbParcelles} parcelle(s)
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
