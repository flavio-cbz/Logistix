import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/services/auth"

export async function POST(req: Request) {
  try {
    const user = await getSessionUser()
    if (!user || !user.aiConfig) {
      return NextResponse.json({ error: "Configuration IA non trouvée ou utilisateur non autorisé" }, { status: 401 })
    }

    const { endpoint, apiKey, model } = user.aiConfig
    const body = await req.json()

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        ...body,
        model: model,
      })
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error(`Erreur de l'API d'inférence: ${response.status} ${response.statusText}`, errorBody)
      return NextResponse.json({ error: "Erreur lors de l'appel à l'API d'inférence", details: errorBody }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)

  } catch (e: any) {
    console.error("Erreur dans le service d'inférence:", e)
    return NextResponse.json({ error: e.message || "Erreur serveur" }, { status: 500 })
  }
}