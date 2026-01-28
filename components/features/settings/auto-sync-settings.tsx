"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    RefreshCw,
    Clock,
    Package,
    ShoppingBag,
    Bell,
    Settings,
    Loader2,
    Sparkles,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch, patchJson } from "@/lib/utils/api-fetch";
import { toast } from "sonner";
import { useParcelles } from "@/lib/hooks/use-parcelles";

interface UserPreferences {
    autoSync?: {
        enabled?: boolean;
        interval?: "hourly" | "daily" | "weekly" | "manual";
        syncParcels?: boolean;
        syncOrders?: boolean;
        notifyOnSync?: boolean;
    };
    orderMatching?: {
        autoCreateProducts?: boolean;
        autoEnrich?: boolean;
        defaultParcelId?: string;
    };
}

interface UserSettings {
    preferences: UserPreferences;
}

function useUserSettings() {
    return useQuery<UserSettings>({
        queryKey: ["user-settings"],
        queryFn: async () => {
            const response = await apiFetch<{ success: boolean; data: UserSettings }>(
                "/api/v1/settings/user"
            );
            return response.data;
        },
        staleTime: 5 * 60 * 1000,
    });
}

function useUpdateSettings() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (preferences: UserPreferences) => {
            const response = await patchJson<{ preferences: UserPreferences }, { success: boolean }>("/api/v1/settings/user", {
                preferences,
            });
            return response;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["user-settings"] });
        },
    });
}

