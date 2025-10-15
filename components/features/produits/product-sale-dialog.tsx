"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AnimatedButton } from "@/components/ui/animated-button"
import { Product, Platform } from "@/lib/shared/types/entities"
import { getSellingPrice, getListedAt, getSoldAt, type ProductWithLegacyFields } from "@/lib/utils/product-field-normalizers"
import { DollarSign, Calendar, Store } from "lucide-react"

// Schéma de validation pour les informations de vente
const saleFormSchema = z.object({
  prixVente: z.coerce.number().min(0.01, "Le prix de vente doit être supérieur à 0"),
  dateVente: z.string().min(1, "La date de vente est requise"),
  dateMiseEnLigne: z.string().min(1, "La date de mise en ligne est requise"),
  plateforme: z.nativeEnum(Platform, {
    errorMap: () => ({ message: "Veuillez sélectionner une plateforme" }),
  }),
})

type SaleFormValues = z.infer<typeof saleFormSchema>

interface ProductSaleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: Product | null
  onConfirm: (data: SaleFormValues) => Promise<void>
  coutTotal?: number // Coût total pour afficher le bénéfice estimé
}

export function ProductSaleDialog({
  open,
  onOpenChange,
  product,
  onConfirm,
  coutTotal = 0,
}: ProductSaleDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  // S'assurer que coutTotal est un nombre
  const coutTotalNum = Number(coutTotal) || 0

  const form = useForm<SaleFormValues>({
    resolver: zodResolver(saleFormSchema),
    defaultValues: {
      prixVente: getSellingPrice(product as ProductWithLegacyFields) || coutTotalNum * 1.5, // Suggérer 50% de marge
      dateVente: getSoldAt(product as ProductWithLegacyFields) || new Date().toISOString().split('T')[0],
      dateMiseEnLigne: getListedAt(product as ProductWithLegacyFields) || new Date().toISOString().split('T')[0],
      plateforme: (product?.plateforme as Platform) || "leboncoin" as Platform,
    } as SaleFormValues,
  })

  // Calculer le bénéfice estimé en temps réel
  const prixVente = Number(form.watch("prixVente")) || 0
  const beneficeEstime = prixVente - coutTotalNum

  async function onSubmit(data: SaleFormValues) {
    setIsSubmitting(true)
    try {
      await onConfirm(data)
      form.reset()
      onOpenChange(false)
    } catch (error) {
      console.error("Erreur lors de la validation de la vente:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Réinitialiser le formulaire quand on ouvre/ferme
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      form.reset()
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Confirmer la vente
          </DialogTitle>
          <DialogDescription>
            Renseignez les informations de vente pour{" "}
            <span className="font-semibold">{product?.name}</span>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => onSubmit(data))} className="space-y-4">
            {/* Résumé du coût */}
            <div className="bg-muted/50 border rounded-lg p-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Coût total</span>
                <span className="font-medium">{coutTotalNum.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Prix de vente</span>
                <span className="font-semibold text-green-600">
                  {prixVente ? prixVente.toFixed(2) : "0.00"} €
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Date mise en ligne</span>
                <span className="font-medium">
                  {form.watch("dateMiseEnLigne") ? new Date(form.watch("dateMiseEnLigne")).toLocaleDateString('fr-FR') : "Non définie"}
                </span>
              </div>
              <div className="border-t pt-1 mt-1">
                <div className="flex justify-between">
                  <span className="font-medium">Bénéfice estimé</span>
                  <span
                    className={`font-bold ${
                      beneficeEstime >= 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {beneficeEstime >= 0 ? "+" : ""}
                    {beneficeEstime.toFixed(2)} €
                  </span>
                </div>
              </div>
            </div>

            {/* Prix de vente */}
            <FormField
              control={form.control as any}
              name="prixVente"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Prix de vente
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Ex: 25.00"
                        {...field}
                        className="pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        €
                      </span>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date de mise en ligne */}
            <FormField
              control={form.control as any}
              name="dateMiseEnLigne"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Date de mise en ligne
                  </FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date de vente */}
            <FormField
              control={form.control as any}
              name="dateVente"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Date de vente
                  </FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Plateforme */}
            <FormField
              control={form.control as any}
              name="plateforme"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Store className="h-4 w-4" />
                    Plateforme de vente
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une plateforme" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={Platform.LEBONCOIN}>Leboncoin</SelectItem>
                      <SelectItem value={Platform.OTHER}>Autre</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2">
              <AnimatedButton
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                Annuler
              </AnimatedButton>
              <AnimatedButton
                type="submit"
                disabled={isSubmitting}
                ripple={true}
                haptic={true}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? "Validation..." : "Confirmer la vente"}
              </AnimatedButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
