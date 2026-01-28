import { JobRepository } from "@/lib/repositories/job-repository";
import { JobService } from "@/lib/services/job-service";
import { getLogger } from "@/lib/utils/logging/logger";
// import { ServiceContainer } from "./container";
// import { jobs } from "@/lib/database/schema";
// import { eq } from "drizzle-orm";

const logger = getLogger("JobRecoveryService");

export class JobRecoveryService {
    private jobRepository: JobRepository;
    private jobService: JobService;

    constructor(jobRepository: JobRepository, jobService: JobService) {
        this.jobRepository = jobRepository;
        this.jobService = jobService;
    }

    /**
<<<<<<< HEAD
     * Recover stuck jobs that were left in 'processing' state
     * Only recovers jobs that haven't been updated for a specific threshold (default 5 minutes)
     */
    async recoverStuckJobs(staleThresholdMs: number = 5 * 60 * 1000): Promise<void> {
        // Use a lock mechanism or check if already running to avoid race conditions if needed
        // For now, simple check is sufficient

        try {
            await this.recoverProcessingJobs(staleThresholdMs);
            await this.recoverStuckEnrichments(staleThresholdMs);
=======
     * Recover stuck jobs that were left in 'processing' state due to server restart
     */
    async recoverStuckJobs(): Promise<void> {
        logger.info("Initializing job recovery process...");

        try {
            // We need a direct method on repository to find all processing jobs across all users
            // Since we don't have it on the repository interface yet, we will rely on 
            // a custom query here, or add it to the repository. 
            // For now, let's update the repository to support findStuckJobs.

            // Wait, we should probably add this method to JobRepository first 
            // to follow the layered architecture pattern properly.

            // Assuming we added `findProcessingJobs` to JobRepository:
            const processingJobs = await this.jobRepository.findProcessingJobs();

            if (processingJobs.length === 0) {
                logger.info("No stuck jobs found.");
                return;
            }

            logger.warn(`Found ${processingJobs.length} stuck jobs from previous run. Recovering...`);

            for (const job of processingJobs) {
                try {
                    await this.jobService.failJob(
                        job.id,
                        "System Restart: Job was interrupted by server restart."
                    );
                    logger.info(`Recovered job ${job.id} (marked as failed)`);
                } catch (err) {
                    logger.error(`Failed to recover job ${job.id}`, { error: err });
                }
            }

            logger.info("Job recovery process completed.");
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
        } catch (error) {
            logger.error("Critical error during job recovery", { error });
        }
    }
<<<<<<< HEAD

    private async recoverProcessingJobs(staleThresholdMs: number): Promise<void> {
        const processingJobs = await this.jobRepository.findProcessingJobs();

        if (processingJobs.length === 0) return;

        const now = new Date();
        const staleJobs = processingJobs.filter(job => {
            const updatedAt = new Date(job.updatedAt || job.createdAt);
            const diff = now.getTime() - updatedAt.getTime();
            return diff > staleThresholdMs;
        });

        if (staleJobs.length === 0) return;

        logger.warn(`Found ${staleJobs.length} stale jobs (processing > ${staleThresholdMs}ms). Recovering...`);

        for (const job of staleJobs) {
            try {
                await this.jobService.failJob(
                    job.id,
                    "System Recovery: Job was stuck in processing state for too long."
                );
                logger.info(`Recovered stale job ${job.id} (marked as failed)`);
            } catch (err) {
                logger.error(`Failed to recover job ${job.id}`, { error: err });
            }
        }
    }

    private async recoverStuckEnrichments(staleThresholdMs: number): Promise<void> {
        try {
            // Import databaseService dynamically to avoid circular dependencies if any
            const { databaseService } = await import("@/lib/database/database-service");

            // Find products with pending enrichment status
            // Note: SQLite JSON syntax specific
            const stuckProducts = await databaseService.query<{ id: string; enrichment_data: string }>(
                `SELECT id, enrichment_data 
                 FROM products 
                 WHERE json_extract(enrichment_data, '$.enrichmentStatus') = 'pending'`
            );

            if (!stuckProducts || stuckProducts.length === 0) return;

            const now = new Date();
            let recoveredCount = 0;

            for (const product of stuckProducts) {
                try {
                    const data = JSON.parse(product.enrichment_data || "{}");
                    const enrichedAt = data.enrichedAt ? new Date(data.enrichedAt) : null;

                    // If no timestamp, assume stuck. If timestamp exists, check if stale.
                    const isStale = !enrichedAt || (now.getTime() - enrichedAt.getTime() > staleThresholdMs);

                    if (isStale) {
                        await databaseService.execute(
                            `UPDATE products 
                             SET enrichment_data = json_set(enrichment_data, '$.enrichmentStatus', 'failed', '$.error', 'System Recovery: Enrichment stuck in pending state') 
                             WHERE id = ?`,
                            [product.id]
                        );
                        recoveredCount++;
                    }
                } catch (e) {
                    logger.error(`Failed to check/recover product enrichment ${product.id}`, { error: e });
                }
            }

            if (recoveredCount > 0) {
                logger.info(`Recovered ${recoveredCount} stuck product enrichments`);
            }
        } catch (error) {
            logger.error("Error recovering stuck enrichments", { error });
        }
    }
=======
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
}
