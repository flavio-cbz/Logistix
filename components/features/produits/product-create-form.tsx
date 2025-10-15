/**
 * Formulaire de création/modification de produit - Version refactorisée
 * Architecture en couches avec séparation des responsabilités
 */

"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { ProductStatus, Platform } from "@/lib/shared/types/entities";

import { AnimatedButton } from "@/components/ui/animated-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ImageUpload } from "@/components/ui/image-upload";

import type { Product } from "@/lib/shared/types/entities";
import {
  createProductSchema,
  updateProductSchema,
  type CreateProductFormData,
} from "@/lib/schemas/product";
import {
  useCreateProduct,
  useUpdateProduct,
  useProductFormData,
} from "@/lib/hooks/use-products";
import { useParcelles } from "@/lib/hooks/use-parcelles";
import {
  calculateProductMetrics,
  getMissingSoldFields,
  formatWeight,
} from "@/lib/utils/product-calculations";
import { ProductMetricsDisplay } from "./product-metrics-display";
import { ParcelleSelect } from "./parcelle-select";

type ProductFormValues = CreateProductFormData;

interface ProductCreateFormProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCreated?: () => void;
  editProduct?: Product | null;
}

function ProductCreateFormRefactored({
  open = false,
  onOpenChange,
  onCreated,
  editProduct,
}: ProductCreateFormProps) {
  const [globalError, setGlobalError] = useState<string | null>(null);
  const { toast } = useToast();

  const isEditMode = !!editProduct;
  const validationSchema = isEditMode
    ? updateProductSchema
    : createProductSchema;

  // Hooks
  const {
    data: parcelles,
    refetch: refetchParcelles,
    isFetching: isFetchingParcelles,
  } = useParcelles();
  const createProductMutation = useCreateProduct();
  const updateProductMutation = useUpdateProduct();
  const formData = useProductFormData(editProduct || undefined);

  // Form initialization
  const getDefaultValues = useCallback((): ProductFormValues => {
    if (formData) return formData;

    return {
      name: "",
      brand: "",
      category: "",
      subcategory: "",
      price: 0,
      poids: 0,
      parcelleId: "",
      vendu: "0",
      dateMiseEnLigne: "",
      dateVente: "",
      prixVente: 0,
      plateforme: "leboncoin" as Platform,
      currency: "EUR",
      status: ProductStatus.DRAFT,
    };
  }, [formData]);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(validationSchema),
    defaultValues: getDefaultValues(),
    mode: "onChange", // Validation en temps réel
  });

  // Reset form when editProduct changes or dialog opens
  useEffect(() => {
    if (!open) return;

    if (formData) {
      form.reset(formData);
    } else {
      form.reset(getDefaultValues());
    }
  }, [editProduct, open, form, formData, getDefaultValues]);

  // Watch form values
  const watchedValues = form.watch();
  const isVendu = watchedValues.vendu === "1";

  // Memoized calculations
  const selectedParcelle = useMemo(() => {
    return (parcelles ?? []).find((p) => p.id === watchedValues.parcelleId);
  }, [parcelles, watchedValues.parcelleId]);

  const metrics = useMemo(() => {
    return calculateProductMetrics(
      watchedValues.price || 0,
      watchedValues.poids || 0,
      watchedValues.prixVente,
      watchedValues.dateMiseEnLigne,
      watchedValues.dateVente,
      selectedParcelle
    );
  }, [
    watchedValues.price,
    watchedValues.poids,
    watchedValues.prixVente,
    watchedValues.dateMiseEnLigne,
    watchedValues.dateVente,
    selectedParcelle,
  ]);

  const soldFieldsValidation = useMemo(() => {
    if (!isVendu) return { isValid: true, missing: [] };

    const missing = getMissingSoldFields(
      watchedValues.dateMiseEnLigne,
      watchedValues.dateVente,
      watchedValues.prixVente
    );

    return {
      isValid: missing.length === 0,
      missing,
    };
  }, [isVendu, watchedValues]);

  // Handlers
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      onOpenChange?.(newOpen);
      if (!newOpen) {
        setGlobalError(null);
        form.reset();
      }
    },
    [onOpenChange, form]
  );

  const handleRefreshParcelles = useCallback(async () => {
    await refetchParcelles();
  }, [refetchParcelles]);

  const onSubmit = useCallback(
    (values: ProductFormValues) => {
      setGlobalError(null);

      // Validation stricte du statut vendu
      if (values.vendu === "1" && !soldFieldsValidation.isValid) {
        setGlobalError(
          `Pour valider le statut Vendu, renseignez : ${soldFieldsValidation.missing.join(", ")}`
        );
        return;
      }

      // Transform form values - convert empty strings to null for consistency
      const transformedValues = {
        ...values,
        parcelleId: values.parcelleId || null,
        userId: editProduct?.userId || "current-user",
        color: values.color && values.color.trim() !== "" ? values.color : null,
        size: values.size && values.size.trim() !== "" ? values.size : null,
        dateMiseEnLigne: values.dateMiseEnLigne || null,
        dateVente: values.dateVente || null,
        coutLivraison: values.coutLivraison ?? null,
        prixVente: values.prixVente ?? null,
        plateforme: values.plateforme ?? null,
        photoUrl: values.photoUrl && values.photoUrl.trim() !== "" ? values.photoUrl : null,
        brand: values.brand && values.brand.trim() !== "" ? values.brand : null,
        category: values.category && values.category.trim() !== "" ? values.category : null,
        subcategory: values.subcategory && values.subcategory.trim() !== "" ? values.subcategory : null,
        url: values.url && values.url.trim() !== "" ? values.url : null,
        poids: values.poids || 0,
      };

      if (isEditMode && editProduct) {
        updateProductMutation.mutate(
          { id: editProduct.id, data: transformedValues },
          {
            onSuccess: () => {
              toast({
                title: "✓ Produit mis à jour",
                description: "Les modifications ont été enregistrées.",
              });
              handleOpenChange(false);
            },
            onError: (error) => {
              setGlobalError(
                error.message ||
                  "Une erreur est survenue lors de la mise à jour"
              );
            },
          }
        );
      } else {
        createProductMutation.mutate(transformedValues, {
          onSuccess: () => {
            toast({
              title: "✓ Produit créé",
              description: "Le produit a été ajouté à votre inventaire.",
            });
            onCreated?.();
            handleOpenChange(false);
          },
          onError: (error) => {
            setGlobalError(
              error.message || "Une erreur est survenue lors de la création"
            );
          },
        });
      }
    },
    [
      isEditMode,
      editProduct,
      soldFieldsValidation,
      updateProductMutation,
      createProductMutation,
      toast,
      handleOpenChange,
      onCreated,
    ]
  );

  const isSubmitting =
    createProductMutation.isPending || updateProductMutation.isPending;
  const hasMetrics = metrics.coutTotal > 0;
  const showProfitMetrics = isVendu && (watchedValues.prixVente || 0) > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!isEditMode && typeof open === "undefined" && (
        <DialogTrigger asChild>
          <AnimatedButton
            ripple={true}
            haptic={true}
            screenReaderDescription="Ouvrir le formulaire d'ajout de nouveau produit"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nouveau Produit
          </AnimatedButton>
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-2">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold">
              {isEditMode ? "Modifier le produit" : "Nouveau produit"}
            </DialogTitle>
            {isEditMode && (
              <Badge variant="outline" className="font-mono text-xs">
                {editProduct?.id.substring(0, 12)}...
              </Badge>
            )}
          </div>
          <DialogDescription className="text-sm">
            {isEditMode
              ? "Modifiez les informations du produit sélectionné"
              : "Ajoutez un nouveau produit à votre inventaire"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
            {/* Global Error Alert */}
            {globalError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="ml-2">{globalError}</AlertDescription>
              </Alert>
            )}

            {/* Section 1: Informations de base */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">Informations de base</h3>
                <Separator className="flex-1" />
              </div>

              {/* Nom */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Nom du produit <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="ex: Robe Zara taille S"
                        {...field}
                        className="h-10"
                        autoComplete="off"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Marque et Catégorie */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="brand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Marque</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="ex: Zara"
                          {...field}
                          value={field.value ?? ""}
                          className="h-10"
                          autoComplete="off"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Catégorie</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="ex: Vêtements"
                          {...field}
                          value={field.value ?? ""}
                          className="h-10"
                          autoComplete="off"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Sous-catégorie */}
              <FormField
                control={form.control}
                name="subcategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sous-catégorie (optionnel)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="ex: Robes"
                        {...field}
                        value={field.value ?? ""}
                        className="h-10"
                        autoComplete="off"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Photo du produit */}
            <FormField
              control={form.control}
              name="photoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <ImageUpload
                      value={field.value}
                      onChange={field.onChange}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Section 2: Détails financiers et logistiques */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">
                  Détails financiers & logistiques
                </h3>
                <Separator className="flex-1" />
              </div>

              {/* Prix et Poids */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Prix d'achat <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value === ""
                                  ? undefined
                                  : Number(e.target.value)
                              )
                            }
                            placeholder="12.50"
                            className="h-10 pr-8"
                            min="0"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                            €
                          </span>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="poids"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Poids <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value === ""
                                  ? undefined
                                  : Number(e.target.value)
                              )
                            }
                            placeholder="500"
                            className="h-10 pr-8"
                            min="0.01"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                            g
                          </span>
                        </div>
                      </FormControl>
                      <FormMessage />
                      {field.value && field.value > 0 && (
                        <FormDescription>
                          {formatWeight(field.value)}
                        </FormDescription>
                      )}
                    </FormItem>
                  )}
                />
              </div>

              {/* Parcelle */}
              <FormField
                control={form.control}
                name="parcelleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Parcelle <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <ParcelleSelect
                        value={field.value}
                        onChange={field.onChange}
                        parcelles={parcelles}
                        onRefresh={handleRefreshParcelles}
                        isRefreshing={isFetchingParcelles}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Métriques financières */}
              {hasMetrics && (
                <div className="p-4 rounded-lg border bg-muted/30">
                  <ProductMetricsDisplay
                    metrics={metrics}
                    showProfit={showProfitMetrics}
                  />
                </div>
              )}
            </div>

            {/* Section 3: Statut */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">Statut du produit</h3>
                <Separator className="flex-1" />
              </div>

              <FormField
                control={form.control}
                name="vendu"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Statut</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Sélectionner le statut" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-yellow-500" />
                              Disponible
                            </div>
                          </SelectItem>
                          <SelectItem value="1">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-green-500" />
                              Vendu
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Section 4: Informations de vente (si vendu) */}
            {isVendu && (
              <div className="space-y-4 p-4 rounded-lg border bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
                <h3 className="text-sm font-semibold text-green-900 dark:text-green-100">
                  Informations de vente
                </h3>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="dateMiseEnLigne"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date de mise en ligne</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field} 
                            value={field.value ?? ""}
                            className="h-10" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dateVente"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date de vente</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field} 
                            value={field.value ?? ""}
                            className="h-10" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Prix de vente et Plateforme */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="prixVente"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prix de vente</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type="number"
                              step="0.01"
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value === ""
                                    ? undefined
                                    : Number(e.target.value)
                                )
                              }
                              placeholder="25.00"
                              className="h-10 pr-8"
                              min="0"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                              €
                            </span>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="plateforme"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plateforme</FormLabel>
                        <FormControl>
                          <Select
                            onValueChange={(v) =>
                              field.onChange(v === "" ? undefined : v)
                            }
                            value={field.value || ""}
                          >
                            <SelectTrigger className="h-10">
                              <SelectValue placeholder="Choisir" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="leboncoin">
                                Le Bon Coin
                              </SelectItem>
                              <SelectItem value="autre">Autre</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <AnimatedButton
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                Annuler
              </AnimatedButton>
              <AnimatedButton
                type="submit"
                className="flex-1"
                loading={isSubmitting}
                loadingText={isEditMode ? "Mise à jour..." : "Création..."}
                success={form.formState.isSubmitSuccessful}
                successText={isEditMode ? "✓ Mis à jour" : "✓ Créé"}
                ripple={true}
                haptic={true}
                disabled={isSubmitting}
              >
                {isEditMode ? "Mettre à jour" : "Créer"} le produit
              </AnimatedButton>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default ProductCreateFormRefactored;
