import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/services/auth"
import { db } from "@/lib/services/database/drizzle-client"
import { users } from "@/lib/services/database/drizzle-schema"
import { eq } from "drizzle-orm"
import { encryptSecret, decryptSecret } from "@/lib/utils/crypto"

export async function POST(req: Request) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { endpoint, apiKey, selectedModel } = await req.json()
    
    // Chiffrer la clé API avant de la stocker
    const apiKeyEncrypted = apiKey ? encryptSecret(apiKey) : undefined

    const updatedUser = await db.update(users).set({
      ai_config: JSON.stringify({ endpoint, apiKey: apiKeyEncrypted, model: selectedModel })
    }).where(eq(users.id, user.id)).returning()

    if (updatedUser.length === 0) {
      return NextResponse.json({ error: "Impossible de mettre à jour l'utilisateur" }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Configuration enregistrée." })
  } catch (e: any) {
    console.error("Erreur lors de la sauvegarde de la configuration IA:", e)
    return NextResponse.json({ error: e.message || "Erreur serveur" }, { status: 500 })
  }
}

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }
    const result = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      columns: {
        ai_config: true,
      },
    });

    if (!result || !result.ai_config) {
      return NextResponse.json({ ai_config: null });
    }

    // Déchiffrer la clé API avant de la renvoyer au client
    let aiConfig = typeof result.ai_config === "string" ? JSON.parse(result.ai_config) : result.ai_config;
    if (aiConfig && aiConfig.apiKey && typeof aiConfig.apiKey === "string") {
      try {
        aiConfig.apiKey = decryptSecret(aiConfig.apiKey)
      } catch (err) {
        console.warn("Failed to decrypt ai apiKey:", err)
        // En cas d'échec, on renvoie la valeur telle quelle (fallback)
      }
    }

    // Conserver le même shape qu'avant (string JSON) pour compatibilité front
    return NextResponse.json({ ai_config: JSON.stringify(aiConfig) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Erreur serveur" }, { status: 500 })
  }
}