/**
 * API Endpoint: GET /api/v1/metrics/performance
 * 
 * Expose les métriques de performance des use-cases.
 * Protégé - Admin uniquement.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth-middleware';
import { getPerformanceMetrics, resetPerformanceMetrics } from '@/lib/monitoring/performance-metrics';
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
 * GET /api/v1/metrics/performance
 * Récupère toutes les statistiques de performance
 */
export async function GET(req: NextRequest) {
  try {
    // Vérifier que l'utilisateur est admin
    await requireAdmin(req);

    const metrics = getPerformanceMetrics();

    return NextResponse.json({
      success: true,
      data: {
        metrics,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/**
 * DELETE /api/v1/metrics/performance
 * Reset les métriques de performance (admin uniquement)
 */
export async function DELETE(req: NextRequest) {
  try {
    // Vérifier que l'utilisateur est admin
    await requireAdmin(req);

    // Récupérer le paramètre optionnel 'operation'
    const { searchParams } = new URL(req.url);
    const operation = searchParams.get('operation') || undefined;

    resetPerformanceMetrics(operation);

    return NextResponse.json({
      success: true,
      data: {
        message: operation
          ? `Métriques réinitialisées pour: ${operation}`
          : 'Toutes les métriques ont été réinitialisées',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
