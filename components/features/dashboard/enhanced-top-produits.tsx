"use client"

import React from "react"
import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { InteractiveDashboardWidget } from "./interactive-dashboard-widget"
import type { Produit } from "@/types/database"
import { cn } from "@/lib/utils"

interface EnhancedTopProduitsProps {
  produits: Produit[]
  loading?: boolean
  onRefresh?: () => Promise<void>
  onExport?: () => void
  maxItems?: number
}

export function EnhancedTopProduits({ 
  produits, 
  loading = false, 
  onRefresh,
  onExport,
  maxItems = 5
}: EnhancedTopProduitsProps) {
  // Tri des produits par bénéfice
  const topProduits = [...produits]
    .sort((a, b) => {
      const beneficeA = (a.prixVente || 0) - a.prixArticle - a.prixLivraison
      const beneficeB = (b.prixVente || 0) - b.prixArticle - b.prixLivraison
      return beneficeB - beneficeA
    })
    .slice(0, maxItems)

  const handleExport = () => {
    if (onExport) {
      onExport()
    } else {
      // Default export functionality
      const csvContent = [
        ['Produit', 'Prix de vente (€)', 'Bénéfice (€)', 'Marge (%)'],
        ...topProduits.map(produit => {
          const benefice = (produit.prixVente || 0) - produit.prixArticle - produit.prixLivraison
          const marge = ((benefice / (produit.prixArticle + produit.prixLivraison)) * 100).toFixed(1)
          return [produit.nom, produit.prixVente?.toFixed(2) || '0', benefice.toFixed(2), marge]
        })
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

  const getMargeBadgeVariant = (marge: number) => {
    if (marge >= 50) return "default" // High margin - primary color
    if (marge >= 25) return "secondary" // Medium margin
    return "destructive" // Low margin
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  }

  const itemVariants = {
    hidden: { 
      opacity: 0, 
      x: -20,
      scale: 0.95
    },
    visible: { 
      opacity: 1, 
      x: 0,
      scale: 1,
      transition: {
        duration: 0.4,
        ease: "easeOut"
      }
    }
  }

  return (
    <InteractiveDashboardWidget
      title={`Top ${maxItems} des produits`}
      description="Les produits les plus rentables"
      loading={loading}
      onRefresh={onRefresh}
      onExport={handleExport}
      variant="default"
    >
      {topProduits.length > 0 ? (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-3"
        >
          {topProduits.map((produit, index) => {
            const benefice = (produit.prixVente || 0) - produit.prixArticle - produit.prixLivraison
            const marge = ((benefice / (produit.prixArticle + produit.prixLivraison)) * 100)
            const margeFormatted = marge.toFixed(1)

            return (
              <motion.div
                key={produit.id}
                variants={itemVariants}
                whileHover={{ 
                  scale: 1.02,
                  transition: { duration: 0.2 }
                }}
                className={cn(
                  "group relative p-4 rounded-lg border transition-all duration-300",
                  "hover:shadow-enhanced-md hover:border-primary/30",
                  "bg-gradient-to-r from-background to-muted/20"
                )}
              >
                {/* Rank indicator */}
                <div className="absolute -left-2 -top-2 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold shadow-enhanced-sm">
                  {index + 1}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                      {produit.nom}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        Prix: {produit.prixVente?.toFixed(2) || '0.00'}€
                      </span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">
                        Bénéfice: {benefice.toFixed(2)}€
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={getMargeBadgeVariant(marge)}
                      className="text-xs font-medium"
                    >
                      {margeFormatted}%
                    </Badge>
                  </div>
                </div>

                {/* Progress bar for visual representation */}
                <div className="mt-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-muted-foreground">Performance</span>
                    <span className="text-xs font-medium">{benefice.toFixed(0)}€</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ 
                        width: `${Math.min((benefice / Math.max(...topProduits.map(p => 
                          (p.prixVente || 0) - p.prixArticle - p.prixLivraison
                        ))) * 100, 100)}%` 
                      }}
                      transition={{ duration: 1, delay: index * 0.1 + 0.5 }}
                    />
                  </div>
                </div>

                {/* Hover effect overlay */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 rounded-lg pointer-events-none"
                  animate={{ opacity: 0 }}
                  whileHover={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                />
              </motion.div>
            )
          })}
        </motion.div>
      ) : (
        <motion.div 
          className="h-32 flex items-center justify-center text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="text-center space-y-2">
            <p className="text-sm">Aucun produit trouvé.</p>
            <p className="text-xs">Ajoutez des produits pour voir le classement.</p>
          </div>
        </motion.div>
      )}
    </InteractiveDashboardWidget>
  )
}