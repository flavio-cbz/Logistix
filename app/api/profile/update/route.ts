import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth"
import { db, getCurrentTimestamp } from "@/lib/db"
import { hashPassword } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    // Vérifier l'authentification
    const user = getSessionUser()
    if (!user) {
      return NextResponse.json({ success: false, message: "Non authentifié" }, { status: 401 })
    }

    // Récupérer les données du corps de la requête
    const data = await request.json()
    const { username, email, bio, avatar, language, theme, password } = data

    console.log("Mise à jour du profil pour l'utilisateur:", user.id)
    console.log("Données reçues:", { username, email, language, theme })

    // Vérifier si le nom d'utilisateur existe déjà (sauf pour l'utilisateur actuel)
    if (username !== user.username) {
      try {
        // Utiliser une requête préparée avec des paramètres nommés pour plus de clarté
        const existingUser = db.prepare("SELECT id FROM users WHERE username = ? AND id != ?").get(username, user.id)

        if (existingUser) {
          return NextResponse.json(
            {
              success: false,
              message: "Ce nom d'utilisateur est déjà utilisé",
            },
            { status: 400 },
          )
        }
      } catch (error) {
        console.error("Erreur lors de la vérification du nom d'utilisateur:", error)
        return NextResponse.json(
          {
            success: false,
            message: "Erreur lors de la vérification du nom d'utilisateur",
          },
          { status: 500 },
        )
      }
    }

    // Vérifier si l'email existe déjà (sauf pour l'utilisateur actuel)
    if (email !== user.email) {
      try {
        const existingUser = db.prepare("SELECT id FROM users WHERE email = ? AND id != ?").get(email, user.id)

        if (existingUser) {
          return NextResponse.json(
            {
              success: false,
              message: "Cette adresse email est déjà utilisée",
            },
            { status: 400 },
          )
        }
      } catch (error) {
        console.error("Erreur lors de la vérification de l'email:", error)
        return NextResponse.json(
          {
            success: false,
            message: "Erreur lors de la vérification de l'email",
          },
          { status: 500 },
        )
      }
    }

    const timestamp = getCurrentTimestamp()

    try {
      // Mettre à jour le profil dans la base de données
      if (password && password.length > 0) {
        const passwordHash = hashPassword(password)

        db.prepare(`
          UPDATE users
          SET username = ?, email = ?, bio = ?, avatar = ?, language = ?, theme = ?, password_hash = ?, updated_at = ?
          WHERE id = ?
        `).run(
          username,
          email,
          bio || null,
          avatar || null,
          language || "fr",
          theme || "system",
          passwordHash,
          timestamp,
          user.id,
        )
      } else {
        db.prepare(`
          UPDATE users
          SET username = ?, email = ?, bio = ?, avatar = ?, language = ?, theme = ?, updated_at = ?
          WHERE id = ?
        `).run(username, email, bio || null, avatar || null, language || "fr", theme || "system", timestamp, user.id)
      }

      console.log("Profil mis à jour avec succès")

      return NextResponse.json({
        success: true,
        message: "Profil mis à jour avec succès",
        user: {
          id: user.id,
          username,
          email,
          bio,
          avatar,
          language,
          theme,
        },
      })
    } catch (dbError: any) {
      console.error("Erreur lors de la mise à jour en base de données:", dbError)
      return NextResponse.json(
        {
          success: false,
          message: `Erreur de base de données: ${dbError.message}`,
        },
        { status: 500 },
      )
    }
  } catch (error: any) {
    console.error("Erreur lors de la mise à jour du profil:", error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Une erreur s'est produite lors de la mise à jour du profil",
      },
      { status: 500 },
    )
  }
}

