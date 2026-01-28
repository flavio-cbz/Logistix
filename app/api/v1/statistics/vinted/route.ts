import { NextResponse } from 'next/server';
import { serviceContainer } from "@/lib/services/container";
import { logger } from '@/lib/utils/logging/logger';

export async function GET() {
    try {
        const authService = serviceContainer.getAuthService();
        const user = await authService.requireAuth();

        const productStatsService = serviceContainer.getProductStatsService();
        const stats = await productStatsService.getVintedStats(user.id);

        return NextResponse.json(stats);

    } catch (error) {
        logger.error('[VINTED-STATS] Error:', { error });
        return NextResponse.json(
            { error: 'Failed to fetch stats' },
            { status: 500 }
        );
    }
}
