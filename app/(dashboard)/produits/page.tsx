"use client"

import { useEffect } from "react"
// import { motion } from "framer-motion" // Removed framer-motion import
import { ProduitsList } from "@/components/features/produits/produits-list"
// import { Produit } from "@/types/database" // Commented out as not directly used
import { useStore } from "@/lib/services/admin/store"
// import { toast } from "@/components/ui/use-toast" // Commented out as not directly used

export default function ProduitsPage() {
  const { produits, initializeStore } = useStore()

  useEffect(() => {
    if (produits.length === 0) {
      console.log("Initializing produits data...")
    }
  }, [produits.length, initializeStore])

  return (
    <div className="flex-1 p-4 md:p-8">
      <div
        // initial={{ opacity: 0, y: -20 }} // Removed motion props
        // animate={{ opacity: 1, y: 0 }} // Removed motion props
        // transition={{ duration: 0.5, delay: 0.1 }} // Removed motion props
      >
        <h3 className="text-lg font-medium">Produits</h3>
        <p className="text-sm text-muted-foreground">Gérez vos produits et leurs statuts de vente.</p>
      </div>

      <div
        // initial={{ opacity: 0, y: 20 }} // Removed motion props
        // animate={{ opacity: 1, y: 0 }} // Removed motion props
        // transition={{ duration: 0.5, delay: 0.2 }} // Removed motion props
      >
        <ProduitsList /> {/* Removed initialProduits prop */}
      </div>
    </div>
  )
}