"use client"

import { useTheme } from "next-themes"
import { Package2 } from "lucide-react"
import { DataImportExport } from "@/components/data-import-export"

export function AppHeader() {
  const { theme } = useTheme()

  return (
    <div className="flex items-center justify-between py-8">
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-primary-foreground">
          <Package2 className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">LogistiX Pro</h1>
          <p className="text-sm text-muted-foreground">Gestion intelligente de vos parcelles et produits</p>
        </div>
      </div>

      <div>
        <DataImportExport />
      </div>
    </div>
  )
}

