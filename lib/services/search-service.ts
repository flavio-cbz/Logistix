import { databaseService } from './database/db'

export interface SearchResult {
  id: string
  type: 'parcelle' | 'produit' | 'page'
  title: string
  description?: string
  url: string
  relevance: number
}

export interface SearchOptions {
  query: string
  type?: 'parcelle' | 'produit' | 'all'
  limit?: number
  offset?: number
  userId: string
}

export interface SearchSuggestion {
  text: string
  type: 'parcelle' | 'produit' | 'page'
  count?: number
}

export interface SearchHistory {
  id: string
  userId: string
  query: string
  timestamp: Date
  resultCount: number
}

export interface SearchAnalytics {
  totalSearches: number
  popularQueries: Array<{ query: string; count: number }>
  averageResultCount: number
  searchesByType: Record<string, number>
}

export class SearchService {
  private static instance: SearchService
  private databaseService: typeof databaseService
  private searchHistory: Map<string, SearchHistory[]> = new Map()
  private searchCache: Map<string, { results: SearchResult[]; timestamp: number }> = new Map()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  private constructor() {
    this.databaseService = databaseService
  }

  public static getInstance(): SearchService {
    if (!SearchService.instance) {
      SearchService.instance = new SearchService()
    }
    return SearchService.instance
  }

  /**
   * Perform global search across all data types
   */
  async search(options: SearchOptions): Promise<{
    results: SearchResult[]
    total: number
    suggestions: string[]
  }> {
    const { query, type = 'all', limit = 10, offset = 0, userId } = options

    if (!query.trim()) {
      return { results: [], total: 0, suggestions: [] }
    }

    // Check cache first
    const cacheKey = `${userId}-${query}-${type}-${limit}-${offset}`
    const cached = this.searchCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return {
        results: cached.results,
        total: cached.results.length,
        suggestions: this.generateSuggestions(query, cached.results)
      }
    }

    const results: SearchResult[] = []

    // Search parcelles
    if (type === 'all' || type === 'parcelle') {
      const parcelleResults = await this.searchParcelles(query, userId, limit, offset)
      results.push(...parcelleResults)
    }

    // Search produits
    if (type === 'all' || type === 'produit') {
      const produitResults = await this.searchProduits(query, userId, limit, offset)
      results.push(...produitResults)
    }

    // Add static pages
    if (type === 'all') {
      const pageResults = this.searchPages(query)
      results.push(...pageResults)
    }

    // Sort by relevance
    results.sort((a, b) => b.relevance - a.relevance)

    // Apply pagination
    const paginatedResults = results.slice(0, limit)

    // Cache results
    this.searchCache.set(cacheKey, {
      results: paginatedResults,
      timestamp: Date.now()
    })

    // Record search history
    await this.recordSearchHistory(userId, query, paginatedResults.length)

