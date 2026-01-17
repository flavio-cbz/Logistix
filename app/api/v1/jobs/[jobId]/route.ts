import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/middleware/auth-middleware";
import { serviceContainer } from "@/lib/services/container";
import { createSuccessResponse, createErrorResponse, createNotFoundResponse } from "@/lib/utils/api-response";

export async function GET(
    request: NextRequest,
    { params }: { params: { jobId: string } }
) {
    try {
        const { user } = await requireAuth(request);
        const jobService = serviceContainer.getJobService();

        // Pass user.id to getJob to ensure authorization check
        const job = await jobService.getJob(params.jobId, user.id);

        if (!job) {
            return createNotFoundResponse("Job");
        }

        return createSuccessResponse(job);
    } catch (error) {
        return createErrorResponse(error);
    }
}
