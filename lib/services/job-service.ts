<<<<<<< HEAD
import { BaseService } from "./base-service";
import { JobRepository } from "@/lib/repositories/job-repository";
import { type Job } from "@/lib/database/schema";
import { EventEmitter } from "events";

// Global event emitter for SSE - shared across all JobService instances
const jobEvents = new EventEmitter();
jobEvents.setMaxListeners(100); // Allow many SSE connections

export interface JobUpdateEvent {
    jobId: string;
    userId: string;
    status: Job["status"];
    progress: number;
    result?: Record<string, unknown>;
    error?: string;
}

export class JobService extends BaseService {
    constructor(private readonly jobRepository: JobRepository) {
        super("JobService");
    }

    /**
     * Get the global event emitter for SSE subscriptions
     */
    static getEventEmitter(): EventEmitter {
        return jobEvents;
    }

    private emitJobUpdate(job: Job): void {
        const event: JobUpdateEvent = {
            jobId: job.id,
            userId: job.userId,
            status: job.status,
            progress: job.progress ?? 0,
            result: job.result as Record<string, unknown> | undefined,
            error: job.error || undefined,
        };
        jobEvents.emit("job:update", event);
    }

    async createJob(type: string, userId: string, initialData?: Record<string, unknown>): Promise<Job> {
        return this.executeOperation("createJob", async () => {
            const job = await this.jobRepository.create({
                type,
                userId,
                status: "pending",
                progress: 0,
                result: initialData,
            });
            this.emitJobUpdate(job);
            return job;
        });
    }

    async updateProgress(
        jobId: string,
        progress: number,
        status: "pending" | "processing" | "cancelling" | "cancelled" | "completed" | "failed" = "processing",
        data?: Record<string, unknown>
    ): Promise<Job | null> {
        return this.executeOperation("updateProgress", async () => {
            const job = await this.jobRepository.update(jobId, {
                progress,
                status,
                result: data,
                updatedAt: new Date().toISOString(),
            });
            if (job) this.emitJobUpdate(job);
            return job;
        });
    }

    async cancelJob(jobId: string): Promise<Job | null> {
        return this.executeOperation("cancelJob", async () => {
            const job = await this.jobRepository.update(jobId, {
                status: "cancelling",
                updatedAt: new Date().toISOString(),
            });
            if (job) this.emitJobUpdate(job);
            return job;
        });
    }

    async completeJob(jobId: string, result: Record<string, unknown>): Promise<Job | null> {
        return this.executeOperation("completeJob", async () => {
            const job = await this.jobRepository.update(jobId, {
                status: "completed",
                progress: 100,
                result,
                updatedAt: new Date().toISOString(),
            });
            if (job) this.emitJobUpdate(job);
            return job;
        });
    }

    async failJob(jobId: string, error: string): Promise<Job | null> {
        return this.executeOperation("failJob", async () => {
            const job = await this.jobRepository.update(jobId, {
                status: "failed",
                error,
                updatedAt: new Date().toISOString(),
            });
            if (job) this.emitJobUpdate(job);
            return job;
        });
    }

    async getJob(jobId: string, userId: string): Promise<Job | null> {
        return this.executeOperation("getJob", async () => {
            const job = await this.jobRepository.findById(jobId);
            if (job && job.userId !== userId) {
                throw this.createAuthorizationError("Not authorized to view this job");
            }
            return job;
        });
    }

    async getUserJobs(userId: string, limit = 10): Promise<Job[]> {
        return this.executeOperation("getUserJobs", async () => {
            return this.jobRepository.findByUser(userId, limit);
        });
    }

    async listActiveJobs(userId: string): Promise<Job[]> {
        return this.executeOperation("listActiveJobs", async () => {
            return this.jobRepository.findActiveByUser(userId);
        });
    }
}

=======
import { BaseService } from "./base-service";
import { JobRepository } from "@/lib/repositories/job-repository";
import { type Job } from "@/lib/database/schema";
import { EventEmitter } from "events";

// Global event emitter for SSE - shared across all JobService instances
const jobEvents = new EventEmitter();
jobEvents.setMaxListeners(100); // Allow many SSE connections

export interface JobUpdateEvent {
    jobId: string;
    userId: string;
    status: Job["status"];
    progress: number;
    result?: Record<string, unknown>;
    error?: string;
}

export class JobService extends BaseService {
    constructor(private readonly jobRepository: JobRepository) {
        super("JobService");
    }

    /**
     * Get the global event emitter for SSE subscriptions
     */
    static getEventEmitter(): EventEmitter {
        return jobEvents;
    }

    private emitJobUpdate(job: Job): void {
        const event: JobUpdateEvent = {
            jobId: job.id,
            userId: job.userId,
            status: job.status,
            progress: job.progress,
            result: job.result as Record<string, unknown> | undefined,
            error: job.error || undefined,
        };
        jobEvents.emit("job:update", event);
    }

    async createJob(type: string, userId: string, initialData?: Record<string, unknown>): Promise<Job> {
        return this.executeOperation("createJob", async () => {
            const job = await this.jobRepository.create({
                type,
                userId,
                status: "pending",
                progress: 0,
                result: initialData,
            });
            this.emitJobUpdate(job);
            return job;
        });
    }

    async updateProgress(
        jobId: string,
        progress: number,
        status: "pending" | "processing" | "cancelling" | "cancelled" | "completed" | "failed" = "processing",
        data?: Record<string, unknown>
    ): Promise<Job | null> {
        return this.executeOperation("updateProgress", async () => {
            const job = await this.jobRepository.update(jobId, {
                progress,
                status,
                result: data,
                updatedAt: new Date().toISOString(),
            });
            if (job) this.emitJobUpdate(job);
            return job;
        });
    }

    async cancelJob(jobId: string): Promise<Job | null> {
        return this.executeOperation("cancelJob", async () => {
            const job = await this.jobRepository.update(jobId, {
                status: "cancelling",
                updatedAt: new Date().toISOString(),
            });
            if (job) this.emitJobUpdate(job);
            return job;
        });
    }

    async completeJob(jobId: string, result: Record<string, unknown>): Promise<Job | null> {
        return this.executeOperation("completeJob", async () => {
            const job = await this.jobRepository.update(jobId, {
                status: "completed",
                progress: 100,
                result,
                updatedAt: new Date().toISOString(),
            });
            if (job) this.emitJobUpdate(job);
            return job;
        });
    }

    async failJob(jobId: string, error: string): Promise<Job | null> {
        return this.executeOperation("failJob", async () => {
            const job = await this.jobRepository.update(jobId, {
                status: "failed",
                error,
                updatedAt: new Date().toISOString(),
            });
            if (job) this.emitJobUpdate(job);
            return job;
        });
    }

    async getJob(jobId: string, userId: string): Promise<Job | null> {
        return this.executeOperation("getJob", async () => {
            const job = await this.jobRepository.findById(jobId);
            if (job && job.userId !== userId) {
                throw this.createAuthorizationError("Not authorized to view this job");
            }
            return job;
        });
    }

    async getUserJobs(userId: string, limit = 10): Promise<Job[]> {
        return this.executeOperation("getUserJobs", async () => {
            return this.jobRepository.findByUser(userId, limit);
        });
    }

    async listActiveJobs(userId: string): Promise<Job[]> {
        return this.executeOperation("listActiveJobs", async () => {
            return this.jobRepository.findActiveByUser(userId);
        });
    }
}

>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
