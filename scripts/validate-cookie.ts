#!/usr/bin/env ts-node

/**
 * scripts/validate-cookie.ts
 *
 * Script léger pour valider un cookie/session Vinted fourni en argument ou via la variable d'environnement TEST_COOKIE.
 * Utilise le service centralisé lib/services/auth/vinted-session-validator.ts
 *
 * Sortie: JSON sur stdout avec { success: boolean, valid: boolean, refreshed?: boolean, details?: any }
 */

async function main() {
  const cookieArg = process.argv[2]!
  const envCookie = process.env['TEST_COOKIE']! || process.env['VINTED_SESSION']!
  const cookie = cookieArg || envCookie

  if (!cookie || typeof cookie !== 'string' || cookie.length < 10) {
    console.error(JSON.stringify({ success: false, error: 'Cookie Vinted manquant ou trop court' }))
    process.exit(2)
  }

  try {
    const mod = await import('../lib/services/auth/vinted-session-validator')
    const testVintedSessionCookie = (mod as any).testVintedSessionCookie ?? (mod as any).default ?? mod

    const result = await testVintedSessionCookie(cookie)

    if (result && result.success && result.valid) {
      console.log(JSON.stringify({ success: true, valid: true, refreshed: !!result.refreshed, details: result.details }))
      process.exit(0)
    }

    console.error(JSON.stringify({ success: false, valid: false, _message: result?.message, details: result?.details }))
    process.exit(1)
  } catch (err: any) {
    console.error(JSON.stringify({ success: false, error: err?.message || String(err) }))
    process.exit(3)
  }
}

if (require.main === module) {
  main()
}