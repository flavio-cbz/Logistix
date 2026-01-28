<<<<<<< HEAD
"use client";

import { useParams, useRouter } from "next/navigation";
import { useMemo } from "react";
import {
    Package,
    ArrowLeft,
    MapPin,
    Scale,
    DollarSign,
    TrendingUp,
    ShoppingBag,
    Clock,
    CheckCircle,
    AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { useParcelle } from "@/lib/hooks/use-parcelles";
import { useParcelProducts, useParcelStats } from "@/lib/hooks/use-parcel-products";
import { useFormatting } from "@/lib/hooks/use-formatting";
import { cn } from "@/lib/utils";
import { Product } from "@/lib/shared/types/entities";

function StatCard({
    icon: Icon,
    title,
    value,
    subtitle,
    colorClass = "text-primary",
}: {
    icon: React.ElementType;
    title: string;
    value: string | number;
    subtitle?: string;
    colorClass?: string;
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
            </CardContent>
        </Card>
    );
}

function ProductStatusBadge({ product }: { product: Product }) {
    if (product.vendu === "1") {
        return <Badge variant="default" className="bg-green-500">Vendu</Badge>;
    }
    if (product.listedAt) {
        return <Badge variant="secondary">En ligne</Badge>;
    }
    return <Badge variant="outline">Brouillon</Badge>;
}

export default function ParcelDetailPage() {
    const params = useParams();
    const router = useRouter();
    const parcelId = params["id"] as string;

    const { formatCurrency, formatWeight } = useFormatting();

    // Fetch parcel data
    const { data: parcelle, isLoading: isParcelLoading } = useParcelle(parcelId);

    // Fetch products for this parcel
    const { data: products, isLoading: isProductsLoading } = useParcelProducts(parcelId);

    // Calculate stats
    const stats = useParcelStats(products, parcelle);

    const isLoading = isParcelLoading || isProductsLoading;

    // Calculate parcel details
    const parcelDetails = useMemo(() => {
        if (!parcelle) return null;

        return {
            totalCost: parcelle.totalPrice || 0,
            pricePerGram: parcelle.pricePerGram || 0,
            carrier: parcelle.carrier || "Non spécifié",
            trackingNumber: parcelle.trackingNumber || "Non disponible",
        };
    }, [parcelle]);

    if (isLoading) {
        return (
            <div className="container mx-auto py-6 space-y-6">
                <Skeleton className="h-8 w-48" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-32" />
                    ))}
                </div>
                <Skeleton className="h-64" />
            </div>
        );
    }

    if (!parcelle) {
        return (
            <div className="container mx-auto py-6">
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium">Parcelle non trouvée</h3>
                        <Button variant="ghost" className="mt-4" onClick={() => router.back()}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Retour
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Package className="h-6 w-6" />
                        {parcelle.name || `Parcelle ${parcelle.superbuyId}`}
                    </h1>
                    <p className="text-muted-foreground flex items-center gap-2 mt-1">
                        <MapPin className="h-4 w-4" />
                        {parcelDetails?.carrier} · {parcelDetails?.trackingNumber}
                    </p>
                </div>
                <Badge variant={parcelle.status === "delivered" ? "default" : "secondary"} className="text-sm">
                    {parcelle.status === "delivered" ? "Livré" : parcelle.status}
                </Badge>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <StatCard
                    icon={ShoppingBag}
                    title="Produits"
                    value={stats.totalProducts}
                    subtitle={`${stats.soldProducts} vendus`}
                />
                <StatCard
                    icon={Scale}
                    title="Poids utilisé"
                    value={formatWeight(stats.totalWeightUsed)}
                    subtitle={`sur ${formatWeight(parcelle.weight || 0)}`}
                    colorClass={stats.weightUtilization > 100 ? "text-red-500" : "text-blue-500"}
                />
                <StatCard
                    icon={DollarSign}
                    title="Valeur achat"
                    value={formatCurrency(stats.totalPurchaseValue)}
                    subtitle={`Coût parcelle: ${formatCurrency(parcelDetails?.totalCost || 0)}`}
                />
                <StatCard
                    icon={TrendingUp}
                    title="Ventes"
                    value={formatCurrency(stats.totalSoldValue)}
                    colorClass="text-green-500"
                />
                <StatCard
                    icon={CheckCircle}
                    title="Bénéfice"
                    value={`${stats.totalProfit >= 0 ? "+" : ""}${formatCurrency(stats.totalProfit)}`}
                    subtitle={`Marge: ${stats.averageMargin.toFixed(1)}%`}
                    colorClass={stats.totalProfit >= 0 ? "text-green-500" : "text-red-500"}
                />
                <StatCard
                    icon={Clock}
                    title="Prix/gramme"
                    value={`${(parcelDetails?.pricePerGram || 0).toFixed(4)}€`}
                    subtitle="Coût d'envoi unitaire"
                />
            </div>

            {/* Weight Utilization Progress */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Utilisation du poids</CardTitle>
                    <CardDescription>
                        {formatWeight(stats.totalWeightUsed)} sur {formatWeight(parcelle.weight || 0)} ({stats.weightUtilization.toFixed(1)}%)
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                        <div
                            className={cn(
                                "h-full transition-all duration-500",
                                stats.weightUtilization > 100 ? "bg-red-500" :
                                    stats.weightUtilization > 80 ? "bg-yellow-500" : "bg-green-500"
                            )}
                            style={{ width: `${Math.min(stats.weightUtilization, 100)}%` }}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Products Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Produits associés ({stats.totalProducts})</CardTitle>
                    <CardDescription>
                        {stats.soldProducts} vendus · {stats.onlineProducts} en ligne · {stats.draftProducts} brouillons
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {products && products.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Produit</TableHead>
                                    <TableHead>Marque</TableHead>
                                    <TableHead className="text-right">Poids</TableHead>
                                    <TableHead className="text-right">Prix achat</TableHead>
                                    <TableHead className="text-right">Coût envoi</TableHead>
                                    <TableHead className="text-right">Coût total</TableHead>
                                    <TableHead className="text-right">Prix vente</TableHead>
                                    <TableHead className="text-right">Bénéfice</TableHead>
                                    <TableHead>Statut</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {products.map((product) => {
                                    const shippingCost = (product.poids || 0) * (parcelDetails?.pricePerGram || 0);
                                    const totalCost = (product.price || 0) + shippingCost;
                                    const profit = product.vendu === "1" && product.sellingPrice
                                        ? product.sellingPrice - totalCost
                                        : null;

                                    return (
                                        <TableRow key={product.id} className="cursor-pointer hover:bg-muted/50">
                                            <TableCell className="font-medium max-w-[200px] truncate">
                                                {product.name}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {product.brand || "—"}
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">
                                                {formatWeight(product.poids || 0)}
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">
                                                {formatCurrency(product.price || 0)}
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums text-muted-foreground">
                                                {formatCurrency(shippingCost)}
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums font-medium">
                                                {formatCurrency(totalCost)}
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">
                                                {product.sellingPrice ? formatCurrency(product.sellingPrice) : "—"}
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">
                                                {profit !== null ? (
                                                    <span className={cn(
                                                        "font-bold",
                                                        profit >= 0 ? "text-green-500" : "text-red-500"
                                                    )}>
                                                        {profit >= 0 ? "+" : ""}{formatCurrency(profit)}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <ProductStatusBadge product={product} />
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <ShoppingBag className="h-12 w-12 mb-4 opacity-50" />
                            <p>Aucun produit associé à cette parcelle</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
=======
"use client";

import { useParams, useRouter } from "next/navigation";
import { useMemo } from "react";
import {
    Package,
    ArrowLeft,
    MapPin,
    Scale,
    DollarSign,
    TrendingUp,
    ShoppingBag,
    Clock,
    CheckCircle,
    AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { useParcelle } from "@/lib/hooks/use-parcelles";
import { useParcelProducts, useParcelStats } from "@/lib/hooks/use-parcel-products";
import { useFormatting } from "@/lib/hooks/use-formatting";
import { cn } from "@/lib/utils";
import { Product } from "@/lib/shared/types/entities";

function StatCard({
    icon: Icon,
    title,
    value,
    subtitle,
    colorClass = "text-primary",
}: {
    icon: React.ElementType;
    title: string;
    value: string | number;
    subtitle?: string;
    colorClass?: string;
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
            </CardContent>
        </Card>
    );
}

function ProductStatusBadge({ product }: { product: Product }) {
    if (product.vendu === "1") {
        return <Badge variant="default" className="bg-green-500">Vendu</Badge>;
    }
    if (product.listedAt) {
        return <Badge variant="secondary">En ligne</Badge>;
    }
    return <Badge variant="outline">Brouillon</Badge>;
}

export default function ParcelDetailPage() {
    const params = useParams();
    const router = useRouter();
    const parcelId = params["id"] as string;

    const { formatCurrency, formatWeight } = useFormatting();

    // Fetch parcel data
    const { data: parcelle, isLoading: isParcelLoading } = useParcelle(parcelId);

    // Fetch products for this parcel
    const { data: products, isLoading: isProductsLoading } = useParcelProducts(parcelId);

    // Calculate stats
    const stats = useParcelStats(products, parcelle);

    const isLoading = isParcelLoading || isProductsLoading;

    // Calculate parcel details
    const parcelDetails = useMemo(() => {
        if (!parcelle) return null;

        return {
            totalCost: parcelle.totalPrice || 0,
            pricePerGram: parcelle.pricePerGram || 0,
            carrier: parcelle.carrier || "Non spécifié",
            trackingNumber: parcelle.trackingNumber || "Non disponible",
        };
    }, [parcelle]);

    if (isLoading) {
        return (
            <div className="container mx-auto py-6 space-y-6">
                <Skeleton className="h-8 w-48" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-32" />
                    ))}
                </div>
                <Skeleton className="h-64" />
            </div>
        );
    }

    if (!parcelle) {
        return (
            <div className="container mx-auto py-6">
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium">Parcelle non trouvée</h3>
                        <Button variant="ghost" className="mt-4" onClick={() => router.back()}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Retour
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Package className="h-6 w-6" />
                        {parcelle.name || `Parcelle ${parcelle.superbuyId}`}
                    </h1>
                    <p className="text-muted-foreground flex items-center gap-2 mt-1">
                        <MapPin className="h-4 w-4" />
                        {parcelDetails?.carrier} · {parcelDetails?.trackingNumber}
                    </p>
                </div>
                <Badge variant={parcelle.status === "delivered" ? "default" : "secondary"} className="text-sm">
                    {parcelle.status === "delivered" ? "Livré" : parcelle.status}
                </Badge>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <StatCard
                    icon={ShoppingBag}
                    title="Produits"
                    value={stats.totalProducts}
                    subtitle={`${stats.soldProducts} vendus`}
                />
                <StatCard
                    icon={Scale}
                    title="Poids utilisé"
                    value={formatWeight(stats.totalWeightUsed)}
                    subtitle={`sur ${formatWeight(parcelle.weight || 0)}`}
                    colorClass={stats.weightUtilization > 100 ? "text-red-500" : "text-blue-500"}
                />
                <StatCard
                    icon={DollarSign}
                    title="Valeur achat"
                    value={formatCurrency(stats.totalPurchaseValue)}
                    subtitle={`Coût parcelle: ${formatCurrency(parcelDetails?.totalCost || 0)}`}
                />
                <StatCard
                    icon={TrendingUp}
                    title="Ventes"
                    value={formatCurrency(stats.totalSoldValue)}
                    colorClass="text-green-500"
                />
                <StatCard
                    icon={CheckCircle}
                    title="Bénéfice"
                    value={`${stats.totalProfit >= 0 ? "+" : ""}${formatCurrency(stats.totalProfit)}`}
                    subtitle={`Marge: ${stats.averageMargin.toFixed(1)}%`}
                    colorClass={stats.totalProfit >= 0 ? "text-green-500" : "text-red-500"}
                />
                <StatCard
                    icon={Clock}
                    title="Prix/gramme"
                    value={`${(parcelDetails?.pricePerGram || 0).toFixed(4)}€`}
                    subtitle="Coût d'envoi unitaire"
                />
            </div>

            {/* Weight Utilization Progress */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Utilisation du poids</CardTitle>
                    <CardDescription>
                        {formatWeight(stats.totalWeightUsed)} sur {formatWeight(parcelle.weight || 0)} ({stats.weightUtilization.toFixed(1)}%)
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                        <div
                            className={cn(
                                "h-full transition-all duration-500",
                                stats.weightUtilization > 100 ? "bg-red-500" :
                                    stats.weightUtilization > 80 ? "bg-yellow-500" : "bg-green-500"
                            )}
                            style={{ width: `${Math.min(stats.weightUtilization, 100)}%` }}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Products Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Produits associés ({stats.totalProducts})</CardTitle>
                    <CardDescription>
                        {stats.soldProducts} vendus · {stats.onlineProducts} en ligne · {stats.draftProducts} brouillons
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {products && products.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Produit</TableHead>
                                    <TableHead>Marque</TableHead>
                                    <TableHead className="text-right">Poids</TableHead>
                                    <TableHead className="text-right">Prix achat</TableHead>
                                    <TableHead className="text-right">Coût envoi</TableHead>
                                    <TableHead className="text-right">Coût total</TableHead>
                                    <TableHead className="text-right">Prix vente</TableHead>
                                    <TableHead className="text-right">Bénéfice</TableHead>
                                    <TableHead>Statut</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {products.map((product) => {
                                    const shippingCost = (product.poids || 0) * (parcelDetails?.pricePerGram || 0);
                                    const totalCost = (product.price || 0) + shippingCost;
                                    const profit = product.vendu === "1" && product.sellingPrice
                                        ? product.sellingPrice - totalCost
                                        : null;

                                    return (
                                        <TableRow key={product.id} className="cursor-pointer hover:bg-muted/50">
                                            <TableCell className="font-medium max-w-[200px] truncate">
                                                {product.name}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {product.brand || "—"}
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">
                                                {formatWeight(product.poids || 0)}
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">
                                                {formatCurrency(product.price || 0)}
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums text-muted-foreground">
                                                {formatCurrency(shippingCost)}
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums font-medium">
                                                {formatCurrency(totalCost)}
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">
                                                {product.sellingPrice ? formatCurrency(product.sellingPrice) : "—"}
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">
                                                {profit !== null ? (
                                                    <span className={cn(
                                                        "font-bold",
                                                        profit >= 0 ? "text-green-500" : "text-red-500"
                                                    )}>
                                                        {profit >= 0 ? "+" : ""}{formatCurrency(profit)}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <ProductStatusBadge product={product} />
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <ShoppingBag className="h-12 w-12 mb-4 opacity-50" />
                            <p>Aucun produit associé à cette parcelle</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
