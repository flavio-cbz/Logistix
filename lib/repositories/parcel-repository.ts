import { eq, and, sql, gte, lte, asc, desc, inArray, SQL, or } from "drizzle-orm";
import {
  BaseRepository,
  FilterOptions,
  buildTextSearch,
  buildDateRange,
  combineConditions,
} from "./base-repository";
import { DatabaseService } from "@/lib/database";
import { parcels, NewParcel, products } from "@/lib/database/schema";
import { Parcel } from "@/lib/types/entities";

// ============================================================================
// PARCEL REPOSITORY
// ============================================================================
// Specialized repository for parcel management operations

export interface ParcelFilterOptions extends FilterOptions {
  userId?: string | undefined;
  superbuyId?: string | undefined;
  trackingNumber?: string | undefined;
  carrier?: string | undefined;
  status?: string | undefined;
  searchTerm?: string | undefined;
  totalPriceMin?: number | undefined;
  totalPriceMax?: number | undefined;
  weightMin?: number | undefined;
  weightMax?: number | undefined;
  dateFrom?: string | undefined;
  dateTo?: string | undefined;
}

export interface ParcelStats {
  totalParcels: number;
  totalPrice: number;
  totalWeight: number;
  averagePricePerGram: number;
  byCarrier: Record<
    string,
    {
      count: number;
      totalWeight: number;
      totalPrice: number;
      averagePricePerGram: number;
    }
  >;
}

export interface ParcelWithProducts extends Parcel {
  productCount: number;
  totalProductValue: number;
}

export class ParcelRepository extends BaseRepository<
  typeof parcels,
  Parcel,
  NewParcel
