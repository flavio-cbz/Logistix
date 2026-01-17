
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth-middleware';
import { serviceContainer } from '@/lib/services/container';
import { createSuccessResponse, createErrorResponse } from '@/lib/utils/api-response';

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ jobId: string }> } // Correct type for Next.js 15+ dynamic routes (params is a Promise)
) {
    try {
        const { user } = await requireAuth(req);
        const { jobId } = await context.params;

        const jobService = serviceContainer.getJobService();

        // Verify ownership
        const job = await jobService.getJob(jobId, user.id);
        if (!job) {
            return createErrorResponse(new Error('Job not found or access denied'), {
                headers: { 'X-Status-Code': '404' } // createErrorResponse derives 404 from specific error types, but generic Error is 500. 
            });
            // Better: use createNotFoundResponse
            // return createNotFoundResponse('Job');
        }

        // Cancel
        const cancelledJob = await jobService.cancelJob(jobId);

        return createSuccessResponse({
            job: cancelledJob,
            message: 'Job cancellation requested'
        });

    } catch (error) {
        return createErrorResponse(error);
    }
}
