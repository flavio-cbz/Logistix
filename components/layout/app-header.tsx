"use client"

import { useTheme } from "next-themes"
import { Package2 } from "lucide-react"
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts"
import { NotificationCenter } from "@/components/notifications/notification-center"
import { GlobalSearch } from "@/components/search/global-search"

export function AppHeader() {
  const { theme } = useTheme()

  return (
    <div className="flex items-center justify-between py-8">
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-primary-foreground">
          <Package2 className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Logistix</h1>
          <p className="text-sm text-muted-foreground">Gestion intelligente de vos parcelles et produits</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <GlobalSearch />
        <NotificationCenter />
        <KeyboardShortcuts />
      </div>
    </div>
  )
}

