/**
 * Superbuy Sync Repository
 * 
 * Handles database operations for parcel and product synchronization
 */

import { eq, and } from "drizzle-orm";
import { BaseRepository } from "./base-repository";
import { DatabaseService } from "@/lib/database";
import { superbuySync } from "@/lib/database/schema";

export interface SuperbuySyncRecord {
  id: string;
  userId: string;
  superbuyId: string;
  logistixId: string;
  entityType: "parcel" | "product";
  lastSyncedAt: string;
  superbuyData: Record<string, unknown> | null;
  createdAt: string;
}

export interface CreateSyncRecordInput {
  userId: string;
  superbuyId: string;
  logistixId: string;
  entityType: "parcel" | "product";
  superbuyData?: Record<string, unknown>;
}

export class SuperbuySyncRepository extends BaseRepository<typeof superbuySync> {
  constructor(databaseService: DatabaseService) {
    super(superbuySync, databaseService);
  }

  /**
   * Find sync record by Superbuy ID
   */
  async findBySuperbuyId(
    userId: string,
    superbuyId: string,
    entityType: "parcel" | "product"
  ): Promise<SuperbuySyncRecord | undefined> {
    return this.databaseService.executeQuery(async (db) => {
      const result = await db
        .select()
        .from(superbuySync)
        .where(
          and(
            eq(superbuySync.userId, userId),
            eq(superbuySync.superbuyId, superbuyId),
            eq(superbuySync.entityType, entityType)
          )
        )
        .get();

      return result as SuperbuySyncRecord | undefined;
    }, "findBySuperbuyId");
  }

  /**
   * Find sync record by LogistiX ID
   */
  async findByLogistixId(
    userId: string,
    logistixId: string,
    entityType: "parcel" | "product"
  ): Promise<SuperbuySyncRecord | undefined> {
    return this.databaseService.executeQuery(async (db) => {
      const result = await db
        .select()
        .from(superbuySync)
        .where(
          and(
            eq(superbuySync.userId, userId),
            eq(superbuySync.logistixId, logistixId),
            eq(superbuySync.entityType, entityType)
          )
        )
        .get();

      return result as SuperbuySyncRecord | undefined;
    }, "findByLogistixId");
  }

  /**
   * Get all sync records for a user
   */
  async findByUserId(userId: string): Promise<SuperbuySyncRecord[]> {
    return this.databaseService.executeQuery(async (db) => {
      const results = await db
        .select()
        .from(superbuySync)
        .where(eq(superbuySync.userId, userId))
        .all();

      return results as SuperbuySyncRecord[];
    }, "findByUserId");
  }

  /**
   * Create a sync record
   */
  async createSyncRecord(input: CreateSyncRecordInput): Promise<SuperbuySyncRecord> {
    return this.databaseService.executeQuery(async (db) => {
      const now = new Date().toISOString();
      const superbuyDataJson = input.superbuyData ? input.superbuyData : null;

      await db
        .insert(superbuySync)
        .values({
          userId: input.userId,
          superbuyId: input.superbuyId,
          logistixId: input.logistixId,
          entityType: input.entityType,
          lastSyncedAt: now,
          superbuyData: superbuyDataJson,
        })
        .run();

      const result = await db
        .select()
        .from(superbuySync)
        .where(eq(superbuySync.superbuyId, input.superbuyId))
        .get();

      if (!result) {
        throw new Error("Failed to create sync record");
      }

      return result as SuperbuySyncRecord;
    }, "createSyncRecord");
  }

  /**
   * Update sync record timestamp
   */
  async updateSyncTimestamp(
    id: string,
    superbuyData?: Record<string, unknown>
  ): Promise<void> {
    return this.databaseService.executeQuery(async (db) => {
      const updateData: Partial<import("@/lib/database/schema").NewSuperbuySync> = {
        lastSyncedAt: new Date().toISOString(),
      };

      if (superbuyData) {
        updateData.superbuyData = superbuyData;
      }

      await db
        .update(superbuySync)
        .set(updateData)
        .where(eq(superbuySync.id, id))
        .run();
    }, "updateSyncTimestamp");
  }

  /**
   * Delete sync record
   */
  async deleteBySuperbuyId(
    userId: string,
    superbuyId: string,
    entityType: "parcel" | "product"
  ): Promise<void> {
    return this.databaseService.executeQuery(async (db) => {
      await db
        .delete(superbuySync)
        .where(
          and(
            eq(superbuySync.userId, userId),
            eq(superbuySync.superbuyId, superbuyId),
            eq(superbuySync.entityType, entityType)
          )
        )
        .run();
    }, "deleteBySuperbuyId");
  }

  /**
   * Check if a Superbuy entity is already synced
   */
  async isSynced(
    userId: string,
    superbuyId: string,
    entityType: "parcel" | "product"
  ): Promise<boolean> {
    const record = await this.findBySuperbuyId(userId, superbuyId, entityType);
    return !!record;
  }
<<<<<<< HEAD

  /**
   * Find multiple sync records by Superbuy IDs (batch operation)
   */
  async findManyBySuperbuyIds(
    userId: string,
    superbuyIds: string[],
    entityType: "parcel" | "product"
  ): Promise<Map<string, SuperbuySyncRecord>> {
    return this.databaseService.executeQuery(async (db) => {
      const { inArray } = await import("drizzle-orm");

      const results = await db
        .select()
        .from(superbuySync)
        .where(
          and(
            eq(superbuySync.userId, userId),
            inArray(superbuySync.superbuyId, superbuyIds),
            eq(superbuySync.entityType, entityType)
          )
        )
        .all();

      // Convert to Map for O(1) lookup
      const recordMap = new Map<string, SuperbuySyncRecord>();
      for (const record of results as SuperbuySyncRecord[]) {
        recordMap.set(record.superbuyId, record);
      }

      return recordMap;
    }, "findManyBySuperbuyIds");
  }

  /**
   * Create multiple sync records in batch
   */
  async createSyncRecordsBatch(inputs: CreateSyncRecordInput[]): Promise<number> {
    return this.databaseService.executeQuery(async (db) => {
      if (inputs.length === 0) return 0;

      const now = new Date().toISOString();

      const values = inputs.map(input => ({
        userId: input.userId,
        superbuyId: input.superbuyId,
        logistixId: input.logistixId,
        entityType: input.entityType,
        lastSyncedAt: now,
        superbuyData: input.superbuyData || null,
      }));

      const result = await db
        .insert(superbuySync)
        .values(values)
        .run();

      return result.changes || 0;
    }, "createSyncRecordsBatch");
  }

  /**
   * Update multiple sync timestamps in batch
   */
  async updateMany(
    records: Array<{
      id: string;
      superbuyData?: Record<string, unknown>;
    }>
  ): Promise<number> {
    return this.databaseService.executeQuery(async (db) => {
      if (records.length === 0) return 0;

      const now = new Date().toISOString();
      let totalUpdated = 0;

      // SQLite doesn't support batch updates easily, so we use a transaction
      for (const record of records) {
        const updateData: Partial<import("@/lib/database/schema").NewSuperbuySync> = {
          lastSyncedAt: now,
        };

        if (record.superbuyData) {
          updateData.superbuyData = record.superbuyData;
        }

        await db
          .update(superbuySync)
          .set(updateData)
          .where(eq(superbuySync.id, record.id))
          .run();

        totalUpdated++;
      }

      return totalUpdated;
    }, "updateMany");
  }
=======
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
}
