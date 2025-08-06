import { databaseService } from './database/db'

export interface Produit {
  id: string
  nom: string
  prixArticle: number
  prixLivraison: number
  prixVente?: number
  benefices?: number
  pourcentageBenefice?: number
  vendu: boolean
  dateVente?: string
  created_at: number
  plateforme?: string
  user_id: string
  parcelle_id: string
}

export interface Parcelle {
  id: string
  numero: string
  transporteur: string
  poids: number
  prix_achat: number
  date_creation: number
  user_id: string
}

export interface ROIData {
  produit: string
  roi: number
}

export interface PlatformPerformance {
  plateforme: string
  rentabilite: number
}

export interface RadarMetric {
  subject: string
  A: number
  fullMark: number
}

export interface TrendData {
  periode: string
  ventes: number
}

export interface HeatmapPoint {
  day: number
  hour: number
  value: number
}

export interface AverageSellingTime {
  categorie: string
  jours: number
}

export interface TrendCurveData {
  mois: string
  valeur: number
  min: number
  max: number
}

export interface SalesPrediction {
  mois: string
  prevision: number
}

export interface KeyStatistics {
  produitsVendus: number
  ventesTotales: number
  beneficesTotaux: number
  nombreParcelles: number
}

export interface DashboardData extends KeyStatistics {
  roiParProduit: ROIData[]
  tempsMoyenVente: AverageSellingTime[]
  heatmapVentes: HeatmapPoint[]
  meilleuresPlateformes: PlatformPerformance[]
  radarPerformances: RadarMetric[]
  tendancesSaisonnieres: TrendData[]
  courbeTendance: TrendCurveData[]
  previsionsVentes: SalesPrediction[]
}

export class StatisticsService {
  private static instance: StatisticsService
  private cache: Map<string, { data: any; timestamp: number }> = new Map()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  public static getInstance(): StatisticsService {
    if (!StatisticsService.instance) {
      StatisticsService.instance = new StatisticsService()
    }
    return StatisticsService.instance
  }

  private constructor() {}

  /**
   * Get comprehensive dashboard data for a user
   */
  async getDashboardData(userId: string): Promise<DashboardData> {
    const cacheKey = `dashboard_${userId}`
    const cached = this.getCachedData(cacheKey)
    if (cached) {
      return cached
    }

    const [produits, parcelles] = await Promise.all([
      this.getProductsForUser(userId),
      this.getParcelsForUser(userId)
    ])

    const data: DashboardData = {
      ...this.calculateKeyStatistics(produits, parcelles),
      roiParProduit: this.calculateROIPerProduct(produits),
      tempsMoyenVente: this.calculateAverageSellingTime(produits),
      heatmapVentes: this.calculateSalesHeatmap(produits),
      meilleuresPlateformes: this.calculateBestPlatforms(produits),
      radarPerformances: this.calculateRadarPerformances(produits),
      tendancesSaisonnieres: this.calculateSeasonalTrends(produits),
      courbeTendance: this.calculateTrendCurve(produits),
      previsionsVentes: this.calculateSalesPredictions(produits)
    }

    this.setCachedData(cacheKey, data)
    return data
  }

  /**
   * Calculate ROI for each product
   */
  calculateROIPerProduct(produits: Produit[]): ROIData[] {
    return produits
      .filter(p => p.vendu && p.pourcentageBenefice != null)
      .map(p => ({
        produit: p.nom,
        roi: p.pourcentageBenefice!
      }))
      .sort((a, b) => b.roi - a.roi)
      .slice(0, 10)
  }

  /**
   * Calculate average selling time by platform
   */
  calculateAverageSellingTime(produits: Produit[]): AverageSellingTime[] {
    const produitsVendusAvecTemps = produits
      .filter(p => p.vendu && p.dateVente && p.created_at)
      .map(p => {
        const dateVente = new Date(p.dateVente!).getTime()
        const dateCreation = p.created_at * 1000
        const tempsVente = (dateVente - dateCreation) / (1000 * 60 * 60 * 24)
        return { ...p, tempsVente }
      })

    const statsParPlateforme: { [key: string]: { totalJours: number; count: number } } = {}

    for (const p of produitsVendusAvecTemps) {
      const plateforme = p.plateforme || 'Non spécifié'
      if (!statsParPlateforme[plateforme]) {
        statsParPlateforme[plateforme] = { totalJours: 0, count: 0 }
      }
      statsParPlateforme[plateforme].totalJours += p.tempsVente
      statsParPlateforme[plateforme].count++
    }

    return Object.entries(statsParPlateforme).map(([plateforme, data]) => ({
      categorie: plateforme,
      jours: Math.round(data.totalJours / data.count)
    }))
  }

