import { NextResponse } from "next/server"
import { db } from "@/lib/services/db"

interface SessionQueryResult {
  session_id: string;
  user_id: string;
  username: string;
  expires_at: string;
}

export async function GET(request: Request) {
  try {
    // Récupérer la première session de la base de données
    const session = db
      .prepare(`
      SELECT s.id as session_id, s.user_id, s.expires_at, u.username
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      LIMIT 1
    `)
      .get() as SessionQueryResult;

    if (!session) {
      return NextResponse.json({
        success: false,
        message: "Aucune session trouvée dans la base de données",
      })
    }

    // Créer une réponse
    const response = NextResponse.json({
      success: true,
      message: "Cookie de session défini manuellement",
      session: {
        id: session.session_id,
        userId: session.user_id,
        username: session.username,
        expiresAt: session.expires_at,
      },
    })

    // Définir le cookie de session directement sur la réponse
    response.cookies.set({
      name: "session_id",
      value: session.session_id,
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 jours
    })

    return response
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

