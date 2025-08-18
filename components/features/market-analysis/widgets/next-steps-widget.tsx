"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar } from "lucide-react"
import type { VintedAnalysisResult } from "@/types/vinted-market-analysis"

interface NextStepsWidgetProps {
  analysis: VintedAnalysisResult;
}

export default function NextStepsWidget({ analysis }: NextStepsWidgetProps) {
    
  const handleExport = () => {
    if (!analysis || !analysis.rawItems) {
      alert("Aucune donnée à exporter.");
      return;
    }
    const dataStr = JSON.stringify(analysis.rawItems, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `vinted-analysis-${analysis.catalogInfo.id}-${new Date().toISOString().slice(0,10)}.json`;
    
    let linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleScheduleFollowUp = () => {
    alert("La fonctionnalité de programmation de suivi sera bientôt disponible !");
  };

  const handleAnalyzeVariant = () => {
    alert("La fonctionnalité d'analyse de variante sera bientôt disponible !");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Prochaines étapes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Recommandations</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Surveillez les tendances sur 2-3 semaines</li>
              <li>• Comparez avec d'autres catégories similaires</li>
              <li>• Analysez la saisonnalité du produit</li>
              {analysis.salesVolume < 20 && (
                <li>• Essayez des mots-clés plus génériques pour plus de données</li>
              )}
            </ul>
          </div>
          
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Actions possibles</h4>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleExport}>
                Exporter les données
              </Button>
              <Button variant="outline" size="sm" onClick={handleScheduleFollowUp}>
                Programmer un suivi
              </Button>
              <Button variant="outline" size="sm" onClick={handleAnalyzeVariant}>
                Analyser une variante
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}