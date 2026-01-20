"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    TrendingUp,
    TrendingDown,
    Package,
    Calendar,
    Plus,
    Loader2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch, postJson } from "@/lib/utils/api-fetch";
import { useFormatting } from "@/lib/hooks/use-formatting";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ShippingHistoryData {
    history: Array<{
        id: string;
        carrier: string;
        pricePerGram: number;
        totalWeight: number | null;
        totalPrice: number | null;
        source: string;
        notes: string | null;
        recordedAt: string;
    }>;
    stats: Array<{
        carrier: string;
        avgPricePerGram: number;
        minPricePerGram: number;
        maxPricePerGram: number;
        recordCount: number;
        lastRecordedAt: string;
    }>;
    evolution: Array<{
        date: string;
        carrier: string;
        pricePerGram: number;
    }>;
    carriers: string[];
}

function useShippingHistory(carrier?: string, days = 90) {
    return useQuery<ShippingHistoryData>({
        queryKey: ["shipping-history", carrier, days],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (carrier) params.set("carrier", carrier);
            params.set("days", days.toString());

            const response = await apiFetch<{ success: boolean; data: ShippingHistoryData }>(
                `/api/v1/shipping-history?${params.toString()}`
            );
            return response.data;
        },
        staleTime: 5 * 60 * 1000,
    });
}

