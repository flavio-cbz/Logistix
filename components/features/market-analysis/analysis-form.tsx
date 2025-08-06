"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Search, AlertCircle, Info } from "lucide-react"
import { MarketAnalysisRequestSchema, type MarketAnalysisRequest, type AnalysisFormProps } from "@/types/vinted-market-analysis"
import { HierarchicalCatalogSelector } from "./hierarchical-catalog-selector"
import type { VintedCatalogLevel3 } from "@/lib/types/vinted-catalog-hierarchy"

export default function AnalysisForm({ onSubmit, isLoading, error }: AnalysisFormProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [isCategoryValid, setIsCategoryValid] = useState(false)

  const form = useForm<MarketAnalysisRequest>({
    resolver: zodResolver(MarketAnalysisRequestSchema),
    defaultValues: {
      productName: "",
      categoryName: "",
      catalogId: undefined,
    },
  })

  const handleSubmit = async (data: MarketAnalysisRequest) => {
    try {
      await onSubmit(data)
      // Optionnel: réinitialiser le formulaire après succès
      // form.reset()
    } catch (error) {
      // L'erreur est gérée par le composant parent
      console.error("Erreur lors de la soumission:", error)
    }
  }

  const productName = form.watch("productName")
  const categoryName = form.watch("categoryName")
  const catalogId = form.watch("catalogId")

  // Validation en temps réel pour afficher des conseils
  const hasValidInput = productName && productName.length >= 3
  const hasCategory = catalogId || categoryName
  const canSubmit = hasValidInput && isCategoryValid

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
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
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
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Sélecteur de catalogue hiérarchique */}
            <FormField
              control={form.control}
              name="catalogId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Catégorie *</FormLabel>
                  <FormControl>
                    <HierarchicalCatalogSelector
                      value={field.value}
                      onValueChange={(categoryId: number, category: VintedCatalogLevel3) => {
                        field.onChange(categoryId)
                        form.setValue("categoryName", category.name)
                      }}
                      productName={productName}
                      onValidationChange={setIsCategoryValid}
                      placeholder="Sélectionner une catégorie niveau 3..."
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormDescription>
                    Sélectionnez une catégorie spécifique (niveau 3) pour des résultats précis
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

            {/* Section avancée */}
            <div className="space-y-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-sm text-muted-foreground"
              >
                {showAdvanced ? "Masquer" : "Afficher"} les options avancées
              </Button>
            </div>

            {/* Conseils en temps réel */}
            {hasValidInput && !isCategoryValid && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Sélectionnez une catégorie de niveau 3 pour lancer l'analyse
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