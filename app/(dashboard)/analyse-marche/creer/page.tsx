"use client";
export const dynamic = "force-dynamic";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { launchMarketAnalysis } from "@/lib/services/market-analysis";
import { useMarketAnalysisStore } from "@/lib/store";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import ProductInfoCard from "@/components/features/market-analysis/cards/product-info-card";
import FiltersCard from "@/components/features/market-analysis/cards/filters-card";
import ParamsCard from "@/components/features/market-analysis/cards/params-card";
import { MarketAnalysisRequestSchema } from "@/types/vinted-market-analysis";
import type { MarketAnalysisRequest } from "@/types/vinted-market-analysis";
import { Loader2, Search, RotateCcw } from "lucide-react";

export default function Page() {
  return <AnalysisCreationDashboard />;
}

function AnalysisCreationDashboard(): JSX.Element {
  const router = useRouter();
  const { isLoading, error } = useMarketAnalysisStore();

  const initialValues: Partial<MarketAnalysisRequest> = {
    productName: "",
    categoryName: "",
    maxProducts: 100,
    itemStates: [],
    // catalogId et brandId omis si undefined
  };

  const form = useForm<MarketAnalysisRequest>({
    resolver: zodResolver(MarketAnalysisRequestSchema),
    defaultValues: {
      productName: "",
      categoryName: "",
      maxProducts: 100,
      itemStates: [],
      ...initialValues,
      // catalogId et brandId omis si undefined
    },
    mode: "onChange",
  });

  const productName = form.watch("productName");
  const catalogId = form.watch("catalogId");
  const canSubmit = Boolean(
    productName && productName.length >= 3 && typeof catalogId === "number",
  );

  const submit = async (values: MarketAnalysisRequest) => {
    // Convertir MarketAnalysisRequest vers MarketAnalysisConfig
    const config: any = {
      category: values.categoryName || values.productName,
      keywords: [values.productName],
      brand: values.brandId ? `Brand-${values.brandId}` : undefined,
      priceRange: undefined, // Peut être ajouté plus tard
      region: undefined, // Peut être ajouté plus tard
    };

    const success = await launchMarketAnalysis(config);
    if (success) {
      try {
        router.push("/analyse-marche");
      } catch {
        // best-effort navigation
      }
    }
  };

  const handleReset = () => {
    form.reset({
      productName: "",
      categoryName: "",
      maxProducts: 100,
      itemStates: [],
      ...initialValues,
      // catalogId et brandId omis si undefined
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Créer une nouvelle analyse de marché</CardTitle>
          <CardDescription>
            Formulaire complet pour configurer et lancer une analyse
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(submit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <ProductInfoCard form={form} isLoading={isLoading} />
                </div>
                <div className="md:col-span-1">
                  <FiltersCard form={form} isLoading={isLoading} />
                </div>
                <div className="md:col-span-1">
                  <ParamsCard form={form} isLoading={isLoading} />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset!}
                  disabled={isLoading}
                  className="min-w-[100px] flex items-center gap-1"
                  aria-label="Réinitialiser le formulaire"
                >
                  <RotateCcw className="h-4 w-4" />
                  Réinitialiser
                </Button>

                <Button
                  type="submit"
                  disabled={isLoading || !canSubmit}
                  className="min-w-[120px] flex items-center justify-center gap-2"
                  aria-disabled={isLoading || !canSubmit}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyse...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Analyser
                    </>
                  )}
                </Button>
              </div>

              {/* Affichage d'erreur sommaire */}
              {error && (
                <div role="alert" className="text-sm text-destructive mt-2">
                  {error}
                </div>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
