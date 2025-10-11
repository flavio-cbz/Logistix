import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { edgeLogger as logger } from "@/lib/utils/logging/edge-logger"
import { getErrorMessage } from '@/lib/utils/error-utils'
import { getCookieName, isProduction } from '@/lib/config/edge-config'

// =============================================================================
// TYPES ET CONSTANTES
// =============================================================================

interface SessionValidationResult {
  isValid: boolean;
  error?: string;
  responseTime?: number;
}

interface MiddlewareContext {
  requestId: string;
  path: string;
  method: string;
  userAgent?: string | undefined;
  ip?: string;
  startTime: number;
}

const PROTECTED_ROUTES = new Set([
  "/dashboard",
  "/profile",
  "/produits",
  "/parcelles",
  "/statistiques",
  "/admin",
  "/vinted-scraper",
])

const PUBLIC_ROUTES = new Set([
  "/login", 
  "/signup"
])

const MAX_REDIRECT_COUNT = 3

// =============================================================================
// FONCTIONS UTILITAIRES
// =============================================================================

/**
 * Génère un ID unique pour la requête
 */
function generateRequestId(): string {
  return `mid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Crée le contexte de middleware pour le logging
 */
function createMiddlewareContext(request: NextRequest): MiddlewareContext {
  return {
    requestId: generateRequestId(),
    path: request.nextUrl.pathname,
    method: request.method,
    userAgent: request.headers.get('user-agent')?.substring(0, 100),
    ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
    startTime: Date.now(),
  }
}

/**
 * Vérifie si une route est protégée
 */
function isProtectedRoute(path: string): boolean {
  return PROTECTED_ROUTES.has(path) || 
         Array.from(PROTECTED_ROUTES).some(route => path.startsWith(`${route}/`))
}

/**
 * Vérifie si une route est publique
 */
function isPublicRoute(path: string): boolean {
  return PUBLIC_ROUTES.has(path) || 
         Array.from(PUBLIC_ROUTES).some(route => path.startsWith(`${route}/`))
}

/**
 * Fonction pour vérifier la validité de la session via un appel API interne
 */
async function validateSession(request: NextRequest, context: MiddlewareContext): Promise<SessionValidationResult> {
  const startTime = Date.now()
  const cookieName = getCookieName()
  
  try {
    logger.debug('Début de validation de session', {
      requestId: context.requestId,
      path: context.path,
      cookieName,
    })
    
    const cookie = request.cookies.get(cookieName)
    
    logger.debug('Cookie de session trouvé dans la requête', {
      requestId: context.requestId,
      path: context.path,
      cookiePresent: !!cookie,
      cookieName,
      cookieValuePresent: !!cookie?.value,
      cookieValueLength: cookie?.value?.length,
    })
    
    if (!cookie) {
      logger.debug('Aucun cookie de session trouvé', {
        requestId: context.requestId,
        path: context.path,
        cookieName,
      })
      return { isValid: false, responseTime: Date.now() - startTime }
    }

    // Validation du format du cookie
    if (!cookie.value || cookie.value.trim().length === 0) {
      logger.warn('Cookie de session vide ou invalide', {
        requestId: context.requestId,
        path: context.path,
        cookieName,
      })
      return { isValid: false, responseTime: Date.now() - startTime }
    }

    // Construction de l'URL absolue pour l'appel fetch (utilise le nouvel endpoint session-check)
    const url = new URL('/api/v1/auth/session-check', request.url) // Force update

    // Log pour déboguer l'envoi du cookie
    logger.debug('Envoi de la requête de validation de session', {
      cookieName: cookie.name,
      cookieValuePresent: !!cookie.value,
      cookieValueLength: cookie.value?.length,
    })

    const response = await fetch(url, {
      headers: {
        'Cookie': `${cookie.name}=${cookie.value}`,
        'User-Agent': context.userAgent || 'LogistiX-Middleware',
        'X-Request-ID': context.requestId,
      },
      // Timeout pour éviter les blocages
      signal: AbortSignal.timeout(5000),
    })

    const responseTime = Date.now() - startTime
    const isValid = response.ok

    if (isValid) {
      logger.debug('Validation de session réussie', {
        requestId: context.requestId,
        path: context.path,
        responseTime,
      })
    } else {
      logger.warn('Échec de validation de session', {
        requestId: context.requestId,
        path: context.path,
        status: response.status,
        responseTime,
      })
    }

    return { isValid, responseTime }
    
  } catch (error: unknown) {
    const responseTime = Date.now() - startTime
    const errorMessage = getErrorMessage(error)
    
    logger.error('Erreur lors de la validation de la session', {
      requestId: context.requestId,
      path: context.path,
      error: errorMessage,
      responseTime,
    })
    
    return { 
      isValid: false, 
      error: errorMessage,
      responseTime 
    }
  }
}

/**
 * Gère les redirections avec protection contre les boucles
 */
function createRedirectResponse(
  targetPath: string, 
  request: NextRequest, 
  context: MiddlewareContext
): NextResponse {
  // Utiliser un cookie pour suivre le nombre de redirections au lieu d'en-têtes
  // Cela est plus fiable car les en-têtes peuvent être perdus lors des redirections
  const redirectCookieName = `redirect_count_${context.requestId}`
  const redirectCookie = request.cookies.get(redirectCookieName)
  const redirectCount = redirectCookie ? Number.parseInt(redirectCookie.value) : 0
  const cookieName = getCookieName()

  if (redirectCount >= MAX_REDIRECT_COUNT) {
    logger.warn('Boucle de redirection détectée - nettoyage du cookie', {
      requestId: context.requestId,
      path: context.path,
      targetPath,
      redirectCount,
    })
    
    const response = NextResponse.redirect(new URL("/login", request.url))
    response.cookies.delete(cookieName)
    response.cookies.delete(redirectCookieName)
    response.headers.set("x-redirect-loop-broken", "true")
    response.headers.set("x-request-id", context.requestId)
    response.headers.set("x-trace-id", context.requestId)
    return response
  }

  logger.debug('Redirection initiée', {
    requestId: context.requestId,
    from: context.path,
    to: targetPath,
    redirectCount: redirectCount + 1,
  })

  const response = NextResponse.redirect(new URL(targetPath, request.url))
  response.cookies.set(redirectCookieName, (redirectCount + 1).toString(), {
    maxAge: 60, // Expire après 1 minute
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'lax',
  })
  response.headers.set("x-request-id", context.requestId)
  response.headers.set("x-trace-id", context.requestId)
  return response
}

// =============================================================================
// MIDDLEWARE PRINCIPAL
// =============================================================================

export async function middleware(req: NextRequest) {
  const context = createMiddlewareContext(req)
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-request-id', context.requestId)
  requestHeaders.set('x-trace-id', context.requestId)
  
  try {
    logger.debug('Début du traitement middleware', {
      requestId: context.requestId,
      path: context.path,
      method: context.method,
      userAgent: context.userAgent,
      ip: context.ip,
      runtimeVersion: 'edge-runtime',
      runtimeAbi: 'not-available',
    })

    // Bloquer l'accès aux routes de débogage en production
    const isDebugRoute = context.path.startsWith("/debug")
    if (isDebugRoute && isProduction() && process.env['DEBUG_ROUTES_ENABLED'] !== "true") {
      logger.warn('Tentative d\'accès aux routes de debug en production', {
        requestId: context.requestId,
        path: context.path,
        ip: context.ip,
      })
      return createRedirectResponse("/login", req, context)
    }

    // Les routes API sont exclues de la logique de redirection UI
    const isApiRoute = context.path.startsWith("/api/")
    if (isApiRoute) {
      logger.debug('Route API détectée - passage direct', {
        requestId: context.requestId,
        path: context.path,
      })
      
      // Gestion CORS pour toutes les routes API
      const origin = req.headers.get('origin')
      if (req.method === "OPTIONS") {
        // Préflight CORS
        const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-request-id, x-trace-id',
    'Access-Control-Max-Age': '86400',
          'x-request-id': context.requestId,
          'x-trace-id': context.requestId,
        }
        if (origin) {
          headers['Access-Control-Allow-Origin'] = origin
          headers['Vary'] = 'Origin'
          headers['Access-Control-Allow-Credentials'] = 'true'
        } else {
          headers['Access-Control-Allow-Origin'] = '*'
        }
        return new NextResponse(null, { status: 200, headers })
      }

      const response = NextResponse.next({ request: { headers: requestHeaders } })
      if (origin) {
        response.headers.set('Access-Control-Allow-Origin', origin)
        response.headers.set('Vary', 'Origin')
        response.headers.set('Access-Control-Allow-Credentials', 'true')
      } else {
        response.headers.set('Access-Control-Allow-Origin', '*')
      }
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-request-id, x-trace-id')
  response.headers.set('Access-Control-Expose-Headers', 'Set-Cookie, x-request-id, x-trace-id')
      response.headers.set("x-request-id", context.requestId)
      response.headers.set("x-trace-id", context.requestId)
      return response
    }

    // Validation de la session
    const sessionResult = await validateSession(req, context)
    const isAuthenticated = sessionResult.isValid

    const isProtected = isProtectedRoute(context.path)
    const isPublic = isPublicRoute(context.path)

    // Gestion des routes protégées sans authentification
    if (!isAuthenticated && isProtected) {
      logger.info('Accès refusé à route protégée - redirection vers login', {
        requestId: context.requestId,
        path: context.path,
        ip: context.ip,
      })
      return createRedirectResponse("/login", req, context)
    }

    // Gestion des routes publiques avec authentification
    if (isAuthenticated && isPublic) {
      logger.debug('Utilisateur authentifié sur route publique - redirection vers dashboard', {
        requestId: context.requestId,
        path: context.path,
      })
      return createRedirectResponse("/dashboard", req, context)
    }

    // Gestion de la route racine
    if (context.path === "/") {
      const targetPath = isAuthenticated ? "/dashboard" : "/login"
      logger.debug('Route racine - redirection appropriée', {
        requestId: context.requestId,
        targetPath,
        isAuthenticated,
      })
      return createRedirectResponse(targetPath, req, context)
    }

    const responseTime = Date.now() - context.startTime
    logger.debug('Middleware terminé - passage de la requête', {
      requestId: context.requestId,
      path: context.path,
      responseTime,
    })

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set("x-request-id", context.requestId)
  response.headers.set("x-trace-id", context.requestId)
    return response

  } catch (error: unknown) {
    const responseTime = Date.now() - context.startTime
    const errorMessage = getErrorMessage(error)
    
    logger.error('Erreur critique dans le middleware', {
      requestId: context.requestId,
      path: context.path,
      error: errorMessage,
      responseTime,
    })

    // En cas d'erreur critique, on laisse passer la requête
  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set("x-request-id", context.requestId)
  response.headers.set("x-trace-id", context.requestId)
  response.headers.set("x-middleware-error", "true")
    return response
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}