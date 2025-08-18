import { NextRequest, NextResponse } from 'next/server';
import { tokenRefreshScheduler } from '@/lib/services/scheduler';
import { getSessionUser } from '@/lib/services/auth';
import { ApiError, createApiErrorResponse } from '@/lib/utils/validation';
import { getVintedConfig } from '@/lib/config/vinted-config';

/**
 * GET /api/v1/vinted/scheduler
 * Retourne l'état du scheduler de rafraîchissement des tokens
 */
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        createApiErrorResponse(new ApiError("Authentification requise", 401, "AUTH_REQUIRED")),
        { status: 401 }
      );
    }

    const config = getVintedConfig();
    return NextResponse.json({
      isActive: tokenRefreshScheduler.isActive,
      autoRefreshEnabled: config.autoRefreshEnabled,
      intervalMinutes: config.refreshIntervalMinutes,
    });
  } catch (error) {
    return NextResponse.json(
      createApiErrorResponse(new ApiError("Erreur interne", 500, "INTERNAL_ERROR")),
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/vinted/scheduler
 * Contrôle le scheduler (start/stop/restart)
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        createApiErrorResponse(new ApiError("Authentification requise", 401, "AUTH_REQUIRED")),
        { status: 401 }
      );
    }

    const { action, intervalMinutes } = await req.json();

    switch (action) {
      case 'start':
        tokenRefreshScheduler.start(intervalMinutes);
        return NextResponse.json({ success: true, message: 'Scheduler démarré' });
      
      case 'stop':
        tokenRefreshScheduler.stop();
        return NextResponse.json({ success: true, message: 'Scheduler arrêté' });
      
      case 'restart':
        tokenRefreshScheduler.stop();
        tokenRefreshScheduler.start(intervalMinutes);
        return NextResponse.json({ success: true, message: 'Scheduler redémarré' });
      
      default:
        return NextResponse.json(
          createApiErrorResponse(new ApiError("Action invalide", 400, "INVALID_ACTION")),
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      createApiErrorResponse(new ApiError("Erreur interne", 500, "INTERNAL_ERROR")),
      { status: 500 }
    );
  }
}