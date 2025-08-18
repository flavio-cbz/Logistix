import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { endpoint } = await req.json()
    if (!endpoint) {
      return NextResponse.json({ error: "endpoint requis" }, { status: 400 })
    }

    const normalizedEndpoint = endpoint.endsWith("/") ? endpoint : endpoint + "/"

    const res = await fetch(normalizedEndpoint + "models")
    if (!res.ok) {
      const errorText = await res.text()
      console.error("Error fetching models:", res.status, errorText)
      return NextResponse.json({ error: `Erreur lors de la récupération des modèles: ${res.statusText}`, status: res.status }, { status: 500 })
    }

    const data = await res.json()

    // La réponse de l'API NVIDIA est dans data.data
    return NextResponse.json({ data: data.data || [] })
  } catch (e: any) {
    console.error("Server error:", e.message)
    return NextResponse.json({ error: e.message || "Erreur serveur" }, { status: 500 })
  }
}