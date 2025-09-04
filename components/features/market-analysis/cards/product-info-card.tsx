// import * as React from "react"; // inutile en React 18+
import { useEffect, useState, useRef } from "react";
import type { UseFormReturn, ControllerRenderProps } from "react-hook-form";
import type { MarketAnalysisRequest } from "@/types/vinted-market-analysis";
import { getBrandSuggestions, getCategorySuggestions } from "@/lib/services/market-analysis";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { CatalogSelector } from "@/components/features/market-analysis/catalog-selector";
import { BrandSelector } from "@/components/features/market-analysis/brand-selector";
import { Command, CommandList, CommandItem } from "@/components/ui/command";

interface ProductInfoCardProps {
  form: UseFormReturn<MarketAnalysisRequest>;
  isLoading?: boolean;
}

/**
 * Carte réutilisable contenant les champs produit / catégorie / marque.
 * Reçoit le `form` de react-hook-form (UseFormReturn) depuis le dashboard parent.
 */
export default function ProductInfoCard({ form, isLoading = false }: ProductInfoCardProps) {
  const [brands, setBrands] = useState<{ id: number; name: string }[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(false);

  // Suggestions de catégories (remplissage semi-automatique)
  const [categorySuggestions, setCategorySuggestions] = useState<{ id: number; title: string }[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const categoryQueryIdRef = useRef(0);

  const productName = form.watch("productName");
  const catalogId = form.watch("catalogId");

  // Récupération des marques suggérées (existant)
  useEffect(() => {
    let cancelled = false;
    async function fetchBrands() {
      if (!productName || !catalogId) {
        setBrands([]);
        return;
      }
      setLoadingBrands(true);
      try {
        const result = await getBrandSuggestions(productName, catalogId);
        if (!cancelled) setBrands(result);
      } catch {
        if (!cancelled) setBrands([]);
      } finally {
        if (!cancelled) setLoadingBrands(false);
      }
    }
    fetchBrands();
    return () => { cancelled = true; };
  }, [productName, catalogId]);

  // Suggestions de catégories (débounce + prévention des courses)
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    if (productName && productName.trim().length >= 3) {
      setCategoryLoading(true);
      setCategoryError(null);
      const currentQueryId = ++categoryQueryIdRef.current;
      debounceRef.current = setTimeout(async () => {
        try {
          const suggestionsRaw = await getCategorySuggestions(productName);
          if (currentQueryId !== categoryQueryIdRef.current) return;
          const suggestions = Array.isArray(suggestionsRaw)
            ? suggestionsRaw.map((s: any) => ({ id: Number(s.id), title: String(s.title ?? s.name ?? '') })).filter((s: any) => !!s.title)
            : [];
          setCategorySuggestions(suggestions);
        } catch (err) {
          setCategorySuggestions([]);
          setCategoryError("Erreur lors de la récupération des suggestions de catégories.");
        } finally {
          if (currentQueryId === categoryQueryIdRef.current) {
            setCategoryLoading(false);
          }
        }
      }, 350);
    } else {
      setCategorySuggestions([]);
      setCategoryLoading(false);
      setCategoryError(null);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    }
  }, [productName]);

  // Adaptation pour BrandSelector : il attend brands: {id, title}[]
  const brandsForSelector = brands.map((b: { id: number; name: string }) => ({ id: b.id, title: b.name }));

  return (
    <Card role="region" aria-label="Informations produit">
      <CardHeader>
        <CardTitle>Informations produit</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <FormField
            control={form.control}
            name="productName"
            render={({ field }: { field: ControllerRenderProps<MarketAnalysisRequest, "productName"> }) => (
              <FormItem>
                <FormLabel>Nom du produit</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ex : Robe en soie Zara"
                    {...field}
                    disabled={isLoading}
                  />
                </FormControl>
                <FormDescription>Nom utilisé pour la recherche d'annonces (min. 3 caractères)</FormDescription>

                {/* Suggestions de catégories semi-automatique */}
                {categoryLoading && (
                  <div className="text-xs text-muted-foreground mt-2" role="status" aria-live="polite">
                    Recherche de catégories...
                  </div>
                )}
                {categoryError && (
                  <div className="text-xs text-destructive mt-2">{categoryError}</div>
                )}
                {!categoryLoading && !categoryError && categorySuggestions.length > 0 && (
                  <Command className="mt-2 rounded-md border" aria-label="Suggestions de catégories">
                    <CommandList className="bg-muted/10 p-2 text-xs">
                      {categorySuggestions.map((cat: { id: number; title: string }) => (
                        <CommandItem
                          key={cat.id}
                          onSelect={() => {
                            form.setValue("catalogId", cat.id, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
                            form.setValue("categoryName", cat.title, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
                            setCategorySuggestions([]);
                          }}
                          className="cursor-pointer"
                        >
                          {cat.title}
                        </CommandItem>
                      ))}
                    </CommandList>
                  </Command>
                )}

                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="catalogId"
            render={({ field }: { field: ControllerRenderProps<MarketAnalysisRequest, "catalogId"> }) => (
              <FormItem>
                <FormLabel>Catégorie *</FormLabel>
                <FormControl>
                  <CatalogSelector
                    value={field.value}
                    onValueChange={(categoryId: number, catalog: any) => {
                      field.onChange(categoryId);
                      // Mettre à jour aussi le nom de catégorie visible dans le formulaire
                      form.setValue("categoryName", catalog.name, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
                    }}
                    placeholder="Sélectionner une catégorie Vinted..."
                    disabled={isLoading}
                  />
                </FormControl>
                <FormDescription>Choisir la catégorie Vinted pour affiner les résultats</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="brandId"
            render={({ field }: { field: ControllerRenderProps<MarketAnalysisRequest, "brandId"> }) => (
              <FormItem>
                <FormLabel>Marque (optionnel)</FormLabel>
                <FormControl>
                  <BrandSelector
                    value={field.value ?? 0}
                    onValueChange={field.onChange}
                    brands={brandsForSelector}
                    placeholder={loadingBrands ? "Chargement..." : "Sélectionner une marque..."}
                    disabled={isLoading || !form.getValues("catalogId") || loadingBrands || brandsForSelector.length === 0}
                  />
                </FormControl>
                <FormDescription>Préciser la marque si vous souhaitez restreindre l'analyse</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}