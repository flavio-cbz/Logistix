"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Search, AlertCircle, Info } from "lucide-react"
import { MarketAnalysisRequestSchema, type MarketAnalysisRequest, type AnalysisFormProps } from "@/types/vinted-market-analysis"
import { CatalogSelector } from "./hierarchical-catalog-selector"
import { BrandSelector } from "./brand-selector"
import { getCategorySuggestions, getBrandSuggestions } from "@/lib/services/market-analysis"

const ITEM_STATE_OPTIONS = [
  { id: 6, label: "Neuf avec étiquette" },
  { id: 1, label: "Neuf sans étiquette" },
  { id: 2, label: "Très bon état" },
  { id: 3, label: "Bon état" },
  { id: 4, label: "Satisfaisant" },
];

export default function AnalysisForm({ onSubmit, isLoading, error }: AnalysisFormProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [brands, setBrands] = useState<{ id: number; title: string }[]>([])
  const [categorySuggestions, setCategorySuggestions] = useState<any[]>([])
  const [categoryLoading, setCategoryLoading] = useState(false)
  const [debounceTimeout, setDebounceTimeout] = useState<NodeJS.Timeout | null>(null)

  const form = useForm<MarketAnalysisRequest>({
    resolver: zodResolver(MarketAnalysisRequestSchema),
    defaultValues: {
      productName: "",
      categoryName: "",
      catalogId: undefined,
      brandId: undefined,
      maxProducts: 100,
      itemStates: [],
    },
  })

  const productName = form.watch("productName")
  const catalogId = form.watch("catalogId")

  // Suggestions de catégories dynamiques (debounce)
  useEffect(() => {
    if (debounceTimeout) clearTimeout(debounceTimeout)
    if (productName && productName.length >= 3) {
      setCategoryLoading(true)
      const timeout = setTimeout(async () => {
        const suggestions = await getCategorySuggestions(productName);
        setCategorySuggestions(suggestions);
        setCategoryLoading(false);
      }, 400)
      setDebounceTimeout(timeout)
    } else {
      setCategorySuggestions([])
      setCategoryLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productName])

  // Suggestions de marques (existant)
  useEffect(() => {
    const fetchBrands = async () => {
      if (productName && productName.length >= 3 && catalogId) {
        const suggestedBrands = await getBrandSuggestions(productName, catalogId);
        setBrands(suggestedBrands.map(b => ({ id: b.id, title: b.name })));
      } else {
        setBrands([]);
      }
    };
    fetchBrands();
  }, [productName, catalogId])

  const hasValidInput = productName && productName.length >= 3
  const hasCategory = !!catalogId
  const canSubmit = hasValidInput && hasCategory

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
                      />
                    </FormControl>
                    <FormDescription>
                      Soyez précis pour obtenir des résultats pertinents
                    </FormDescription>
                    {/* Suggestions de catégories dynamiques */}
                    {categoryLoading && (
                      <div className="text-xs text-muted-foreground mt-2">Recherche de catégories...</div>
                    )}
                    {!categoryLoading && categorySuggestions.length > 0 && (
                      <ul className="mt-2 border rounded bg-muted/10 p-2 text-xs space-y-1">
                        {categorySuggestions.map((cat: any) => (
                          <li
                            key={cat.id}
                            className="cursor-pointer hover:bg-primary/10 px-2 py-1 rounded"
                            onClick={() => {
                              form.setValue("catalogId", cat.id)
                              form.setValue("categoryName", cat.title)
                              setCategorySuggestions([])
                            }}
                          >
                            {cat.title}
                          </li>
                        ))}
                      </ul>
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
                        onValueChange={(categoryId: number, category: any) => {
                          field.onChange(categoryId)
                          form.setValue("categoryName", category.title)
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
                        value={field.value}
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
              <summary className="cursor-pointer text-md font-semibold py-2">Options Avancées</summary>
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
                          min={1}
                          max={500}
                          {...field}
                          onChange={event => field.onChange(+event.target.value)}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormDescription>
                        Choisissez combien de produits seront inclus dans l’analyse (défaut : 100)
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
                          {ITEM_STATE_OPTIONS.map((option) => (
                            <label key={option.id} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                value={option.id.toString()}
                                checked={field.value?.includes(option.id.toString()) ?? false}
                                onChange={e => {
                                  const selectedId = option.id.toString();
                                  if (e.target.checked) {
                                    field.onChange([...(field.value || []), selectedId])
                                  } else {
                                    field.onChange((field.value || []).filter((id: string) => id !== selectedId))
                                  }
                                }}
                                disabled={isLoading}
                              />
                              <span>{option.label}</span>
                            </label>
                          ))}
                        </div>
                      </FormControl>
                      <FormDescription>
                        Sélectionnez un ou plusieurs états à inclure dans l’analyse.
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
                        <FormLabel>Nom de catégorie personnalisé (optionnel)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: Chaussures de sport vintage..."
                            {...field}
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormDescription>
                          Remplace la catégorie sélectionnée ci-dessus si spécifié
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
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-sm text-muted-foreground"
                  >
                    {showAdvanced ? "Masquer" : "Afficher"} le champ personnalisé
                  </Button>
                </div>
              </div>
            </details>

            {/* Conseils en temps réel */}
            {hasValidInput && !hasCategory && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Sélectionnez une catégorie pour lancer l'analyse
                </AlertDescription>
              </Alert>
            )}

            {/* Affichage des erreurs */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Bouton de soumission */}
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isLoading || !canSubmit}
                className="min-w-[120px]"
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
  )
}