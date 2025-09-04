"use client"

import { useMemo } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Bar, CartesianGrid } from "recharts"
import { useTheme } from "next-themes"
import { motion } from "framer-motion"
import { formatCurrency } from "@/lib/utils/formatting"
import { InteractiveDashboardWidget } from "./interactive-dashboard-widget"
import type { Produit } from "@/types/database"

interface EnhancedTopProduitsProps {
  produits: Produit[]
  loading?: boolean
  onRefresh?: () => Promise<void>
  onExport?: () => void
}

export function EnhancedTopProduits({ produits, loading, onRefresh, onExport }: EnhancedTopProduitsProps) {
  const { theme } = useTheme()
  const isDark = theme === "dark"

  const topProduits = useMemo(() => {
    const sorted = [...produits].sort((a, b) => (b.prixVente || 0) - (a.prixVente || 0))
    return sorted.slice(0, 5) // Top 5 produits par prix de vente
  }, [produits])

  const topBenefices = useMemo(() => {
    const sorted = [...produits].sort((a, b) => (b.benefices || 0) - (a.benefices || 0))
    return sorted.slice(0, 5) // Top 5 produits par bénéfices
  }, [produits])

  const chartData = useMemo(() => {
    return topBenefices.map((produit) => ({
      name: produit.nom,
      benefices: produit.benefices || 0,
    }))
  }, [topBenefices])

  const handleExport = () => {
    if (onExport) {
      onExport()
    } else {
      // Default export functionality
      const csvContent = [
        ['Nom du Produit', 'Prix de Vente (€)', 'Bénéfices (€)', 'Statut'],
        ...produits.map(p => [p.nom, p.prixVente, p.benefices, p.vendu ? 'Vendu' : 'En stock'])
      ].map(row => row.join(',')).join('\n')
      
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'top-produits.csv'
      a.click()
      window.URL.revokeObjectURL(url)
    }
  }

  return (
    <InteractiveDashboardWidget
      title="Top Produits & Bénéfices"
      description="Aperçu des produits les plus performants"
  {...(loading !== undefined ? { loading } : {})}
  {...(onRefresh !== undefined ? { onRefresh } : {})}
  onExport={handleExport}
  variant="elevated"
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top 5 Produits par Prix de Vente */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h3 className="text-lg font-semibold mb-3">Top 5 par Prix de Vente</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead>Produit</TableHead>
                <TableHead className="text-right">Prix de Vente</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topProduits.length > 0 ? (
                topProduits.map((produit, index) => ( // Correction: index ajouté ici
                  <TableRow key={produit.id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>{produit.nom}</TableCell>
                    <TableCell className="text-right">{formatCurrency(produit.prixVente || 0)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    Aucun produit vendu.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </motion.div>

        {/* Top 5 Produits par Bénéfices (Graphique) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h3 className="text-lg font-semibold mb-3">Top 5 par Bénéfices</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} />
                <XAxis type="number" stroke={isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)"} />
                <YAxis type="category" dataKey="name" stroke={isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)"} />
                <Tooltip 
                  formatter={(value: number) => [`${formatCurrency(value)}`, 'Bénéfices']}
                  labelFormatter={(label: string) => `Produit: ${label}`}
                />
                <Bar 
                  dataKey="benefices" 
                  fill={isDark ? "hsl(var(--primary))" : "hsl(var(--primary))"} 
                  radius={[4, 4, 0, 0]}
                  className="animate-chart-draw-bar"
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
              Aucune donnée de bénéfices pour le moment.
            </div>
          )}
        </motion.div>
      </div>
    </InteractiveDashboardWidget>
  )
}