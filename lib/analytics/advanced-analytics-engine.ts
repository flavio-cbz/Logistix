// Moteur d'analytics avancé pour l'analyse de marché Vinted

import { VintedAnalysisResult, VintedSoldItem, MarketAnalysisHistoryItem } from '@/types/vinted-market-analysis'

export type ComparisonResult = {
  baselineId: string;
  comparisonId: string;
  metrics: {
    priceDifference: { absolute: number; percentage: number };
    volumeDifference: { absolute: number; percentage: number };
    trendSimilarity: number;
    marketPositionShift: number;
  };
  insights: string[];
  significance: number;
}

// Types pour les métriques avancées
export interface DescriptiveStats {
  mean: number
  median: number
  mode: number[]
  standardDeviation: number
  variance: number
  quartiles: [number, number, number] // Q1, Q2 (médiane), Q3
  outliers: number[]
  skewness: number
  kurtosis: number
  range: { min: number; max: number }
  interquartileRange: number
}

export interface PriceDistribution {
  histogram: Array<{
    range: [number, number]
    count: number
    percentage: number
    density: number
  }>
  density: Array<{
    price: number
    density: number
  }>
  percentiles: Record<number, number>
  cumulativeDistribution: Array<{
    price: number
    cumulative: number
  }>
}

export interface SeasonalityData {
  detected: boolean
  pattern: 'weekly' | 'monthly' | 'seasonal' | 'none'
  confidence: number
  peaks: Array<{
    period: string
    value: number
    significance: number
  }>
  cycles: Array<{
    length: number
    amplitude: number
    phase: number
  }>
}

export interface CyclicalPattern {
  period: number
  amplitude: number
  phase: number
  confidence: number
  description: string
}

export interface TrendData {
  direction: 'up' | 'down' | 'stable'
  strength: number // 0-1
  duration: number // en jours
  slope: number
  rSquared: number
  changePoints: Array<{
    date: string
    type: 'increase' | 'decrease' | 'volatility'
    magnitude: number
    significance: number
  }>
}

export interface TemporalAnalysis {
  seasonality: SeasonalityData
  trends: TrendData
  cyclicalPatterns: CyclicalPattern[]
  volatility: {
    overall: number
    periods: Array<{
      start: string
      end: string
      volatility: number
    }>
  }
}

export interface CompetitiveAnalysis {
  marketPosition: 'low' | 'average' | 'high'
  competitorDensity: number
  priceGaps: Array<{
    min: number
    max: number
    opportunity: number
    confidence: number
  }>
  marketShare: {
    estimated: number
    confidence: number
  }
  competitiveAdvantage: Array<{
    factor: string
    advantage: number
    description: string
  }>
}

export interface AdvancedMetrics {
  descriptiveStats: DescriptiveStats
  priceDistribution: PriceDistribution
  temporalAnalysis: TemporalAnalysis
  competitiveAnalysis: CompetitiveAnalysis
  qualityScore: {
    overall: number
    dataCompleteness: number
    sampleSize: number
    timeRange: number
    variance: number
  }
}

export class AdvancedAnalyticsEngine {
  
  /**
   * Calcule les métriques statistiques avancées
   */
  calculateAdvancedMetrics(data: VintedAnalysisResult): AdvancedMetrics {
    const prices = this.extractPrices(data.rawItems)
    
    return {
      descriptiveStats: this.calculateDescriptiveStats(prices),
      priceDistribution: this.calculatePriceDistribution(prices),
      temporalAnalysis: this.calculateTemporalAnalysis(data.rawItems),
      competitiveAnalysis: this.calculateCompetitiveAnalysis(data),
      qualityScore: this.calculateQualityScore(data)
    }
  }

  /**
   * Extrait les prix des articles vendus
   */
  private extractPrices(items: VintedSoldItem[] = []): number[] {
    return items
      .map(item => parseFloat(item?.price?.amount ?? 'NaN'))
      .filter(price => !isNaN(price) && price > 0)
      .sort((a, b) => a - b)
  }

