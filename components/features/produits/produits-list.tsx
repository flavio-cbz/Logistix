"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import ProduitForm from "@/components/features/produits/produit-form"
import { Button } from "@/components/ui/button"
import { VenteForm } from "@/components/features/produits/vente-form"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EllipsisHorizontalIcon } from "@heroicons/react/20/solid"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "@/components/ui/use-toast"
import { useStore } from "@/lib/services/admin/store"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { useDuplicateEntity } from "@/lib/hooks/use-duplicate-entity"
import { Produit } from "@/types/database" 

interface ProduitsListProps {
  // initialProduits: Produit[] // Removed initialProduits as it's not directly used anymore
}

export function ProduitsList({}: ProduitsListProps) {
  const [editProduit, setEditProduit] = useState<Produit | null>(null)
  const [venteFormProduitId, setVenteFormProduitId] = useState<string | null>(null)
  const { produits, deleteProduit, updateProduit, addProduit } = useStore()

  const handleDuplicate = (produit: Produit) => {
    const { duplicateEntity } = useDuplicateEntity<Produit>(); // Explicitly define generic type
    duplicateEntity({
      entity: produit,
      transform: (p: Produit) => ({
        ...p,
        nom: `${p.nom} (copie)`,
      }),
      addFunction: addProduit,
      entityName: "Produit",
    });
  };

  const handleSaveVente = (produitId: string, venteData: Partial<Produit>) => {
    updateProduit(produitId, venteData);
    setVenteFormProduitId(null);
    toast({
      title: "Vente enregistrée",
      description: "Le produit a été marqué comme vendu.",
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Mes Produits</CardTitle>
        <Button onClick={() => setEditProduit({} as Produit)}>Ajouter un produit</Button>
      </CardHeader>
      <CardContent>
        {produits.length === 0 ? (
          <p className="text-center text-muted-foreground">Aucun produit enregistré.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead className="hidden md:table-cell">Détails</TableHead>
                  <TableHead className="text-right">Prix Achat</TableHead>
                  <TableHead className="text-right">Prix Vente</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="hidden md:table-cell">Date Création</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {produits.map((produit) => (
                    <motion.tr
                      key={produit.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.2 }}
                    >
                      <TableCell className="font-medium">{produit.nom || "-"}</TableCell>
                      <TableCell className="hidden md:table-cell max-w-[200px] truncate">
                        {produit.details ?? "-"}
                      </TableCell>
                      <TableCell className="text-right">{(produit.prixArticle ?? 0).toFixed(2)} €</TableCell>
                      <TableCell className="text-right">
                        {produit.vendu ? (
                          (produit.prixVente ?? 0).toFixed(2) + " €"
                        ) : (
                          <Badge variant="outline">Non vendu</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {produit.vendu ? (
                          <Badge className="bg-green-500 hover:bg-green-600">Vendu</Badge>
                        ) : (
                          <Badge variant="secondary">En stock</Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {produit.createdAt ? format(new Date(produit.createdAt), "PPP", { locale: fr }) : "-"}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              aria-haspopup="true"
                              size="icon"
                              variant="ghost"
                            >
                              <EllipsisHorizontalIcon className="h-4 w-4" />
                              <span className="sr-only">Toggle menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => setEditProduit(produit)}>Modifier</DropdownMenuItem>
                            {!produit.vendu && (
                                <DropdownMenuItem onClick={() => setVenteFormProduitId(produit.id)}>Enregistrer vente</DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleDuplicate(produit)}>Dupliquer</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => deleteProduit(produit.id)}>Supprimer</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {editProduit && (
        <ProduitForm
          className="w-full sm:w-auto sm:ml-auto"
          editProduit={editProduit}
          onClose={() => setEditProduit(null)}
        />
      )}

      {venteFormProduitId && (
        <VenteForm
          produit={produits.find(p => p.id === venteFormProduitId)!}
          onSave={(venteData) => handleSaveVente(venteFormProduitId, venteData)}
          onCancel={() => setVenteFormProduitId(null)}
        />
      )}
    </Card>
  )
}