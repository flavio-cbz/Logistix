"use client"

import { useEffect } from "react"
import { ParcellesList } from "@/components/parcelles/parcelles-list"
import { useStore } from "@/lib/store"

export default function ParcellesPage() {
  const { parcelles, deleteParcelle, initializeStore } = useStore()

  useEffect(() => {
    initializeStore()
  }, [initializeStore])

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Parcelles</h3>
        <p className="text-sm text-muted-foreground">Gérez vos parcelles et leurs informations.</p>
      </div>
      <ParcellesList initialParcelles={parcelles} onDelete={deleteParcelle} />
    </div>
  )
}

