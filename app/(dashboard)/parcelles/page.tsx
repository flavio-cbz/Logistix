"use client"

import { useEffect, useState } from "react"
import ParcellesList from "@/components/features/parcelles/parcelles-list"
import { useStore } from "@/lib/services/admin/store"
// import { motion } from "framer-motion" // Removed framer-motion import
import { ConfirmDialog } from "@/components/confirm-dialog"
import { useToast } from "@/components/ui/use-toast"

export default function ParcellesPage() {
  const { parcelles, deleteParcelle, initializeStore } = useStore()
  const [isLoading, setIsLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    const loadData = async () => {
      await initializeStore()
      setIsLoading(false)
    }

    loadData()
  }, [initializeStore])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6"> {/* Removed motion.div */}
      <div
        // initial={{ opacity: 0, y: -20 }} // Removed motion props
        // animate={{ opacity: 1, y: 0 }} // Removed motion props
        // transition={{ duration: 0.5, delay: 0.1 }} // Removed motion props
      >
        <h3 className="text-lg font-medium">Parcelles</h3>
        <p className="text-sm text-muted-foreground">Gérez vos parcelles et leurs informations.</p>
      </div>
      <div
        // initial={{ opacity: 0, y: 20 }} // Removed motion props
        // animate={{ opacity: 1, y: 0 }} // Removed motion props
        // transition={{ duration: 0.5, delay: 0.2 }} // Removed motion props
      >
        <ParcellesList initialParcelles={parcelles} onDelete={(id: string) => setDeleteId(id)} />
      </div>
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null) }}
        onConfirm={async () => {
          if (!deleteId) return
          try {
            await deleteParcelle(deleteId)
            toast({ title: "Parcelle supprimée", description: "La parcelle a été supprimée avec succès." })
          } catch (error) {
            toast({ variant: "destructive", title: "Erreur", description: "Une erreur est survenue lors de la suppression." })
          } finally {
            setDeleteId(null)
          }
        }}
        title="Supprimer la parcelle"
        description="Êtes-vous sûr de vouloir supprimer cette parcelle ? Cette action est irréversible."
      />
    </div>
  )
}