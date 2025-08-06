import { NextResponse } from "next/server";
// Disabled market analysis service
// import { parseSemanticQuery } from "@/lib/services/market-analysis/semantic-parser";

export async function POST(req: Request) {
  return NextResponse.json({ 
    error: "Service d'analyse sémantique temporairement désactivé" 
  }, { status: 503 });
}