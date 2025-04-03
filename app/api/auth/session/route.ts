import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth"
import { cookies } from "next/headers"

export async function GET() {
  try {
    // Récupérer tous les cookies pour le débogage
    const allCookies = cookies().getAll()
    const sessionCookie = cookies().get("session_id")

    console.log("GET /api/auth/session - Cookies:", allCookies.map((c) => c.name).join(", "))
    console.log("GET /api/auth/session - Cookie de session:", sessionCookie?.value)

    const user = getSessionUser()
    console.log("GET /api/auth/session - Utilisateur:", user ? user.username : "non authentifié")

    if (!user) {
      return NextResponse.json(
        {
          user: null,
          debug: {
            cookies: allCookies.map((c) => c.name),
            sessionCookie: sessionCookie
              ? {
                  exists: true,
                  value: `${sessionCookie.value.substring(0, 5)}...`,
                }
              : { exists: false },
          },
        },
        { status: 401 },
      )
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error("Erreur lors de la récupération de la session:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

