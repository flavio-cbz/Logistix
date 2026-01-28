
import { NextResponse } from 'next/server';
import { getLogger } from '@/lib/utils/logging/logger';
import { vintedClient } from '@/lib/services/market/vinted-client-wrapper';
import { marketStatsCalculator } from '@/lib/services/market/market-stats';
import { z } from 'zod';

const logger = getLogger('API/Market/Analysis');

const schema = z.object({
    query: z.string().min(2),
    userId: z.string().optional().default('default-user'),
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { query, userId } = schema.parse(body);

        logger.info(`Analyzing market for query: "${query}"`);

        // Search Vinted
        const items = await vintedClient.searchItems(userId, {
            searchText: query,
            order: 'relevance', // relevance gives better "market price" usually
            perPage: 40 // Analyze 40 items for better stats
        });

        // Calculate Stats
        const itemsList = items.items || [];

        const stats = marketStatsCalculator.calculate(itemsList);

        return NextResponse.json({
            success: true,
            query,
            stats,
            rawCount: itemsList.length
        });

    } catch (error) {
        logger.error('Market analysis API failed', { error });
        return NextResponse.json(
            { success: false, message: 'Analysis failed' },
            { status: 500 }
        );
    }
}
