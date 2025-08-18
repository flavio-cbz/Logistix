import type { Parcelle, Produit } from "@/types/database"

// Utility functions for dashboard statistics and sparkline data

export interface StatsData {
  totalParcelles: number
  produitsVendus: number
  ventesTotales: number
  beneficesTotaux: number
  sparklineData: {
    parcelles: number[]
    ventes: number[]
    benefices: number[]
    produits: number[]
  }
  trends: {
    parcelles: number
    ventes: number
    benefices: number
    produits: number
  }
  additionalDetails: {
    parcelles: { label: string; value: string | number }[]
    ventes: { label: string; value: string | number }[]
    benefices: { label: string; value: string | number }[]
    produits: { label: string; value: string | number }[]
  }
}

// Generate sparkline data from historical data
function generateSparklineFromData(data: { date: string; value: number }[], days: number = 7): number[] {
  if (!data || data.length === 0) {
    // Generate sample data if no historical data available
    return Array.from({ length: days }, (_, i) => Math.random() * 100 + 50)
  }

  // Sort by date and take last N days
  const sortedData = data
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-days)

  return sortedData.map(item => item.value)
}

// Calculate trend percentage from sparkline data
function calculateTrendFromSparkline(data: number[]): number {
  if (!data || data.length < 2) return 0
  
  const first = data[0]
  const last = data[data.length - 1]
  
  if (first === 0) return (last || 0) > 0 ? 100 : 0
  
  return (((last || 0) - (first || 0)) / (first || 1)) * 100
}

// Group data by date for sparkline generation
function groupDataByDate(items: any[], dateField: string, valueCalculator: (items: any[]) => number): { date: string; value: number }[] {
  const grouped = items.reduce((acc, item) => {
    const date = item[dateField] ? new Date(item[dateField]).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    
    if (!acc[date]) {
      acc[date] = []
    }
    if (date) {
      acc[date].push(item)
    }
    return acc
  }, {} as Record<string, any[]>)

  // Use Object.keys to preserve the typed array values for each date group
  return Object.keys(grouped).map(date => ({
    date,
    value: valueCalculator(grouped[date])
  }))
}

// Calculate comprehensive dashboard statistics
export function calculateDashboardStats(parcelles: Parcelle[], produits: Produit[]): StatsData {
  const produitsVendus = produits.filter(p => p.vendu)
  const ventesTotales = produitsVendus.reduce((sum, p) => sum + (p.prixVente || 0), 0)
  const coutTotal = produitsVendus.reduce((sum, p) => sum + (p.prixArticle + p.prixLivraison), 0)
  const beneficesTotaux = ventesTotales - coutTotal

  // Generate sparkline data from historical data
  const parcellesData = groupDataByDate(parcelles, 'createdAt', (items) => items.length)
  const ventesData = groupDataByDate(produitsVendus, 'dateVente', (items) => 
    items.reduce((sum, p) => sum + (p.prixVente || 0), 0)
  )
  const beneficesData = groupDataByDate(produitsVendus, 'dateVente', (items) => 
    items.reduce((sum, p) => sum + ((p.prixVente || 0) - p.prixArticle - p.prixLivraison), 0)
  )
  const produitsData = groupDataByDate(produitsVendus, 'dateVente', (items) => items.length)

  const sparklineData = {
    parcelles: generateSparklineFromData(parcellesData),
    ventes: generateSparklineFromData(ventesData),
    benefices: generateSparklineFromData(beneficesData),
    produits: generateSparklineFromData(produitsData)
  }

  const trends = {
    parcelles: calculateTrendFromSparkline(sparklineData.parcelles),
    ventes: calculateTrendFromSparkline(sparklineData.ventes),
    benefices: calculateTrendFromSparkline(sparklineData.benefices),
    produits: calculateTrendFromSparkline(sparklineData.produits)
  }

  // Calculate additional details for hover states
  const avgPrixVente = produitsVendus.length > 0 ? ventesTotales / produitsVendus.length : 0
  const avgBeneficeParProduit = produitsVendus.length > 0 ? beneficesTotaux / produitsVendus.length : 0
  const avgPoidsParParcelle = parcelles.length > 0 ? parcelles.reduce((sum, p) => sum + p.poids, 0) / parcelles.length : 0
  const tauxVente = produits.length > 0 ? (produitsVendus.length / produits.length) * 100 : 0

  const additionalDetails = {
    parcelles: [
      { label: "Poids moyen", value: `${avgPoidsParParcelle.toFixed(1)}g` },
      { label: "Prix moyen/g", value: `${parcelles.length > 0 ? (parcelles.reduce((sum, p) => sum + p.prixParGramme, 0) / parcelles.length).toFixed(2) : 0}€` }
    ],
    ventes: [
      { label: "Prix moyen", value: `${avgPrixVente.toFixed(2)}€` },
      { label: "Taux de vente", value: `${tauxVente.toFixed(1)}%` }
    ],
    benefices: [
      { label: "Bénéfice/produit", value: `${avgBeneficeParProduit.toFixed(2)}€` },
      { label: "Marge moyenne", value: `${ventesTotales > 0 ? ((beneficesTotaux / ventesTotales) * 100).toFixed(1) : 0}%` }
    ],
    produits: [
      { label: "En stock", value: produits.length - produitsVendus.length },
      { label: "Valeur stock", value: `${(produits.filter(p => !p.vendu).reduce((sum, p) => sum + p.prixArticle + p.prixLivraison, 0)).toFixed(2)}€` }
    ]
  }

  return {
    totalParcelles: parcelles.length,
    produitsVendus: produitsVendus.length,
    ventesTotales,
    beneficesTotaux,
    sparklineData,
    trends,
    additionalDetails
  }
}

// Generate sample data for development/testing
export function generateSampleSparklineData(trend: 'up' | 'down' | 'neutral' = 'neutral', length: number = 7): number[] {
  const data: number[] = []
  let baseValue = 50
  
  for (let i = 0; i < length; i++) {
    const randomVariation = (Math.random() - 0.5) * 20
    
    if (trend === 'up') {
      baseValue += Math.random() * 5 + randomVariation * 0.3
    } else if (trend === 'down') {
      baseValue -= Math.random() * 5 + randomVariation * 0.3
    } else {
      baseValue += randomVariation
    }
    
    data.push(Math.max(0, baseValue))
  }
  
  return data
}