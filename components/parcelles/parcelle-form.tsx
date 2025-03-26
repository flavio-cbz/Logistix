"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { useStore } from "@/lib/store"
import { useToast } from "@/components/ui/use-toast"
import type { Parcelle } from "@/types"

const formSchema = z.object({
  numero: z.string().min(1, "Le numéro est requis"),
  transporteur: z.string().min(1, "Le transporteur est requis"),
  poids: z.number().min(1, "Le poids doit être supérieur à 0"),
  prixTotal: z.number().min(0, "Le prix doit être positif"),
})

interface ParcelleFormProps {
  editParcelle?: Parcelle
  onClose?: () => void
}

export function ParcelleForm({ editParcelle, onClose }: ParcelleFormProps) {
  const [open, setOpen] = useState(false)
  const { addParcelle, updateParcelle } = useStore()
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: editParcelle
      ? {
          numero: editParcelle.numero,
          transporteur: editParcelle.transporteur,
          poids: editParcelle.poids,
          prixTotal: editParcelle.prixTotal,
        }
      : {
          numero: "",
          transporteur: "",
          poids: 0,
          prixTotal: 0,
        },
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (editParcelle) {
      updateParcelle(editParcelle.id, values)
      toast({
        title: "Parcelle mise à jour",
        description: "La parcelle a été mise à jour avec succès.",
      })
    } else {
      addParcelle(values)
      toast({
        title: "Parcelle créée",
        description: "La nouvelle parcelle a été créée avec succès.",
      })
    }

    setOpen(false)
    if (onClose) onClose()
    form.reset()
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen && onClose) onClose()
  }

  return (
    <Dialog open={open || !!editParcelle} onOpenChange={handleOpenChange}>
      {!editParcelle && (
        <DialogTrigger asChild>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle Parcelle
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{editParcelle ? "Modifier la parcelle" : "Ajouter une nouvelle parcelle"}</DialogTitle>
          <DialogDescription>
            {editParcelle
              ? "Modifiez les informations de la parcelle"
              : "Renseignez les informations de la nouvelle parcelle"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="numero"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Numéro de parcelle</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="ex: A123" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="transporteur"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transporteur</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="ex: DHL" />
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
              name="prixTotal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prix Total (€)</FormLabel>
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
            <Button type="submit" className="w-full">
              {editParcelle ? "Mettre à jour" : "Ajouter"} la parcelle
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