  /**
   * Calcule les statistiques descriptives
   */
  private calculateDescriptiveStats(prices: number[]): DescriptiveStats {
    if (prices.length === 0) {
      return this.getEmptyDescriptiveStats()
    }

    const n = prices.length
    const mean = this.calculateMean(prices)
    const median = this.calculateMedian(prices)
    const mode = this.calculateMode(prices)
    const variance = this.calculateVariance(prices, mean)
    const standardDeviation = Math.sqrt(variance)
    const quartiles = this.calculateQuartiles(prices)
    const outliers = this.detectOutliers(prices, quartiles)
    const skewness = this.calculateSkewness(prices, mean, standardDeviation)
    const kurtosis = this.calculateKurtosis(prices, mean, standardDeviation)

    return {
      mean,
      median,
      mode,
      standardDeviation,
      variance,
      quartiles,
      outliers,
      skewness,
      kurtosis,
      range: { min: prices[0] ?? 0, max: prices[n - 1] ?? 0 },
      interquartileRange: quartiles[2] - quartiles[0]
    }
  }

  /**
   * Calcule la moyenne
   */
  private calculateMean(values: number[]): number {
    return values.reduce((sum, val) => sum + val, 0) / values.length
  }

  /**
   * Calcule la médiane
   */
  private calculateMedian(sortedValues: number[]): number {
    const n = sortedValues.length
    if (n % 2 === 0) {
      return ((sortedValues[n / 2 - 1] ?? 0) + (sortedValues[n / 2] ?? 0)) / 2
    }
    return sortedValues[Math.floor(n / 2)] ?? 0
  }

  /**
   * Calcule le mode (valeurs les plus fréquentes)
   */
  private calculateMode(values: number[]): number[] {
    const frequency: Record<number, number> = {}
    let maxFreq = 0

    values.forEach(val => {
      frequency[val] = (frequency[val] || 0) + 1
      maxFreq = Math.max(maxFreq, frequency[val])
    })

    return Object.keys(frequency)
      .filter(key => frequency[Number(key)] === maxFreq)
      .map(Number)
  }

