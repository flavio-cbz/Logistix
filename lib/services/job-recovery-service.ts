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
        } catch (error) {
            logger.error("Critical error during job recovery", { error });
        }
    }
}
