import { BaseService } from "./base-service";
import { databaseService } from "@/lib/database";
import { shippingPriceHistory, type NewShippingPriceHistoryRecord } from "@/lib/database/schema";
import { eq, and } from "drizzle-orm";
import { type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "@/lib/database/schema";

interface ShippingHistoryRecord {
    id: string;
    carrier: string;
    pricePerGram: number;
    totalWeight: number | null;
    totalPrice: number | null;
    source: string;
    notes: string | null;
    recordedAt: string;
    parcelId: string | null;
}

interface CarrierStats {
    carrier: string;
    avgPricePerGram: number;
    minPricePerGram: number;
    maxPricePerGram: number;
    recordCount: number;
    lastRecordedAt: string;
}

interface PriceEvolution {
    date: string;
    carrier: string;
    pricePerGram: number;
}

export class ShippingHistoryService extends BaseService {
    constructor() {
        super("ShippingHistoryService");
    }

    /**
     * Record a new shipping price
     */
    async recordPrice(
        userId: string,
        data: {
            carrier: string;
            pricePerGram: number;
            totalWeight?: number;
            totalPrice?: number;
            parcelId?: string;
            source?: "manual" | "superbuy_sync" | "parcel_update";
            notes?: string;
        }
    ): Promise<ShippingHistoryRecord> {
        return this.executeOperation("recordPrice", async () => {
            const db = await databaseService.getDb() as BetterSQLite3Database<typeof schema>;

            const record: NewShippingPriceHistoryRecord = {
                userId,
                carrier: data.carrier,
                pricePerGram: data.pricePerGram,
                totalWeight: data.totalWeight ?? null,
                totalPrice: data.totalPrice ?? null,
                parcelId: data.parcelId ?? null,
                source: data.source || "manual",
                notes: data.notes ?? null,
            };

            const result = await db
                .insert(shippingPriceHistory)
                .values(record)
                .returning();

            return result[0] as ShippingHistoryRecord;
        }, { userId, carrier: data.carrier });
    }

    /**
     * Get shipping history for a user, optionally filtered by carrier
     */
    async getHistory(
        userId: string,
        options?: {
            carrier?: string;
            limit?: number;
            startDate?: string;
            endDate?: string;
        }
    ): Promise<ShippingHistoryRecord[]> {
        return this.executeOperation("getHistory", async () => {
            let query = `
        SELECT 
          id, carrier, price_per_gram as pricePerGram, 
          total_weight as totalWeight, total_price as totalPrice,
          source, notes, recorded_at as recordedAt, parcel_id as parcelId
        FROM shipping_price_history
        WHERE user_id = ?
      `;
            const params: unknown[] = [userId];

            if (options?.carrier) {
                query += " AND carrier = ?";
                params.push(options.carrier);
            }

            if (options?.startDate) {
                query += " AND recorded_at >= ?";
                params.push(options.startDate);
            }

            if (options?.endDate) {
                query += " AND recorded_at <= ?";
                params.push(options.endDate);
            }

            query += " ORDER BY recorded_at DESC";

            if (options?.limit) {
                query += ` LIMIT ${options.limit}`;
            }

            return databaseService.query<ShippingHistoryRecord>(query, params, "get-shipping-history");
        }, { userId, ...options });
    }

    /**
     * Get carrier statistics
     */
    async getCarrierStats(userId: string): Promise<CarrierStats[]> {
        return this.executeOperation("getCarrierStats", async () => {
            return databaseService.query<CarrierStats>(
                `SELECT 
          carrier,
          AVG(price_per_gram) as avgPricePerGram,
          MIN(price_per_gram) as minPricePerGram,
          MAX(price_per_gram) as maxPricePerGram,
          COUNT(*) as recordCount,
          MAX(recorded_at) as lastRecordedAt
        FROM shipping_price_history
        WHERE user_id = ?
        GROUP BY carrier
        ORDER BY recordCount DESC`,
                [userId],
                "get-carrier-stats"
            );
        }, { userId });
    }

    /**
     * Get price evolution over time (for charting)
     */
    async getPriceEvolution(
        userId: string,
        options?: {
            carrier?: string;
            days?: number;
        }
    ): Promise<PriceEvolution[]> {
        return this.executeOperation("getPriceEvolution", async () => {
            const days = options?.days || 90;

            let query = `
        SELECT 
          DATE(recorded_at) as date,
          carrier,
          AVG(price_per_gram) as pricePerGram
        FROM shipping_price_history
        WHERE user_id = ? 
          AND recorded_at >= date('now', '-${days} days')
      `;
            const params: unknown[] = [userId];

            if (options?.carrier) {
                query += " AND carrier = ?";
                params.push(options.carrier);
            }

            query += `
        GROUP BY DATE(recorded_at), carrier
        ORDER BY date ASC, carrier ASC
      `;

            return databaseService.query<PriceEvolution>(query, params, "get-price-evolution");
        }, { userId, ...options });
    }

    /**
     * Get list of unique carriers for a user
     */
    async getCarriers(userId: string): Promise<string[]> {
        return this.executeOperation("getCarriers", async () => {
            const results = await databaseService.query<{ carrier: string }>(
                `SELECT DISTINCT carrier FROM shipping_price_history WHERE user_id = ? ORDER BY carrier`,
                [userId],
                "get-carriers"
            );
            return results.map((r) => r.carrier);
        }, { userId });
    }

    /**
     * Delete a history record
     */
    async deleteRecord(userId: string, recordId: string): Promise<boolean> {
        return this.executeOperation("deleteRecord", async () => {
            const db = await databaseService.getDb() as BetterSQLite3Database<typeof schema>;

            const result = await db
                .delete(shippingPriceHistory)
                .where(
                    and(
                        eq(shippingPriceHistory.id, recordId),
                        eq(shippingPriceHistory.userId, userId)
                    )
                )
                .returning();

            return result.length > 0;
        }, { userId, recordId });
    }

    /**
     * Get the latest price per gram for a carrier
     */
    async getLatestPrice(userId: string, carrier: string): Promise<number | null> {
        return this.executeOperation("getLatestPrice", async () => {
            const result = await databaseService.queryOne<{ pricePerGram: number }>(
                `SELECT price_per_gram as pricePerGram 
         FROM shipping_price_history 
         WHERE user_id = ? AND carrier = ?
         ORDER BY recorded_at DESC
         LIMIT 1`,
                [userId, carrier],
                "get-latest-price"
            );
            return result?.pricePerGram ?? null;
        }, { userId, carrier });
    }
}

// Export singleton instance
export const shippingHistoryService = new ShippingHistoryService();
