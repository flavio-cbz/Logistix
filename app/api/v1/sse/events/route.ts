import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/middleware/auth-middleware";
import { JobService, JobUpdateEvent } from "@/lib/services/job-service";

/**
 * SSE Endpoint for real-time job updates
 * GET /api/v1/sse/events
 */
export async function GET(request: NextRequest) {
    const authContext = await requireAuth(request);
    if (!authContext || !authContext.user) {
        return new Response("Unauthorized", { status: 401 });
    }

    const userId = authContext.user.id;
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        start(controller) {
            const eventEmitter = JobService.getEventEmitter();

            const onJobUpdate = (event: JobUpdateEvent) => {
                // Only send events for this user's jobs
                if (event.userId !== userId) return;

                const data = JSON.stringify({
                    type: "job:update",
                    payload: event,
                });

                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            };

            // Subscribe to job updates
            eventEmitter.on("job:update", onJobUpdate);

            // Send initial heartbeat
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`));

            // Heartbeat every 30 seconds to keep connection alive
            const heartbeatInterval = setInterval(() => {
                try {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "heartbeat" })}\n\n`));
                } catch {
                    // Stream closed, cleanup
                    clearInterval(heartbeatInterval);
                    eventEmitter.off("job:update", onJobUpdate);
                }
            }, 30000);

            // Handle client disconnect
            request.signal.addEventListener("abort", () => {
                clearInterval(heartbeatInterval);
                eventEmitter.off("job:update", onJobUpdate);
                controller.close();
            });
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no", // Disable nginx buffering
        },
    });
}
