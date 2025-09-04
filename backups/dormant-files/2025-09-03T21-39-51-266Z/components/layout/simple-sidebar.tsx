"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutGrid,
  Map,
  Package,
  BarChart,
  Search,
  LucideIcon // Importez LucideIcon
} from "lucide-react"

interface NavigationItem {
  href: string
  label: string
  icon: LucideIcon // Changez le type pour LucideIcon
}

const navigationItems: NavigationItem[] = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutGrid },
  { href: "/parcelles", label: "Parcelles", icon: Map },
  { href: "/produits", label: "Produits", icon: Package },
  { href: "/statistiques", label: "Statistiques", icon: BarChart },
  { href: "/analyse-marche", label: "Analyse de Marché", icon: Search },
]

export function SimpleSidebar() {
  const pathname = usePathname()
  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-background/80 border-b border-border shadow-lg backdrop-blur-lg rounded-b-xl">
      <div className="flex items-center justify-center px-4 py-2 max-w-screen-2xl mx-auto">
        <ul className="flex items-center gap-3">
          {navigationItems.map(_item => {
            const isActive = pathname === _item.href
            return (
              <li key={_item.href}>
                <Link
                  href={_item.href}
                  className={`flex items-center gap-2 px-5 py-2 rounded-full font-semibold transition-all duration-200
                    ${isActive
                      ? "bg-accent text-accent-foreground shadow-accent/30 shadow"
                      : "text-foreground"}
                  `}
                  style={
                    !isActive
                      ? {
                          transition: "background 0.2s, color 0.2s",
                        }
                      : {}
                  }
                  onMouseEnter={e => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.background = "hsl(var(--accent-hover))"
                      ;(e.currentTarget as HTMLElement).style.color = "hsl(var(--accent-foreground), 1)"
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.background = ""
                      ;(e.currentTarget as HTMLElement).style.color = ""
                    }
                  }}
                >
                  <_item.icon className={`w-5 h-5 ${isActive ? "text-accent-foreground" : "text-muted-foreground"}`} />
                  <span className="hidden sm:inline">{_item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}