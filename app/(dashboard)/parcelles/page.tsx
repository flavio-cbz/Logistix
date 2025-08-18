"use client"

import { useEffect, useState } from "react"
import ParcellesList from "@/components/features/parcelles/parcelles-list"
import { useStore } from "@/lib/services/admin/store"
import { motion } from "framer-motion"

export default function ParcellesPage() {
  const { parcelles, deleteParcelle, initializeStore } = useStore()
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
        <h3 className="text-lg font-medium">Parcelles</h3>
        <p className="text-sm text-muted-foreground">Gérez vos parcelles et leurs informations.</p>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <ParcellesList initialParcelles={parcelles} onDelete={deleteParcelle} />
      </motion.div>
    </motion.div>
  )
}

