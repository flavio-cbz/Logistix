import { NextRequest, NextResponse } from 'next/server';
import { vintedSyncService } from '@/lib/services/market/vinted-sync-service';
import { logger } from '@/lib/utils/logging/logger';
import { serviceContainer } from "@/lib/services/container";

export async function POST(
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const authService = serviceContainer.getAuthService();
        const user = await authService.requireAuth();
        const userId = user.id;
        const productId = params.id;

        if (!productId || !/^[0-9a-f-]{36}$/i.test(productId)) {
            return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
        }

        const result = await vintedSyncService.syncProduct(productId, userId);

        if (!result.success) {
            return NextResponse.json({
                error: result.error || 'Failed to sync',
                hint: result.error?.includes('not found') ? 'Check if the item exists on Vinted' : undefined
            }, { status: 404 }); // Using 404 for business logic failures in this specific endpoint context if item not found
        }

        return NextResponse.json({
            success: true,
            action: result.action,
            soldPrice: result.soldPrice
        });

    } catch (error) {
        logger.error('[SYNC-VINTED] Error', { error });
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to sync' },
            { status: 500 }
        );
    }
}
