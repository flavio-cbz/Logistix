
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth-middleware';
import { serviceContainer } from '@/lib/services/container';
import { createSuccessResponse, createErrorResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const { user } = await requireAuth(req);
        const jobService = serviceContainer.getJobService();

        // Get optional status filter from query params



        // Note: service.listActiveJobs currently returns jobs with status 'pending' or 'processing'
        // If we want all jobs, we might need to extend the service or use listActiveJobs for now.
        // Let's use listActiveJobs for restoration usage.

        // Run job recovery for stale jobs (lazy cleanup)
        const jobRecoveryService = serviceContainer.getJobRecoveryService();
        await jobRecoveryService.recoverStuckJobs();

        const jobs = await jobService.listActiveJobs(user.id);

        return createSuccessResponse(jobs);
    } catch (error) {
        return createErrorResponse(error);
    }
}
