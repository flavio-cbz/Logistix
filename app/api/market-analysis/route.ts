import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth"
import { db, generateId, getCurrentTimestamp } from "@/lib/db"

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) {
      return new NextResponse(JSON.stringify({ message: "Non authentifié" }), { status: 401 })
    }

    const stmt = db.prepare(`
      SELECT 
        id, product_name as productName, current_price as currentPrice, 
        min_price as minPrice, max_price as maxPrice, avg_price as avgPrice, 
        sales_volume as salesVolume, competitor_count as competitorCount, 
        trend, trend_percentage as trendPercentage, last_updated as lastUpdated, 
        recommended_price as recommendedPrice, market_share as marketShare, 
        demand_level as demandLevel
      FROM market_analyses 
      WHERE user_id = ?
    `)
    const analyses = stmt.all(user.id)
    return NextResponse.json(analyses)
  } catch (error) {
    console.error("Erreur lors de la récupération des analyses de marché:", error)
    return new NextResponse(JSON.stringify({ message: "Erreur interne du serveur" }), { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return new NextResponse(JSON.stringify({ message: "Non authentifié" }), { status: 401 })
    }

    const data = await request.json()
    const timestamp = getCurrentTimestamp()

    const existing = db.prepare("SELECT id FROM market_analyses WHERE user_id = ? AND product_name = ?").get(user.id, data.productName)

    if (existing) {
      db.prepare(`
        UPDATE market_analyses SET
          current_price = ?, min_price = ?, max_price = ?, avg_price = ?,
          sales_volume = ?, competitor_count = ?, trend = ?, trend_percentage = ?,
          last_updated = ?, recommended_price = ?, market_share = ?, demand_level = ?,
          updated_at = ?
        WHERE id = ? AND user_id = ?
      `).run(
        data.currentPrice, data.minPrice, data.maxPrice, data.avgPrice,
        data.salesVolume, data.competitorCount, data.trend, data.trendPercentage,
        data.lastUpdated, data.recommendedPrice, data.marketShare, data.demandLevel,
        timestamp, (existing as { id: string }).id, user.id
      )
      return new NextResponse(JSON.stringify({ message: "Analyse de marché mise à jour" }), { status: 200 })
    } else {
      const id = generateId()
      db.prepare(`
        INSERT INTO market_analyses (
          id, user_id, product_name, current_price, min_price, max_price, avg_price,
          sales_volume, competitor_count, trend, trend_percentage, last_updated,
          recommended_price, market_share, demand_level, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, user.id, data.productName, data.currentPrice, data.minPrice, data.maxPrice, data.avgPrice,
        data.salesVolume, data.competitorCount, data.trend, data.trendPercentage, data.lastUpdated,
        data.recommendedPrice, data.marketShare, data.demandLevel, timestamp, timestamp
      )
      return new NextResponse(JSON.stringify({ message: "Analyse de marché sauvegardée", id }), { status: 201 })
    }
  } catch (error) {
    console.error("Erreur lors de la sauvegarde/mise à jour de l'analyse de marché:", error)
    return new NextResponse(JSON.stringify({ message: "Erreur interne du serveur" }), { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return new NextResponse(JSON.stringify({ message: "Non authentifié" }), { status: 401 })
    }

    const { id } = await request.json()
    if (!id) {
      return new NextResponse(JSON.stringify({ message: "ID du produit manquant" }), { status: 400 })
    }

    db.prepare("DELETE FROM market_analyses WHERE id = ? AND user_id = ?").run(id, user.id)
    return new NextResponse(JSON.stringify({ message: "Analyse de marché supprimée" }), { status: 200 })
  } catch (error) {
    console.error("Erreur lors de la suppression de l'analyse de marché:", error)
    return new NextResponse(JSON.stringify({ message: "Erreur interne du serveur" }), { status: 500 })
  }
}