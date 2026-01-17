/**
 * API Endpoint: GET /api/v1/metrics/http
 * 
 * Expose les métriques HTTP agrégées (requêtes par endpoint, latence, etc.)
 * Protégé - Admin uniquement.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth-middleware';
import { getHttpMetricsStats } from '@/lib/middleware/http-metrics';
import { createErrorResponse } from '@/lib/middleware/error-handling';

/**
 * Helper pour convertir une erreur en NextResponse HTTP
 */
function toErrorResponse(error: unknown): NextResponse {
    const err = error as { statusCode?: number; code?: string; message?: string; context?: Record<string, unknown> };
    const statusCode = err.statusCode || 500;
    const response = createErrorResponse(
        err.code || 'INTERNAL_ERROR',
        err.message || 'Une erreur est survenue',
        err.context || {},
    );
    return NextResponse.json(response, { status: statusCode });
}

/**
 * GET /api/v1/metrics/http
 * Récupère les statistiques HTTP agrégées
 */
export async function GET(req: NextRequest) {
    try {
        // Vérifier que l'utilisateur est admin
        await requireAdmin(req);

        const stats = getHttpMetricsStats();

        return NextResponse.json({
            success: true,
            data: {
                stats,
                timestamp: new Date().toISOString(),
            },
        });
    } catch (error) {
        return toErrorResponse(error);
    }
}
