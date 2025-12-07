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
function toErrorResponse(error: any): NextResponse {
    const statusCode = error.statusCode || 500;
    const response = createErrorResponse(
        error.code || 'INTERNAL_ERROR',
        error.message || 'Une erreur est survenue',
        error.context || {},
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
