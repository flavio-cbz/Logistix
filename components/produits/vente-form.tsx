"use client"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useStore } from "@/lib/store"
import { useToast } from "@/components/ui/use-toast"
import { useEffect } from "react"

const venteFormSchema = z.object({
  dateVente: z.string().min(1, "La date de vente est requise"),
  dateMiseEnVente: z.string().min(1, "La date de mise en vente est requise"),
  tempsEnLigne: z.string().optional(),
  prixVente: z.number().min(0, "Le prix de vente doit être positif"),
  plateforme: z.string().min(1, "La plateforme est requise"),
})

interface VenteFormProps {
  produitId: string
  open: boolean
  onClose: () => void
}

export function VenteForm({ produitId, open, onClose }: VenteFormProps) {
  const { updateProduitVente } = useStore()
  const { toast } = useToast()

  const form = useForm<z.infer<typeof venteFormSchema>>({
    resolver: zodResolver(venteFormSchema),
    defaultValues: {
      dateVente: new Date().toISOString().split("T")[0],
      dateMiseEnVente: new Date().toISOString().split("T")[0],
      tempsEnLigne: "",
      prixVente: 0,
      plateforme: "",
    },
  })

  // Calculer automatiquement le temps en ligne lorsque les dates changent
  useEffect(() => {
    const dateVente = form.watch("dateVente")
    const dateMiseEnVente = form.watch("dateMiseEnVente")

    if (dateVente && dateMiseEnVente) {
      try {
        const dateVenteObj = new Date(dateVente)
        const dateMiseEnVenteObj = new Date(dateMiseEnVente)

        // Vérifier que les dates sont valides
        if (!isNaN(dateVenteObj.getTime()) && !isNaN(dateMiseEnVenteObj.getTime())) {
          // Calculer la différence en jours
          const diffTime = dateVenteObj.getTime() - dateMiseEnVenteObj.getTime()
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

          if (diffDays >= 0) {
            form.setValue("tempsEnLigne", `${diffDays} jours`)
          } else {
            form.setValue("tempsEnLigne", "Date de vente antérieure à la mise en vente")
          }
        }
      } catch (error) {
        console.error("Erreur lors du calcul du temps en ligne:", error)
      }
    }
  }, [form.watch("dateVente"), form.watch("dateMiseEnVente"), form])

  function onSubmit(values: z.infer<typeof venteFormSchema>) {
    updateProduitVente(produitId, {
      ...values,
      prixVente: Number(values.prixVente),
      vendu: true,
    })
    toast({
      title: "Vente enregistrée",
      description: "Les détails de la vente ont été enregistrés avec succès.",
    })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Détails de la vente</DialogTitle>
          <DialogDescription>Renseignez les informations de vente pour ce produit</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dateMiseEnVente"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date de mise en vente</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormDescription>Date à laquelle le produit a été mis en vente</FormDescription>
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
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormDescription>Date à laquelle le produit a été vendu</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="tempsEnLigne"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Temps en ligne</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Calculé automatiquement" readOnly />
                  </FormControl>
                  <FormDescription>Calculé automatiquement à partir des dates ci-dessus</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="prixVente"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prix de vente (€)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
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
                    <Input {...field} placeholder="ex: Vinted" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full">
              Enregistrer la vente
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

