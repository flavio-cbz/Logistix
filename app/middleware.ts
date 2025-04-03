import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  console.log("Middleware exécuté pour:", req.nextUrl.pathname)

  // Vérifier si l'utilisateur est connecté via le cookie de session
  const sessionId = req.cookies.get("session_id")?.value
  console.log("Cookie de session trouvé:", sessionId)
  const isAuthenticated = !!sessionId

  // Routes protégées qui nécessitent une authentification
  const protectedRoutes = ["/dashboard", "/profile", "/produits", "/parcelles", "/statistiques", "/admin"]

  // Routes publiques accessibles uniquement si non connecté
  const publicRoutes = ["/login", "/signup"]

  // Routes toujours accessibles
  const openRoutes = ["/debug", "/setup-help", "/api"]

  // URL actuelle
  const path = req.nextUrl.pathname

  // Vérifier si l'URL actuelle est une route API
  const isApiRoute = path.startsWith("/api/")
  if (isApiRoute) {
    console.log("Route API détectée, pas de redirection")
    return NextResponse.next()
  }

  // Vérifier si l'URL actuelle est une route protégée
  const isProtectedRoute = protectedRoutes.some((route) => path === route || path.startsWith(`${route}/`))

  // Vérifier si l'URL actuelle est une route publique
  const isPublicRoute = publicRoutes.some((route) => path === route || path.startsWith(`${route}/`))

  // Vérifier si l'URL actuelle est une route ouverte
  const isOpenRoute = openRoutes.some((route) => path === route || path.startsWith(`${route}/`))

  // Si c'est une route ouverte, permettre l'accès sans restriction
  if (isOpenRoute) {
    console.log("Accès autorisé à une route ouverte")
    return NextResponse.next()
  }

  // Si l'utilisateur n'est pas connecté et essaie d'accéder à une page protégée
  if (!isAuthenticated && isProtectedRoute) {
    console.log("Redirection vers /login car non authentifié")
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = "/login"
    redirectUrl.searchParams.set("redirect", path)
    return NextResponse.redirect(redirectUrl)
  }

  // Si l'utilisateur est connecté et essaie d'accéder à la page de connexion ou d'inscription
  if (isAuthenticated && isPublicRoute) {
    console.log("Redirection vers /dashboard car déjà authentifié")
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = "/dashboard"
    return NextResponse.redirect(redirectUrl)
  }

  // Si l'utilisateur accède à la racine, rediriger vers le tableau de bord s'il est connecté, sinon vers la page de connexion
  if (path === "/") {
    console.log("Redirection depuis la racine")
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = isAuthenticated ? "/dashboard" : "/login"
    return NextResponse.redirect(redirectUrl)
  }

  console.log("Accès autorisé")
  return NextResponse.next()
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profile/:path*",
    "/produits/:path*",
    "/parcelles/:path*",
    "/statistiques/:path*",
    "/admin/:path*",
    "/login",
    "/signup",
    "/",
    "/debug",
    "/setup-help",
    "/api/:path*",
  ],
}

