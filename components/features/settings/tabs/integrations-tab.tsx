<<<<<<< HEAD
"use client";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Plug } from "lucide-react";
import { SuperbuyConnect } from "../superbuy-connect";
import { VintedConnect } from "../vinted-connect";
import { EnrichmentSettings } from "../enrichment-settings";

export function IntegrationsTab() {
    return (
        <div className="space-y-6 mt-2">
            <SuperbuyConnect />
            <EnrichmentSettings />

            <VintedConnect />

            <Card>
                <CardHeader>
                    <CardTitle>Autres Intégrations</CardTitle>
                    <CardDescription>
                        Connectez vos comptes marketplace
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Plug className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">eBay & Leboncoin</h3>
                        <p className="text-sm text-muted-foreground max-w-md">
                            Bientôt disponible.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
=======
"use client";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Plug } from "lucide-react";
import { SuperbuyConnect } from "../superbuy-connect";
import { EnrichmentSettings } from "../enrichment-settings";

export function IntegrationsTab() {
    return (
        <div className="space-y-6 mt-2">
            <SuperbuyConnect />
            <EnrichmentSettings />

            <Card>
                <CardHeader>
                    <CardTitle>Autres Intégrations</CardTitle>
                    <CardDescription>
                        Connectez vos comptes marketplace
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Plug className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Bientôt disponible</h3>
                        <p className="text-sm text-muted-foreground max-w-md">
                            Les intégrations avec Vinted, eBay et d'autres plateformes seront bientôt disponibles.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
