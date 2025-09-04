'use client';

import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

import { toast } from '@/components/ui/use-toast';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/utils/logging/logger';
import type { VintedAnalysisResult } from '@/types/vinted-market-analysis';

// Définitions d'interfaces (simplifiées pour l'exemple)
export interface ComparativeAnalysisViewProps { // Export de l'interface
  analysisResults: VintedAnalysisResult[];
  className?: string;
}

interface ComparisonMetric {
  key: keyof VintedAnalysisResult;
  name: string;
  format: (value: any) => string;
  type: 'number' | 'currency';
}


export function ComparativeAnalysisView({ analysisResults, className }: ComparativeAnalysisViewProps) {
  const [selectedComparison, setSelectedComparison] = useState<number | null>(null);

  const comparisons = useMemo(() => analysisResults.slice(0, 3), [analysisResults]);

  const comparisonMetrics: ComparisonMetric[] = useMemo(() => [
    { key: 'avgPrice', name: 'Prix Moyen', format: (v: number) => `${v.toFixed(2)} €`, type: 'currency' },
    { key: 'salesVolume', name: 'Volume des Ventes', format: (v: number) => v.toString(), type: 'number' },
  ], []);

  const handleComparisonSelect = useCallback((_index: number | null) => {
    setSelectedComparison(_index);
    if (_index !== null && comparisons[_index]) {
      const selected = comparisons[_index];
      logger.info(`Comparaison ${_index + 1} sélectionnée: `, selected);
      toast({
        title: "Comparaison sélectionnée",
        description: `Comparaison ${_index + 1} sélectionnée.`,
      });
    } else {
      logger.info("Comparaison désélectionnée.");
      toast({
        title: "Comparaison désélectionnée",
        description: "Aucune comparaison sélectionnée.",
      });
    }
  }, [comparisons]);

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle>Analyse Comparative</CardTitle>
        <CardDescription>Comparez les performances de différentes analyses de marché.</CardDescription>
      </CardHeader>
      <CardContent>
        {comparisons.length === 0 ? (
          <p className="text-muted-foreground">Aucune analyse disponible pour la comparaison.</p>
        ) : (
          <div className="space-y-4">
            <ToggleGroup type="single" value={selectedComparison !== null ? selectedComparison.toString() : ''} onValueChange={(value) => handleComparisonSelect(value ? parseInt(value) : null)}>
              {comparisons.map((_comparison, index) => (
                <ToggleGroupItem 
                  key={index} 
                  value={index.toString()}
                  aria-label={`Sélectionner la comparaison ${index + 1}`}
                >
                  Comparaison {index + 1}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>

            {selectedComparison !== null && comparisons[selectedComparison] && (
              <div className="border rounded-md p-4 space-y-4">
                <h3 className="font-semibold text-lg">Détails de la Comparaison {selectedComparison + 1}</h3>
                <p className="text-sm text-muted-foreground">
                  Produit: {comparisons[selectedComparison]?.input?.productName || 'N/A'}
                </p>
                <Separator />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {comparisonMetrics.map((metric) => (
                    <div key={metric.key}>
                      <p className="text-sm font-medium">{metric.name}:</p>
                      <p className="text-lg font-bold">
                        {metric.format(comparisons[selectedComparison][metric.key])}
                      </p>
                    </div>
                  ))}
                </div>
                {/* Ajoutez ici des graphiques ou d'autres visualisations pour la comparaison */}
                <p className="text-muted-foreground text-sm">
                  Des visualisations détaillées pour cette comparaison seraient affichées ici.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}