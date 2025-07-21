import { NextResponse } from "next/server"
import { Logger } from "@/lib/logger"

export async function GET(request: Request) {
  try {
    // Créer une réponse
    const response = NextResponse.json({
      message: "Cookie de test défini",
      timestamp: new Date().toISOString(),
    })

    // Définir un cookie directement sur la réponse
    response.cookies.set({
      name: "test_direct_cookie",
      value: "test_value_" + Date.now(),
      path: "/",
      maxAge: 60 * 60, // 1 heure
    })

    return response
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
