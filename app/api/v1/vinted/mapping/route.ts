import { NextRequest, NextResponse } from 'next/server';
import { vintedMappingService } from '@/lib/services/market/vinted-mapping-service';
import { logger } from '@/lib/utils/logging/logger';
import { requireAuth } from '@/lib/middleware/auth-middleware';

export async function GET(req: NextRequest) {
    try {
        const auth = await requireAuth(req);
        const userId = auth.user.id;

        const items = await vintedMappingService.getMappingStatus(userId);

        return NextResponse.json({ items });

    } catch (error) {
        logger.error('API Error', { error });
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
