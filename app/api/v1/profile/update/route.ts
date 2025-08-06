import { NextResponse } from "next/server"
import { getSessionUser, hashPassword } from "@/lib/services/auth"
import { db, getCurrentTimestamp } from "@/lib/services/database/db"
import * as z from "zod"

// Le schéma de validation corrigé avec superRefine pour une logique conditionnelle
const profileFormSchema = z
	.object({
		username: z.string().min(2, { message: "Le nom d'utilisateur doit faire au moins 2 caractères." }).max(30, { message: "Le nom d'utilisateur ne peut pas dépasser 30 caractères." }),
		email: z.string().min(1, { message: "L'email est requis." }).email("Email invalide."),
		password: z.string().optional(), // La validation de la longueur se fera dans superRefine
		language: z.string({ required_error: "Veuillez sélectionner une langue." }),
		theme: z.string({ required_error: "Veuillez sélectionner un thème." }),
		avatar: z.string().url({ message: "Veuillez entrer une URL valide pour l'avatar." }).optional().or(z.literal("")),
	})
	.superRefine((data, ctx) => {
		// Valide la longueur du mot de passe uniquement s'il est fourni et non vide.
		if (data.password && data.password.length > 0 && data.password.length < 4) {
			ctx.addIssue({
				code: z.ZodIssueCode.too_small,
				minimum: 4,
				type: "string",
				inclusive: true,
				message: "Le mot de passe doit contenir au moins 4 caractères.",
				path: ["password"],
			})
		}
	})

export async function POST(request: Request) {
	try {
		// 1. Vérifier l'authentification
		const user = await getSessionUser()
		if (!user) {
			return NextResponse.json({ success: false, message: "Non authentifié" }, { status: 401 })
		}

		// 2. Récupérer et valider les données
		const data = await request.json()
		const validation = profileFormSchema.safeParse(data)

		if (!validation.success) {
			const errors = validation.error.errors.map((err) => err.message).join(", ")
			return NextResponse.json({ success: false, message: `Données invalides: ${errors}` }, { status: 400 })
		}

		const { username, email, avatar, language, theme, password } = validation.data

		// 3. Vérifications d'unicité
		if (username && username !== user.username) {
			const existingUser = db.prepare("SELECT id FROM users WHERE username = ? AND id != ?").get(username, user.id)
			if (existingUser) {
				return NextResponse.json({ success: false, message: "Ce nom d'utilisateur est déjà utilisé" }, { status: 400 })
			}
		}

		const timestamp = getCurrentTimestamp()

		// 4. Mise à jour en base de données
		try {
			if (password && password.length > 0) {
				// Mettre à jour avec le nouveau mot de passe
				const passwordHash = hashPassword(password)
				db.prepare(
					`
          UPDATE users
          SET username = ?, email = ?, avatar = ?, language = ?, theme = ?, password_hash = ?, updated_at = ?
          WHERE id = ?
        `,
				).run(username, email, avatar || "", language, theme, passwordHash, timestamp, user.id)
			} else {
				// Mettre à jour sans changer le mot de passe
				db.prepare(
					`
          UPDATE users
          SET username = ?, email = ?, avatar = ?, language = ?, theme = ?, updated_at = ?
          WHERE id = ?
        `,
				).run(username, email, avatar || "", language, theme, timestamp, user.id)
			}

			return NextResponse.json({
				success: true,
				message: "Profil mis à jour avec succès",
			})
		} catch (dbError: any) {
			console.error("Erreur lors de la mise à jour en base de données:", dbError)
			return NextResponse.json({ success: false, message: `Erreur de base de données: ${dbError.message}` }, { status: 500 })
		}
	} catch (error: any) {
		console.error("Erreur inattendue lors de la mise à jour du profil:", error)
		return NextResponse.json({ success: false, message: error.message || "Une erreur serveur s'est produite" }, { status: 500 })
	}
}