export function AutoSyncSettings() {
    const { data: settings, isLoading } = useUserSettings();
    const { data: parcelles } = useParcelles();
    const updateSettings = useUpdateSettings();

    const [autoSync, setAutoSync] = useState<UserPreferences["autoSync"]>({
        enabled: false,
        interval: "daily",
        syncParcels: true,
        syncOrders: true,
        notifyOnSync: true,
    });

    const [orderMatching, setOrderMatching] = useState<UserPreferences["orderMatching"]>({
        autoCreateProducts: false,
        autoEnrich: false,
        defaultParcelId: undefined,
    });

    const [hasChanges, setHasChanges] = useState(false);

    // Load settings when data is fetched
    useEffect(() => {
        if (settings?.preferences) {
            setAutoSync({
                enabled: settings.preferences.autoSync?.enabled ?? false,
                interval: settings.preferences.autoSync?.interval ?? "daily",
                syncParcels: settings.preferences.autoSync?.syncParcels ?? true,
                syncOrders: settings.preferences.autoSync?.syncOrders ?? true,
                notifyOnSync: settings.preferences.autoSync?.notifyOnSync ?? true,
            });
            setOrderMatching({
                autoCreateProducts: settings.preferences.orderMatching?.autoCreateProducts ?? false,
                autoEnrich: settings.preferences.orderMatching?.autoEnrich ?? false,
                defaultParcelId: settings.preferences.orderMatching?.defaultParcelId,
            });
        }
    }, [settings]);

    const handleSave = async () => {
        try {
            await updateSettings.mutateAsync({
                ...settings?.preferences,
                autoSync,
                orderMatching,
            });
            setHasChanges(false);
            toast.success("Paramètres sauvegardés !");
        } catch {
            toast.error("Erreur lors de la sauvegarde");
        }
    };

    const updateAutoSync = (updates: Partial<UserPreferences["autoSync"]>) => {
        setAutoSync((prev) => ({ ...prev, ...updates }));
        setHasChanges(true);
    };

    const updateOrderMatching = (updates: Partial<UserPreferences["orderMatching"]>) => {
        setOrderMatching((prev) => ({ ...prev, ...updates }));
        setHasChanges(true);
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-48" />
                <Skeleton className="h-48" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Auto-Sync Settings */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <RefreshCw className="h-5 w-5" />
                        Synchronisation automatique
                    </CardTitle>
                    <CardDescription>
                        Configurez la synchronisation automatique avec Superbuy
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Master Toggle */}
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="auto-sync-enabled" className="text-base font-medium">
                                Activer la sync automatique
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                Synchronise automatiquement vos données Superbuy
                            </p>
                        </div>
                        <Switch
                            id="auto-sync-enabled"
                            checked={autoSync?.enabled}
                            onCheckedChange={(checked) => updateAutoSync({ enabled: checked })}
                        />
                    </div>

                    {autoSync?.enabled && (
                        <>
                            <Separator />

                            {/* Interval */}
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-base font-medium flex items-center gap-2">
                                        <Clock className="h-4 w-4" />
                                        Fréquence
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        À quelle fréquence synchroniser
                                    </p>
                                </div>
                                <Select
                                    value={autoSync?.interval ?? "manual"}
                                    onValueChange={(value) =>
                                        updateAutoSync({ interval: value as "hourly" | "daily" | "weekly" | "manual" })
                                    }
                                >
                                    <SelectTrigger className="w-[140px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="hourly">Toutes les heures</SelectItem>
                                        <SelectItem value="daily">Quotidien</SelectItem>
                                        <SelectItem value="weekly">Hebdomadaire</SelectItem>
                                        <SelectItem value="manual">Manuel uniquement</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Sync Options */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Package className="h-4 w-4 text-muted-foreground" />
                                        <Label htmlFor="sync-parcels">Synchroniser les parcelles</Label>
                                    </div>
                                    <Switch
                                        id="sync-parcels"
                                        checked={autoSync?.syncParcels}
                                        onCheckedChange={(checked) => updateAutoSync({ syncParcels: checked })}
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                                        <Label htmlFor="sync-orders">Synchroniser les commandes</Label>
                                    </div>
                                    <Switch
                                        id="sync-orders"
                                        checked={autoSync?.syncOrders}
                                        onCheckedChange={(checked) => updateAutoSync({ syncOrders: checked })}
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Bell className="h-4 w-4 text-muted-foreground" />
                                        <Label htmlFor="notify-sync">Notifications de sync</Label>
                                    </div>
                                    <Switch
                                        id="notify-sync"
                                        checked={autoSync?.notifyOnSync}
                                        onCheckedChange={(checked) => updateAutoSync({ notifyOnSync: checked })}
                                    />
                                </div>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Order-to-Product Matching */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Matching Commandes → Produits
                    </CardTitle>
                    <CardDescription>
                        Automatisez la création de produits à partir de vos commandes
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Auto-create products */}
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="auto-create" className="text-base font-medium">
                                Créer les produits automatiquement
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                Crée un produit pour chaque article de commande importé
                            </p>
                        </div>
                        <Switch
                            id="auto-create"
                            checked={orderMatching?.autoCreateProducts}
                            onCheckedChange={(checked) => updateOrderMatching({ autoCreateProducts: checked })}
                        />
                    </div>

                    {orderMatching?.autoCreateProducts && (
                        <>
                            <Separator />

                            {/* Auto-enrich */}
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-base font-medium flex items-center gap-2">
                                        <Sparkles className="h-4 w-4 text-purple-500" />
                                        Enrichir automatiquement
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        Lance l&apos;enrichissement IA après création
                                    </p>
                                </div>
                                <Switch
                                    checked={orderMatching?.autoEnrich}
                                    onCheckedChange={(checked) => updateOrderMatching({ autoEnrich: checked })}
                                />
                            </div>

                            {/* Default parcel */}
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-base font-medium">Parcelle par défaut</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Associe les nouveaux produits à cette parcelle
                                    </p>
                                </div>
                                <Select
                                    value={orderMatching?.defaultParcelId || "none"}
                                    onValueChange={(value) =>
                                        updateOrderMatching({ defaultParcelId: value === "none" ? undefined : value })
                                    }
                                >
                                    <SelectTrigger className="w-[200px]">
                                        <SelectValue placeholder="Aucune" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Aucune</SelectItem>
                                        {parcelles?.map((p) => (
                                            <SelectItem key={p.id} value={p.id}>
                                                {p.name || p.superbuyId}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Save Button */}
            {hasChanges && (
                <div className="flex justify-end">
                    <Button onClick={handleSave} disabled={updateSettings.isPending}>
                        {updateSettings.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Sauvegarder les modifications
                    </Button>
                </div>
            )}
        </div>
    );
}
