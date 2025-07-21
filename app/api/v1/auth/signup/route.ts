import { NextResponse } from "next/server"
import { hashPassword } from "@/lib/services/auth"
import { db, generateId, getCurrentTimestamp } from "@/lib/services/db"
import { z } from "zod"

// Schéma de validation
const userSchema = z.object({
  username: z.string().min(2, "Le nom d'utilisateur doit faire au moins 2 caractères"),
  password: z.string().min(6, "Le mot de passe doit faire au moins 6 caractères"),
})

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const username = formData.get("username") as string
    const password = formData.get("password") as string

    console.log("API signup - Données reçues:", { username, password: "***" })

    if (!username || !password) {
      console.error("Données d'inscription incomplètes")
      return NextResponse.json({ success: false, message: "Tous les champs sont requis" }, { status: 400 })
    }

    try {
      const validatedData = userSchema.parse({ username, password })
      console.log("Données validées avec succès")

      // Vérifier si le nom d'utilisateur existe déjà
      const existingUsername = db.prepare("SELECT id FROM users WHERE username = ?").get(validatedData.username)

      if (existingUsername) {
        return NextResponse.json(
          {
            success: false,
            field: "username",
            message: "Ce nom d'utilisateur est déjà utilisé",
          },
          { status: 400 },
        )
      }

      // Créer l'utilisateur
      const id = generateId()
      const passwordHash = hashPassword(password)
      const timestamp = getCurrentTimestamp()

      db.prepare(`
        INSERT INTO users (id, username, password_hash, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, username, passwordHash, timestamp, timestamp)

      console.log("Utilisateur créé avec succès:", id)

      // Créer une session
      const sessionId = generateId()
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 jours

      db.prepare(`
        INSERT INTO sessions (id, user_id, expires_at)
        VALUES (?, ?, ?)
      `).run(sessionId, id, expiresAt)

      console.log("Session créée avec succès")

      // Créer une réponse avec le cookie de session
      const response = NextResponse.json({
        success: true,
        message: "Inscription réussie",
        user: { id, username },
      })

      // Définir le cookie de session
      const expiresAtDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 jours
      response.cookies.set({
        name: "session_id",
        value: sessionId,
        expires: expiresAtDate,
        path: "/",
      })

      return response
    } catch (error: any) {
      console.error("Erreur lors de la validation ou création d'utilisateur:", error)

      // Gestion spécifique des erreurs de validation Zod
      if (error.errors) {
        const errorMessages = error.errors.map((err: any) => err.message).join(", ")
        return NextResponse.json({ success: false, message: errorMessages }, { status: 400 })
      }

      return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }
  } catch (error: any) {
    console.error("Erreur lors de l'inscription:", error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Une erreur s'est produite lors de l'inscription",
      },
      { status: 500 },
    )
  }
}

