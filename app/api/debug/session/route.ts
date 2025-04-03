import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { db } from "@/lib/db"

export async function GET() {
  try {
    // Récupérer le cookie de session
    const sessionId = cookies().get("session_id")?.value

    // Informations sur le cookie
    const cookieInfo = {
      exists: !!sessionId,
      value: sessionId ? `${sessionId.substring(0, 5)}...` : null,
    }

    // Informations sur la session en base de données
    let sessionInfo = null
    if (sessionId) {
      try {
        const session = db
          .prepare(`
            SELECT s.id as session_id, s.user_id, s.expires_at, u.username, u.email
            FROM sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.id = ?
          `)
          .get(sessionId)

        sessionInfo = session
          ? {
              valid: new Date(session.expires_at) > new Date(),
              userId: session.user_id,
              username: session.username,
              expiresAt: session.expires_at,
              timeRemaining: new Date(session.expires_at).getTime() - Date.now(),
            }
          : { error: "Session non trouvée en base de données" }
      } catch (error: any) {
        sessionInfo = { error: error.message }
      }
    }

    // Informations sur la base de données
    let dbInfo = null
    try {
      const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get().count
      const sessionCount = db.prepare("SELECT COUNT(*) as count FROM sessions").get().count

      dbInfo = {
        userCount,
        sessionCount,
      }
    } catch (error: any) {
      dbInfo = { error: error.message }
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      cookie: cookieInfo,
      session: sessionInfo,
      database: dbInfo,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

