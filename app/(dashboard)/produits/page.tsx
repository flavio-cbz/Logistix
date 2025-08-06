"use client"

import { useEffect, useState } from "react"
import ProduitsList from "@/components/features/produits/produits-list"
import { useStore } from "@/store/store"
import { motion } from "framer-motion"

export default function ProduitsPage() {
  const { produits, initializeStore } = useStore()
  const [isLoading, setIsLoading] = useState(true)

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
    <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <h3 className="text-lg font-medium">Produits</h3>
        <p className="text-sm text-muted-foreground">Gérez vos produits et leurs statuts de vente.</p>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <ProduitsList initialProduits={produits} />
      </motion.div>
    </motion.div>
  )
}

