import { eq, and, sql, gte, lte, asc, desc } from "drizzle-orm";
import {
  BaseRepository,
  FilterOptions,
  buildTextSearch,
  buildDateRange,
  combineConditions,
} from "./base-repository";
import { DatabaseService } from "@/lib/database";
import { parcelles, NewParcelle } from "@/lib/database/schema";
import { Parcelle } from "@/lib/types/entities";
import { transformDbParcelleToEntity } from "@/lib/transformers/parcelle-transformer";

// ============================================================================
// PARCELLE REPOSITORY
// ============================================================================
// Specialized repository for parcelle (parcel) management operations

export interface ParcelleFilterOptions extends FilterOptions {
  userId?: string;
  numero?: string;
  transporteur?: string;
  searchTerm?: string;
  prixAchatMin?: number;
  prixAchatMax?: number;
  poidsMin?: number;
  poidsMax?: number;
  prixTotalMin?: number;
  prixTotalMax?: number;
  dateFrom?: string;
  dateTo?: string;
}

export interface ParcelleStats {
  totalParcelles: number;
  totalPrixAchat: number;
  totalPoids: number;
  totalPrixTotal: number;
  averagePrixParGramme: number;
  byTransporteur: Record<
    string,
    {
      count: number;
      totalPoids: number;
      totalPrix: number;
      averagePrixParGramme: number;
    }
  >;
}

export interface ParcelleWithProducts extends Parcelle {
  productCount: number;
  totalProductValue: number;
}

export class ParcelleRepository extends BaseRepository<
  typeof parcelles,
  any, // Use any for TSelect since we transform it
  NewParcelle
