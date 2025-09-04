import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST() {
  try {
    // Supprimer le cookie côté client en envoyant un Set-Cookie expiré
    const response = NextResponse.json({
      success: true,
      _message: "Déconnexion réussie"
    });

    response.cookies.set("session_id", "", {
      httpOnly: true,
      secure: (process.env as any)['NODE_ENV'] === "production",
      expires: new Date(0),
      maxAge: 0,
      path: "/",
      sameSite: (process.env as any)['NODE_ENV'] === "production" ? 'none' : 'lax',
    });

    // Supprimer aussi côté serveur (store SSR)
    const cookieStore = await cookies();
    cookieStore.delete('session_id');

    return response;
  } catch (error) {
    console.error("Erreur dans l'API logout:", error)
    return NextResponse.json(
      { success: false, _message: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}