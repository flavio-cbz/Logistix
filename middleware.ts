import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname

  // Bloquer l'accès aux routes de débogage en production
  const isDebugRoute = path.startsWith("/debug")
  if (isDebugRoute && process.env.NODE_ENV === "production") {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  const sessionId = req.cookies.get("session_id")?.value
  const isAuthenticated = !!sessionId

  const protectedRoutes = new Set([
    "/dashboard",
    "/profile",
    "/produits",
    "/parcelles",
    "/statistiques",
    "/admin",
    "/vinted-scraper", // Ajout de la nouvelle route
  ])
  const publicRoutes = new Set(["/login", "/signup"])

  const isApiRoute = path.startsWith("/api/")
  if (isApiRoute) {
    return NextResponse.next()
  }

  const isProtectedRoute = protectedRoutes.has(path) || Array.from(protectedRoutes).some(route => path.startsWith(`${route}/`));
  const isPublicRoute = publicRoutes.has(path) || Array.from(publicRoutes).some(route => path.startsWith(`${route}/`));

  const redirectCount = Number.parseInt(req.headers.get("x-redirect-count") || "0")

  // Fonction utilitaire pour la redirection
  const redirectTo = (targetPath: string) => {
    if (redirectCount > 2) {
      const response = NextResponse.redirect(new URL("/login", req.url))
      response.cookies.delete("session_id")
      return response
    }
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = targetPath
    const response = NextResponse.redirect(redirectUrl)
    response.headers.set("x-redirect-count", (redirectCount + 1).toString())
    return response
  }

  if (!isAuthenticated && isProtectedRoute) {
    return redirectTo("/login")
  }

  if (isAuthenticated && isPublicRoute) {
    return redirectTo("/dashboard")
  }

  if (path === "/") {
    return redirectTo(isAuthenticated ? "/dashboard" : "/login")
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
    "/vinted-scraper/:path*", // Ajout de la nouvelle route
  ],
}