> {
  constructor(databaseService: DatabaseService) {
    super(parcelles, databaseService, {
      enableLogging: process.env.NODE_ENV === "development",
      defaultLimit: 100,
      maxLimit: 500,
      tableName: "parcelles",
    });
  }

  /**
   * Override findAll to transform database results to Parcelle entities
   */
  public override async findAll(options: FilterOptions = {}): Promise<Parcelle[]> {
    const dbResults = await super.findAll(options);
    return dbResults.map(transformDbParcelleToEntity);
  }

  /**
   * Override create to transform database result to Parcelle entity
   */
  public override async create(data: NewParcelle): Promise<Parcelle> {
    const dbResult = await super.create(data);
    return transformDbParcelleToEntity(dbResult);
  }

  /**
   * Override update to transform database result to Parcelle entity
   */
  public override async update(
    id: string,
    data: Partial<NewParcelle>,
  ): Promise<Parcelle | null> {
    const dbResult = await super.update(id, data);
    return dbResult ? transformDbParcelleToEntity(dbResult) : null;
  }

  /**
   * Find parcelles by user ID
   */
  public async findByUserId(
    userId: string,
    options: FilterOptions = {},
  ): Promise<Parcelle[]> {
    try {
      return await this.findAll({
        ...options,
        where: combineConditions(eq(this.table.userId, userId), options.where),
        orderBy: options.orderBy || "createdAt",
        orderDirection: options.orderDirection || "desc",
      });
    } catch (error) {
      this.logError("findByUserId failed", error, { userId, options });
      throw error;
    }
  }

  /**
   * Find parcelle by numero
   */
  public async findByNumero(
    numero: string,
    userId?: string,
  ): Promise<Parcelle | null> {
    try {
      return await this.executeCustomQuery((db) => {
        let query = db.select().from(this.table) as any;

        query = query.where(eq(this.table.numero, numero));

        if (userId) {
          query = query.where(
            and(eq(this.table.numero, numero), eq(this.table.userId, userId)),
          );
        }

        const result = query.get();
        return (result as Parcelle | undefined) || null;
      }, "findByNumero");
    } catch (error) {
      this.logError("findByNumero failed", error, { numero, userId });
      throw error;
    }
  }

  /**
   * Find parcelles with advanced filtering
   */
  public async findParcelles(
    options: ParcelleFilterOptions = {},
  ): Promise<Parcelle[]> {
    try {
      return await this.executeCustomQuery(() => {
        const conditions: any[] = [];

        // User filter
        if (options.userId) {
          conditions.push(eq(this.table.userId, options.userId));
        }

        // Numero filter
        if (options.numero) {
          conditions.push(eq(this.table.numero, options.numero));
        }

        // Transporteur filter
        if (options.transporteur) {
          conditions.push(eq(this.table.transporteur, options.transporteur));
        }

        // Price range filters
        if (options.prixAchatMin !== undefined) {
          conditions.push(gte(this.table.prixAchat, options.prixAchatMin));
        }
        if (options.prixAchatMax !== undefined) {
          conditions.push(lte(this.table.prixAchat, options.prixAchatMax));
        }

        // Weight range filters
        if (options.poidsMin !== undefined) {
          conditions.push(gte(this.table.poids, options.poidsMin));
        }
        if (options.poidsMax !== undefined) {
          conditions.push(lte(this.table.poids, options.poidsMax));
        }

        // Total price range filters
        if (options.prixTotalMin !== undefined) {
          conditions.push(gte(this.table.prixTotal, options.prixTotalMin));
        }
        if (options.prixTotalMax !== undefined) {
          conditions.push(lte(this.table.prixTotal, options.prixTotalMax));
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

        // Search term (searches numero, transporteur)
        if (options.searchTerm) {
          const searchConditions = [
            buildTextSearch(this.table.numero, options.searchTerm),
            buildTextSearch(this.table.transporteur, options.searchTerm),
          ];
          conditions.push(sql`(${searchConditions.join(" OR ")})`);
        }

        // Combine all conditions
        const whereClause = combineConditions(options.where, ...conditions);

        return this.findAll({
          ...options,
          where: whereClause,
        });
      }, "findParcelles");
    } catch (error) {
      this.logError("findParcelles failed", error, { options });
      throw error;
    }
  }

  /**
   * Find parcelles by transporteur
   */
  public async findByTransporteur(
    transporteur: string,
    options: FilterOptions = {},
  ): Promise<Parcelle[]> {
    try {
      return await this.findAll({
        ...options,
        where: combineConditions(
          eq(this.table.transporteur, transporteur),
          options.where,
        ),
      });
    } catch (error) {
      this.logError("findByTransporteur failed", error, {
        transporteur,
        options,
      });
      throw error;
    }
  }

  /**
   * Check if numero exists for a user
   */
  public async numeroExists(
    numero: string,
    userId: string,
    excludeId?: string,
  ): Promise<boolean> {
    try {
      return await this.executeCustomQuery((db) => {
        let whereClause = and(
          eq(this.table.numero, numero),
          eq(this.table.userId, userId),
        );

        if (excludeId) {
          whereClause = and(
            eq(this.table.numero, numero),
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
      }, "numeroExists");
    } catch (error) {
      this.logError("numeroExists failed", error, {
        numero,
        userId,
        excludeId,
      });
      throw error;
    }
  }

  /**
   * Calculate and update prix par gramme
   */
  public async updatePrixParGramme(id: string): Promise<Parcelle | null> {
    try {
      return await this.executeCustomQuery((db) => {
        // First get the current parcelle
        const parcelle = db
          .select()
          .from(this.table)
          .where(eq(this.table.id, id))
          .get() as Parcelle | undefined;

        if (!parcelle) return null;

        // Calculate prix par gramme
        let prixParGramme = 0;
        if (parcelle.poids && parcelle.poids > 0 && parcelle.prixTotal) {
          prixParGramme = parcelle.prixTotal / parcelle.poids;
        }

        // Update the parcelle
        const result = db
          .update(this.table)
          .set({
            prixParGramme,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(this.table.id, id))
          .returning()
          .get();

        return (result as Parcelle | undefined) || null;
      }, "updatePrixParGramme");
    } catch (error) {
      this.logError("updatePrixParGramme failed", error, { id });
      throw error;
    }
  }

  /**
   * Update parcelle with automatic prix par gramme calculation
   */
  public async updateWithCalculation(
    id: string,
    data: Partial<NewParcelle>,
  ): Promise<Parcelle | null> {
    try {
      return await this.executeCustomQuery((db) => {
        // Calculate prix par gramme if poids and prixTotal are provided
        const updateData = { ...data };

        if (data.poids && data.prixTotal) {
          updateData.prixParGramme = data.prixTotal / data.poids;
        } else if (data.poids || data.prixTotal) {
          // If only one is updated, get the current values
          const current = db
            .select()
            .from(this.table)
            .where(eq(this.table.id, id))
            .get() as Parcelle | undefined;

          if (current) {
            const poids = data.poids ?? current.poids;
            const prixTotal = data.prixTotal ?? current.prixTotal;

            if (poids && prixTotal && poids > 0) {
              updateData.prixParGramme = prixTotal / poids;
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

        return (result as Parcelle | undefined) || null;
      }, "updateWithCalculation");
    } catch (error) {
      this.logError("updateWithCalculation failed", error, { id, data });
      throw error;
    }
  }

  /**
   * Get parcelle statistics for a user
   */
  public async getParcelleStats(userId: string): Promise<ParcelleStats> {
    try {
      return await this.executeCustomQuery((db) => {
        // Get all parcelles for the user
        const parcelles = db
          .select()
          .from(this.table)
          .where(eq(this.table.userId, userId))
          .all() as Parcelle[];

        const stats: ParcelleStats = {
          totalParcelles: parcelles.length,
          totalPrixAchat: 0,
          totalPoids: 0,
          totalPrixTotal: 0,
          averagePrixParGramme: 0,
          byTransporteur: {},
        };

        const transporteurStats: Record<
          string,
          {
            count: number;
            totalPoids: number;
            totalPrix: number;
            averagePrixParGramme: number;
          }
        > = {};

        let totalWeightedPrixParGramme = 0;
        let totalPoids = 0;

        // Process each parcelle
        parcelles.forEach((parcelle) => {
          // Totals
          stats.totalPrixAchat += parcelle.prixAchat || 0;
          stats.totalPoids += parcelle.poids || 0;
          stats.totalPrixTotal += parcelle.prixTotal || 0;

          // Transporteur stats
          const transporteur = parcelle.transporteur;
          if (!transporteurStats[transporteur]) {
            transporteurStats[transporteur] = {
              count: 0,
              totalPoids: 0,
              totalPrix: 0,
              averagePrixParGramme: 0,
            };
          }

          transporteurStats[transporteur].count++;
          transporteurStats[transporteur].totalPoids += parcelle.poids || 0;
          transporteurStats[transporteur].totalPrix += parcelle.prixTotal || 0;

          // Weighted average prix par gramme
          if (parcelle.poids && parcelle.prixParGramme) {
            totalWeightedPrixParGramme +=
              parcelle.prixParGramme * parcelle.poids;
            totalPoids += parcelle.poids;
          }
        });

        // Calculate average prix par gramme
        stats.averagePrixParGramme =
          totalPoids > 0 ? totalWeightedPrixParGramme / totalPoids : 0;

        // Calculate transporteur averages
        Object.keys(transporteurStats).forEach((transporteur) => {
          const tStats = transporteurStats[transporteur];
          tStats.averagePrixParGramme =
            tStats.totalPoids > 0 ? tStats.totalPrix / tStats.totalPoids : 0;
        });

        stats.byTransporteur = transporteurStats;

        return stats;
      }, "getParcelleStats");
    } catch (error) {
      this.logError("getParcelleStats failed", error, { userId });
      throw error;
    }
  }

  /**
   * Get unique transporteurs for a user
   */
  public async getUserTransporteurs(userId: string): Promise<string[]> {
    try {
      return await this.executeCustomQuery((db) => {
        let query: any = db
          .selectDistinct({ transporteur: this.table.transporteur })
          .from(this.table)
          .where(
            and(
              eq(this.table.userId, userId),
              sql`${this.table.transporteur} IS NOT NULL AND ${this.table.transporteur} != ''`,
            ),
          );

        if ((query as any).orderBy) {
          query = (query as any).orderBy(asc(this.table.transporteur));
        }

        const results = query.all();

        return (results as any[])
          .map((r) => r.transporteur)
          .filter(Boolean) as string[];
      }, "getUserTransporteurs");
    } catch (error) {
      this.logError("getUserTransporteurs failed", error, { userId });
      throw error;
    }
  }

  /**
   * Get parcelles with product information
   */
  public async findParcellesWithProducts(
    userId: string,
  ): Promise<ParcelleWithProducts[]> {
    try {
      return await this.executeCustomQuery((db) => {
        // This would require a JOIN with products table
        // For now, we'll get parcelles and then get product counts separately
        let query2: any = db
          .select()
          .from(this.table)
          .where(eq(this.table.userId, userId));

        if ((query2 as any).orderBy) {
          query2 = (query2 as any).orderBy(desc(this.table.createdAt));
        }

        const parcelles = query2.all() as Parcelle[];

        // Get product counts for each parcelle
        const parcellesWithProducts: ParcelleWithProducts[] = [];

        for (const parcelle of parcelles) {
          // Note: This would normally be done with a JOIN, but we're keeping it simple
          // In a real implementation, you'd want to do this in a single query
          const productCount = db
            .select({ count: sql`COUNT(*)` })
            .from(this.table)
            .where(eq(this.table.parcelleId, parcelle.id))
            .get();

          const totalValue = db
            .select({ total: sql`COALESCE(SUM(price), 0)` })
            .from(this.table)
            .where(eq(this.table.parcelleId, parcelle.id))
            .get();

          parcellesWithProducts.push({
            ...parcelle,
            productCount: Number(productCount?.count || 0),
            totalProductValue: Number(totalValue?.total || 0),
          });
        }

        return parcellesWithProducts;
      }, "findParcellesWithProducts");
    } catch (error) {
      this.logError("findParcellesWithProducts failed", error, { userId });
      throw error;
    }
  }

  /**
   * Delete parcelle and handle related products
   */
  public async deleteWithProducts(id: string): Promise<boolean> {
    try {
      return await this.executeCustomTransaction((db) => {
        // First, update any products that reference this parcelle
        db.update(this.table)
          .set({ parcelleId: null } as any)
          .where(eq(this.table.parcelleId, id))
          .run();

        // Then delete the parcelle
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
}
