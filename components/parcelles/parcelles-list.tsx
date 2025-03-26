"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ParcelleForm } from "@/components/parcelles/parcelle-form"
import { Edit, Trash2 } from "lucide-react"
import { ConfirmDialog } from "@/components/confirm-dialog"
import type { Parcelle } from "@/types"
import { useToast } from "@/components/ui/use-toast"

interface ParcellesListProps {
  initialParcelles: Parcelle[]
  onDelete: (id: string) => Promise<void>
}

export function ParcellesList({ initialParcelles = [], onDelete }: ParcellesListProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editParcelle, setEditParcelle] = useState<Parcelle | null>(null)
  const { toast } = useToast()

  const filteredParcelles = initialParcelles.filter(
    (parcelle) =>
      parcelle.transporteur.toLowerCase().includes(searchTerm.toLowerCase()) ||
      parcelle.numero.toString().includes(searchTerm),
  )

  const handleDelete = async (id: string) => {
    try {
      await onDelete(id)
      toast({
        title: "Parcelle supprimée",
        description: "La parcelle a été supprimée avec succès.",
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue lors de la suppression.",
      })
    }
    setDeleteId(null)
  }

  return (
    <>
      <div className="flex items-center py-4">
        <Input
          placeholder="Rechercher des parcelles..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <ParcelleForm className="ml-auto" editParcelle={editParcelle} onClose={() => setEditParcelle(null)} />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Numéro</TableHead>
              <TableHead>Transporteur</TableHead>
              <TableHead>Poids (g)</TableHead>
              <TableHead>Prix Total (€)</TableHead>
              <TableHead>Prix/g (€)</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence>
              {filteredParcelles.map((parcelle) => (
                <motion.tr
                  key={parcelle.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <TableCell>#{parcelle.numero}</TableCell>
                  <TableCell>{parcelle.transporteur}</TableCell>
                  <TableCell>{parcelle.poids}</TableCell>
                  <TableCell>{parcelle.prixTotal.toFixed(2)} €</TableCell>
                  <TableCell>{parcelle.prixParGramme.toFixed(3)} €</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => setEditParcelle(parcelle)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(parcelle.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </motion.tr>
              ))}
            </AnimatePresence>
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        onConfirm={() => deleteId && handleDelete(deleteId)}
        title="Supprimer la parcelle"
        description="Êtes-vous sûr de vouloir supprimer cette parcelle ? Cette action est irréversible."
      />
    </>
  )
}

