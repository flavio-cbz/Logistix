"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tag } from "lucide-react";
import type { VintedAnalysisResult } from "@/types/vinted-market-analysis";

interface ProductInfoWidgetProps {
  analysis: VintedAnalysisResult;
}

export default function ProductInfoWidget({
  analysis,
}: ProductInfoWidgetProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="h-5 w-5" />
          Informations produit
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div>
            <span className="text-sm font-medium">Catégorie</span>
            <p className="text-sm text-muted-foreground">
              ID {analysis.catalogInfo?.id ?? "N/A"}
              {(analysis.catalogInfo?.name ?? "Unknown") !== "Unknown" &&
                ` - ${analysis.catalogInfo?.name ?? "Unknown"}`}
            </p>
          </div>

          {analysis.brandInfo && (
            <div>
              <span className="text-sm font-medium">Marque détectée</span>
              <p className="text-sm text-muted-foreground">
                {analysis.brandInfo?.name ?? "N/A"} (ID:{" "}
                {analysis.brandInfo?.id ?? "N/A"})
              </p>
            </div>
          )}

          <div>
            <span className="text-sm font-medium">Échantillon analysé</span>
            <p className="text-sm text-muted-foreground">
              {analysis.rawItems?.length ?? 0} articles sur les dernières ventes
            </p>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <h4 className="text-sm font-medium">Qualité de l'analyse</h4>
          <div className="flex items-center gap-2">
            {(analysis.salesVolume ?? 0) >= 50 ? (
              <Badge className="bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]">
                Excellente ({analysis.salesVolume ?? 0} ventes)
              </Badge>
            ) : (analysis.salesVolume ?? 0) >= 20 ? (
              <Badge className="bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))]">
                Bonne ({analysis.salesVolume ?? 0} ventes)
              </Badge>
            ) : (
              <Badge className="bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))]">
                Limitée ({analysis.salesVolume ?? 0} ventes)
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Plus il y a de ventes analysées, plus les résultats sont fiables
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