function AddPriceDialog({ carriers, onSuccess }: { carriers: string[]; onSuccess: () => void }) {
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        carrier: "",
        newCarrier: "",
        pricePerGram: "",
        totalWeight: "",
        totalPrice: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const carrier = formData.carrier === "__new__" ? formData.newCarrier : formData.carrier;

            if (!carrier || !formData.pricePerGram) {
                toast.error("Veuillez remplir tous les champs obligatoires");
                return;
            }

            await postJson("/api/v1/shipping-history", {
                carrier,
                pricePerGram: parseFloat(formData.pricePerGram),
                totalWeight: formData.totalWeight ? parseFloat(formData.totalWeight) : undefined,
                totalPrice: formData.totalPrice ? parseFloat(formData.totalPrice) : undefined,
                source: "manual",
            });

            toast.success("Prix enregistré !");
            setOpen(false);
            setFormData({ carrier: "", newCarrier: "", pricePerGram: "", totalWeight: "", totalPrice: "" });
            onSuccess();
        } catch (error) {
            toast.error("Erreur lors de l'enregistrement");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter un prix
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Enregistrer un prix d&apos;envoi</DialogTitle>
                    <DialogDescription>
                        Ajoutez un nouveau prix au gramme pour suivre l&apos;évolution
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="carrier">Transporteur *</Label>
                            <Select
                                value={formData.carrier}
                                onValueChange={(value) => setFormData((prev) => ({ ...prev, carrier: value }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Choisir un transporteur" />
                                </SelectTrigger>
                                <SelectContent>
                                    {carriers.map((c) => (
                                        <SelectItem key={c} value={c}>
                                            {c}
                                        </SelectItem>
                                    ))}
                                    <SelectItem value="__new__">+ Nouveau transporteur</SelectItem>
                                </SelectContent>
                            </Select>
                            {formData.carrier === "__new__" && (
                                <Input
                                    placeholder="Nom du transporteur"
                                    value={formData.newCarrier}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, newCarrier: e.target.value }))}
                                />
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="pricePerGram">Prix au gramme (€) *</Label>
                            <Input
                                id="pricePerGram"
                                type="number"
                                step="0.0001"
                                placeholder="0.0175"
                                value={formData.pricePerGram}
                                onChange={(e) => setFormData((prev) => ({ ...prev, pricePerGram: e.target.value }))}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="totalWeight">Poids total (g)</Label>
                                <Input
                                    id="totalWeight"
                                    type="number"
                                    step="0.01"
                                    placeholder="2500"
                                    value={formData.totalWeight}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, totalWeight: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="totalPrice">Prix total (€)</Label>
                                <Input
                                    id="totalPrice"
                                    type="number"
                                    step="0.01"
                                    placeholder="43.75"
                                    value={formData.totalPrice}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, totalPrice: e.target.value }))}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Annuler
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Enregistrer
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export function ShippingHistoryChart() {
    const [selectedCarrier, setSelectedCarrier] = useState<string | undefined>(undefined);
    const [selectedDays, setSelectedDays] = useState(90);
    const { data, isLoading, error, refetch } = useShippingHistory(selectedCarrier, selectedDays);
    const { formatCurrency, formatDate } = useFormatting();

    // Calculate max price for chart scaling
    const maxPrice = useMemo(() => {
        if (!data?.evolution?.length) return 0.05;
        return Math.max(...data.evolution.map((e) => e.pricePerGram)) * 1.1;
    }, [data?.evolution]);

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-32" />
                <Skeleton className="h-64" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <Card>
                <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">Erreur lors du chargement des données</p>
                </CardContent>
            </Card>
        );
    }

    const { stats, evolution, carriers, history } = data;

    return (
        <div className="space-y-6">
            {/* Controls */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <Select
                        value={selectedCarrier || "all"}
                        onValueChange={(v) => setSelectedCarrier(v === "all" ? undefined : v)}
                    >
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Tous les transporteurs" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tous les transporteurs</SelectItem>
                            {carriers.map((c) => (
                                <SelectItem key={c} value={c}>
                                    {c}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select
                        value={selectedDays.toString()}
                        onValueChange={(v) => setSelectedDays(parseInt(v))}
                    >
                        <SelectTrigger className="w-[120px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="30">30 jours</SelectItem>
                            <SelectItem value="90">90 jours</SelectItem>
                            <SelectItem value="180">6 mois</SelectItem>
                            <SelectItem value="365">1 an</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <AddPriceDialog carriers={carriers} onSuccess={() => refetch()} />
            </div>

            {/* Carrier Stats Cards */}
            {stats.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {stats.slice(0, 6).map((stat) => {
                        const trend = stat.recordCount > 1
                            ? ((evolution.filter(e => e.carrier === stat.carrier).at(-1)?.pricePerGram || stat.avgPricePerGram) - stat.avgPricePerGram) / stat.avgPricePerGram * 100
                            : 0;

                        return (
                            <Card key={stat.carrier}>
                                <CardContent className="pt-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Package className="h-4 w-4 text-muted-foreground" />
                                            <span className="font-medium">{stat.carrier}</span>
                                        </div>
                                        <Badge variant="secondary">{stat.recordCount} enregistrements</Badge>
                                    </div>
                                    <div className="mt-3 flex items-end justify-between">
                                        <div>
                                            <p className="text-2xl font-bold">{stat.avgPricePerGram.toFixed(4)}€/g</p>
                                            <p className="text-xs text-muted-foreground">
                                                Min: {stat.minPricePerGram.toFixed(4)}€ · Max: {stat.maxPricePerGram.toFixed(4)}€
                                            </p>
                                        </div>
                                        {trend !== 0 && (
                                            <div className={cn("flex items-center gap-1", trend > 0 ? "text-red-500" : "text-green-500")}>
                                                {trend > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                                <span className="text-sm font-medium">{Math.abs(trend).toFixed(1)}%</span>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Price Evolution Chart */}
            {evolution.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5" />
                            Évolution des prix
                        </CardTitle>
                        <CardDescription>
                            Prix au gramme sur les {selectedDays} derniers jours
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-64 flex items-end gap-1">
                            {evolution.map((point, idx) => {
                                const height = (point.pricePerGram / maxPrice) * 100;
                                const colors: Record<string, string> = {
                                    "E-EMS": "bg-blue-500",
                                    "EMS": "bg-green-500",
                                    "DHL": "bg-yellow-500",
                                    "UPS": "bg-orange-500",
                                    "FedEx": "bg-purple-500",
                                };
                                const bgColor = colors[point.carrier] || "bg-primary";

                                return (
                                    <div
                                        key={`${point.date}-${point.carrier}-${idx}`}
                                        className="flex-1 min-w-[4px] max-w-[20px] group relative"
                                    >
                                        <div
                                            className={cn(
                                                "w-full rounded-t transition-all hover:opacity-80",
                                                bgColor
                                            )}
                                            style={{ height: `${Math.max(height, 2)}%` }}
                                        />
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                                            <div className="bg-popover text-popover-foreground text-xs p-2 rounded shadow-lg whitespace-nowrap">
                                                <p className="font-medium">{point.carrier}</p>
                                                <p>{formatDate(point.date)}</p>
                                                <p className="text-primary font-bold">{point.pricePerGram.toFixed(4)}€/g</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                            <span>{evolution[0]?.date}</span>
                            <span>{evolution[evolution.length - 1]?.date}</span>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Recent Records */}
            {history.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Historique récent</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {history.slice(0, 10).map((record) => (
                                <div
                                    key={record.id}
                                    className="flex items-center justify-between py-2 border-b last:border-0"
                                >
                                    <div className="flex items-center gap-3">
                                        <Badge variant="outline">{record.carrier}</Badge>
                                        <span className="font-medium">{record.pricePerGram.toFixed(4)}€/g</span>
                                        {record.totalWeight && (
                                            <span className="text-sm text-muted-foreground">
                                                ({record.totalWeight}g · {formatCurrency(record.totalPrice || 0)})
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Badge variant="secondary" className="text-xs">
                                            {record.source === "manual" ? "Manuel" : record.source === "superbuy_sync" ? "Sync" : "Parcelle"}
                                        </Badge>
                                        <span>{formatDate(record.recordedAt)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Empty State */}
            {!history.length && !stats.length && (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium">Aucun historique</h3>
                        <p className="text-muted-foreground mb-4">
                            Commencez à enregistrer vos prix d&apos;envoi pour suivre l&apos;évolution
                        </p>
                        <AddPriceDialog carriers={[]} onSuccess={() => refetch()} />
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
