"use client";

import { MarketAnalysisWizard } from "@/components/features/market-analysis/market-analysis-wizard";

export default function AnalyseMarchePage() {
    return (
        <div className="min-h-screen bg-background p-6">
            <div className="max-w-screen-xl mx-auto space-y-8">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold">Analyse de Marché</h1>
                    <p className="text-muted-foreground">
                        Analysez la concurrence et estimez le meilleur prix de vente pour vos produits.
                    </p>
                </div>

                <MarketAnalysisWizard />
            </div>
        </div>
    );
}
