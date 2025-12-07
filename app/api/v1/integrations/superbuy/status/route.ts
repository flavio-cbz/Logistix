import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth-middleware';
import { IntegrationRepository } from '@/lib/repositories/integration-repository';
import { DatabaseService } from '@/lib/database';
import { NextRequest } from 'next/server';

/**
 * GET /api/v1/integrations/superbuy/status
 * Returns the current Superbuy integration status for the authenticated user
 */
export async function GET(req: NextRequest) {
    try {
        const { user } = await requireAuth(req);

        const integrationRepo = new IntegrationRepository(DatabaseService.getInstance());
        const integration = await integrationRepo.findByProvider(user.id, 'superbuy');

        if (!integration || !integration.credentials) {
            return NextResponse.json({
                connected: false,
                message: 'No Superbuy integration configured'
            });
        }

        const credentials = integration.credentials as { email?: string; encryptedPassword?: string };

        return NextResponse.json({
            connected: true,
            email: credentials.email || null,
            lastSyncAt: integration.lastUsedAt || null,
            configuredAt: integration.createdAt,
        });

    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal Server Error' },
            { status: 500 }
        );
    }
}
