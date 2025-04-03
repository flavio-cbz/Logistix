import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth"
import { db } from "@/lib/db"

export async function POST() {
  try {
    const user = getSessionUser()

    if (user) {
      // Récupérer l'ID de session depuis le cookie
      const sessionId = require("next/headers").cookies().get("session_id")?.value

      if (sessionId) {
        // Supprimer la session de la base de données
        db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId)
      }
    }

    // Créer une réponse
    const response = NextResponse.json({
      success: true,
      message: "Déconnexion réussie",
    })

    // Supprimer le cookie de session
    response.cookies.delete("session_id")

    return response
  } catch (error: any) {
    console.error("Erreur lors de la déconnexion:", error)

    // Même en cas d'erreur, on supprime le cookie
    const response = NextResponse.json(
      {
        success: false,
        message: error.message || "Une erreur s'est produite lors de la déconnexion",
      },
      { status: 500 },
    )

    response.cookies.delete("session_id")

    return response
  }
}

