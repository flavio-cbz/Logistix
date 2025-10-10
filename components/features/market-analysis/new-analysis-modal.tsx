"use client";

import { useCallback } from "react"; // Removed React import
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useMarketAnalysisStore } from "@/lib/store";
import AnalysisForm from "./analysis-form";
import { launchMarketAnalysis } from "@/lib/services/market-analysis";
import { MarketAnalysisRequest } from "@/lib/validations/vinted-market-analysis-schemas";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";

export default function NewAnalysisModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { isLoading, error } = useMarketAnalysisStore();
  const { toast } = useToast();
  const router = useRouter();

  const initialValues: Partial<MarketAnalysisRequest> = {
    productName: "",
    catalogId: 0, // Initialisation à 0 pour correspondre au type number
    categoryName: undefined, // Changed to undefined for optional property
    brandId: undefined,
    maxProducts: 100,
    itemStates: [],
  };

  const handleReset = useCallback(() => {
    // Logique de réinitialisation si nécessaire
  }, []);

  const handleFormSubmit = async (request: MarketAnalysisRequest) => {
    // Conversion de MarketAnalysisRequest vers MarketAnalysisConfig
    const config = {
      category: request.categoryName || request.productName,
      keywords: [request.productName],
      ...(request.brandId && { brand: `Brand-${request.brandId}` }), // N'inclure brand que s'il existe
      // priceRange et region omis (undefined par défaut)
    };

    const result = await launchMarketAnalysis(config);
    if (result) {
      onClose();
      toast({
        title: "Analyse lancée !",
        description: "Votre analyse de marché a été initiée avec succès.",
      });
      router.refresh();
    } else {
      toast({
        title: "Erreur lors du lancement de l'analyse",
        description: error || "Une erreur inconnue est survenue.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle Analyse de Marché</DialogTitle>
          <DialogDescription>
            Lancez une nouvelle analyse de marché en spécifiant les critères de
            recherche.
          </DialogDescription>
        </DialogHeader>
        <AnalysisForm
          onSubmit={handleFormSubmit}
          isLoading={isLoading}
          error={error}
          initialValues={initialValues}
          onReset={handleReset}
        />
      </DialogContent>
    </Dialog>
  );
}
