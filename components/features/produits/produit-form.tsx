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
import { useStore } from "@/store/store"
import { useEffect, useState } from "react"
import { useToast } from "@/components/ui/use-toast"
import type { Produit } from "@/types"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { calculPrixLivraison } from "@/lib/utils/calculations"

// Schéma de base pour les produits (non vendus)
const produitBaseSchema = z.object({
  commandeId: z.string().min(1, "L'ID de commande est requis"),
  nom: z.string().min(1, "Le nom est requis"),
  details: z.string().optional(),
  prixArticle: z.number().min(0, "Le prix doit être positif"),
  poids: z.number().min(1, "Le poids doit être positif"),
  parcelleId: z.string().min(1, "La parcelle est requise"),
})

// Schéma pour les produits vendus (avec champs supplémentaires)
const produitVenduSchema = produitBaseSchema.extend({
  prixVente: z.number().min(0, "Le prix de vente doit être positif"),
  dateVente: z.string().min(1, "La date de vente est requise"),
  tempsEnLigne: z.string().min(1, "Le temps en ligne est requis"),
  plateforme: z.string().min(1, "La plateforme est requise"),
})

// Schéma conditionnel selon si le produit est vendu ou non
const produitFormSchema = z.discriminatedUnion("isVendu", [
  z.object({ isVendu: z.literal(false), ...produitBaseSchema.shape }),
  z.object({ isVendu: z.literal(true), ...produitVenduSchema.shape }),
])

interface ProduitFormProps {
  className?: string
  editProduit?: Produit | null
  onClose?: () => void
}

export function ProduitForm({ className, editProduit = null, onClose }: ProduitFormProps) {
  const [open, setOpen] = useState(false)
  const { parcelles, addProduit, updateProduit } = useStore()
  const { toast } = useToast()
  const [isVendu, setIsVendu] = useState(false)

  const form = useForm<z.infer<typeof produitFormSchema>>({
    resolver: zodResolver(produitFormSchema),
    defaultValues: {
      isVendu: false,
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
      const isProductSold = editProduit.vendu
      setIsVendu(isProductSold)

      if (isProductSold) {
        form.reset({
          isVendu: true,
          commandeId: editProduit.commandeId,
          nom: editProduit.nom ?? "",
          details: editProduit.details || "",
          prixArticle: editProduit.prixArticle,
          poids: editProduit.poids,
          parcelleId: editProduit.parcelleId,
          prixVente: editProduit.prixVente || 0,
          dateVente: editProduit.dateVente?.split("T")[0] || new Date().toISOString().split("T")[0],
          tempsEnLigne: editProduit.tempsEnLigne || "",
          plateforme: editProduit.plateforme || "",
        })
      } else {
        form.reset({
          isVendu: false,
          commandeId: editProduit.commandeId,
          nom: editProduit.nom ?? "",
          details: editProduit.details || "",
          prixArticle: editProduit.prixArticle,
          poids: editProduit.poids,
          parcelleId: editProduit.parcelleId,
        })
      }

      setOpen(true)
    }
  }, [editProduit, form])

  function onSubmit(values: z.infer<typeof produitFormSchema>) {
    // Extraire les données communes
    const { isVendu, commandeId, nom, details, prixArticle, poids, parcelleId } = values

    // Données de base pour tous les produits
    const baseData = {
      commandeId,
      nom,
      details,
      prixArticle,
      poids,
      parcelleId,
    }

    // Ajouter les données de vente si le produit est vendu
    const venteData = isVendu
      ? {
          vendu: true,
          prixVente: values.prixVente,
          dateVente: values.dateVente,
          tempsEnLigne: values.tempsEnLigne,
          plateforme: values.plateforme,
        }
      : { vendu: false }

    // Calculer le prix de livraison
    const prixLivraison = calculPrixLivraison(poids, parcelles, parcelleId)

    // Combiner les données
    const produitData = {
      ...baseData,
      ...venteData,
      prixLivraison,
    }

    if (editProduit) {
      updateProduit(editProduit.id, produitData)
      toast({
        title: "Produit mis à jour",
        description: "Le produit a été mis à jour avec succès.",
      })
    } else {
      addProduit(produitData)
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
    setIsVendu(false)
    if (onClose) onClose()
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className={className}>
        {editProduit ? "Modifier le produit" : "Ajouter un produit"}
      </Button>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl">
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
              {/* Champ caché pour le statut de vente */}
              <FormField
                control={form.control}
                name="isVendu"
                render={({ field }) => (
                  <FormItem className="hidden">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={isVendu}
                        onChange={(e) => {
                          setIsVendu(e.target.checked)
                          field.onChange(e.target.checked)
                        }}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Afficher un badge si le produit est vendu */}
              {editProduit && editProduit.vendu && (
                <div className="flex justify-end">
                  <Badge variant="outline" className="bg-green-100 dark:bg-green-900">
                    Produit vendu
                  </Badge>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>

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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              </div>

              {/* Champs supplémentaires pour les produits vendus */}
              {isVendu && (
                <>
                  <Separator className="my-4" />
                  <h3 className="text-lg font-medium mb-4">Informations de vente</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  </div>
                </>
              )}

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
