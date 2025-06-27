import { NextResponse } from "next/server"
import { hashPassword } from "@/lib/auth"
import { db, generateId } from "@/lib/db"
import { z } from "zod"
import { cookies } from "next/headers" // Importez cookies ici

// Interfaces pour les types de données de la base de données (à importer de lib/auth si possible)
interface User {
  id: string;
  username: string;
  password_hash: string;
}

// Schéma de validation
const loginSchema = z.object({
  identifier: z.string().min(1, "Identifiant requis"),
  password: z.string().min(1, "Le mot de passe est requis"),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { identifier, password } = body

    console.log("API login - Identifiant:", identifier)

    try {
      const validatedData = loginSchema.parse({ identifier, password })

      // Vérifier si la table users existe
      try {
        db.prepare("SELECT 1 FROM users LIMIT 1").get()
      } catch (error: any) {
        console.error("Erreur lors de l'accès à la table users:", error)
        if (error.message.includes("no such table")) {
          return NextResponse.json(
            {
              success: false,
              message: "Erreur de base de données: la table users n'existe pas. Veuillez contacter l'administrateur.",
            },
            { status: 500 },
          )
        }
      }

      const passwordHash = hashPassword(password)

      const user = db
        .prepare<[string], User>(`
        SELECT id, username, password_hash FROM users
        WHERE username = ?
      `)
        .get(identifier)

      if (!user) {
        console.log("Utilisateur non trouvé")
        return NextResponse.json(
          {
            success: false,
            field: "identifier",
            message: "Identifiant incorrect",
          },
          { status: 401 },
        )
      }

      if (user.password_hash !== passwordHash) {
        console.log("Mot de passe incorrect")
        return NextResponse.json(
          {
            success: false,
            field: "password",
            message: "Mot de passe incorrect",
          },
          { status: 401 },
        )
      }

      console.log("Utilisateur authentifié, création de session pour:", user.id)

      // Supprimer toute session existante pour cet utilisateur
      try {
        const result = db.prepare("DELETE FROM sessions WHERE user_id = ?").run(user.id)
        console.log(
          "Sessions existantes supprimées pour l'utilisateur:",
          user.id,
          "Nombre de sessions supprimées:",
          result.changes,
        )
      } catch (error) {
        console.error("Erreur lors de la suppression des sessions existantes:", error)
      }

      // Créer une nouvelle session
      const sessionId = generateId()
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 jours

      db.prepare(`
        INSERT INTO sessions (id, user_id, expires_at)
        VALUES (?, ?, ?)
      `).run(sessionId, user.id, expiresAt)

      console.log("Session créée dans la base de données:", sessionId)

      // Créer une réponse avec le cookie de session
      const response = NextResponse.json({
        success: true,
        message: "Connexion réussie",
        user: { id: user.id, username: user.username },
      })

      // Définir le cookie de session
      const expiresAtDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 jours
      response.cookies.set({ // Utiliser response.cookies.set()
        name: "session_id",
        value: sessionId,
        expires: expiresAtDate,
        path: "/",
      })

      return response
    } catch (error: any) {
      console.error("Erreur dans l'API login:", error)
      return NextResponse.json({ success: false, message: error.message }, { status: 400 })
    }
  } catch (error: any) {
    console.error("Erreur lors de la connexion:", error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Une erreur s'est produite lors de la connexion",
      },
      { status: 500 },
    )
  }
}
