import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/services/auth"

export async function GET() {
  try {
    const user = getSessionUser()

    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error("Erreur lors de la récupération de la session:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

