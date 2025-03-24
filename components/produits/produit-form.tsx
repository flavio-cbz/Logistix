"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useStore } from "@/lib/store"
import { useEffect, useState } from "react"
import { useToast } from "@/components/ui/use-toast"
import type { Produit } from "@/types"

const produitFormSchema = z.object({
  commandeId: z.string().min(1, "L'ID de commande est requis"),
  nom: z.string().min(1, "Le nom est requis"),
  details: z.string().optional(),
  prixArticle: z.number().min(0, "Le prix doit être positif"),
  poids: z.number().min(1, "Le poids doit être positif"),
  parcelleId: z.string().min(1, "La parcelle est requise"),
})

interface ProduitFormProps {
  className?: string
  editProduit?: Produit | null
  onClose?: () => void
}

export function ProduitForm({ className, editProduit = null, onClose }: ProduitFormProps) {
  const [open, setOpen] = useState(false)
  const { parcelles, addProduit, updateProduit } = useStore()
  const { toast } = useToast()

  const form = useForm<z.infer<typeof produitFormSchema>>({
    resolver: zodResolver(produitFormSchema),
    defaultValues: {
      commandeId: "",
      nom: "",
      details: "",
      prixArticle: 0,
      poids: 0,
      parcelleId: "",
    },
  })

  useEffect(() => {
    if (editProduit) {
      form.reset({
        commandeId: editProduit.commandeId,
        nom: editProduit.nom,
        details: editProduit.details || "",
        prixArticle: editProduit.prixArticle,
        poids: editProduit.poids,
        parcelleId: editProduit.parcelleId,
      })
      setOpen(true)
    }
  }, [editProduit, form])

  function onSubmit(values: z.infer<typeof produitFormSchema>) {
    if (editProduit) {
      updateProduit(editProduit.id, values)
      toast({
        title: "Produit mis à jour",
        description: "Le produit a été mis à jour avec succès.",
      })
    } else {
      addProduit({
        ...values,
        vendu: false,
      })
      toast({
        title: "Produit ajouté",
        description: "Le produit a été ajouté avec succès.",
      })
    }
    handleClose()
  }

  function handleClose() {
    setOpen(false)
    form.reset()
    if (onClose) onClose()
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className={className}>
        {editProduit ? "Modifier le produit" : "Ajouter un produit"}
      </Button>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editProduit ? "Modifier le produit" : "Ajouter un produit"}</DialogTitle>
            <DialogDescription>
              {editProduit
                ? "Modifiez les informations du produit ci-dessous."
                : "Remplissez les informations du produit ci-dessous."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="commandeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID Commande</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom du produit</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="details"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Détails (optionnel)</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="prixArticle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prix de l'article (€)</FormLabel>
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
                name="poids"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Poids (g)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="parcelleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parcelle</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez une parcelle" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {parcelles.map((parcelle) => (
                          <SelectItem key={parcelle.id} value={parcelle.id}>
                            #{parcelle.numero} - {parcelle.transporteur} ({parcelle.prixParGramme.toFixed(3)} €/g)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full">
                {editProduit ? "Mettre à jour" : "Ajouter"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  )
}

