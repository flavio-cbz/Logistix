import { NextRequest, NextResponse } from 'next/server';
import { getLogger } from '@/lib/utils/logging/logger';
import { vintedSessionManager } from '@/lib/services/auth/vinted-session-manager';
import { vintedClient } from '@/lib/services/market/vinted-client-wrapper';
import { requireAuth } from '@/lib/middleware/auth-middleware';

const logger = getLogger('API/Vinted/Status');

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const userId = auth.user.id;

    const { searchParams } = new URL(req.url);
    const verify = searchParams.get('verify') === 'true';

    // Get detailed status
    const sessionStatus = await vintedSessionManager.getSessionStatus(userId);

    if (!sessionStatus) {
      return NextResponse.json({
        success: false,
        connected: false,
        status: 'error',
        message: 'Failed to retrieve session status'
      });
    }

    // Return early if not verifying or not connected
    if (!verify || !sessionStatus.connected) {
      return NextResponse.json({
        success: true,
        ...sessionStatus
      });
    }

    // Verify session by making a real API call
    try {
      const items = await vintedClient.getSoldItems(userId);

      return NextResponse.json({
        success: true,
        valid: true,
        message: `Session valide (${items.length} articles récupérés)`,
        ...sessionStatus
      });
    } catch (error) {
      // API call failed, meaning session is likely invalid despite DB saying it's active
      return NextResponse.json({
        success: true,
        valid: false,
        message: 'Session expirée ou invalide',
        ...sessionStatus,
        status: 'requires_refresh',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
    }

  } catch (error) {
    logger.error('Vinted status check error', { error });
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const userId = auth.user.id;

    await vintedSessionManager.clearSession(userId);

    return NextResponse.json({
      success: true,
      message: 'Session Vinted supprimée'
    });

  } catch (error) {
    logger.error('Vinted disconnect error', { error });
    return NextResponse.json(
      { success: false, message: 'Failed to disconnect' },
      { status: 500 }
    );
  }
}
