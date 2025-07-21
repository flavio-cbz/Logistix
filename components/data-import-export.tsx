"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useStore } from "@/store/store"
import { useToast } from "@/components/ui/use-toast"
import { Download, Upload, Database } from "lucide-react"

export function DataImportExport() {
  const [open, setOpen] = useState(false)
  const { exportData, importData } = useStore()
  const { toast } = useToast()

  // Fonction pour exporter les données
  const handleExport = () => {
    try {
      // Récupérer les données à exporter
      const data = exportData()

      // Convertir en JSON et créer un blob
      const jsonData = JSON.stringify(data, null, 2)
      const blob = new Blob([jsonData], { type: "application/json" })

      // Créer un URL pour le téléchargement
      const url = URL.createObjectURL(blob)

      // Créer un lien et déclencher le téléchargement
      const a = document.createElement("a")
      a.href = url
      a.download = `logistix-data-${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(a)
      a.click()

      // Nettoyer
      URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "Exportation réussie",
        description: "Vos données et configurations ont été exportées avec succès.",
      })
    } catch (error) {
      console.error("Erreur lors de l'exportation:", error)
      toast({
        variant: "destructive",
        title: "Erreur d'exportation",
        description: "Une erreur est survenue lors de l'exportation des données.",
      })
    }
  }

  // Fonction pour importer les données
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const data = JSON.parse(content)

        // Vérifier que les données sont valides
        if (!data.parcelles || !data.produits) {
          throw new Error("Format de fichier invalide")
        }

        // Importer les données
        importData(data)

        toast({
          title: "Importation réussie",
          description: "Vos données et configurations ont été importées avec succès.",
        })

        setOpen(false)
      } catch (error) {
        console.error("Erreur lors de l'importation:", error)
        toast({
          variant: "destructive",
          title: "Erreur d'importation",
          description: "Le fichier sélectionné n'est pas valide.",
        })
      }
    }

    reader.readAsText(file)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Database className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gestion des données</DialogTitle>
          <DialogDescription>
            Exportez vos données pour les sauvegarder ou les transférer sur un autre appareil.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="flex flex-col gap-2">
            <Button onClick={handleExport} className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Exporter les données
            </Button>
            <p className="text-xs text-muted-foreground">
              Téléchargez un fichier JSON contenant toutes vos données pour les sauvegarder ou les transférer.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="import-file">
              <div className="flex w-full cursor-pointer items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium ring-offset-background hover:bg-accent hover:text-accent-foreground">
                <Upload className="mr-2 h-4 w-4" />
                Importer des données
              </div>
              <input id="import-file" type="file" accept=".json" onChange={handleImport} className="sr-only" />
            </label>
            <p className="text-xs text-muted-foreground">
              Sélectionnez un fichier JSON précédemment exporté pour restaurer vos données.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