  /**
   * Calcule la variance
   */
  private calculateVariance(values: number[], mean: number): number {
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2))
    return this.calculateMean(squaredDiffs)
  }

  /**
   * Calcule les quartiles
   */
  private calculateQuartiles(sortedValues: number[]): [number, number, number] {
    const n = sortedValues.length
    
    const q1Index = Math.floor(n * 0.25)
    const q2Index = Math.floor(n * 0.5)
    const q3Index = Math.floor(n * 0.75)
    
    return [
      sortedValues[q1Index] ?? 0,
      sortedValues[q2Index] ?? 0,
      sortedValues[q3Index] ?? 0
    ]
  }

  /**
   * Détecte les valeurs aberrantes (outliers)
   */
  private detectOutliers(sortedValues: number[], quartiles: [number, number, number]): number[] {
    const [q1, , q3] = quartiles
    const iqr = q3 - q1
    const lowerBound = q1 - 1.5 * iqr
    const upperBound = q3 + 1.5 * iqr

    return sortedValues.filter(val => val < lowerBound || val > upperBound)
  }

  /**
   * Calcule l'asymétrie (skewness)
   */
  private calculateSkewness(values: number[], mean: number, stdDev: number): number {
    if (stdDev === 0) return 0
    
    const n = values.length
    const cubedDeviations = values.map(val => Math.pow((val - mean) / stdDev, 3))
    return (n / ((n - 1) * (n - 2))) * this.calculateMean(cubedDeviations)
  }

  /**
   * Calcule l'aplatissement (kurtosis)
   */
  private calculateKurtosis(values: number[], mean: number, stdDev: number): number {
    if (stdDev === 0) return 0
    
    const n = values.length
    const fourthPowerDeviations = values.map(val => Math.pow((val - mean) / stdDev, 4))
    const kurtosis = this.calculateMean(fourthPowerDeviations)
    
    // Kurtosis excess (soustraction de 3 pour la distribution normale)
    return kurtosis - 3
  }

  /**
   * Calcule la distribution des prix
   */
  private calculatePriceDistribution(prices: number[]): PriceDistribution {
    if (prices.length === 0) {
      return this.getEmptyPriceDistribution()
    }

    const binCount = Math.min(20, Math.ceil(Math.sqrt(prices.length)))
    const min = prices[0]
    const max = prices[prices.length - 1]
    const binWidth = ((max ?? 0) - (min ?? 0)) / binCount

    // Créer l'histogramme
    const histogram = Array.from({ length: binCount }, (_, i) => {
      const rangeMin = (min ?? 0) + i * binWidth
      const rangeMax = (min ?? 0) + (i + 1) * binWidth
      const count = prices.filter(p => p >= rangeMin && (i === binCount - 1 ? p <= rangeMax : p < rangeMax)).length
      
      return {
        range: [rangeMin, rangeMax] as [number, number],
        count,
        percentage: (count / prices.length) * 100,
        density: count / (binWidth * prices.length)
      }
    })

    // Calculer la densité lissée
    const density = this.calculateKernelDensity(prices)

    // Calculer les percentiles
    const percentiles = this.calculatePercentiles(prices)

    // Distribution cumulative
    const cumulativeDistribution = prices.map((price, index) => ({
      price,
      cumulative: (index + 1) / prices.length
    }))

    return {
      histogram,
      density,
      percentiles,
      cumulativeDistribution
    }
  }

  /**
   * Calcule la densité par noyau (kernel density estimation)
   */
  private calculateKernelDensity(prices: number[], bandwidth?: number): Array<{ price: number; density: number }> {
    if (prices.length === 0) return []

    const n = prices.length
    const h = bandwidth || this.calculateOptimalBandwidth(prices)
    const min = prices[0]
    const max = prices[prices.length - 1]
    const points = 100

    const result: Array<{ price: number; density: number }> = []

    for (let i = 0; i <= points; i++) {
      const x = (min ?? 0) + (i / points) * ((max ?? 0) - (min ?? 0))
      let density = 0

      for (const price of prices) {
        const u = (x - price) / h
        density += this.gaussianKernel(u)
      }

      density = density / (n * h)
      result.push({ price: x, density })
    }

    return result
  }

  /**
   * Noyau gaussien pour l'estimation de densité
   */
  private gaussianKernel(u: number): number {
    return (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * u * u)
  }

  /**
   * Calcule la bande passante optimale pour l'estimation de densité
   */
  private calculateOptimalBandwidth(prices: number[]): number {
    const n = prices.length
    const stdDev = Math.sqrt(this.calculateVariance(prices, this.calculateMean(prices)))
    
    // Règle de Scott
    return 1.06 * stdDev * Math.pow(n, -1/5)
  }

  /**
   * Calcule les percentiles
   */
  private calculatePercentiles(sortedPrices: number[]): Record<number, number> {
    const percentiles: Record<number, number> = {}
    const percentilePoints = [5, 10, 25, 50, 75, 90, 95, 99]

    percentilePoints.forEach(p => {
      const index = (p / 100) * (sortedPrices.length - 1)
      const lower = Math.floor(index)
      const upper = Math.ceil(index)
      const weight = index - lower

      if (lower === upper) {
        percentiles[p] = sortedPrices[lower] ?? 0
      } else {
        percentiles[p] = (sortedPrices[lower] ?? 0) * (1 - weight) + (sortedPrices[upper] ?? 0) * weight
      }
    })

    return percentiles
  }

  /**
   * Analyse temporelle des données
   */
  private calculateTemporalAnalysis(items: VintedSoldItem[]): TemporalAnalysis {
    const timeSeriesData = this.extractTimeSeriesData(items)
    
    return {
      seasonality: this.detectSeasonality(timeSeriesData),
      trends: this.calculateTrends(timeSeriesData),
      cyclicalPatterns: this.detectCyclicalPatterns(timeSeriesData),
      volatility: this.calculateVolatility(timeSeriesData)
    }
  }

  /**
   * Extrait les données de série temporelle
   */
  private extractTimeSeriesData(items: VintedSoldItem[] = []): Array<{ date: Date; price: number }> {
    return items
      .filter(item => (item?.sold_at || item?.created_at) && item?.price?.amount)
      .map(item => ({
        date: new Date(item.sold_at ?? item.created_at ?? ''),
        price: parseFloat(item.price?.amount ?? 'NaN')
      }))
      .filter(data => !isNaN(data.price) && data.price > 0 && !isNaN(data.date.getTime()))
      .sort((a, b) => a.date.getTime() - b.date.getTime())
  }

  /**
   * Détecte la saisonnalité
   */
  private detectSeasonality(data: Array<{ date: Date; price: number }>): SeasonalityData {
    if (data.length < 14) {
      return {
        detected: false,
        pattern: 'none',
        confidence: 0,
        peaks: [],
        cycles: []
      }
    }

    // Analyse simple de saisonnalité basée sur les jours de la semaine
    const weeklyPattern = this.analyzeWeeklyPattern(data)
    const monthlyPattern = this.analyzeMonthlyPattern(data)

    const weeklyConfidence = this.calculatePatternConfidence(weeklyPattern)
    const monthlyConfidence = this.calculatePatternConfidence(monthlyPattern)

    if (weeklyConfidence > 0.6) {
      return {
        detected: true,
        pattern: 'weekly',
        confidence: weeklyConfidence,
        peaks: this.identifyPeaks(weeklyPattern, 'weekly'),
        cycles: [{
          length: 7,
          amplitude: this.calculateAmplitude(weeklyPattern),
          phase: this.calculatePhase(weeklyPattern)
        }]
      }
    }

    if (monthlyConfidence > 0.5) {
      return {
        detected: true,
        pattern: 'monthly',
        confidence: monthlyConfidence,
        peaks: this.identifyPeaks(monthlyPattern, 'monthly'),
        cycles: [{
          length: 30,
          amplitude: this.calculateAmplitude(monthlyPattern),
          phase: this.calculatePhase(monthlyPattern)
        }]
      }
    }

    return {
      detected: false,
      pattern: 'none',
      confidence: 0,
      peaks: [],
      cycles: []
    }
  }

  /**
   * Analyse le pattern hebdomadaire
   */
  private analyzeWeeklyPattern(data: Array<{ date: Date; price: number }>): number[] {
    const weeklyData: number[][] = Array.from({ length: 7 }, () => [])

    data.forEach(({ date, price }) => {
      const dayOfWeek = date.getDay()
      if (weeklyData[dayOfWeek]) weeklyData[dayOfWeek].push(price)
    })

    return weeklyData.map(dayPrices => 
      dayPrices.length > 0 ? this.calculateMean(dayPrices) : 0
    )
  }

  /**
   * Analyse le pattern mensuel
   */
  private analyzeMonthlyPattern(data: Array<{ date: Date; price: number }>): number[] {
    const monthlyData: number[][] = Array.from({ length: 12 }, () => [])

    data.forEach(({ date, price }) => {
      const month = date.getMonth()
      if (monthlyData[month]) monthlyData[month].push(price)
    })

    return monthlyData.map(monthPrices => 
      monthPrices.length > 0 ? this.calculateMean(monthPrices) : 0
    )
  }

  /**
   * Calcule la confiance d'un pattern
   */
  private calculatePatternConfidence(pattern: number[]): number {
    const validValues = pattern.filter(val => val > 0)
    if (validValues.length < 3) return 0

    const mean = this.calculateMean(validValues)
    const variance = this.calculateVariance(validValues, mean)
    const coefficientOfVariation = Math.sqrt(variance) / mean

    // Plus la variation est faible, plus la confiance est élevée
    return Math.max(0, 1 - coefficientOfVariation)
  }

  /**
   * Identifie les pics dans un pattern
   */
  private identifyPeaks(pattern: number[], type: 'weekly' | 'monthly'): Array<{ period: string; value: number; significance: number }> {
    const peaks: Array<{ period: string; value: number; significance: number }> = []
    const mean = this.calculateMean(pattern.filter(val => val > 0))

    pattern.forEach((value, index) => {
      if (value > mean * 1.1) { // 10% au-dessus de la moyenne
        const periodName = type === 'weekly' 
          ? ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'][index]
          : ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'][index]

        peaks.push({
          period: periodName ?? '',
          value,
          significance: (value - mean) / mean
        })
      }
    })

    return peaks.sort((a, b) => b.significance - a.significance)
  }

  /**
   * Calcule l'amplitude d'un pattern
   */
  private calculateAmplitude(pattern: number[]): number {
    const validValues = pattern.filter(val => val > 0)
    if (validValues.length === 0) return 0

    const min = Math.min(...validValues)
    const max = Math.max(...validValues)
    return (max - min) / 2
  }

  /**
   * Calcule la phase d'un pattern
   */
  private calculatePhase(pattern: number[]): number {
    const maxIndex = pattern.indexOf(Math.max(...pattern))
    return (maxIndex / pattern.length) * 2 * Math.PI
  }

  /**
   * Calcule les tendances
   */
  private calculateTrends(data: Array<{ date: Date; price: number }>): TrendData {
    if (data.length < 3) {
      return {
        direction: 'stable',
        strength: 0,
        duration: 0,
        slope: 0,
        rSquared: 0,
        changePoints: []
      }
    }

    // Régression linéaire simple
    const regression = this.calculateLinearRegression(data)
    const changePoints = this.detectChangePoints(data)

    return {
      direction: regression.slope > 0.01 ? 'up' : regression.slope < -0.01 ? 'down' : 'stable',
      strength: Math.abs(regression.slope),
      duration: ((data[data.length - 1]?.date?.getTime?.() ?? 0) - (data[0]?.date?.getTime?.() ?? 0)) / (1000 * 60 * 60 * 24),
      slope: regression.slope,
      rSquared: regression.rSquared,
      changePoints
    }
  }

  /**
   * Calcule la régression linéaire
   */
  private calculateLinearRegression(data: Array<{ date: Date; price: number }>): { slope: number; intercept: number; rSquared: number } {
    const n = data.length
    const startTime = data[0]?.date?.getTime?.() ?? 0
    
    // Convertir les dates en nombres (jours depuis le début)
    const points = data.map(({ date, price }) => ({
      x: (date.getTime() - startTime) / (1000 * 60 * 60 * 24),
      y: price
    }))

    const sumX = points.reduce((sum, p) => sum + p.x, 0)
    const sumY = points.reduce((sum, p) => sum + p.y, 0)
    const sumXY = points.reduce((sum, p) => sum + p.x * p.y, 0)
    const sumXX = points.reduce((sum, p) => sum + p.x * p.x, 0)
    const sumYY = points.reduce((sum, p) => sum + p.y * p.y, 0)

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n

    // Calcul du R²
    const meanY = sumY / n
    const ssRes = points.reduce((sum, p) => {
      const predicted = slope * p.x + intercept
      return sum + Math.pow(p.y - predicted, 2)
    }, 0)
    const ssTot = points.reduce((sum, p) => sum + Math.pow(p.y - meanY, 2), 0)
    const rSquared = ssTot > 0 ? 1 - (ssRes / ssTot) : 0

    return { slope, intercept, rSquared }
  }

  /**
   * Détecte les points de changement
   */
  private detectChangePoints(data: Array<{ date: Date; price: number }>): Array<{
    date: string;
    type: 'increase' | 'decrease' | 'volatility';
    magnitude: number;
    significance: number;
  }> {
    const changePoints: Array<{
      date: string;
      type: 'increase' | 'decrease' | 'volatility';
      magnitude: number;
      significance: number;
    }> = []

    if (data.length < 5) return changePoints

    // Analyse simple des changements significatifs
    const windowSize = Math.max(3, Math.floor(data.length / 10))
    
    for (let i = windowSize; i < data.length - windowSize; i++) {
      const beforeWindow = data.slice(i - windowSize, i)
      const afterWindow = data.slice(i, i + windowSize)
      
      const beforeMean = this.calculateMean(beforeWindow.map(d => d.price))
      const afterMean = this.calculateMean(afterWindow.map(d => d.price))
      
      const change = (afterMean - beforeMean) / beforeMean
      
      if (Math.abs(change) > 0.15) { // Changement de plus de 15%
        changePoints.push({
          date: data[i]?.date?.toISOString?.() ?? '',
          type: change > 0 ? 'increase' : 'decrease',
          magnitude: Math.abs(change),
          significance: Math.min(1, Math.abs(change) / 0.5)
        })
      }
    }

    return changePoints
  }

  /**
   * Détecte les patterns cycliques
   */
  private detectCyclicalPatterns(data: Array<{ date: Date; price: number }>): CyclicalPattern[] {
    // Implémentation simplifiée - dans un vrai projet, on utiliserait FFT ou autocorrélation
    return []
  }

  /**
   * Calcule la volatilité
   */
  private calculateVolatility(data: Array<{ date: Date; price: number }>): {
    overall: number;
    periods: Array<{ start: string; end: string; volatility: number }>;
  } {
    if (data.length < 2) {
      return { overall: 0, periods: [] }
    }

    // Calcul des rendements
    const returns = []
    for (let i = 1; i < data.length; i++) {
      const return_ = ((data[i]?.price ?? 0) - (data[i-1]?.price ?? 0)) / (data[i-1]?.price ?? 1)
      returns.push(return_)
    }

    const overallVolatility = Math.sqrt(this.calculateVariance(returns, this.calculateMean(returns)))

    // Volatilité par périodes (fenêtres glissantes)
    const windowSize = Math.max(5, Math.floor(data.length / 4))
    const periods: Array<{ start: string; end: string; volatility: number }> = []

    for (let i = 0; i <= returns.length - windowSize; i += Math.floor(windowSize / 2)) {
      const windowReturns = returns.slice(i, i + windowSize)
      const windowVolatility = Math.sqrt(this.calculateVariance(windowReturns, this.calculateMean(windowReturns)))
      
      periods.push({
        start: data[i]?.date?.toISOString?.() ?? '',
        end: data[Math.min(i + windowSize, data.length - 1)]?.date?.toISOString?.() ?? '',
        volatility: windowVolatility
      })
    }

    return {
      overall: overallVolatility,
      periods
    }
  }

  /**
   * Analyse concurrentielle
   */
  private calculateCompetitiveAnalysis(data: VintedAnalysisResult): CompetitiveAnalysis {
    const prices = this.extractPrices(data.rawItems ?? [])
    const avgPrice = data.avgPrice ?? 0
    
    // Position sur le marché
    const sortedPrices = [...prices].sort((a, b) => a - b)
    const position = sortedPrices.indexOf(avgPrice) / sortedPrices.length
    
    let marketPosition: 'low' | 'average' | 'high'
    if (position < 0.33) marketPosition = 'low'
    else if (position > 0.67) marketPosition = 'high'
    else marketPosition = 'average'

    // Densité concurrentielle
    const priceRange = (data.priceRange?.max ?? 0) - (data.priceRange?.min ?? 0)
    const competitorDensity = prices.length / Math.max(priceRange, 1)

    // Identification des gaps de prix
    const priceGaps = this.identifyPriceGaps(sortedPrices)

    return {
      marketPosition,
      competitorDensity,
      priceGaps,
      marketShare: {
        estimated: 1 / prices.length, // Estimation simple
        confidence: Math.min(1, prices.length / 100)
      },
      competitiveAdvantage: this.identifyCompetitiveAdvantages(data, prices)
    }
  }

  /**
   * Identifie les gaps de prix
   */
  private identifyPriceGaps(sortedPrices: number[]): Array<{
    min: number;
    max: number;
    opportunity: number;
    confidence: number;
  }> {
    const gaps: Array<{
      min: number;
      max: number;
      opportunity: number;
      confidence: number;
    }> = []

    const avgGap = this.calculateMean(
      sortedPrices.slice(1).map((price, i) => (price ?? 0) - (sortedPrices[i] ?? 0))
    )

    for (let i = 1; i < sortedPrices.length; i++) {
      const gap = (sortedPrices[i] ?? 0) - (sortedPrices[i - 1] ?? 0)
      
      if (gap > avgGap * 2) { // Gap significatif
        gaps.push({
          min: sortedPrices[i - 1] ?? 0,
          max: sortedPrices[i] ?? 0,
          opportunity: gap / avgGap,
          confidence: Math.min(1, gap / ((sortedPrices[i - 1] ?? 1) * 0.1))
        })
      }
    }

    return gaps.sort((a, b) => b.opportunity - a.opportunity).slice(0, 5)
  }

  /**
   * Identifie les avantages concurrentiels
   */
  private identifyCompetitiveAdvantages(data: VintedAnalysisResult, prices: number[]): Array<{
    factor: string;
    advantage: number;
    description: string;
  }> {
    const advantages: Array<{
      factor: string;
      advantage: number;
      description: string;
    }> = []

    // Avantage prix
    const avgPrice = this.calculateMean(prices)
    const priceAdvantage = (avgPrice - data.avgPrice) / avgPrice
    
    if (Math.abs(priceAdvantage) > 0.1) {
      advantages.push({
        factor: 'Prix',
        advantage: priceAdvantage,
        description: priceAdvantage > 0 
          ? 'Prix inférieur à la moyenne du marché'
          : 'Prix premium par rapport à la moyenne'
      })
    }

    // Avantage volume
    const volumeAdvantage = data.salesVolume / Math.max(prices.length, 1)
    advantages.push({
      factor: 'Volume',
      advantage: volumeAdvantage,
      description: `Volume de ventes ${volumeAdvantage > 1 ? 'supérieur' : 'inférieur'} à la moyenne`
    })

    return advantages
  }

  /**
   * Calcule le score de qualité des données
   */
  private calculateQualityScore(data: VintedAnalysisResult): {
    overall: number;
    dataCompleteness: number;
    sampleSize: number;
    timeRange: number;
    variance: number;
  } {
    const items = data.rawItems
    
    // Complétude des données
    const completeItems = items.filter(item => 
      item.price.amount && 
      (item.sold_at || item.created_at) &&
      item.title
    ).length
    const dataCompleteness = items.length > 0 ? completeItems / items.length : 0

    // Taille de l'échantillon
    const sampleSize = Math.min(1, (items?.length ?? 0) / 50) // Optimal à 50+ items

    // Étendue temporelle
    const dates = (items ?? [])
      .map(item => new Date(item?.sold_at ?? item?.created_at ?? ''))
      .filter(date => !isNaN(date.getTime()))
      .sort((a, b) => a.getTime() - b.getTime())
    
    const timeRange = dates.length > 1 
      ? Math.min(1, ((dates[dates.length - 1]?.getTime?.() ?? 0) - (dates[0]?.getTime?.() ?? 0)) / (30 * 24 * 60 * 60 * 1000)) // 30 jours optimal
      : 0

    // Variance des prix (diversité)
    const prices = this.extractPrices(items ?? [])
    const priceVariance = prices.length > 1 && this.calculateMean(prices) !== 0
      ? Math.min(1, Math.sqrt(this.calculateVariance(prices, this.calculateMean(prices))) / this.calculateMean(prices))
      : 0

    const overall = (dataCompleteness + sampleSize + timeRange + priceVariance) / 4

    return {
      overall,
      dataCompleteness,
      sampleSize,
      timeRange,
      variance: priceVariance
    }
  }

  /**
   * Retourne des statistiques descriptives vides
   */
  private getEmptyDescriptiveStats(): DescriptiveStats {
    return {
      mean: 0,
      median: 0,
      mode: [],
      standardDeviation: 0,
      variance: 0,
      quartiles: [0, 0, 0],
      outliers: [],
      skewness: 0,
      kurtosis: 0,
      range: { min: 0, max: 0 },
      interquartileRange: 0
    }
  }

  /**
   * Retourne une distribution de prix vide
   */
  private getEmptyPriceDistribution(): PriceDistribution {
    return {
      histogram: [],
      density: [],
      percentiles: {},
      cumulativeDistribution: []
    }
  }

  /**
   * Détecte les tendances dans les données historiques
   */
  detectTrends(historicalData: MarketAnalysisHistoryItem[]): TrendData {
    if (historicalData.length < 3) {
      return {
        direction: 'stable',
        strength: 0,
        duration: 0,
        slope: 0,
        rSquared: 0,
        changePoints: []
      }
    }

    const timeSeriesData = historicalData
      .map(item => ({
        date: new Date(item.createdAt),
        price: item.avgPrice
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime())

    return this.calculateTrends(timeSeriesData)
  }

  /**
   * Compare plusieurs analyses
   */
  compareAnalyses(analyses: VintedAnalysisResult[]): Array<{
    baselineId: string;
    comparisonId: string;
    metrics: {
      priceDifference: { absolute: number; percentage: number };
      volumeDifference: { absolute: number; percentage: number };
      trendSimilarity: number;
      marketPositionShift: number;
    };
    insights: string[];
    significance: number;
  }> {
    const comparisons: Array<{
      baselineId: string;
      comparisonId: string;
      metrics: {
        priceDifference: { absolute: number; percentage: number };
        volumeDifference: { absolute: number; percentage: number };
        trendSimilarity: number;
        marketPositionShift: number;
      };
      insights: string[];
      significance: number;
    }> = []

    for (let i = 0; i < analyses.length; i++) {
      for (let j = i + 1; j < analyses.length; j++) {
        const baseline = analyses[i]
        const comparison = analyses[j]

        const priceDiff = (comparison?.avgPrice ?? 0) - (baseline?.avgPrice ?? 0)
        const priceDiffPercent = baseline?.avgPrice ? (priceDiff / baseline.avgPrice) * 100 : 0

        const volumeDiff = (comparison?.salesVolume ?? 0) - (baseline?.salesVolume ?? 0)
        const volumeDiffPercent = baseline?.salesVolume && baseline.salesVolume > 0
          ? (volumeDiff / baseline.salesVolume) * 100
          : 0

        const insights: string[] = []
        
        if (Math.abs(priceDiffPercent) > 10) {
          insights.push(`Prix ${priceDiffPercent > 0 ? 'augmenté' : 'diminué'} de ${Math.abs(priceDiffPercent).toFixed(1)}%`)
        }
        
        if (Math.abs(volumeDiffPercent) > 20) {
          insights.push(`Volume ${volumeDiffPercent > 0 ? 'augmenté' : 'diminué'} de ${Math.abs(volumeDiffPercent).toFixed(1)}%`)
        }

        const significance = Math.min(1, (Math.abs(priceDiffPercent) + Math.abs(volumeDiffPercent)) / 100)

        comparisons.push({
          baselineId: baseline?.analysisDate ?? '',
          comparisonId: comparison?.analysisDate ?? '',
          metrics: {
            priceDifference: { absolute: priceDiff, percentage: priceDiffPercent },
            volumeDifference: { absolute: volumeDiff, percentage: volumeDiffPercent },
            trendSimilarity: 0.5, // Placeholder - nécessiterait une analyse plus complexe
            marketPositionShift: 0 // Placeholder
          },
          insights,
          significance
        })
      }
    }

    return comparisons.sort((a, b) => b.significance - a.significance)
  }
}

export default AdvancedAnalyticsEngine