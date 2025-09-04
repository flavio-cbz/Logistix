import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

/**
 * POST /api/v1/vinted/test-token
 *
 * Body: { token: string }
 *
 * Utilise le service centralisé de validation de session Vinted (vinted-session-validator)
 * pour effectuer : validation, refresh et fallback HTTP en un seul appel.
 *
 * Réponses:
 * - 200 { valid: true, refreshed?: boolean, details?: any }
 * - 400 { valid: false, error: string }
 * - 500 { error: string }
 */

const bodySchema = z.object({
  token: z.string().min(10, "token too short"),
})

export async function POST(req: NextRequest) {
  try {
    const json = await req.json().catch(() => ({}))
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ valid: false, error: "Payload invalide" }, { status: 400 })
    }

    const { token } = parsed.data

    try {
      // Import dynamique du validateur centralisé
      const mod = await import('@/lib/services/auth/vinted-session-validator')
      const testVintedSessionCookie = (mod as any).testVintedSessionCookie ?? (mod as any).default ?? mod

      const result = await testVintedSessionCookie(token)

      if (result.success && result.valid) {
        return NextResponse.json(
          { valid: true, refreshed: !!result.refreshed, details: result.details ?? null },
          { status: 200 }
        )
      }

      // Validation échouée — renvoyer message utilisateur-friendly sans exposer de secrets
      return NextResponse.json(
        { valid: false, error: result.message || "Token/cookie Vinted invalide ou expiré" },
        { status: 400 }
      )
    } catch (err: any) {
      // Si le validateur échoue pour une raison inattendue, renvoyons 500
      return NextResponse.json({ error: err?.message ?? "Erreur interne lors de la validation" }, { status: 500 })
    }
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Erreur interne" }, { status: 500 })
  }
}