import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/services/auth";
import { ApiError, createApiErrorResponse } from "@/lib/utils/validation";
import { logger } from "@/lib/utils/logging/logger";
import { z } from "zod";
import axios from "axios";
import { SuggestionsResponseSchema } from "@/lib/validations/vinted-market-analysis-schemas";

// --- Schémas de validation ---
const TokenTestSchema = z.object({
    sessionCookie: z.string().min(10, "Le cookie de session doit contenir au moins 10 caractères"),
});

// --- Constantes ---
const VINTED_API_BASE = 'https://www.vinted.fr/api/v2';
const TEST_ENDPOINT = `${VINTED_API_BASE}/items/suggestions`;

// POST /api/v1/market-analysis/token/test : Tester un cookie de session Vinted
export async function POST(req: NextRequest) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json(
                createApiErrorResponse(new ApiError("Authentification requise", 401, "AUTH_REQUIRED")),
                { status: 401 }
            );
        }

        let requestBody: unknown;
        try {
            requestBody = await req.json();
        } catch (e) {
            return NextResponse.json(
                createApiErrorResponse(new ApiError("Corps de requête JSON invalide", 400, "INVALID_JSON")),
                { status: 400 }
            );
        }

        const validationResult = TokenTestSchema.safeParse(requestBody);
        if (!validationResult.success) {
            const errors = Object.entries(validationResult.error.flatten().fieldErrors).flatMap(([field, messages]) =>
                (messages || []).map(message => ({ field, message, code: 'INVALID_INPUT' }))
            );
            return NextResponse.json(
                createApiErrorResponse(new ApiError("Cookie de session invalide", 400, "VALIDATION_ERROR", errors)),
                { status: 400 }
            );
        }

        const { sessionCookie } = validationResult.data;

        // Tester le cookie de session avec l'API Vinted
        try {
            const testResult = await testVintedSessionCookie(sessionCookie);

            if (testResult.success) {
                logger.info(`[TokenTest] Cookie de session Vinted testé avec succès pour l'utilisateur ${user.id}`);

                return NextResponse.json({
                    success: true,
                    message: "Cookie de session Vinted valide",
                    details: {
                        testedAt: new Date().toISOString(),
                        apiResponse: testResult.details,
                        suggestions: testResult.suggestions?.length || 0,
                    },
                }, { status: 200 });
            } else {
                return NextResponse.json(
                    createApiErrorResponse(new ApiError(
                        testResult.message || "Cookie de session Vinted invalide",
                        400,
                        "INVALID_SESSION_COOKIE"
                    )),
                    { status: 400 }
                );
            }

        } catch (error: any) {
            logger.error(`[TokenTest] Erreur lors du test du cookie:`, error);

            if (error.response?.status === 401 || error.response?.status === 403) {
                return NextResponse.json(
                    createApiErrorResponse(new ApiError(
                        "Cookie de session non autorisé ou expiré",
                        401,
                        "UNAUTHORIZED_SESSION"
                    )),
                    { status: 401 }
                );
            }

            if (error.response?.status === 429) {
                return NextResponse.json(
                    createApiErrorResponse(new ApiError(
                        "Trop de tentatives de test. Réessayez dans quelques minutes.",
                        429,
                        "RATE_LIMITED"
                    )),
                    { status: 429 }
                );
            }

            return NextResponse.json(
                createApiErrorResponse(new ApiError(
                    "Erreur lors du test du cookie de session",
                    500,
                    "SESSION_TEST_ERROR"
                )),
                { status: 500 }
            );
        }

    } catch (error: any) {
        logger.error(`[TokenTest] Erreur générale:`, error);

        if (error instanceof ApiError) {
            return NextResponse.json(createApiErrorResponse(error), { status: error.statusCode });
        }

        return NextResponse.json(
            createApiErrorResponse(new ApiError("Erreur interne du serveur", 500, "INTERNAL_ERROR")),
            { status: 500 }
        );
    }
}

/**
 * Détecte le type de token et crée les headers appropriés
 */
function createVintedHeaders(token: string): Record<string, string> {
    const baseHeaders = {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
        'Referer': 'https://www.vinted.fr/',
        'Origin': 'https://www.vinted.fr'
    };

    // Détecter si c'est un JWT token (Bearer) ou un cookie de session
    if (token.startsWith('eyJ')) {
        // C'est un JWT token, utiliser Authorization Bearer
        return {
            ...baseHeaders,
            'Authorization': `Bearer ${token}`
        };
    } else {
        // C'est probablement un cookie de session
        return {
            ...baseHeaders,
            'Cookie': `access_token_web=${token}`
        };
    }
}

/**
 * Teste un token Vinted (Bearer ou cookie de session) en faisant un appel à l'API
 */
async function testVintedSessionCookie(token: string): Promise<{
    success: boolean
    message?: string
    details?: any
    suggestions?: any[]
}> {
    try {
        const headers = createVintedHeaders(token);

        // Faire un appel test simple à l'API Vinted avec le cookie de session
        const testParams = new URLSearchParams({
            title: 'test',
            catalog_id: '1904', // Chaussures femmes
            description: '',
            'photo_ids[]': '',
            upload_session_id: '',
        });

        logger.info(`[SessionTest] Test du cookie avec l'endpoint: ${TEST_ENDPOINT}`);

        const response = await axios.get(`${TEST_ENDPOINT}?${testParams.toString()}`, {
            headers,
            timeout: 15000,
            validateStatus: (status) => status < 500, // Ne pas rejeter pour les erreurs 4xx
        });

        logger.info(`[SessionTest] Réponse reçue: status ${response.status}`);

        if (response.status === 200) {
            // Validation sûre avec Zod
            const parsed = SuggestionsResponseSchema.safeParse(response.data);
            const suggestions = parsed.success ? parsed.data.brands : [];

            return {
                success: true,
                message: "Cookie de session valide",
                details: {
                    status: response.status,
                    suggestionsCount: suggestions.length,
                    firstSuggestion: suggestions[0]?.title || null,
                },
                suggestions,
            };
        } else if (response.status === 401 || response.status === 403) {
            return {
                success: false,
                message: "Cookie de session expiré ou invalide",
                details: { status: response.status, data: response.data },
            };
        } else {
            return {
                success: false,
                message: `Erreur API Vinted (status: ${response.status})`,
                details: { status: response.status, data: response.data },
            };
        }

    } catch (error: any) {
        logger.warn(`[SessionTest] Échec du test:`, {
            status: error.response?.status,
            message: error.message,
            data: error.response?.data,
        });

        if (error.response?.status === 401 || error.response?.status === 403) {
            return {
                success: false,
                message: "Cookie de session non autorisé",
                details: { status: error.response.status, error: error.response.data },
            };
        }

        if (error.response?.status === 429) {
            return {
                success: false,
                message: "Trop de requêtes, réessayez plus tard",
                details: { status: error.response.status },
            };
        }

        return {
            success: false,
            message: "Erreur de connexion à l'API Vinted",
            details: { error: error.message },
        };
    }
}