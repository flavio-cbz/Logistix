"use client"

import { useEffect } from "react"
import { ProduitsList } from "@/components/produits/produits-list"
import { useStore } from "@/lib/store"

export default function ProduitsPage() {
  const { produits, initializeStore } = useStore()

  useEffect(() => {
    initializeStore()
  }, [initializeStore])

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Produits</h3>
        <p className="text-sm text-muted-foreground">Gérez vos produits et leurs statuts de vente.</p>
      </div>
      <ProduitsList initialProduits={produits} />
    </div>
  )
}

