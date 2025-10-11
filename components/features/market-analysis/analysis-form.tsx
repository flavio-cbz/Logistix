"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandList, CommandItem } from "@/components/ui/command";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Search, AlertCircle, RotateCcw } from "lucide-react"; // Removed Info and Clock
import {
  MarketAnalysisRequestSchema,
  MarketAnalysisRequest,
} from "@/lib/validations/vinted-market-analysis-schemas";
import { CatalogSelector } from "./hierarchical-catalog-selector";
import { BrandSelector } from "./brand-selector";
import {
  getCategorySuggestions,
  getBrandSuggestions,
} from "@/lib/services/market-analysis";

// Constantes
const MIN_PRODUCT_NAME_LEN = 3;
const MAX_PRODUCTS_MIN = 1;
const MAX_PRODUCTS_MAX = 500;

// Types stricts locaux (aucun any)
interface CategorySuggestion {
  id: number;
  title: string;
}

interface BrandOption {
  id: number;
  title: string;
}

// Type guards et normalisation sécurisée
const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

function normalizeCategorySuggestions(input: unknown): CategorySuggestion[] {
  if (!Array.isArray(input)) return [];
  const out: CategorySuggestion[] = [];
  for (const item of input) {
    if (isRecord(item)) {
      const id = typeof item['id'] === "number" ? item['id'] : Number(item['id']);
      const title =
        typeof item['title'] === "string" ? item['title'] : String(item['title'] ?? "");
      if (Number.isFinite(id) && title) out.push({ id, title });
    }
  }
  return out;
}

function normalizeBrandOptions(input: unknown): BrandOption[] {
  if (!Array.isArray(input)) return [];
  const out: BrandOption[] = [];
  for (const item of input) {
    if (isRecord(item)) {
      const id = typeof item['id'] === "number" ? item['id'] : Number(item['id']);
      // L'API peut retourner `name` ou `title`
      const name = typeof item['name'] === "string" ? item['name'] : undefined;
      const titleRaw =
        typeof item['title'] === "string" ? item['title'] : (name ?? "");
      const title = String(titleRaw);
      if (Number.isFinite(id) && title) out.push({ id, title });
    }
  }
  return out;
}

const ITEM_STATE_OPTIONS = [
  { id: 6, label: "Neuf avec étiquette" },
  { id: 1, label: "Neuf sans étiquette" },
  { id: 2, label: "Très bon état" },
  { id: 3, label: "Bon état" },
  { id: 4, label: "Satisfaisant" },
] as const;

