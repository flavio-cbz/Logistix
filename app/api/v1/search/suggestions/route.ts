import { NextRequest, NextResponse } from 'next/server'
import { databaseService } from '@/lib/services/database/db'
import { validateSession } from '@/lib/services/auth'


interface Suggestion {
  text: string
  type: 'parcelle' | 'produit' | 'page'
  count?: number
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
    const limit = Math.min(parseInt(searchParams.get('limit') || '5'), 10)

    if (!query.trim()) {
      return NextResponse.json({
        success: true,
        suggestions: []
      })
    }

    const db = databaseService
    const userId = sessionResult.user.id
    const searchTerm = `${query.toLowerCase()}%`

    const suggestions: Suggestion[] = []

    // Get parcelle suggestions
    const parcelleQuery = `
      SELECT DISTINCT transporteur, COUNT(*) as count
      FROM parcelles 
      WHERE user_id = ? AND LOWER(transporteur) LIKE ?
      GROUP BY transporteur
      ORDER BY count DESC
      LIMIT ?
    `
    
    const parcelleSuggestions = await db.query(parcelleQuery, [
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
    
    const produitSuggestions = await db.query(produitQuery, [
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

    return NextResponse.json({
      success: true,
      suggestions: suggestions.slice(0, limit)
    })

  } catch (error) {
    console.error('Suggestions error:', error)
    return NextResponse.json(
      { success: false, message: 'Erreur lors de la génération des suggestions' },
      { status: 500 }
    )
  }
}