> {
  constructor(databaseService: DatabaseService) {
    super(parcels, databaseService, {
      enableLogging: process.env['NODE_ENV'] === "development",
      defaultLimit: 100,
      maxLimit: 500,
      tableName: "parcels",
    });
  }

  /**
   * Override findAll
   */
  public override async findAll(options: FilterOptions = {}): Promise<Parcel[]> {
    return super.findAll(options);
  }

  /**
   * Override create
   */
  public override async create(data: NewParcel): Promise<Parcel> {
    return super.create(data);
  }

  /**
   * Override update
   */
  public override async update(
    id: string,
    data: Partial<NewParcel>,
  ): Promise<Parcel | null> {
    return super.update(id, data);
  }

  /**
   * Find parcels by user ID (active only)
   */
  public async findByUserId(
    userId: string,
    options: FilterOptions = {},
  ): Promise<Parcel[]> {
    try {
      return await this.findAll({
        ...options,
        where: combineConditions(
          and(
            eq(this.table.userId, userId),
            eq(this.table.isActive, 1)
          ),
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
   * Find parcel by ID and user ID (secure, active only)
   */
  public async findByIdAndUserId(
    id: string,
    userId: string,
  ): Promise<Parcel | null> {
    try {
      return await this.executeCustomQuery((db) => {
        const result = db
          .select()
          .from(this.table)
          .where(
            and(
              eq(this.table.id, id),
              eq(this.table.userId, userId),
              eq(this.table.isActive, 1)
            )
          )
          .get();

        return (result as Parcel) || null;
      }, "findByIdAndUserId");
    } catch (error) {
      this.logError("findByIdAndUserId failed", error, { id, userId });
      throw error;
    }
  }

  /**
   * Find parcel by superbuyId (active only)
   */
  public async findBySuperbuyId(
    superbuyId: string,
    userId?: string,
  ): Promise<Parcel | null> {
    try {
      return await this.executeCustomQuery((db) => {
        const conditions = [
          eq(this.table.superbuyId, superbuyId),
          eq(this.table.isActive, 1)
        ];

        if (userId) {
          conditions.push(eq(this.table.userId, userId));
        }

        const result = db
          .select()
          .from(this.table)
          .where(and(...conditions))
          .get();

        return (result as Parcel) || null;
      }, "findBySuperbuyId");
    } catch (error) {
      this.logError("findBySuperbuyId failed", error, { superbuyId, userId });
      throw error;
    }
  }

  /**
   * Find parcels by a list of superbuyIds
   */
  async findBySuperbuyIds(userId: string, superbuyIds: string[]): Promise<Parcel[]> {
    if (superbuyIds.length === 0) return [];

    return this.executeCustomQuery(async (db) => {
      const results = await db
        .select()
        .from(parcels)
        .where(
          and(
            eq(parcels.userId, userId),
            inArray(parcels.superbuyId, superbuyIds)
          )
        );

      return results as Parcel[];
    });
  }

  /**
   * Find parcels with advanced filtering
   */
  public async findParcels(
    options: ParcelFilterOptions = {},
  ): Promise<Parcel[]> {
    try {
      return await this.executeCustomQuery(() => {
        const conditions: (SQL | undefined)[] = [];

        // User filter
        if (options.userId) {
          conditions.push(eq(this.table.userId, options.userId));
        }

        // Superbuy ID filter
        if (options.superbuyId) {
          conditions.push(eq(this.table.superbuyId, options.superbuyId));
        }

        // Carrier filter
        if (options.carrier) {
          conditions.push(eq(this.table.carrier, options.carrier));
        }

        // Status filter
        if (options.status) {
          conditions.push(eq(this.table.status, options.status));
        }

        // Price range filters (using totalPrice)
        if (options.totalPriceMin !== undefined) {
          conditions.push(gte(this.table.totalPrice, options.totalPriceMin));
        }
        if (options.totalPriceMax !== undefined) {
          conditions.push(lte(this.table.totalPrice, options.totalPriceMax));
        }

        // Weight range filters
        if (options.weightMin !== undefined) {
          conditions.push(gte(this.table.weight, options.weightMin));
        }
        if (options.weightMax !== undefined) {
          conditions.push(lte(this.table.weight, options.weightMax));
        }

        // Date range filter
        const dateRange = buildDateRange(
          this.table.createdAt,
          options.dateFrom,
          options.dateTo,
        );
        if (dateRange) {
          conditions.push(dateRange);
        }

        // Search term (searches superbuyId, carrier, name)
        if (options.searchTerm) {
          const searchConditions = [
            buildTextSearch(this.table.superbuyId, options.searchTerm),
            buildTextSearch(this.table.carrier, options.searchTerm),
            buildTextSearch(this.table.name, options.searchTerm),
          ];
          conditions.push(or(...searchConditions));
        }

        // Combine all conditions
        const whereClause = combineConditions(options.where, ...conditions);

        return this.findAll({
          ...options,
          where: whereClause,
        });
      }, "findParcels");
    } catch (error) {
      this.logError("findParcels failed", error, { options });
      throw error;
    }
  }

  /**
   * Find parcels by carrier
   */
  public async findByCarrier(
    carrier: string,
    options: FilterOptions = {},
  ): Promise<Parcel[]> {
    try {
      return await this.findAll({
        ...options,
        where: combineConditions(
          eq(this.table.carrier, carrier),
          options.where,
        ),
      });
    } catch (error) {
      this.logError("findByCarrier failed", error, {
        carrier,
        options,
      });
      throw error;
    }
  }

  /**
   * Check if superbuyId exists for a user
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
   * Calculate and update price per gram
   */
  public async updatePricePerGram(id: string): Promise<Parcel | null> {
    try {
      return await this.executeCustomQuery((db) => {
        // First get the current parcel
        const parcel = db
          .select()
          .from(this.table)
          .where(eq(this.table.id, id))
          .get() as Parcel | undefined;

        if (!parcel) return null;

        // Calculate price per gram
        let pricePerGram = 0;
        if (parcel.weight && parcel.weight > 0 && parcel.totalPrice) {
          pricePerGram = parcel.totalPrice / parcel.weight;
        }

        // Update the parcel
        const result = db
          .update(this.table)
          .set({
            pricePerGram,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(this.table.id, id))
          .returning()
          .get();

        return (result as Parcel | undefined) || null;
      }, "updatePricePerGram");
    } catch (error) {
      this.logError("updatePricePerGram failed", error, { id });
      throw error;
    }
  }

  /**
   * Update parcel with automatic price per gram calculation
   */
  public async updateWithCalculation(
    id: string,
    data: Partial<NewParcel>,
  ): Promise<Parcel | null> {
    try {
      return await this.executeCustomQuery((db) => {
        // Calculate price per gram if weight and totalPrice are provided
        const updateData = { ...data };

        if (data.weight && data.totalPrice) {
          updateData.pricePerGram = data.totalPrice / data.weight;
        } else if (data.weight || data.totalPrice) {
          // If only one is updated, get the current values
          const current = db
            .select()
            .from(this.table)
            .where(eq(this.table.id, id))
            .get() as Parcel | undefined;

          if (current) {
            const weight = data.weight ?? current.weight;
            const totalPrice = data.totalPrice ?? current.totalPrice;

            if (weight && totalPrice && weight > 0) {
              updateData.pricePerGram = totalPrice / weight;
            }
          }
        }

        // Add timestamp
        updateData.updatedAt = new Date().toISOString();

        const result = db
          .update(this.table)
          .set(updateData)
          .where(eq(this.table.id, id))
          .returning()
          .get();

        return (result as Parcel | undefined) || null;
      }, "updateWithCalculation");
    } catch (error) {
      this.logError("updateWithCalculation failed", error, { id, data });
      throw error;
    }
  }

  /**
   * Get parcel statistics for a user
   */
  public async getParcelStats(userId: string): Promise<ParcelStats> {
    try {
      return await this.executeCustomQuery((db) => {
        // Get all parcels for the user
        const parcels = db
          .select()
          .from(this.table)
          .where(eq(this.table.userId, userId))
          .all() as Parcel[];

        const stats: ParcelStats = {
          totalParcels: parcels.length,
          totalPrice: 0,
          totalWeight: 0,
          averagePricePerGram: 0,
          byCarrier: {},
        };

        const carrierStats: Record<
          string,
          {
            count: number;
            totalWeight: number;
            totalPrice: number;
            averagePricePerGram: number;
          }
        > = {};

        let totalWeightedPricePerGram = 0;
        let totalWeight = 0;

        // Process each parcel
        parcels.forEach((parcel) => {
          // Totals
          stats.totalPrice += parcel.totalPrice || 0;
          stats.totalWeight += parcel.weight || 0;

          // Carrier stats
          const carrier = parcel.carrier || "Unknown";
          if (!carrierStats[carrier]) {
            carrierStats[carrier] = {
              count: 0,
              totalWeight: 0,
              totalPrice: 0,
              averagePricePerGram: 0,
            };
          }

          carrierStats[carrier].count++;
          carrierStats[carrier].totalWeight += parcel.weight || 0;
          carrierStats[carrier].totalPrice += parcel.totalPrice || 0;

          // Weighted average price per gram
          if (parcel.weight && parcel.pricePerGram) {
            totalWeightedPricePerGram +=
              parcel.pricePerGram * parcel.weight;
            totalWeight += parcel.weight;
          }
        });

        // Calculate average price per gram
        stats.averagePricePerGram =
          totalWeight > 0 ? totalWeightedPricePerGram / totalWeight : 0;

        // Calculate carrier averages
        Object.keys(carrierStats).forEach((carrier) => {
          const tStats = carrierStats[carrier]!;
          tStats.averagePricePerGram =
            tStats.totalWeight > 0 ? tStats.totalPrice / tStats.totalWeight : 0;
        });

        stats.byCarrier = carrierStats;

        return stats;
      }, "getParcelStats");
    } catch (error) {
      this.logError("getParcelStats failed", error, { userId });
      throw error;
    }
  }

  /**
   * Get unique carriers for a user
   */
  public async getUserCarriers(userId: string): Promise<string[]> {
    try {
      return await this.executeCustomQuery((db) => {
        let query = db
          .selectDistinct({ carrier: this.table.carrier })
          .from(this.table)
          .where(
            and(
              eq(this.table.userId, userId),
              sql`${this.table.carrier} IS NOT NULL AND ${this.table.carrier} != ''`,
            ),
          )
          .$dynamic();

        query = query.orderBy(asc(this.table.carrier));

        const results = query.all();

        return (results)
          .map((r) => r.carrier)
          .filter(Boolean) as string[];
      }, "getUserCarriers");
    } catch (error) {
      this.logError("getUserCarriers failed", error, { userId });
      throw error;
    }
  }

  /**
   * Get parcels with product information
   */
  public async findParcelsWithProducts(
    userId: string,
  ): Promise<ParcelWithProducts[]> {
    try {
      return await this.executeCustomQuery((db) => {

        let query2 = db
          .select()
          .from(this.table)
          .where(eq(this.table.userId, userId))
          .$dynamic();

        query2 = query2.orderBy(desc(this.table.createdAt));

        const parcelList = query2.all() as Parcel[];

        // Get product counts for each parcel
        const parcelsWithProducts: ParcelWithProducts[] = [];

        for (const parcel of parcelList) {
          const productCount = db
            .select({ count: sql`COUNT(*)` })
            .from(products)
            .where(eq(products.parcelId, parcel.id))
            .get();

          // Could also calculate total value from products if needed, 
          // but for now keeping it simple or consistent with how it was (using parcels value?)
          // Legacy code summed parcel value, but that's already on the parcel (totalPrice).
          // Maybe it meant "Value of products inside"? 
          // If legacy code did: sum(products.price), then we should do that.
          // Checking legacy: "COALESCE(SUM(price), 0)" from THIS table (parcelles).
          // So it was summing PARCELS? No, that doesn't make sense if iterating parcelles.
          // It was likely a JOIN or subquery on PRODUCTS.
          // Let's assume it should sum products price.

          const totalValue = db
            .select({ total: sql`COALESCE(SUM(price), 0)` })
            .from(products)
            .where(eq(products.parcelId, parcel.id))
            .get();

          parcelsWithProducts.push({
            ...parcel,
            productCount: Number(productCount?.count || 0),
            totalProductValue: Number(totalValue?.total || 0),
          });
        }

        return parcelsWithProducts;
      }, "findParcelsWithProducts");
    } catch (error) {
      this.logError("findParcelsWithProducts failed", error, { userId });
      return [];
    }
  }

  /**
   * Count products associated with a parcel
   */
  public async countProductsByParcelId(parcelId: string): Promise<number> {
    try {
      return await this.executeCustomQuery((db) => {

        const result = db
          .select({ count: sql<number>`COUNT(*)` })
          .from(products)
          .where(eq(products.parcelId, parcelId))
          .get();

        return Number(result?.count || 0);
      }, "countProductsByParcelId");
    } catch (error) {
      this.logError("countProductsByParcelId failed", error, { parcelId });
      throw error;
    }
  }

  /**
   * Delete parcel and handle related products
   */
  public async deleteWithProducts(id: string): Promise<boolean> {
    try {
      return await this.executeCustomTransaction((db) => {

        // First, update any products that reference this parcel
        db.update(products)
          .set({ parcelId: null })
          .where(eq(products.parcelId, id))
          .run();

        // Then delete the parcel
        const result = db
          .delete(this.table)
          .where(eq(this.table.id, id))
          .returning()
          .get();

        return result !== undefined;
      }, "deleteWithProducts");
    } catch (error) {
      this.logError("deleteWithProducts failed", error, { id });
      throw error;
    }
  }

  /**
   * Get carrier suggestions for search
   */
  public async getCarrierSuggestions(query: string): Promise<{ carrier: string; count: number }[]> {
    try {
      return await this.executeCustomQuery((db) => {
        const results = db
          .select({
            carrier: this.table.carrier,
            count: sql<number>`COUNT(*)`,
          })
          .from(this.table)
          .where(sql`${this.table.carrier} LIKE ${`%${query}%`}`)
          .groupBy(this.table.carrier)
          .orderBy(desc(sql`COUNT(*)`))
          .limit(5)
          .all();

        return results.map((r) => ({
          carrier: r.carrier,
          count: Number(r.count),
        }));
      }, "getCarrierSuggestions");
    } catch (error) {
      this.logError("getCarrierSuggestions failed", error, { query });
      return [];
    }
  }

  /**
   * Upsert multiple parcels (used by automation)
   */
  public async upsertMany(data: NewParcel[]): Promise<void> {
    if (data.length === 0) return;

    await this.executeCustomTransaction((db) => {
      for (const item of data) {
        // Handle timestamps manually if needed, or rely on defaults
        // BaseRepository.addTimestamps equivalent?
        const now = new Date().toISOString();
        const insertData = { ...item, createdAt: now, updatedAt: now };

        const existing = db
          .select()
          .from(parcels)
          .where(eq(parcels.superbuyId, item.superbuyId))
          .get();

        if (existing) {
          // Update
          const updateData = { ...item, updatedAt: now };
          // Remove ID/createdAt if present
          const { id: _id, createdAt: _createdAt, ...rest } = updateData;

          db.update(parcels)
            .set(rest)
            .where(eq(parcels.id, existing.id))
            .run();
        } else {
          // Insert
          db.insert(parcels).values(insertData).run();
        }
      }
    });
  }
}

