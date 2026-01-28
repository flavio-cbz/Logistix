"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { ProductStatus, Platform } from "@/lib/shared/types/entities";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { Form } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

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
} from "@/lib/utils/product-calculations";
import { useFormatting } from "@/lib/hooks/use-formatting";

import { BasicInfoSection } from "./form-sections/basic-info-section";
import { FinancialDetailsSection } from "./form-sections/financial-details-section";
import { StatusSection, SalesInfoSection } from "./form-sections/sales-status-sections";

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
  // useFormatting hook available for future use
  useFormatting();


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
      parcelId: "",
      vendu: "0",
      listedAt: "",
      soldAt: "",
      sellingPrice: 0,
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
    return (parcelles ?? []).find((p) => p.id === watchedValues.parcelId);
  }, [parcelles, watchedValues.parcelId]);

  const metrics = useMemo(() => {
    return calculateProductMetrics(
      watchedValues.price || 0,
      watchedValues.poids || 0,
      watchedValues.sellingPrice,
      watchedValues.listedAt,
      watchedValues.soldAt,
      selectedParcelle
    );
  }, [
    watchedValues.price,
    watchedValues.poids,
    watchedValues.sellingPrice,
    watchedValues.listedAt,
    watchedValues.soldAt,
    selectedParcelle,
  ]);

  const soldFieldsValidation = useMemo(() => {
    if (!isVendu) return { isValid: true, missing: [] };

    const missing = getMissingSoldFields(
      watchedValues.listedAt,
      watchedValues.soldAt,
      watchedValues.sellingPrice
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
        parcelId: values.parcelId || null,
        userId: editProduct?.userId || "current-user",
        color: values.color && values.color.trim() !== "" ? values.color : null,
        size: values.size && values.size.trim() !== "" ? values.size : null,
        listedAt: values.listedAt || null,
        soldAt: values.soldAt || null,
        coutLivraison: values.coutLivraison ?? null,
        sellingPrice: values.sellingPrice ?? null,
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
              toast.success("✓ Produit mis à jour", {
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
        createProductMutation.mutate(transformedValues as Omit<Product, "id" | "createdAt" | "updatedAt">, {
          onSuccess: () => {
            toast.success("✓ Produit créé", {
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
      handleOpenChange,
      onCreated,
    ]
  );

  const isSubmitting =
    createProductMutation.isPending || updateProductMutation.isPending;
  const hasMetrics = metrics.coutTotal > 0;
  const showProfitMetrics = isVendu && (watchedValues.sellingPrice || 0) > 0;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      {!isEditMode && typeof open === "undefined" && (
        <SheetTrigger asChild>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau Produit
          </Button>
        </SheetTrigger>
      )}

      <SheetContent side="right" className="sm:max-w-[600px] w-full overflow-y-auto">
        <SheetHeader className="space-y-2">
          <div className="flex items-center justify-between mr-8">
            <SheetTitle className="text-2xl font-bold">
              {isEditMode ? "Modifier le produit" : "Nouveau produit"}
            </SheetTitle>
            {isEditMode && (
              <Badge variant="outline" className="font-mono text-xs">
                {editProduct?.id.substring(0, 12)}...
              </Badge>
            )}
          </div>
          <SheetDescription className="text-sm">
            {isEditMode
              ? "Modifiez les informations du produit sélectionné"
              : "Ajoutez un nouveau produit à votre inventaire"}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4 pb-20">
            {/* Global Error Alert */}
            {globalError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="ml-2">{globalError}</AlertDescription>
              </Alert>
            )}

            <BasicInfoSection form={form} isSubmitting={isSubmitting} />

            <FinancialDetailsSection
              form={form}
              metrics={metrics}
              hasMetrics={hasMetrics}
              showProfitMetrics={showProfitMetrics}
              parcelles={parcelles}
              handleRefreshParcelles={handleRefreshParcelles}
              isFetchingParcelles={isFetchingParcelles}
            />

            <StatusSection form={form} />

            {isVendu && <SalesInfoSection form={form} />}

            {/* Actions */}
            <SheetFooter className="mt-6">
              <div className="flex gap-3 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-none"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-none"
                >
                  {isSubmitting && <span className="mr-2">...</span>}
                  {isEditMode ? "Mettre à jour" : "Créer"} le produit
                </Button>
              </div>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

export default ProductCreateFormRefactored;