  /**
   * Calculate sales heatmap data
   */
  calculateSalesHeatmap(produits: Produit[]): HeatmapPoint[] {
    const heatmapData = Array(7).fill(0).map(() => Array(24).fill(0))

    produits
      .filter(p => p.vendu && p.dateVente)
      .forEach(p => {
        const dateVente = new Date(p.dateVente!)
        const dayOfWeek = dateVente.getDay()
        const hour = dateVente.getHours()
        heatmapData[dayOfWeek][hour]++
      })

    return heatmapData
      .map((hours, day) => hours.map((value, hour) => ({ day, hour, value })))
      .flat()
  }

  /**
   * Calculate key statistics
   */
  calculateKeyStatistics(produits: Produit[], parcelles: Parcelle[]): KeyStatistics {
    const produitsVendus = produits.filter(p => p.vendu).length
    const ventesTotales = produits
      .filter(p => p.vendu && p.prixVente != null)
      .reduce((acc, p) => acc + (p.prixVente || 0), 0)
    const beneficesTotaux = produits
      .filter(p => p.vendu && p.benefices != null)
      .reduce((acc, p) => acc + (p.benefices || 0), 0)

    return {
      produitsVendus,
      ventesTotales: parseFloat(ventesTotales.toFixed(2)),
      beneficesTotaux: parseFloat(beneficesTotaux.toFixed(2)),
      nombreParcelles: parcelles.length
    }
  }

  /**
   * Calculate best performing platforms
   */
  calculateBestPlatforms(produits: Produit[]): PlatformPerformance[] {
    const rentabiliteParPlateforme: { [key: string]: number } = {}

    produits
      .filter(p => p.vendu && p.benefices != null)
      .forEach(p => {
        const plateforme = p.plateforme || 'Non spécifié'
        rentabiliteParPlateforme[plateforme] = (rentabiliteParPlateforme[plateforme] || 0) + (p.benefices || 0)
      })

    return Object.entries(rentabiliteParPlateforme)
      .map(([plateforme, rentabilite]) => ({
        plateforme,
        rentabilite: parseFloat(rentabilite.toFixed(2))
      }))
      .sort((a, b) => b.rentabilite - a.rentabilite)
      .slice(0, 5)
  }

  /**
   * Calculate radar performance metrics
   */
  calculateRadarPerformances(produits: Produit[]): RadarMetric[] {
    const produitsVendus = produits.filter(p => p.vendu)

    const totalBenefices = produitsVendus.reduce((acc, p) => acc + (p.benefices || 0), 0)
    const avgBenefice = produitsVendus.length > 0 ? totalBenefices / produitsVendus.length : 0

    const totalTempsVente = produitsVendus
      .filter(p => p.dateVente && p.created_at)
      .reduce((acc, p) => {
        const dateVente = new Date(p.dateVente!).getTime()
        const dateCreation = p.created_at * 1000
        return acc + (dateVente - dateCreation)
      }, 0)

    const avgTempsVenteJours = produitsVendus.length > 0 ? totalTempsVente / produitsVendus.length / (1000 * 60 * 60 * 24) : 0
    const vitesseVenteScore = avgTempsVenteJours > 0 ? 100 / avgTempsVenteJours : 0
    const nombreVentes = produitsVendus.length

    const fullMark = 100

    return [
      {
        subject: 'Bénéfice Moyen',
        A: Math.min(avgBenefice > 0 ? Math.round(avgBenefice / 10) : 0, fullMark),
        fullMark
      },
      {
        subject: 'Vitesse Vente',
        A: Math.min(Math.round(vitesseVenteScore), fullMark),
        fullMark
      },
      {
        subject: 'Volume Ventes',
        A: Math.min(Math.round(nombreVentes), fullMark),
        fullMark
      }
    ]
  }

  /**
   * Calculate seasonal trends
   */
  calculateSeasonalTrends(produits: Produit[]): TrendData[] {
    const ventesParMoisAnnee: { [key: string]: number } = {}

    produits
      .filter(p => p.vendu && p.dateVente && p.prixVente != null)
      .forEach(p => {
        const dateVente = new Date(p.dateVente!)
        const annee = dateVente.getFullYear()
        const mois = (dateVente.getMonth() + 1).toString().padStart(2, '0')
        const cle = `${annee}-${mois}`
        ventesParMoisAnnee[cle] = (ventesParMoisAnnee[cle] || 0) + (p.prixVente || 0)
      })

    return Object.entries(ventesParMoisAnnee)
      .map(([periode, ventes]) => ({ periode, ventes: parseFloat(ventes.toFixed(2)) }))
      .sort((a, b) => a.periode.localeCompare(b.periode))
  }

