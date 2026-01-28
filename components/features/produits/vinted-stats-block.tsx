"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Heart, TrendingUp, RefreshCw, Link as LinkIcon, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface VintedStats {
    viewCount: number;
    favouriteCount: number;
    isReserved: boolean;
    isClosed: boolean;
    interestRate: number;
    lastSyncAt: string;
}

interface VintedStatsBlockProps {
    productId: string;
    externalId: string | null;
    stats: VintedStats | null;
    vintedUrl?: string | null;
    onSync?: () => void;
    onAssociate?: () => void;
}

export function VintedStatsBlock({
    productId,
    externalId,
    stats,
    vintedUrl,
    onSync,
    onAssociate
}: VintedStatsBlockProps) {
    const [isSyncing, setIsSyncing] = useState(false);

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            const res = await fetch(`/api/v1/products/${productId}/sync-vinted`, {
                method: 'POST'
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Sync failed');
            }

            toast.success("Statistiques mises à jour");
            onSync?.();
        } catch (error) {
            toast.error("Erreur de synchronisation", {
                description: error instanceof Error ? error.message : "Réessayez plus tard"
            });
        } finally {
            setIsSyncing(false);
        }
    };

    // Not linked to Vinted - show CTA
    if (!externalId) {
        return (
            <Card className="border-dashed border-2 border-muted-foreground/25">
                <CardContent className="py-4 text-center">
                    <LinkIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground mb-3">
                        Associez ce produit à Vinted pour débloquer les statistiques
                    </p>
                    <Button variant="outline" size="sm" onClick={onAssociate}>
                        Associer à Vinted
                    </Button>
                </CardContent>
            </Card>
        );
    }

    // Linked but no stats yet
    if (!stats) {
        return (
            <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200/50">
                <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                                <TrendingUp className="h-4 w-4 text-blue-600" />
                            </div>
                            <span className="text-sm font-medium">Statistiques Vinted</span>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleSync}
                            disabled={isSyncing}
                        >
                            <RefreshCw className={`h-4 w-4 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
                            Charger
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Full stats display
    const lastSync = stats.lastSyncAt
        ? formatDistanceToNow(new Date(stats.lastSyncAt), { addSuffix: true, locale: fr })
        : 'jamais';

    return (
        <Card className="bg-gradient-to-br from-blue-50/80 to-indigo-50/50 dark:from-blue-950/30 dark:to-indigo-950/20 border-blue-200/50">
            <CardContent className="py-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                            <TrendingUp className="h-4 w-4 text-blue-600" />
                        </div>
                        <span className="text-sm font-medium">Vinted</span>
                        {stats.isReserved && (
                            <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">
                                Réservé
                            </Badge>
                        )}
                        {stats.isClosed && (
                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                                Vendu
                            </Badge>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        {vintedUrl && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                <a href={vintedUrl} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-4 w-4" />
                                </a>
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={handleSync}
                            disabled={isSyncing}
                            title="Actualiser"
                        >
                            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                            <Eye className="h-3.5 w-3.5" />
                        </div>
                        <div className="text-xl font-bold">{stats.viewCount}</div>
                        <div className="text-xs text-muted-foreground">vues</div>
                    </div>
                    <div>
                        <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                            <Heart className="h-3.5 w-3.5" />
                        </div>
                        <div className="text-xl font-bold">{stats.favouriteCount}</div>
                        <div className="text-xs text-muted-foreground">favoris</div>
                    </div>
                    <div>
                        <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                            <TrendingUp className="h-3.5 w-3.5" />
                        </div>
                        <div className="text-xl font-bold">{stats.interestRate}%</div>
                        <div className="text-xs text-muted-foreground">intérêt</div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-3 pt-3 border-t border-blue-200/30 text-xs text-muted-foreground text-center">
                    Dernière sync: {lastSync}
                </div>
            </CardContent>
        </Card>
    );
}
