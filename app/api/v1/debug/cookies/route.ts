import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET(request: Request) {
  try {
    // Récupérer tous les cookies
    const allCookies = cookies().getAll()

    // Créer une version sécurisée pour l'affichage
    const safeCookies = allCookies.map((cookie) => ({
      name: cookie.name,
      value: cookie.name === "session_id" ? `${cookie.value.substring(0, 5)}...` : cookie.value,
    }))

    // Construire l'objet des en-têtes manuellement
    const headers: { [key: string]: string } = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    // Définir un nouveau cookie de test
    cookies().set({
      name: "test_cookie",
      value: "test_value",
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: "/",
      maxAge: 60 * 60, // 1 heure
      sameSite: "lax",
    })

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      cookies: safeCookies,
      headers: headers,
      message: "Un cookie de test a été défini. Rafraîchissez pour vérifier s'il apparaît.",
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
