"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { LayoutGrid, Package, Map, BarChart } from "lucide-react"

export function MainNav() {
  const pathname = usePathname()

  return (
    <nav className="flex items-center space-x-4 lg:space-x-6">
      <Link
        href="/dashboard"
        className={cn(
          "text-sm font-medium transition-colors hover:text-primary",
          pathname === "/dashboard" ? "text-primary" : "text-muted-foreground",
        )}
      >
        <Button variant="ghost" className="w-full justify-start">
          <LayoutGrid className="mr-2 h-4 w-4" />
          Tableau de bord
        </Button>
      </Link>
      <Link
        href="/parcelles"
        className={cn(
          "text-sm font-medium transition-colors hover:text-primary",
          pathname === "/parcelles" ? "text-primary" : "text-muted-foreground",
        )}
      >
        <Button variant="ghost" className="w-full justify-start">
          <Map className="mr-2 h-4 w-4" />
          Parcelles
        </Button>
      </Link>
      <Link
        href="/produits"
        className={cn(
          "text-sm font-medium transition-colors hover:text-primary",
          pathname === "/produits" ? "text-primary" : "text-muted-foreground",
        )}
      >
        <Button variant="ghost" className="w-full justify-start">
          <Package className="mr-2 h-4 w-4" />
          Produits
        </Button>
      </Link>
      <Link
        href="/statistiques"
        className={cn(
          "text-sm font-medium transition-colors hover:text-primary",
          pathname === "/statistiques" ? "text-primary" : "text-muted-foreground",
        )}
      >
        <Button variant="ghost" className="w-full justify-start">
          <BarChart className="mr-2 h-4 w-4" />
          Statistiques
        </Button>
      </Link>
    </nav>
  )
}

