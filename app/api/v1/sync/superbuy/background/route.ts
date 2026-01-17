
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth-middleware';
import { logger } from '@/lib/utils/logging/logger';
import { serviceContainer } from '@/lib/services/container';
import { createSuccessResponse, createErrorResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';
export const maxDuration = 30; // 30 seconds max for the starter (the job runs in background, but Vercel might kill it if on serverless. Self-hosted is fine.)

export async function POST(req: NextRequest) {
    try {
        const { user } = await requireAuth(req);

        // Parse body for optional credentials (re-login case)
        let credentials: { username: string; password: string } | undefined;
        try {
            const body = await req.json();
            if (body.username && body.password) {
                credentials = { username: body.username, password: body.password };
            }
        } catch (_e) {
            // Ignore JSON parse error (body might be empty)
        }

        const jobService = serviceContainer.getJobService();
        const syncService = serviceContainer.getSuperbuySyncService();

        // Create Job
        const job = await jobService.createJob('superbuy_sync', user.id, {
            message: 'Job initialized',
            startedAt: new Date().toISOString()
        });

        // Trigger Sync in background (Fire and Forget)
        // Note: In serverless environments (Vercel), this might be killed when response is sent.
        // For self-hosted/VPS (LogistiX target), this works if the process stays alive.
        // Ideally use waitUntil() if available or a proper queue.
        (async () => {
            try {
                await syncService.syncUserData(user.id, credentials, false, job.id);
            } catch (error: unknown) {
                logger.error('Background sync failed:', { error });
                // Job status is already updated to 'failed' inside syncUserData catch block
            }
        })();

        return createSuccessResponse({
            jobId: job.id,
            message: 'Sync job started'
        });

    } catch (error: unknown) {
        return createErrorResponse(error);
    }
}
