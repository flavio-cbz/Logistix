import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/services/db'
import { validateSession } from '@/lib/middlewares/auth'

interface SearchResult {
  id: string
  type: 'parcelle' | 'produit' | 'page'
  title: string
  description?: string
  url: string
  relevance: number
}

interface SearchResponse {
  success: boolean
  results: SearchResult[]
  total: number
  query: string
  suggestions?: string[]
  page: number
  limit: number
}

export async function GET(request: NextRequest) {
  try {
    // Validate session
    const sessionResult = await validateSession(request)
    if (!sessionResult.success || !sessionResult.user) {
      return NextResponse.json(
        { success: false, message: 'Non authentifié' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50)
    const type = searchParams.get('type') as 'parcelle' | 'produit' | 'all' | null

    if (!query.trim()) {
      return NextResponse.json({
        success: true,
        results: [],
        total: 0,
        query: '',
        page,
        limit
      })
    }

    const databaseService = DatabaseService.getInstance()
    const userId = sessionResult.user.id
    const offset = (page - 1) * limit
    const searchTerm = `%${query.toLowerCase()}%`

    let results: SearchResult[] = []
    let total = 0

    // Search parcelles
    if (!type || type === 'all' || type === 'parcelle') {
      const parcelleQuery = `
        SELECT id, numero, transporteur, poids, prix_achat, date_creation
        FROM parcelles 
        WHERE user_id = ? 
        AND (LOWER(numero) LIKE ? OR LOWER(transporteur) LIKE ?)
        ORDER BY date_creation DESC
        LIMIT ? OFFSET ?
      `
      
      const parcelles = await databaseService.query(parcelleQuery, [
        userId, searchTerm, searchTerm, limit, offset
      ])

      const parcelleResults: SearchResult[] = parcelles.map((parcelle: any) => ({
        id: `parcelle-${parcelle.id}`,
        type: 'parcelle' as const,
        title: `Parcelle #${parcelle.numero}`,
        description: `${parcelle.transporteur} - ${parcelle.poids}g - ${parcelle.prix_achat}€`,
        url: `/parcelles?id=${parcelle.id}`,
        relevance: calculateRelevance(query, `${parcelle.numero} ${parcelle.transporteur}`)
      }))

      results.push(...parcelleResults)
    }

    // Search produits
    if (!type || type === 'all' || type === 'produit') {
      const produitQuery = `
        SELECT id, nom, prix, quantite, vendu, date_vente, parcelle_id
        FROM produits 
        WHERE user_id = ? 
        AND LOWER(nom) LIKE ?
        ORDER BY date_creation DESC
        LIMIT ? OFFSET ?
      `
      
      const produits = await databaseService.query(produitQuery, [
        userId, searchTerm, limit, offset
      ])

      const produitResults: SearchResult[] = produits.map((produit: any) => ({
        id: `produit-${produit.id}`,
        type: 'produit' as const,
        title: produit.nom,
        description: `${produit.prix}€ - ${produit.vendu ? 'Vendu' : 'Disponible'}`,
        url: `/produits?id=${produit.id}`,
        relevance: calculateRelevance(query, produit.nom)
      }))

      results.push(...produitResults)
    }

    // Add static pages to results
    if (!type || type === 'all') {
      const pages = [
        { id: 'dashboard', title: 'Tableau de bord', url: '/dashboard' },
        { id: 'parcelles', title: 'Parcelles', url: '/parcelles' },
        { id: 'produits', title: 'Produits', url: '/produits' },
        { id: 'statistiques', title: 'Statistiques', url: '/statistiques' },
        { id: 'analyse-marche', title: 'Analyse de Marché', url: '/analyse-marche' },
        { id: 'profile', title: 'Profil', url: '/profile' }
      ]

      const pageResults: SearchResult[] = pages
        .filter(page => page.title.toLowerCase().includes(query.toLowerCase()))
        .map(page => ({
          id: `page-${page.id}`,
          type: 'page' as const,
          title: page.title,
          url: page.url,
          relevance: calculateRelevance(query, page.title)
        }))

      results.push(...pageResults)
    }

    // Sort by relevance
    results.sort((a, b) => b.relevance - a.relevance)

    // Apply pagination
    const paginatedResults = results.slice(0, limit)
    total = results.length

    // Generate suggestions
    const suggestions = generateSuggestions(query, results)

    return NextResponse.json({
      success: true,
      results: paginatedResults,
      total,
      query,
      suggestions,
      page,
      limit
    })

  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { success: false, message: 'Erreur lors de la recherche' },
      { status: 500 }
    )
  }
}

function calculateRelevance(query: string, text: string): number {
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

function generateSuggestions(query: string, results: SearchResult[]): string[] {
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