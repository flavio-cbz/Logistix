import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  // Réduire les logs
  const path = req.nextUrl.pathname

  // Vérifier si l'URL actuelle est une route de débogage
  const isDebugRoute = path.startsWith("/debug")

  // Bloquer l'accès aux routes de débogage en production
  if (isDebugRoute && process.env.NODE_ENV === "production") {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  // Vérifier si l'utilisateur est connecté via le cookie de session
  const sessionId = req.cookies.get("session_id")?.value
  const isAuthenticated = !!sessionId

  // Routes protégées qui nécessitent une authentification
  const protectedRoutes = ["/dashboard", "/profile", "/produits", "/parcelles", "/statistiques", "/admin"]

  // Routes publiques accessibles uniquement si non connecté
  const publicRoutes = ["/login", "/signup"]

  // Routes toujours accessibles
  const openRoutes = ["/api"]

  // Vérifier si l'URL actuelle est une route API
  const isApiRoute = path.startsWith("/api/")
  if (isApiRoute) {
    return NextResponse.next()
  }

  // Vérifier si l'URL actuelle est une route protégée
  const isProtectedRoute = protectedRoutes.some((route) => path === route || path.startsWith(`${route}/`))

  // Vérifier si l'URL actuelle est une route publique
  const isPublicRoute = publicRoutes.some((route) => path === route || path.startsWith(`${route}/`))

  // Si l'utilisateur n'est pas connecté et essaie d'accéder à une page protégée
  if (!isAuthenticated && isProtectedRoute) {
    // Vérifier si nous sommes déjà en train de rediriger pour éviter les boucles
    const redirectCount = Number.parseInt(req.headers.get("x-redirect-count") || "0")
    if (redirectCount > 2) {
      // Si trop de redirections, effacer les cookies et rediriger vers la page de connexion
      const response = NextResponse.redirect(new URL("/login", req.url))
      response.cookies.delete("session_id")
      return response
    }

    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = "/login"
    redirectUrl.searchParams.set("redirect", path)
    const response = NextResponse.redirect(redirectUrl)
    response.headers.set("x-redirect-count", (redirectCount + 1).toString())
    return response
  }

  // Si l'utilisateur est connecté et essaie d'accéder à la page de connexion ou d'inscription
  if (isAuthenticated && isPublicRoute) {
    // Vérifier si nous sommes déjà en train de rediriger pour éviter les boucles
    const redirectCount = Number.parseInt(req.headers.get("x-redirect-count") || "0")
    if (redirectCount > 2) {
      // Si trop de redirections, effacer les cookies et rediriger vers la page de connexion
      const response = NextResponse.redirect(new URL("/login", req.url))
      response.cookies.delete("session_id")
      return response
    }

    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = "/dashboard"
    const response = NextResponse.redirect(redirectUrl)
    response.headers.set("x-redirect-count", (redirectCount + 1).toString())
    return response
  }

  // Si l'utilisateur accède à la racine, rediriger vers le tableau de bord s'il est connecté, sinon vers la page de connexion
  if (path === "/") {
    // Vérifier si nous sommes déjà en train de rediriger pour éviter les boucles
    const redirectCount = Number.parseInt(req.headers.get("x-redirect-count") || "0")
    if (redirectCount > 2) {
      // Si trop de redirections, effacer les cookies et rediriger vers la page de connexion
      const response = NextResponse.redirect(new URL("/login", req.url))
      response.cookies.delete("session_id")
      return response
    }

    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = isAuthenticated ? "/dashboard" : "/login"
    const response = NextResponse.redirect(redirectUrl)
    response.headers.set("x-redirect-count", (redirectCount + 1).toString())
    return response
  }

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
    "/debug/:path*",
    "/api/:path*",
  ],
}

