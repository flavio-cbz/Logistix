/**
 * API Endpoint: GET /api/v1/observability/db-correlation
 * 
 * Récupère les statistiques et métriques de corrélation DB
 */

import { NextRequest, NextResponse } from 'next/server';
import { dbCorrelationTracker } from '@/lib/services/observability/db-correlation-tracker';
import { requireAdmin } from '@/lib/middleware/auth-middleware';

export async function GET(req: NextRequest) {
  // Vérifier les permissions admin
  const authResult = await requireAdmin(req);
  if (authResult) {
    return authResult;
  }

  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
  const traceId = searchParams.get('traceId');

    // Actions disponibles
    if (action === 'slow-queries') {
      const slowQueries = dbCorrelationTracker.getSlowQueries();
      return NextResponse.json({
        success: true,
        data: {
          queries: slowQueries,
          count: slowQueries.length,
        },
      });
    }

    if (action === 'by-trace' && traceId) {
      const queries = dbCorrelationTracker.getQueriesByTrace(traceId);
      return NextResponse.json({
        success: true,
        data: {
          traceId,
          queries,
          count: queries.length,
        },
      });
    }

    if (action === 'config') {
      const config = (dbCorrelationTracker as any).getConfig ? (dbCorrelationTracker as any).getConfig() : { enabled: false };
      return NextResponse.json({ success: true, data: { config } });
    }

    // Par défaut : statistiques complètes
    const stats = dbCorrelationTracker.getStats();

    return NextResponse.json({
      success: true,
      data: { stats },
    });
  } catch (error) {
    console.error('[Observability API] Error fetching DB correlation stats:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch DB correlation stats',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * API Endpoint: DELETE /api/v1/observability/db-correlation
 * 
 * Réinitialise les statistiques de corrélation DB
 */
export async function DELETE(req: NextRequest) {
  // Vérifier les permissions admin
  const authResult = await requireAdmin(req);
  if (authResult) {
    return authResult;
  }

  try {
    if ((dbCorrelationTracker as any).reset) {
      (dbCorrelationTracker as any).reset();
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'DB correlation stats cleared successfully',
      },
    });
  } catch (error) {
    console.error('[Observability API] Error clearing DB correlation stats:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to clear DB correlation stats',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * API Endpoint: PATCH /api/v1/observability/db-correlation
 * 
 * Met à jour la configuration du tracker
 */
export async function PATCH(req: NextRequest) {
  // Vérifier les permissions admin
  const authResult = await requireAdmin(req);
  if (authResult) {
    return authResult;
  }

  try {
    const body = await req.json();

    if ((dbCorrelationTracker as any).updateConfig) {
      (dbCorrelationTracker as any).updateConfig(body);
    }
    const updatedConfig = (dbCorrelationTracker as any).getConfig ? (dbCorrelationTracker as any).getConfig() : { enabled: false };

    return NextResponse.json({
      success: true,
      data: {
        message: 'DB correlation config updated successfully',
        config: updatedConfig,
      },
    });
  } catch (error) {
    console.error('[Observability API] Error updating DB correlation config:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update DB correlation config',
        },
      },
      { status: 500 }
    );
  }
}
