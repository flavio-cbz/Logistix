"use client"

import { useMemo } from "react"
import { CardStats } from "@/components/ui/card-stats"
import { cn } from "@/lib/utils"
import type { Produit } from "@/types/database"
import { formatCurrency, formatPercentage } from "@/lib/utils/formatting"
import { ArrowDown, ArrowUp, Minus } from "lucide-react"

interface EnhancedStatsGridProps {
  produits: Produit[]
  loading?: boolean
}

// Helper function to calculate percentage change
const calculatePercentageChange = (current: number, previous: number): number => {
  if (previous === 0) return 0 // Avoid division by zero
  return ((current - previous) / previous) * 100
}

// Helper function to determine trend icon
const getTrendIcon = (change: number) => {
  if (change > 0) return <ArrowUp className="h-4 w-4 text-green-500" />
  if (change < 0) return <ArrowDown className="h-4 w-4 text-red-500" />
  return <Minus className="h-4 w-4 text-muted-foreground" />
}

export function EnhancedStatsGrid({ produits, loading }: EnhancedStatsGridProps) {
  const produitsVendus = useMemo(() => produits.filter((p) => p.vendu && p.dateVente), [produits])

  const stats = useMemo(() => {
    // Current month sales
    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

    const currentMonthSales = produitsVendus.filter(
      (p) => p.dateVente && new Date(p.dateVente) >= currentMonthStart,
    )
    const previousMonthSales = produitsVendus.filter(
      (p) => p.dateVente && new Date(p.dateVente) >= previousMonthStart && new Date(p.dateVente) <= previousMonthEnd,
    )

    const totalVentesMoisActuel = currentMonthSales.reduce((sum, p) => sum + (p.prixVente || 0), 0)
    const totalVentesMoisPrecedent = previousMonthSales.reduce((sum, p) => sum + (p.prixVente || 0), 0)
    const ventesChange = calculatePercentageChange(totalVentesMoisActuel, totalVentesMoisPrecedent)

    const totalBeneficesMoisActuel = currentMonthSales.reduce((sum, p) => sum + (p.benefices || 0), 0)
    const totalBeneficesMoisPrecedent = previousMonthSales.reduce((sum, p) => sum + (p.benefices || 0), 0)
    const beneficesChange = calculatePercentageChange(totalBeneficesMoisActuel, totalBeneficesMoisPrecedent)

    // Average price per item
    const totalPrixVente = produitsVendus.reduce((sum, p) => sum + (p.prixVente || 0), 0)
    const prixMoyen = produitsVendus.length > 0 ? totalPrixVente / produitsVendus.length : 0

    // Average time to sell (in days)
    const soldItemsWithDates = produitsVendus.filter((p) => p.dateAchat && p.dateVente)
    const totalDaysToSell = soldItemsWithDates.reduce((sum, p) => {
      const dateAchat = new Date(p.dateAchat!)
      const dateVente = new Date(p.dateVente!)
      const diffTime = Math.abs(dateVente.getTime() - dateAchat.getTime())
      return sum + Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    }, 0)
    const tempsMoyenVente = soldItemsWithDates.length > 0 ? totalDaysToSell / soldItemsWithDates.length : 0

    return [
      {
        title: "Ventes ce mois-ci",
        value: formatCurrency(totalVentesMoisActuel),
        change: formatPercentage(ventesChange),
        Icon: getTrendIcon(ventesChange),
      },
      {
        title: "Bénéfices ce mois-ci",
        value: formatCurrency(totalBeneficesMoisActuel),
        change: formatPercentage(beneficesChange),
        Icon: getTrendIcon(beneficesChange),
      },
      {
        title: "Prix moyen par article",
        value: formatCurrency(prixMoyen),
        description: "Sur tous les articles vendus",
      },
      {
        title: "Temps moyen de vente",
        value: `${tempsMoyenVente.toFixed(0)} jours`,
        description: "Du stock à la vente",
      },
    ]
  }, [produitsVendus])

  return (
    <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-4", loading && "animate-pulse")}>
      {stats.map((stat, index) => ( // Correction: index ajouté ici
        <CardStats
          key={index}
          title={stat.title}
          value={stat.value}
          {...(stat.change !== undefined ? { change: stat.change } : {})}
          {...(stat.Icon !== undefined ? { Icon: stat.Icon } : {})}
          {...(stat.description !== undefined ? { description: stat.description } : {})}
          {...(loading !== undefined ? { loading } : {})}
        />
      ))}
    </div>
  )
}