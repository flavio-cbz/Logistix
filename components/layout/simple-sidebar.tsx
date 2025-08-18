"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutGrid,
  Map,
  Package,
  BarChart,
  Search
} from "lucide-react"

const navigationItems = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutGrid },
  { href: "/parcelles", label: "Parcelles", icon: Map },
  { href: "/produits", label: "Produits", icon: Package },
  { href: "/statistiques", label: "Statistiques", icon: BarChart },
  { href: "/analyse-marche", label: "Analyse de Marché", icon: Search },
]

export function SimpleSidebar() {
  const pathname = usePathname()
  return (
    <nav className="flex flex-col border-r border-border bg-background p-4 min-h-screen w-64">
      <div className="flex items-center gap-2 mb-8 px-2">
        <span className="bg-primary text-primary-foreground rounded-lg px-2 py-1 font-bold text-lg">L</span>
        <span className="font-semibold text-xl text-foreground">Logistix</span>
      </div>
      <ul className="space-y-2">
        {navigationItems.map(item => {
          const isActive = pathname === item.href
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg font-medium transition-colors
                  ${isActive
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-foreground hover:bg-muted hover:text-foreground"}
                `}
              >
                <item.icon className={`w-5 h-5 ${isActive ? "text-primary-foreground" : "text-muted-foreground"}`} />
                <span>{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}