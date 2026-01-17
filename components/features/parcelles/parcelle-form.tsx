"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import type { Parcelle } from "@/lib/types/entities";
import {
  createParcelSchema,
  type CreateParcelFormData,
} from "@/lib/schemas/parcelle";
import {
  useCreateParcelle,
  useUpdateParcelle,
} from "@/lib/hooks/use-parcelles";
import { useFormatting } from "@/lib/hooks/use-formatting";
import { ParcelStatus } from "@/lib/shared/types/entities";


const formSchema = createParcelSchema;
type ParcelleFormData = CreateParcelFormData;

interface ParcelleFormProps {
  editParcelle?: Parcelle | null;
  onClose?: () => void;             // callback quand le dialog se ferme
  className?: string;               // classes pour le bouton trigger interne
  onCreated?: () => void;           // callback après création réussie
  forceOpen?: boolean;              // contrôle externe de l'ouverture du Dialog
  showTrigger?: boolean;            // masquer le trigger interne (utilisé en mode contrôlé)
  triggerLabel?: string;            // personnaliser le libellé du bouton trigger
}

export default function ParcelleForm({
  editParcelle,
  onClose,
  className,
  onCreated,
  forceOpen,
  showTrigger = true,
  triggerLabel = "Nouvelle Parcelle",
}: ParcelleFormProps) {
  // État interne uniquement si non contrôlé de l'extérieur
  const [internalOpen, setInternalOpen] = useState(false);
  const createParcelleMutation = useCreateParcelle();
  const updateParcelleMutation = useUpdateParcelle();
  const { getCurrencySymbol, formatCurrency } = useFormatting();


  // Transform parcelle data for form if editing
  // Transform parcelle data for form if editing
  const formData = useMemo(() => {
    if (!editParcelle) return undefined;
    return editParcelle; // Already in correct format thanks to Parcel type update
  }, [editParcelle]);

  const getDefaultValues = useCallback((): ParcelleFormData => {
    if (formData) {
      return {
        superbuyId: formData.superbuyId,
        carrier: formData.carrier,
        name: formData.name || "",
        status: (formData.status as ParcelStatus) || ParcelStatus.PENDING,
        weight: formData.weight,
        totalPrice: formData.totalPrice || 0,
        pricePerGram: formData.pricePerGram || 0,
        // derived fields not needed for default values as they are calculated? 
        // Wait, schema might require them if they are in the Type but marked optional?
        // createParcelSchema omits pricePerGram.
        // But the form might use them for display? 
      };
    }
    return {
      superbuyId: "",
      carrier: "",
      name: "",
      status: ParcelStatus.PENDING,
      weight: 0,
      totalPrice: 0,
      pricePerGram: 0,
    };
  }, [formData]);

  const form = useForm<ParcelleFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaultValues(),
  });

  useEffect(() => {
    if (formData) {
      form.reset({
        superbuyId: formData.superbuyId,
        carrier: formData.carrier,
        name: formData.name || "",
        status: (formData.status as ParcelStatus) || ParcelStatus.PENDING,
        weight: formData.weight,
        totalPrice: formData.totalPrice || 0,
        pricePerGram: formData.pricePerGram || 0,
      });
    } else {
      form.reset(getDefaultValues());
    }
  }, [formData, form, getDefaultValues]);

  function onSubmit(values: ParcelleFormData) {
    if (editParcelle) {
      updateParcelleMutation.mutate(
        { id: editParcelle.id, data: values },
        {
          onSuccess: (_updatedParcelle) => {
            toast.success("Parcelle mise à jour", {
              description: "La parcelle a été mise à jour avec succès.",
            });
          },
          onError: (error: unknown) => {
            const errorMessage = error instanceof Error ? error.message : "Une erreur est survenue lors de la mise à jour de la parcelle.";
            toast.error("Erreur", {
              description: errorMessage,
            });
          },
          onSettled: () => {
            // Fermer le dialog seulement si la mutation a réussi
            if (!updateParcelleMutation.isError) {
              if (forceOpen !== undefined) {
                if (onClose) {
                  onClose();
                }
              } else {
                setInternalOpen(false);
              }
              form.reset();
            }
          },
        },
      );
    } else {
      createParcelleMutation.mutate(values, {
        onSuccess: async () => {
          toast.success("Parcelle créée", {
            description: "La nouvelle parcelle a été créée avec succès.",
          });
          if (onCreated) {
            onCreated();
          }
          // Attendre un petit délai pour que l'invalidation du cache se termine
          await new Promise(resolve => setTimeout(resolve, 150));

          if (forceOpen === undefined) {
            setInternalOpen(false);
          } else if (onClose) {
            onClose();
          }
          form.reset();
        },
        onError: (error: unknown) => {
          const errorMessage = error instanceof Error ? error.message : "Une erreur est survenue lors de la création de la parcelle.";
          toast.error("Erreur", {
            description: errorMessage,
          });
        },
      });
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    // Si contrôle externe, on ne modifie pas l'état interne (sauf fermeture pour cleanup form)
    if (forceOpen !== undefined) {
      if (!newOpen) {
        if (onClose) onClose();
        form.reset();
      }
      return; // pas d'état interne à mettre à jour
    }
    setInternalOpen(newOpen);
    if (!newOpen) {
      if (onClose) onClose();
      form.reset();
    }
  };

  const effectiveOpen = forceOpen !== undefined ? forceOpen : internalOpen;

  return (
    <Dialog open={effectiveOpen} onOpenChange={handleOpenChange!}>
      {!editParcelle && showTrigger && (
        <DialogTrigger asChild>
          <Button
            className={className ?? ""}
            onClick={() => {
              if (forceOpen !== undefined) {
                // Mode contrôlé : le parent doit changer forceOpen. On propose un noop ici.
              } else {
                setInternalOpen(true);
              }
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            {triggerLabel}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-xl font-semibold">
            {editParcelle ? "Modifier la parcelle" : "Nouvelle parcelle"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {editParcelle
              ? "Modifiez les informations de la parcelle sélectionnée"
              : "Ajoutez une nouvelle parcelle à votre inventaire. Tous les champs sont obligatoires."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="superbuyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Numéro de parcelle *
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="ex: A123"
                        className="h-11"
                        autoComplete="off"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="carrier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Transporteur *
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="ex: DHL, UPS, LaPoste"
                        className="h-11"
                        autoComplete="off"
                        list="transporteurs-list"
                      />
                    </FormControl>
                    <datalist id="transporteurs-list">
                      <option value="DHL" />
                      <option value="UPS" />
                      <option value="La Poste" />
                      <option value="Chronopost" />
                      <option value="FedEx" />
                      <option value="TNT" />
                    </datalist>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Nom de la parcelle *
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="ex: Colis électronique"
                        className="h-11"
                        autoComplete="off"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Statut *
                    </FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="Pending">En attente</option>
                        <option value="In Transit">En transit</option>
                        <option value="Delivered">Livré</option>
                        <option value="Returned">Retourné</option>
                        <option value="Lost">Perdu</option>
                        <option value="Cancelled">Annulé</option>
                        <option value="Cancelling">Annulation...</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="weight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Poids (grammes) *
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          {...field}
                          onChange={e => field.onChange(Number(e.target.value))}
                          placeholder="500"
                          className="h-11 pr-8"
                          min="0.01"
                          step="0.01"
                        />
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">
                          g
                        </span>
                      </div>
                    </FormControl>
                    <FormMessage />
                    {field.value > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {(field.value / 1000).toFixed(3)} kg
                      </p>
                    )}
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="totalPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Prix d'achat *
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={e => field.onChange(Number(e.target.value))}
                          placeholder="12.50"
                          className="h-11 pr-8"
                          min="0"
                        />
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">
                          {getCurrencySymbol()}
                        </span>
                      </div>
                    </FormControl>
                    <FormMessage />
                    {field.value > 0 && form.watch("weight") > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Prix/g: {formatCurrency(field.value / form.watch("weight"))}/g
                      </p>
                    )}
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  if (forceOpen === undefined) {
                    setInternalOpen(false);
                  } else if (onClose) {
                    onClose();
                  }
                  if (onClose) onClose();
                }}
                disabled={form.formState.isSubmitting}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={!form.formState.isValid || !form.formState.isDirty || form.formState.isSubmitting}
              >
                {form.formState.isSubmitting && <span className="mr-2">...</span>}
                {editParcelle ? "Mettre à jour" : "Créer"} la parcelle
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
