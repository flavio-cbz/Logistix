import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SuperbuySyncService } from '@/lib/services/superbuy-sync-service';
import { SuperbuyAutomationService } from '@/lib/services/superbuy/automation';
import { SuperbuySyncRepository } from '@/lib/repositories/superbuy-sync-repository';
import { JobService } from '@/lib/services/job-service';
import { type SuperbuyParcelData } from '@/lib/shared/types/superbuy';

// Mock Dependencies
const mockSyncRepo = {
    findBySuperbuyId: vi.fn(),
    createSyncRecord: vi.fn(),
    updateSyncTimestamp: vi.fn(),
    findByUserId: vi.fn(),
    deleteBySuperbuyId: vi.fn(),
} as unknown as SuperbuySyncRepository;

const mockAutomationService = {
    connect: vi.fn(),
    sync: vi.fn(),
} as unknown as SuperbuyAutomationService;

const mockJobService = {
    updateProgress: vi.fn(),
    completeJob: vi.fn(),
    failJob: vi.fn(),
} as unknown as JobService;

describe('SuperbuySyncService', () => {
    let syncService: SuperbuySyncService;

    beforeEach(() => {
        vi.clearAllMocks();
        syncService = new SuperbuySyncService(
            mockSyncRepo,
            mockAutomationService,
            mockJobService
        );
    });

    describe('syncParcels', () => {
        const mockParcels: SuperbuyParcelData[] = [
            { packageId: 'PKG1', trackingNumber: 'TRK1', status: 'shipped' } as any,
            { packageId: 'PKG2', trackingNumber: 'TRK2', status: 'pending' } as any,
        ];

        it('should create new sync records for new parcels', async () => {
            vi.mocked(mockSyncRepo.findBySuperbuyId).mockResolvedValue(null);

            const result = await syncService.syncParcels('user-1', mockParcels);

            expect(result.created).toBe(2);
            expect(result.updated).toBe(0);
            expect(mockSyncRepo.createSyncRecord).toHaveBeenCalledTimes(2);
            expect(mockSyncRepo.createSyncRecord).toHaveBeenCalledWith(expect.objectContaining({
                superbuyId: 'PKG1',
                entityType: 'parcel'
            }));
        });

        it('should update existing records', async () => {
            vi.mocked(mockSyncRepo.findBySuperbuyId).mockResolvedValue({ id: 'sync-1', superbuyId: 'PKG1' } as any);

            const result = await syncService.syncParcels('user-1', mockParcels);

            expect(result.updated).toBe(2);
            expect(result.created).toBe(0);
            expect(mockSyncRepo.updateSyncTimestamp).toHaveBeenCalledTimes(2);
        });

        it('should skip existing records if skipExisting is true', async () => {
            vi.mocked(mockSyncRepo.findBySuperbuyId).mockResolvedValue({ id: 'sync-1', superbuyId: 'PKG1' } as any);

            const result = await syncService.syncParcels('user-1', mockParcels, { skipExisting: true });

            expect(result.skipped).toBe(2);
            expect(result.updated).toBe(0);
            expect(mockSyncRepo.updateSyncTimestamp).not.toHaveBeenCalled();
        });

        it('should force update if forceUpdate is true even if skipExisting is set', async () => {
            vi.mocked(mockSyncRepo.findBySuperbuyId).mockResolvedValue({ id: 'sync-1', superbuyId: 'PKG1' } as any);

            const result = await syncService.syncParcels('user-1', mockParcels, { skipExisting: true, forceUpdate: true });

            expect(result.updated).toBe(2);
            expect(result.skipped).toBe(0);
            expect(mockSyncRepo.updateSyncTimestamp).toHaveBeenCalled();
        });

        it('should handle errors for individual parcels', async () => {
            vi.mocked(mockSyncRepo.findBySuperbuyId).mockRejectedValueOnce(new Error('DB Error'));
            vi.mocked(mockSyncRepo.findBySuperbuyId).mockResolvedValueOnce(null); // Second one succeeds

            const result = await syncService.syncParcels('user-1', mockParcels);

            expect(result.failed).toBe(1);
            expect(result.created).toBe(1); // Second one created
            expect(result.results[0].success).toBe(false);
            expect(result.results[1].success).toBe(true);
        });
    });

    describe('syncUserData', () => {
        it('should connect if credentials provided', async () => {
            const credentials = { username: 'test', password: 'pw' };
            vi.mocked(mockAutomationService.connect).mockResolvedValue({ success: true, message: 'ok' });
            vi.mocked(mockAutomationService.sync).mockResolvedValue({ success: true, message: 'Sync successful', data: { parcelsCount: 5, ordersCount: 0 } });

            await syncService.syncUserData('user-1', credentials);

            expect(mockAutomationService.connect).toHaveBeenCalledWith('user-1', 'test', 'pw');
            expect(mockAutomationService.sync).toHaveBeenCalled();
        });

        it('should fail if connect fails', async () => {
            const credentials = { username: 'test', password: 'pw' };
            vi.mocked(mockAutomationService.connect).mockResolvedValue({ success: false, message: 'Auth failed' });

            await expect(syncService.syncUserData('user-1', credentials))
                .rejects.toThrow('Auth failed');

            expect(mockAutomationService.sync).not.toHaveBeenCalled();
        });

        it('should update job progress if jobId provided', async () => {
            vi.mocked(mockAutomationService.sync).mockResolvedValue({ success: true, message: 'Sync successful', data: { parcelsCount: 5, ordersCount: 0 } });

            await syncService.syncUserData('user-1', undefined, false, 'job-1');

            expect(mockJobService.updateProgress).toHaveBeenCalledWith('job-1', 0, 'processing', expect.any(Object));
            expect(mockJobService.completeJob).toHaveBeenCalledWith('job-1', { parcelsCount: 5, ordersCount: 0 });
        });
    });
});
