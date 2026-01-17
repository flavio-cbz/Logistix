import { eq, and, sql, inArray } from "drizzle-orm";
import {
  BaseRepository,
  FilterOptions,
  combineConditions,
} from "./base-repository";
import { DatabaseService } from "@/lib/database";
import { orders, NewOrder } from "@/lib/database/schema";
import { Order } from "@/lib/types/entities";

// ============================================================================
// ORDER REPOSITORY
// ============================================================================
// Specialized repository for order management operations

export interface OrderFilterOptions extends FilterOptions {
  userId?: string;
  superbuyId?: string;
  status?: string;
}

export class OrderRepository extends BaseRepository<
  typeof orders,
  Order,
  NewOrder
> {
  constructor(databaseService: DatabaseService) {
    super(orders, databaseService, {
      enableLogging: process.env['NODE_ENV'] === "development",
      defaultLimit: 100,
      maxLimit: 500,
      tableName: "orders",
    });
  }

  /**
   * Find orders by user ID
   */
  public async findByUserId(
    userId: string,
    options: FilterOptions = {},
  ): Promise<Order[]> {
    try {
      return await this.findAll({
        ...options,
        where: combineConditions(
          eq(this.table.userId, userId),
          options.where
        ),
        orderBy: options.orderBy || "createdAt",
        orderDirection: options.orderDirection || "desc",
      });
    } catch (error) {
      this.logError("findByUserId failed", error, { userId, options });
      throw error;
    }
  }

  /**
   * Find order by ID and user ID (secure)
   */
  public async findByIdAndUserId(
    id: string,
    userId: string,
  ): Promise<Order | null> {
    try {
      return await this.executeCustomQuery((db) => {
        const result = db
          .select()
          .from(this.table)
          .where(
            and(
              eq(this.table.id, id),
              eq(this.table.userId, userId)
            )
          )
          .get();

        return (result as Order) || null;
      }, "findByIdAndUserId");
    } catch (error) {
      this.logError("findByIdAndUserId failed", error, { id, userId });
      throw error;
    }
  }

  /**
   * Find order by Superbuy ID
   */
  public async findBySuperbuyId(
    superbuyId: string,
    userId?: string,
  ): Promise<Order | null> {
    try {
      return await this.executeCustomQuery((db) => {
        const conditions = [
          eq(this.table.superbuyId, superbuyId)
        ];

        if (userId) {
          conditions.push(eq(this.table.userId, userId));
        }

        const result = db
          .select()
          .from(this.table)
          .where(and(...conditions))
          .get();

        return (result as Order) || null;
      }, "findBySuperbuyId");
    } catch (error) {
      this.logError("findBySuperbuyId failed", error, { superbuyId, userId });
      throw error;
    }
  }

  /**
   * Check if Superbuy ID exists for a user
   */
  public async superbuyIdExists(
    superbuyId: string,
    userId: string,
    excludeId?: string,
  ): Promise<boolean> {
    try {
      return await this.executeCustomQuery((db) => {
        let whereClause = and(
          eq(this.table.superbuyId, superbuyId),
          eq(this.table.userId, userId),
        );

        if (excludeId) {
          whereClause = and(
            eq(this.table.superbuyId, superbuyId),
            eq(this.table.userId, userId),
            sql`${this.table.id} != ${excludeId}`,
          );
        }

        const result = db
          .select({ id: this.table.id })
          .from(this.table)
          .where(whereClause)
          .get();

        return result !== undefined;
      }, "superbuyIdExists");
    } catch (error) {
      this.logError("superbuyIdExists failed", error, {
        superbuyId,
        userId,
        excludeId,
      });
      throw error;
    }
  }

  /**
   * Find orders by a list of Superbuy IDs for a specific user
   */
  async findBySuperbuyIds(userId: string, superbuyIds: string[]): Promise<Order[]> {
    if (superbuyIds.length === 0) return [];

    return this.executeCustomQuery(async (db) => {
      const results = await db
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.userId, userId),
            inArray(orders.superbuyId, superbuyIds)
          )
        );

      return results as Order[];
    });
  }
  /**
   * Upsert multiple orders (insert or update on conflict)
   * Uses superbuyId as the conflict key
   */
  public async upsertMany(data: NewOrder[]): Promise<void> {
    if (data.length === 0) return;

    await this.executeCustomTransaction((db) => {
      for (const item of data) {
        const insertData = this.addTimestamps(item, "create");

        // Check if exists first (manual upsert for SQLite without strict unique constraints)
        // Assuming superbuyId is unique per user or globally.

        const existing = db
          .select()
          .from(orders)
          .where(eq(orders.superbuyId, item.superbuyId))
          .get();

        if (existing) {
          // Update
          const updateData = this.addTimestamps(item, "update");
          // Don't overwrite id or createdAt
          delete updateData.id;
          delete updateData.createdAt;

          db.update(orders)
            .set(updateData)
            .where(eq(orders.id, existing.id))
            .run();
        } else {
          // Insert
          db.insert(orders).values(insertData).run();
        }
      }
    });
  }
}
