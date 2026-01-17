import { BaseRepository } from "./base-repository";
import { jobs, type Job, type NewJob } from "@/lib/database/schema";
import { DatabaseService } from "@/lib/database";
import { eq, desc, and, or } from "drizzle-orm";

export class JobRepository extends BaseRepository<typeof jobs, Job, NewJob> {
    constructor(databaseService: DatabaseService) {
        super(jobs, databaseService);
    }

    async findByUser(userId: string, limit = 10): Promise<Job[]> {
        return this.databaseService.executeQuery(
            (db) =>
                db.select()
                    .from(jobs)
                    .where(eq(jobs.userId, userId))
                    .orderBy(desc(jobs.createdAt))
                    .limit(limit)
                    .all(),
            `${this.getTableName()}.findByUser`
        );
    }

    async findActiveByUser(userId: string): Promise<Job[]> {
        return this.databaseService.executeQuery(
            (db) =>
                db.select()
                    .from(jobs)
                    .where(
                        and(
                            eq(jobs.userId, userId),
                            or(eq(jobs.status, "pending"), eq(jobs.status, "processing"))
                        )
                    )
                    .orderBy(desc(jobs.createdAt))
                    .all(),
            `${this.getTableName()}.findActiveByUser`
        );
    }

    async findPendingJobs(): Promise<Job[]> {
        return this.databaseService.executeQuery(
            (db) =>
                db.select()
                    .from(jobs)
                    .where(eq(jobs.status, "pending"))
                    .orderBy(desc(jobs.createdAt))
                    .all(),
            `${this.getTableName()}.findPendingJobs`
        );
    }
    async findProcessingJobs(): Promise<Job[]> {
        return this.databaseService.executeQuery(
            (db) =>
                db.select()
                    .from(jobs)
                    .where(eq(jobs.status, "processing"))
                    .all() as Job[],
            `${this.getTableName()}.findProcessingJobs`
        );
    }
}

