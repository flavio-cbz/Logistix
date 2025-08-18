"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { AnimatedButton } from "@/components/ui/animated-button"
import { LayoutGrid, Package, Map, BarChart, Shield, Search } from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"

export function MainNav() {
  const pathname = usePathname()
  const { user } = useAuth()
  const isAdmin = user?.isAdmin

  const navigationItems = [
    {
      href: "/dashboard",
      label: "Tableau de bord",
      icon: LayoutGrid,
      shortcut: "Alt + Home"
    },
    {
      href: "/parcelles",
      label: "Parcelles",
      icon: Map,
      shortcut: "Alt + P"
    },
    {
      href: "/produits",
      label: "Produits",
      icon: Package,
      shortcut: "Alt + R"
    },
    {
      href: "/statistiques",
      label: "Statistiques",
      icon: BarChart,
      shortcut: "Alt + S"
    },
    {
      href: "/analyse-marche",
      label: "Analyse de Marché",
      icon: Search,
      shortcut: "Alt + M"
    },
    ...(isAdmin ? [{
      href: "/validation",
      label: "Validation",
      icon: Shield,
      shortcut: "Alt + V"
    }] : [])
  ]

  return (
    <nav
      id="main-navigation"
      role="menubar"
      aria-label="Navigation principale"
      className="flex items-center space-x-4 lg:space-x-6"
    >
      {navigationItems.map((item, index) => {
        const Icon = item.icon
        const isActive = pathname === item.href
        
        return (
          <Link
            key={item.href}
            href={item.href}
            role="menuitem"
            className={cn(
              "text-sm font-medium transition-colors hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md focus-visible:bg-accent/40",
              isActive ? "text-primary" : "text-muted-foreground",
            )}
            aria-current={isActive ? "page" : undefined}
            aria-label={`${item.label} (${item.shortcut})`}
            title={`${item.label} - Raccourci: ${item.shortcut}`}
            tabIndex={index === 0 || isActive ? 0 : -1}
          >
            <AnimatedButton
              variant="ghost"
              className={cn(
                "w-full justify-start",
                isActive && "bg-accent text-accent-foreground"
              )}
              tabIndex={-1}
              ripple={true}
              haptic={true}
            >
              <Icon className="mr-2 h-4 w-4" aria-hidden="true" />
              {item.label}
            </AnimatedButton>
          </Link>
        )
      })}
    </nav>
  )
}