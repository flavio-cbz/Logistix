// Endpoint API pour accéder aux ventes similaires Vinted

import { NextRequest, NextResponse } from "next/server"
import { fetchSimilarSales } from "@/lib/services/market-analysis/similar-sales-service"

export const runtime = "edge"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get("q") || ""
  const page = Number(searchParams.get("page") || 1)
  const per_page = Number(searchParams.get("per_page") || 24)

  if (!query.trim()) {
    return NextResponse.json({ error: "Paramètre 'q' requis" }, { status: 400 })
  }

  try {
    const data = await fetchSimilarSales({
      query,
      page,
      per_page,
      cacheTTL: 600
    })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 }
    )
  }
}