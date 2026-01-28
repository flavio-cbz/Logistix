import { NextRequest, NextResponse } from 'next/server';
import { vintedSyncService } from '@/lib/services/market/vinted-sync-service';
import { logger } from '@/lib/utils/logging/logger';
import { requireAuth } from '@/lib/middleware/auth-middleware';

export async function POST(req: NextRequest) {
    try {
        const auth = await requireAuth(req);
        const userId = auth.user.id;

        const result = await vintedSyncService.syncAllProducts(userId);

        if (!result.success) {
            return NextResponse.json({
                success: false,
                error: result.error || 'Sync failed',
                message: result.message
            }, { status: 500 });
        }

        return NextResponse.json(result);

    } catch (error) {
        logger.error('[SYNC-ALL] Error:', { error });
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to sync' },
            { status: 500 }
        );
    }
}
