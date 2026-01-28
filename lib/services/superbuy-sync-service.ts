import { BaseService } from "./base-service";
import { SuperbuyAutomationService } from "@/lib/services/superbuy/automation";
import { JobService } from "@/lib/services/job-service";
import {
  SuperbuyParcelData,
  ParcelSyncOptions,
  ParcelSyncResult,
} from "@/lib/shared/types/superbuy";
import { SuperbuySyncRepository } from "@/lib/repositories/superbuy-sync-repository";

export interface SyncResult {
  success: boolean;
  status?: "created" | "updated" | "skipped";
  id?: string;
  error?: string;
}

export interface SyncSummary {
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  totalProcessed: number;
  results: SyncResult[];
}

export class SuperbuySyncService extends BaseService {
  private automationService: SuperbuyAutomationService;

  constructor(
    private readonly superbuySyncRepository: SuperbuySyncRepository,
    automationService: SuperbuyAutomationService,
    private readonly jobService?: JobService
  ) {
    super("SuperbuySyncService");
    this.automationService = automationService;
  }

  /**
   * Sync parcels from Superbuy (JSON payload)
   */
  async syncParcels(userId: string, parcels: SuperbuyParcelData[], options: ParcelSyncOptions = {}): Promise<SyncSummary> {
    return this.executeOperation("syncParcels", async () => {
      this.logger.info("Syncing parcels", { userId, count: parcels.length, options });

      let created = 0;
      let updated = 0;
      let skipped = 0;
      let failed = 0;
      const results: ParcelSyncResult[] = [];
      const totalProcessed = parcels.length;

      // OPTIMIZATION: Batch query to check existing syncs
      const superbuyIds = parcels.map(p => String(p.packageId || p.id));
      const existingSyncsMap = await this.superbuySyncRepository.findManyBySuperbuyIds(
        userId,
        superbuyIds,
        "parcel"
      );

      // Separate parcels into create/update/skip buckets
      const toCreate: typeof parcels = [];
      const toUpdate: Array<{ id: string; superbuyData: typeof parcels[0] }> = [];

      for (const parcelData of parcels) {
        const superbuyId = String(parcelData.packageId || parcelData.id);
        const existingSync = existingSyncsMap.get(superbuyId);

        if (existingSync && options.skipExisting && !options.forceUpdate) {
          skipped++;
          results.push({ success: true, status: "skipped", id: parcelData.packageId });
          continue;
        }

        if (existingSync) {
          toUpdate.push({ id: existingSync.id, superbuyData: parcelData });
        } else {
          toCreate.push(parcelData);
        }
      }

      // Batch create new sync records
      if (toCreate.length > 0) {
        try {
          const createInputs = toCreate.map(parcelData => ({
            userId,
            superbuyId: String(parcelData.packageId || parcelData.id),
            logistixId: "pending", // we'd need the real ID
            entityType: "parcel" as const,
            superbuyData: parcelData
          }));

          await this.superbuySyncRepository.createSyncRecordsBatch(createInputs);
          created += toCreate.length;

          toCreate.forEach(p => {
            results.push({ success: true, status: "created", id: p.packageId });
          });
        } catch (error: unknown) {
          failed += toCreate.length;
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error("Failed to batch create sync records", { error, count: toCreate.length });

          toCreate.forEach(p => {
            results.push({ success: false, error: errorMessage, id: p.packageId });
          });
        }
      }

      // Batch update existing sync records
      if (toUpdate.length > 0) {
        try {
          await this.superbuySyncRepository.updateMany(toUpdate);
          updated += toUpdate.length;

          toUpdate.forEach(item => {
            results.push({ success: true, status: "updated", id: item.superbuyData.packageId });
          });
        } catch (error: unknown) {
          failed += toUpdate.length;
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error("Failed to batch update sync records", { error, count: toUpdate.length });

          toUpdate.forEach(item => {
            results.push({ success: false, error: errorMessage, id: item.superbuyData.packageId });
          });
        }
      }

      return {
        created,
        updated,
        skipped,
        failed,
        totalProcessed,
        results
      };
    }, { userId });
  }

  async getSyncHistory(userId: string) {
    return this.superbuySyncRepository.findByUserId(userId);
  }

  async deleteSyncRecord(_id: string, _type: string) {
    throw new Error("Method requires userId. Use deleteSyncRecordWithUser instead.");
  }

  async deleteSyncRecordWithUser(userId: string, superbuyId: string, type: "parcel" | "product") {
    return this.superbuySyncRepository.deleteBySuperbuyId(userId, superbuyId, type);
  }

  async syncUserData(
    userId: string,
    credentials?: { username: string; password: string },
    headless: boolean = false,
    jobId?: string,
    enrichProducts: boolean = true
  ): Promise<{ parcelsCount: number; ordersCount: number }> {
    return this.executeOperation("syncUserData", async () => {
      this.logger.info("Starting Superbuy synchronization", { userId, headless, jobId });

      if (jobId && this.jobService) {
        await this.jobService.updateProgress(jobId, 0, "processing", { message: "Starting synchronization..." });
      }

      try {
        const onProgress = async (progress: number, message: string) => {
          if (jobId && this.jobService) {
            // Pass "processing" as 3rd arg, and message object as 4th
            const job = await this.jobService.updateProgress(jobId, progress, "processing", { message });

            if (job && (job.status === 'cancelling' || job.status === 'cancelled')) {
              throw new Error('JOB_CANCELLED');
            }
          }
        };

        // 1. Connect (Login & Save Credentials) - ONLY if credentials provided
        if (credentials) {
          const connectResult = await this.automationService.connect(userId, credentials.username, credentials.password);
          if (!connectResult.success) {
            throw this.createBusinessError(connectResult.message || "Failed to connect to Superbuy.");
          }
        }

        // 2. Sync (Scrape & Save)
        // If credentials were provided, we just connected.
        // If not, sync() will look them up in DB.
        const syncResult = await this.automationService.sync(userId, credentials, onProgress, enrichProducts);

        if (!syncResult.success) {
          throw this.createBusinessError(syncResult.message || "Failed to sync Superbuy data.");
        }

        const parcelsCount = syncResult.data?.parcelsCount || 0;
        const ordersCount = syncResult.data?.ordersCount || 0;

        const resultData = { parcelsCount, ordersCount };
        this.logger.info("Superbuy sync completed successfully", resultData);

        if (jobId && this.jobService) {
          await this.jobService.completeJob(jobId, resultData);
        }

        return resultData;

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage === 'JOB_CANCELLED') {
          this.logger.info("Superbuy sync cancelled by user", { jobId });
          if (jobId && this.jobService) {
            await this.jobService.updateProgress(jobId, 0, "cancelled", { message: "Cancelled by user" });
          }
          // Return partial result if needed, or just standard structure with 0 counts?
          return { parcelsCount: 0, ordersCount: 0 };
        }

        this.logger.error("Superbuy sync failed", { error });
        if (jobId && this.jobService) {
          await this.jobService.failJob(jobId, errorMessage);
        }
        throw error;
      }
    }, { userId });
  }
}
