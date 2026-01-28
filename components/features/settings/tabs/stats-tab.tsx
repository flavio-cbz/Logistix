"use client";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
    BarChart3,
    Package,
    ShoppingBag,
    Calendar,
} from "lucide-react";
import { ProfileData } from "../types";
import { useFormatting } from "@/lib/hooks/use-formatting";

interface StatsTabProps {
    profile: ProfileData;
}

export function StatsTab({ profile }: StatsTabProps) {
    const { formatDateTime } = useFormatting();

    return (
        <div className="space-y-6 mt-2">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-primary" />
                        Statistiques du compte
                    </CardTitle>
                    <CardDescription>
                        Vue d'ensemble de votre activité
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-4 p-4 border rounded-lg bg-gradient-to-br from-blue-50 to-transparent dark:from-blue-950/20">
                            <Package className="h-10 w-10 text-primary" />
                            <div>
                                <p className="text-3xl font-bold">{profile.stats?.totalProducts || 0}</p>
                                <p className="text-sm text-muted-foreground">Produits</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 p-4 border rounded-lg bg-gradient-to-br from-green-50 to-transparent dark:from-green-950/20">
                            <ShoppingBag className="h-10 w-10 text-green-500" />
                            <div>
                                <p className="text-3xl font-bold">{profile.stats?.totalParcels || 0}</p>
                                <p className="text-sm text-muted-foreground">Parcelles</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 p-4 border rounded-lg bg-gradient-to-br from-purple-50 to-transparent dark:from-purple-950/20">
                            <Calendar className="h-10 w-10 text-primary" />
                            <div>
                                <p className="text-3xl font-bold">{profile.stats?.daysActive || 0}</p>
                                <p className="text-sm text-muted-foreground">Jours d'activité</p>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Compte créé le</span>
                            <span className="font-medium">{formatDateTime(profile.createdAt) || "Non disponible"}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Dernière connexion</span>
                            <span className="font-medium">{formatDateTime(profile.lastLoginAt) || "Non disponible"}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Rôle</span>
                            <span className="font-medium capitalize">{profile.role}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
