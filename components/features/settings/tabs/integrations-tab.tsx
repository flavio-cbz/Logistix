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
