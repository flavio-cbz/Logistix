"use client"

import React from "react"
import { motion } from "framer-motion"
import { Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { useTheme } from "next-themes"
import { InteractiveDashboardWidget } from "./interactive-dashboard-widget"
import type { Produit } from "@/types/database"

interface EnhancedPerformanceChartProps {
  produits: Produit[]
  loading?: boolean
  onRefresh?: () => Promise<void>
  onExport?: () => void
}

export function EnhancedPerformanceChart({ 
  produits, 
  loading = false, 
  onRefresh,
  onExport 
}: EnhancedPerformanceChartProps) {
  const { theme } = useTheme()
  const isDark = theme === "dark"

  const produitsVendus = produits.filter(p => p.vendu && p.dateVente)

  // Préparation des données par mois
  const derniers6Mois = Array.from({ length: 6 }, (_, i) => {
    const date = new Date()
    date.setMonth(date.getMonth() - i)
    return {
      mois: date.toLocaleString("fr-FR", { month: "short" }),
      debut: new Date(date.getFullYear(), date.getMonth(), 1),
      fin: new Date(date.getFullYear(), date.getMonth() + 1, 0),
    }
  }).reverse()

  const data = derniers6Mois.map(({ mois, debut, fin }) => {
    const produitsDuMois = produitsVendus.filter(
      (p) => p.dateVente && new Date(p.dateVente) >= debut && new Date(p.dateVente) <= fin,
    )

    const ventes = produitsDuMois.reduce((acc, p) => acc + (p.prixVente || 0), 0)
    const benefices = produitsDuMois.reduce((acc, p) => acc + (p.benefices || 0), 0)
    const marge = ventes > 0 ? (benefices / ventes) * 100 : 0

    return {
      mois,
      ventes: Number(ventes.toFixed(2)),
      benefices: Number(benefices.toFixed(2)),
      marge: Number(marge.toFixed(1)),
    }
  })

  interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{
      name: string;
      value: number;
      color: string;
      dataKey: string;
    }>;
    label?: string;
  }
  
  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          className={`p-3 rounded-md shadow-enhanced-lg backdrop-blur-sm ${
            isDark ? "bg-gray-800/90 text-white" : "bg-white/90 text-gray-800"
          } border ${isDark ? "border-gray-700" : "border-gray-200"}`}
        >
          <p className="font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <motion.p 
              key={`item-${index}`} 
              style={{ color: entry.color }}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              className="text-sm"
            >
              {entry.name}: {entry.value} {entry.dataKey === "marge" ? "%" : "€"}
            </motion.p>
          ))}
        </motion.div>
      )
    }
    return null
  }

  const handleExport = () => {
    if (onExport) {
      onExport()
    } else {
      // Default export functionality
      const csvContent = [
        ['Mois', 'Ventes (€)', 'Bénéfices (€)', 'Marge (%)'],
        ...data.map(row => [row.mois, row.ventes, row.benefices, row.marge])
      ].map(row => row.join(',')).join('\n')
      
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'performance-ventes.csv'
      a.click()
      window.URL.revokeObjectURL(url)
    }
  }

  return (
    <InteractiveDashboardWidget
      title="Performance des ventes"
      description="Evolution des ventes et bénéfices sur 6 mois"
      loading={loading}
      onRefresh={onRefresh}
      onExport={handleExport}
      variant="elevated"
    >
      {produitsVendus.length > 0 ? (
        <motion.div 
          className="h-[300px]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke={isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} 
                className="animate-chart-fade-in"
              />
              <XAxis 
                dataKey="mois" 
                stroke={isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)"} 
                className="animate-chart-fade-in animate-chart-stagger-1"
              />
              <YAxis 
                yAxisId="left" 
                stroke={isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)"} 
                className="animate-chart-fade-in animate-chart-stagger-2"
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke={isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)"}
                className="animate-chart-fade-in animate-chart-stagger-3"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend className="animate-chart-fade-in animate-chart-stagger-4" />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="ventes"
                name="Ventes (€)"
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: "hsl(var(--primary))", strokeWidth: 2 }}
                className="animate-chart-draw-line animate-chart-stagger-1"
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="benefices"
                name="Bénéfices (€)"
                stroke="hsl(var(--success))"
                strokeWidth={3}
                dot={{ fill: "hsl(var(--success))", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: "hsl(var(--success))", strokeWidth: 2 }}
                className="animate-chart-draw-line animate-chart-stagger-2"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="marge"
                name="Marge (%)"
                stroke="hsl(var(--warning))"
                strokeWidth={3}
                dot={{ fill: "hsl(var(--warning))", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: "hsl(var(--warning))", strokeWidth: 2 }}
                className="animate-chart-draw-line animate-chart-stagger-3"
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      ) : (
        <motion.div 
          className="h-[300px] flex items-center justify-center text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="text-center space-y-2">
            <p>Aucune donnée de vente pour le moment.</p>
            <p className="text-sm">Les graphiques apparaîtront une fois que vous aurez des ventes enregistrées.</p>
          </div>
        </motion.div>
      )}
    </InteractiveDashboardWidget>
  )
}