// TODO: Remplacer 'any' par un type précis si besoin
export default function AnalysisForm({
  onSubmit,
  isLoading,
  error,
  initialValues,
  onReset,
}: any): JSX.Element {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [categorySuggestions, setCategorySuggestions] = useState<
    CategorySuggestion[]
  >([]);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  // Refs pour éviter des re-renders inutiles dans le debounce et éviter courses
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const categoryQueryIdRef = useRef(0);
  const brandQueryIdRef = useRef(0);

  const form = useForm<MarketAnalysisRequest>({
    resolver: zodResolver(MarketAnalysisRequestSchema),
    defaultValues: {
      productName: "",
      categoryName: undefined, // Changed to undefined for optional property
      catalogId: undefined, // Changed to undefined for optional property
      brandId: undefined,
      maxProducts: 100, // Default value
      itemStates: [],
      ...initialValues,
    },
  });

  const productName = form.watch("productName");
  const catalogId = form.watch("catalogId");

  const hasValidInput = Boolean(
    productName && productName.length >= MIN_PRODUCT_NAME_LEN,
  );
  const hasCategory =
    typeof catalogId === "number" && Number.isFinite(catalogId);
  const canSubmit = hasValidInput && hasCategory;

  // Nettoyer brandId si les conditions d'activation ne sont pas réunies
  useEffect(() => {
    if (!hasValidInput || !hasCategory) {
      form.setValue("brandId", undefined, {
        shouldDirty: true,
        shouldValidate: false,
      });
    }
  }, [hasValidInput, hasCategory, form]);

  // Suggestions de catégories dynamiques (debounce + prévention des courses)
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    if (productName && productName.length >= MIN_PRODUCT_NAME_LEN) {
      setCategoryLoading(true);
      setCategoryError(null);
      const currentQueryId = ++categoryQueryIdRef.current;
      debounceRef.current = setTimeout(async () => {
        try {
          const suggestionsRaw = await getCategorySuggestions(productName);
          // Ignorer si une nouvelle requête a été lancée entre-temps
          if (currentQueryId !== categoryQueryIdRef.current) return;
          const suggestions = normalizeCategorySuggestions(suggestionsRaw);
          setCategorySuggestions(suggestions);
        } catch (err: unknown) {
          setCategorySuggestions([]);
          setCategoryError(
            "Erreur lors de la récupération des suggestions de catégories.",
          );
        } finally {
          if (currentQueryId === categoryQueryIdRef.current) {
            setCategoryLoading(false);
          }
        }
      }, 400);
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
    };
  }, [productName]);

  // Suggestions de marques (sécurisé + prévention des courses)
  useEffect(() => {
    let active = true;
    const run = async () => {
      if (
        productName &&
        productName.length >= MIN_PRODUCT_NAME_LEN &&
        catalogId
      ) {
        const currentId = ++brandQueryIdRef.current;
        try {
          const suggested = await getBrandSuggestions(productName);
          if (!active || currentId !== brandQueryIdRef.current) return;
          const normalized = normalizeBrandOptions(suggested);
          setBrands(normalized);
        } catch (_e) {
          if (!active || currentId !== brandQueryIdRef.current) return;
          setBrands([]);
        }
      } else {
        setBrands([]);
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [productName, catalogId]);

  // Gestion du reset du formulaire (réinitialise aussi l'état local)
  const handleReset = useCallback(() => {
    // On ne doit pas inclure de clés avec undefined si exactOptionalPropertyTypes est activé
    const resetValues: Partial<MarketAnalysisRequest> = {
      productName: "",
      categoryName: undefined, // Changed to undefined
      maxProducts: 100,
      itemStates: [],
      ...(initialValues ?? {}),
    };
    // Ne pas inclure catalogId/brandId si undefined
    if (typeof initialValues?.catalogId !== "undefined")
      resetValues.catalogId = initialValues.catalogId;
    if (typeof initialValues?.brandId !== "undefined")
      resetValues.brandId = initialValues.brandId;
    form.reset(resetValues);
    setShowAdvanced(false);
    setBrands([]);
    setCategorySuggestions([]);
    setCategoryError(null);
    setCategoryLoading(false);
    if (onReset) onReset();
  }, [form, initialValues, onReset]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Nouvelle Analyse de Marché
        </CardTitle>
        <CardDescription>
          Analysez les prix et volumes de vente d'un produit sur Vinted
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Groupe Analyse Principale */}
            <div className="space-y-6 border-b pb-6 mb-6">
              <h3 className="text-lg font-semibold mb-2">Analyse Principale</h3>
              {/* Champ nom du produit */}
              <FormField
                control={form.control}
                name="productName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom du produit *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Nike Air Max 90, Zara robe noire..."
                        {...field}
                        disabled={isLoading}
                        aria-describedby="productname-help"
                      />
                    </FormControl>
                    <FormDescription id="productname-help">
                      Soyez précis pour obtenir des résultats pertinents
                    </FormDescription>
                    {/* Suggestions de catégories dynamiques */}
                    {categoryLoading && (
                      <div
                        className="text-xs text-muted-foreground mt-2"
                        role="status"
                        aria-live="polite"
                      >
                        Recherche de catégories...
                      </div>
                    )}
                    {categoryError && (
                      <Alert
                        variant="destructive"
                        className="mt-2"
                        role="alert"
                        aria-live="assertive"
                      >
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{categoryError}</AlertDescription>
                      </Alert>
                    )}
                    {!categoryLoading &&
                      !categoryError &&
                      (categorySuggestions?.length ?? 0) > 0 && (
                        <Command
                          className="mt-2 rounded-md border"
                          aria-label="Suggestions de catégories"
                        >
                          <CommandList className="bg-muted/10 p-2 text-xs">
                            {categorySuggestions?.map((cat) => (
                              <CommandItem
                                key={cat.id}
                                onSelect={() => {
                                  form.setValue("catalogId", cat.id);
                                  form.setValue("categoryName", cat.title);
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

              {/* Sélecteur de catégorie dynamique */}
              <FormField
                control={form.control}
                name="catalogId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Catégorie *</FormLabel>
                    <FormControl>
                      <CatalogSelector
                        value={field.value}
                        onValueChange={(
                          categoryId: number,
                          category: { id: number; title: string },
                        ) => {
                          field.onChange(categoryId);
                          form.setValue("categoryName", category.title);
                        }}
                        placeholder="Sélectionner une catégorie Vinted..."
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormDescription>
                      Sélectionnez une catégorie pour des résultats précis
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Sélecteur de marque dynamique (optionnel) */}
              <FormField
                control={form.control}
                name="brandId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marque (optionnel)</FormLabel>
                    <FormControl>
                      <BrandSelector
                        {...(field.value !== undefined
                          ? { value: field.value }
                          : {})}
                        onValueChange={field.onChange}
                        brands={brands}
                        placeholder="Sélectionner une marque..."
                        disabled={isLoading || !hasValidInput || !hasCategory}
                      />
                    </FormControl>
                    <FormDescription>
                      Sélectionnez une marque pour affiner l'analyse.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Groupe Options Avancées */}
            <details className="mb-6">
              <summary className="cursor-pointer text-md font-semibold py-2">
                {showAdvanced ? "Masquer" : "Afficher"} les options avancées
              </summary>
              <div className="space-y-6 pt-4">
                {/* Champ nombre de produits à analyser */}
                <FormField
                  control={form.control}
                  name="maxProducts"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre de produits à analyser</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={MAX_PRODUCTS_MIN}
                          max={MAX_PRODUCTS_MAX}
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={
                            typeof field.value === "number" &&
                            Number.isFinite(field.value)
                              ? field.value
                              : 100
                          }
                          onChange={(event) => {
                            const raw = event.target.valueAsNumber;
                            if (Number.isNaN(raw)) {
                              field.onChange(undefined);
                              return;
                            }
                            const clamped = Math.max(
                              MAX_PRODUCTS_MIN,
                              Math.min(MAX_PRODUCTS_MAX, Math.trunc(raw)),
                            );
                            field.onChange(clamped);
                          }}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormDescription>
                        Choisissez combien de produits seront inclus dans
                        l’analyse (défaut : 100)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Champ multi-sélection état des articles */}
                <FormField
                  control={form.control}
                  name="itemStates"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>État des articles</FormLabel>
                      <FormControl>
                        <div className="flex flex-col gap-2">
                          {ITEM_STATE_OPTIONS.map((option) => {
                            const selectedId = String(option.id);
                            const isChecked = Array.isArray(field.value)
                              ? field.value.map(String).includes(selectedId)
                              : false;
                            return (
                              <label
                                key={option.id}
                                className="flex items-center gap-2"
                              >
                                <Checkbox
                                  checked={!!isChecked}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      const next = new Set<string>(
                                        Array.isArray(field.value)
                                          ? field.value.map(String)
                                          : [],
                                      );
                                      next.add(selectedId);
                                      field.onChange(Array.from(next));
                                    } else {
                                      const next = new Set<string>(
                                        Array.isArray(field.value)
                                          ? field.value.map(String)
                                          : [],
                                      );
                                      next.delete(selectedId);
                                      field.onChange(Array.from(next));
                                    }
                                  }}
                                  disabled={isLoading}
                                />
                                <span>{option.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </FormControl>
                      <FormDescription>
                        Sélectionnez un ou plusieurs états à inclure dans
                        l’analyse.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Champ catégorie en texte libre (optionnel) */}
                {showAdvanced && (
                  <FormField
                    control={form.control}
                    name="categoryName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Nom de catégorie personnalisé (optionnel)
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: Chaussures de sport vintage..."
                            {...field}
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormDescription>
                          Remplace la catégorie sélectionnée ci-dessus si
                          spécifié
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Section avancée toggle */}
                <div className="space-y-4">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAdvanced((v) => !v)}
                    className="text-sm text-muted-foreground"
                    aria-expanded={showAdvanced}
                  >
                    {showAdvanced ? "Masquer" : "Afficher"} le champ
                    personnalisé
                  </Button>
                </div>
              </div>
            </details>

            {/* Conseils en temps réel */}
            {hasValidInput && !hasCategory && (
              <Alert role="status" aria-live="polite">
                <AlertCircle className="h-4 w-4" />{" "}
                {/* Changed from Info to AlertCircle */}
                <AlertDescription>
                  Sélectionnez une catégorie pour lancer l'analyse
                </AlertDescription>
              </Alert>
            )}

            {/* Affichage des erreurs */}
            {error && (
              <Alert variant="destructive" role="alert" aria-live="assertive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Bouton de soumission et reset */}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
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
                className="min-w-[120px]"
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

            {/* Informations sur l'analyse */}
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                <strong>Que fait cette analyse ?</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Recherche les articles similaires vendus sur Vinted</li>
                <li>Calcule le prix moyen et le volume de ventes</li>
                <li>Analyse jusqu'à 100 articles récents</li>
                <li>Stocke les résultats pour consultation ultérieure</li>
              </ul>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
