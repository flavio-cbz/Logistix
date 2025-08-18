import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMarketAnalysisStore } from "@/lib/store";
import AnalysisForm from "./analysis-form";
import { startMarketAnalysis } from "@/lib/services/market-analysis";
import type { MarketAnalysisRequest } from "@/types/vinted-market-analysis";

export default function NewAnalysisModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { isLoading, error } = useMarketAnalysisStore();

  const handleFormSubmit = async (request: MarketAnalysisRequest) => {
    await startMarketAnalysis(request);
    // Si l'analyse a réussi (pas d'erreur), on ferme la modale.
    // Le store sera mis à jour par le service, et le shell affichera les résultats.
    if (!useMarketAnalysisStore.getState().error) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle Analyse de Marché</DialogTitle>
        </DialogHeader>
        <AnalysisForm
          onSubmit={handleFormSubmit}
          isLoading={isLoading}
          error={error}
        />
      </DialogContent>
    </Dialog>
  );
}