  /**
   * Calculate trend curve data
   */
  calculateTrendCurve(produits: Produit[]): TrendCurveData[] {
    const ventesMensuelles: { [key: string]: number } = {}

    produits
      .filter(p => p.vendu && p.dateVente && p.prixVente != null)
      .forEach(p => {
        const dateVente = new Date(p.dateVente!)
        const annee = dateVente.getFullYear()
        const mois = dateVente.getMonth()
        const cle = `${annee}-${mois}`
        ventesMensuelles[cle] = (ventesMensuelles[cle] || 0) + (p.prixVente || 0)
      })

    const courbeTendance: TrendCurveData[] = []
    const now = new Date()

    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const annee = date.getFullYear()
      const mois = date.getMonth()
      const cle = `${annee}-${mois}`
      const nomMois = date.toLocaleString('fr-FR', { month: 'short', year: '2-digit' })

      const valeur = ventesMensuelles[cle] || 0
      const min = valeur * 0.9
      const max = valeur * 1.1

      courbeTendance.push({
        mois: nomMois,
        valeur: parseFloat(valeur.toFixed(2)),
        min: parseFloat(min.toFixed(2)),
        max: parseFloat(max.toFixed(2))
      })
    }

    return courbeTendance
  }

  /**
   * Calculate sales predictions
   */
  calculateSalesPredictions(produits: Produit[]): SalesPrediction[] {
    const ventesMensuelles: { [key: string]: number } = {}

    produits
      .filter(p => p.vendu && p.dateVente && p.prixVente != null)
      .forEach(p => {
        const dateVente = new Date(p.dateVente!)
        const annee = dateVente.getFullYear()
        const mois = dateVente.getMonth()
        const cle = `${annee}-${mois}`
        ventesMensuelles[cle] = (ventesMensuelles[cle] || 0) + (p.prixVente || 0)
      })

    const previsionsVentes: SalesPrediction[] = []
    const now = new Date()

    // Get last known value for prediction base
    const lastKnownValues = Object.values(ventesMensuelles).slice(-3)
    const avgLastValues = lastKnownValues.length > 0 
      ? lastKnownValues.reduce((a, b) => a + b, 0) / lastKnownValues.length 
      : 0

    for (let i = 1; i <= 3; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1)
      const nomMois = date.toLocaleString('fr-FR', { month: 'short', year: '2-digit' })

      // Simple prediction based on average with some variation
      const prevision = avgLastValues * (1 + (Math.random() - 0.5) * 0.2)

      previsionsVentes.push({
        mois: nomMois,
        prevision: parseFloat(prevision.toFixed(2))
      })
    }

    return previsionsVentes
  }

  /**
   * Get performance metrics and KPIs
   */
  async getPerformanceMetrics(userId: string): Promise<{
    responseTime: number
    cacheHitRate: number
    dataFreshness: number
  }> {
    const startTime = Date.now()
    
    // Simulate some processing
    await this.getDashboardData(userId)
    
    const responseTime = Date.now() - startTime
    const cacheHitRate = this.calculateCacheHitRate()
    const dataFreshness = this.calculateDataFreshness(userId)

    return {
      responseTime,
      cacheHitRate,
      dataFreshness
    }
  }

  /**
   * Clear cache for specific user or all cache
   */
  clearCache(userId?: string): void {
    if (userId) {
      const keysToDelete = Array.from(this.cache.keys()).filter(key => key.includes(userId))
      keysToDelete.forEach(key => this.cache.delete(key))
    } else {
      this.cache.clear()
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number; entries: string[] } {
    return {
      size: this.cache.size,
      hitRate: this.calculateCacheHitRate(),
      entries: Array.from(this.cache.keys())
    }
  }

  // Private helper methods

  private async getProductsForUser(userId: string): Promise<Produit[]> {
    return databaseService.query<Produit>('SELECT * FROM produits WHERE user_id = ?', [userId])
  }

  private async getParcelsForUser(userId: string): Promise<Parcelle[]> {
    return databaseService.query<Parcelle>('SELECT * FROM parcelles WHERE user_id = ?', [userId])
  }

  private getCachedData(key: string): any | null {
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data
    }
    if (cached) {
      this.cache.delete(key)
    }
    return null
  }

  private setCachedData(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() })
  }

  private calculateCacheHitRate(): number {
    // This would need to be tracked over time in a real implementation
    return Math.random() * 100 // Placeholder
  }

  private calculateDataFreshness(userId: string): number {
    const cacheKey = `dashboard_${userId}`
    const cached = this.cache.get(cacheKey)
    if (cached) {
      return Date.now() - cached.timestamp
    }
    return 0
  }
}

// Export singleton instance
export const statisticsService = StatisticsService.getInstance()