    return {
      results: paginatedResults,
      total: results.length,
      suggestions: this.generateSuggestions(query, results)
    }
  }

  /**
   * Search parcelles by numero and transporteur
   */
  private async searchParcelles(query: string, userId: string, limit: number, offset: number): Promise<SearchResult[]> {
    const searchTerm = `%${query.toLowerCase()}%`
    
    const parcelleQuery = `
      SELECT id, numero, transporteur, poids, prix_achat, date_creation
      FROM parcelles 
      WHERE user_id = ? 
      AND (LOWER(numero) LIKE ? OR LOWER(transporteur) LIKE ?)
      ORDER BY date_creation DESC
      LIMIT ? OFFSET ?
    `
    
    const parcelles = await this.databaseService.query(parcelleQuery, [
      userId, searchTerm, searchTerm, limit, offset
    ])

    return parcelles.map((parcelle: any) => ({
      id: `parcelle-${parcelle.id}`,
      type: 'parcelle' as const,
      title: `Parcelle #${parcelle.numero}`,
      description: `${parcelle.transporteur} - ${parcelle.poids}g - ${parcelle.prix_achat}€`,
      url: `/parcelles?id=${parcelle.id}`,
      relevance: this.calculateRelevance(query, `${parcelle.numero} ${parcelle.transporteur}`)
    }))
  }

  /**
   * Search produits by name
   */
  private async searchProduits(query: string, userId: string, limit: number, offset: number): Promise<SearchResult[]> {
    const searchTerm = `%${query.toLowerCase()}%`
    
    const produitQuery = `
      SELECT id, nom, prix, quantite, vendu, date_vente, parcelle_id
      FROM produits 
      WHERE user_id = ? 
      AND LOWER(nom) LIKE ?
      ORDER BY date_creation DESC
      LIMIT ? OFFSET ?
    `
    
    const produits = await this.databaseService.query(produitQuery, [
      userId, searchTerm, limit, offset
    ])

    return produits.map((produit: any) => ({
      id: `produit-${produit.id}`,
      type: 'produit' as const,
      title: produit.nom,
      description: `${produit.prix}€ - ${produit.vendu ? 'Vendu' : 'Disponible'}`,
      url: `/produits?id=${produit.id}`,
      relevance: this.calculateRelevance(query, produit.nom)
    }))
  }

  /**
   * Search static pages
   */
  private searchPages(query: string): SearchResult[] {
    const pages = [
      { id: 'dashboard', title: 'Tableau de bord', url: '/dashboard' },
      { id: 'parcelles', title: 'Parcelles', url: '/parcelles' },
      { id: 'produits', title: 'Produits', url: '/produits' },
      { id: 'statistiques', title: 'Statistiques', url: '/statistiques' },
      { id: 'analyse-marche', title: 'Analyse de Marché', url: '/analyse-marche' },
      { id: 'profile', title: 'Profil', url: '/profile' }
    ]

    return pages
      .filter(page => page.title.toLowerCase().includes(query.toLowerCase()))
      .map(page => ({
        id: `page-${page.id}`,
        type: 'page' as const,
        title: page.title,
        url: page.url,
        relevance: this.calculateRelevance(query, page.title)
      }))
  }

  /**
   * Generate search suggestions
   */
  async getSuggestions(query: string, userId: string, limit: number = 5): Promise<SearchSuggestion[]> {
    if (!query.trim()) {
      return []
    }

    const suggestions: SearchSuggestion[] = []
    const searchTerm = `${query.toLowerCase()}%`

    // Get parcelle suggestions
    const parcelleQuery = `
      SELECT DISTINCT transporteur, COUNT(*) as count
      FROM parcelles 
      WHERE user_id = ? AND LOWER(transporteur) LIKE ?
      GROUP BY transporteur
      ORDER BY count DESC
      LIMIT ?
    `
    
    const parcelleSuggestions = await this.databaseService.query(parcelleQuery, [
      userId, searchTerm, limit
    ])

    parcelleSuggestions.forEach((item: any) => {
      suggestions.push({
        text: item.transporteur,
        type: 'parcelle',
        count: item.count
      })
    })

    // Get produit suggestions
    const produitQuery = `
      SELECT DISTINCT nom, COUNT(*) as count
      FROM produits 
      WHERE user_id = ? AND LOWER(nom) LIKE ?
      GROUP BY nom
      ORDER BY count DESC
      LIMIT ?
    `
    
    const produitSuggestions = await this.databaseService.query(produitQuery, [
      userId, searchTerm, limit
    ])

    produitSuggestions.forEach((item: any) => {
      suggestions.push({
        text: item.nom,
        type: 'produit',
        count: item.count
      })
    })

    // Add page suggestions
    const pages = [
      'Tableau de bord',
      'Parcelles',
      'Produits', 
      'Statistiques',
      'Analyse de Marché',
      'Profil'
    ]

    pages.forEach(page => {
      if (page.toLowerCase().startsWith(query.toLowerCase())) {
        suggestions.push({
          text: page,
          type: 'page'
        })
      }
    })

    // Sort by relevance and count
    suggestions.sort((a, b) => {
      if (a.count && b.count) return b.count - a.count
      if (a.count) return -1
      if (b.count) return 1
      return 0
    })

    return suggestions.slice(0, limit)
  }

  /**
   * Calculate relevance score for search results
   */
  private calculateRelevance(query: string, text: string): number {
    const queryLower = query.toLowerCase()
    const textLower = text.toLowerCase()
    
    // Exact match gets highest score
    if (textLower === queryLower) return 100
    
    // Starts with query gets high score
    if (textLower.startsWith(queryLower)) return 80
    
    // Contains query gets medium score
    if (textLower.includes(queryLower)) return 60
    
    // Word boundary matches get lower score
    const words = queryLower.split(' ')
    let wordMatches = 0
    words.forEach(word => {
      if (textLower.includes(word)) wordMatches++
    })
    
    return (wordMatches / words.length) * 40
  }

  /**
   * Generate suggestions from search results
   */
  private generateSuggestions(query: string, results: SearchResult[]): string[] {
    const suggestions: string[] = []
    
    // Extract unique words from results
    const words = new Set<string>()
    results.forEach(result => {
      result.title.split(' ').forEach(word => {
        if (word.length > 2) {
          words.add(word.toLowerCase())
        }
      })
    })
    
    // Find words that start with query
    const queryLower = query.toLowerCase()
    Array.from(words).forEach(word => {
      if (word.startsWith(queryLower) && word !== queryLower) {
        suggestions.push(word)
      }
    })
    
    return suggestions.slice(0, 5)
  }

  /**
   * Record search history for analytics
   */
  private async recordSearchHistory(userId: string, query: string, resultCount: number): Promise<void> {
    const historyEntry: SearchHistory = {
      id: `search-${Date.now()}-${Math.random()}`,
      userId,
      query,
      timestamp: new Date(),
      resultCount
    }

    // Store in memory (in production, this would be stored in database)
    if (!this.searchHistory.has(userId)) {
      this.searchHistory.set(userId, [])
    }
    
    const userHistory = this.searchHistory.get(userId)!
    userHistory.push(historyEntry)
    
    // Keep only last 100 searches per user
    if (userHistory.length > 100) {
      userHistory.shift()
    }
  }

  /**
   * Get search history for a user
   */
  getSearchHistory(userId: string, limit: number = 10): SearchHistory[] {
    const userHistory = this.searchHistory.get(userId) || []
    return userHistory
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
  }

  /**
   * Get search analytics
   */
  getSearchAnalytics(userId?: string): SearchAnalytics {
    let allHistory: SearchHistory[] = []
    
    if (userId) {
      allHistory = this.searchHistory.get(userId) || []
    } else {
      // Aggregate all users
      this.searchHistory.forEach(userHistory => {
        allHistory.push(...userHistory)
      })
    }

    const totalSearches = allHistory.length
    const queryCount = new Map<string, number>()
    const typeCount = new Map<string, number>()
    let totalResults = 0

    allHistory.forEach(entry => {
      // Count queries
      const count = queryCount.get(entry.query) || 0
      queryCount.set(entry.query, count + 1)
      
      // Count results
      totalResults += entry.resultCount
      
      // Count by type (simplified - would need more data in real implementation)
      const type = entry.query.includes('parcelle') ? 'parcelle' : 
                   entry.query.includes('produit') ? 'produit' : 'general'
      const typeCountValue = typeCount.get(type) || 0
      typeCount.set(type, typeCountValue + 1)
    })

    const popularQueries = Array.from(queryCount.entries())
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    const searchesByType: Record<string, number> = {}
    typeCount.forEach((count, type) => {
      searchesByType[type] = count
    })

    return {
      totalSearches,
      popularQueries,
      averageResultCount: totalSearches > 0 ? totalResults / totalSearches : 0,
      searchesByType
    }
  }

  /**
   * Clear search cache
   */
  clearCache(): void {
    this.searchCache.clear()
  }

  /**
   * Clear search history for a user
   */
  clearSearchHistory(userId: string): void {
    this.searchHistory.delete(userId)
  }

  /**
   * Index data for better search performance (placeholder for future implementation)
   */
  async rebuildSearchIndex(userId?: string): Promise<void> {
    // In a real implementation, this would rebuild search indexes
    // For now, just clear the cache to force fresh queries
    this.clearCache()
  }
}