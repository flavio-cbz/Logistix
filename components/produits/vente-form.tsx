"use client"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useStore } from "@/lib/store"
import { useToast } from "@/components/ui/use-toast"

const venteFormSchema = z.object({
  dateVente: z.string().min(1, "La date de vente est requise"),
  tempsEnLigne: z.string().min(1, "Le temps en ligne est requis"),
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
      tempsEnLigne: "",
      prixVente: 0,
      plateforme: "",
    },
  })

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
            <FormField
              control={form.control}
              name="dateVente"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date de vente</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tempsEnLigne"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Temps en ligne</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="ex: 3 jours" />
                  </FormControl>
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

