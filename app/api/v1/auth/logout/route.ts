import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST(req: NextRequest) {
  try {
    // Supprimer le cookie de session
    const cookieStore = cookies()
    cookieStore.delete('session_id')

    return NextResponse.json({
      success: true,
      message: "Déconnexion réussie"
    })
  } catch (error) {
    console.error("Erreur dans l'API logout:", error)
    return NextResponse.json(
      { success: false, message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}