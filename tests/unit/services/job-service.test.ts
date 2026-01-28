import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JobService } from '@/lib/services/job-service';
import { JobRepository } from '@/lib/repositories/job-repository';
import { type Job } from '@/lib/database/schema';

// Mock JobRepository
const mockJobRepository = {
    create: vi.fn(),
    update: vi.fn(),
    findById: vi.fn(),
    findByUser: vi.fn(),
    findActiveByUser: vi.fn(),
} as unknown as JobRepository;

describe('JobService', () => {
    let jobService: JobService;

    beforeEach(() => {
        vi.clearAllMocks();
        jobService = new JobService(mockJobRepository);
    });

    const mockJob: Job = {
        id: 'job-123',
        userId: 'user-1',
        type: 'sync',
        status: 'pending',
        progress: 0,
        result: null,
        error: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    describe('createJob', () => {
        it('should create a job and emit an event', async () => {
            const emitSpy = vi.spyOn(JobService.getEventEmitter(), 'emit');
            vi.mocked(mockJobRepository.create).mockResolvedValue(mockJob);

            const result = await jobService.createJob('sync', 'user-1');

            expect(mockJobRepository.create).toHaveBeenCalledWith({
                type: 'sync',
                userId: 'user-1',
                status: 'pending',
                progress: 0,
                result: undefined,
            });
            expect(result).toEqual(mockJob);
            expect(emitSpy).toHaveBeenCalledWith('job:update', expect.objectContaining({
                jobId: 'job-123',
                status: 'pending'
            }));
        });
    });

    describe('updateProgress', () => {
        it('should update job progress and emit an event', async () => {
            const emitSpy = vi.spyOn(JobService.getEventEmitter(), 'emit');
            const updatedJob = { ...mockJob, progress: 50, status: 'processing' as const };
            vi.mocked(mockJobRepository.update).mockResolvedValue(updatedJob);

            const result = await jobService.updateProgress('job-123', 50);

            expect(mockJobRepository.update).toHaveBeenCalledWith('job-123', expect.objectContaining({
                progress: 50,
                status: 'processing',
            }));
            expect(result).toEqual(updatedJob);
            expect(emitSpy).toHaveBeenCalledWith('job:update', expect.objectContaining({
                progress: 50,
                status: 'processing'
            }));
        });
    });

    describe('completeJob', () => {
        it('should complete job and set progress to 100', async () => {
            const completedJob = { ...mockJob, progress: 100, status: 'completed' as const, result: { success: true } };
            vi.mocked(mockJobRepository.update).mockResolvedValue(completedJob);

            const result = await jobService.completeJob('job-123', { success: true });

            expect(mockJobRepository.update).toHaveBeenCalledWith('job-123', expect.objectContaining({
                status: 'completed',
                progress: 100,
                result: { success: true }
            }));
            expect(result).toEqual(completedJob);
        });
    });

    describe('failJob', () => {
        it('should mark job as failed with error message', async () => {
            const failedJob = { ...mockJob, status: 'failed' as const, error: 'Something went wrong' };
            vi.mocked(mockJobRepository.update).mockResolvedValue(failedJob);

            const result = await jobService.failJob('job-123', 'Something went wrong');

            expect(mockJobRepository.update).toHaveBeenCalledWith('job-123', expect.objectContaining({
                status: 'failed',
                error: 'Something went wrong'
            }));
            expect(result).toEqual(failedJob);
        });
    });

    describe('getJob', () => {
        it('should return job if user is authorized', async () => {
            vi.mocked(mockJobRepository.findById).mockResolvedValue(mockJob);

            const result = await jobService.getJob('job-123', 'user-1');

            expect(result).toEqual(mockJob);
        });

        it('should throw error if user is not authorized', async () => {
            vi.mocked(mockJobRepository.findById).mockResolvedValue(mockJob);

            await expect(jobService.getJob('job-123', 'user-2'))
                .rejects
                .toThrow('Not authorized to view this job');
        });

        it('should return null if job not found', async () => {
            vi.mocked(mockJobRepository.findById).mockResolvedValue(null);

            const result = await jobService.getJob('job-999', 'user-1');

            expect(result).toBeNull();
        });
    });
});
