import { BaseService } from "./base-service";
import { ParcelRepository } from "@/lib/repositories";
import { databaseService } from "@/lib/database/database-service";
import {
  Parcel,
  CreateParcelInput,
  UpdateParcelInput,
} from "@/lib/types/entities";
import {
  createParcelSchema,
  updateParcelSchema,
} from "@/lib/schemas/parcelle";
import { NewParcel } from "@/lib/database/schema";
import { CreateParcelFormData } from "@/lib/schemas/parcelle";
import { shippingHistoryService } from "./shipping-history.service";
// Removed unused imports

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

// Schemas imported from shared location

// =============================================================================
// PARCELLE SERVICE
// =============================================================================

export class ParcelleService extends BaseService {
  constructor(private readonly parcelRepository: ParcelRepository) {
    super("ParcelleService");
  }

  /**
   * Get all parcelles for a user
   */
  async getAllParcelles(
    userId: string,
    options?: { page?: number; limit?: number }
  ): Promise<Parcel[] | { data: Parcel[]; total: number; page: number; limit: number }> {
    return this.executeOperation(
      "getAllParcelles",
      async () => {
        this.validateUUID(userId, "userId");

        if (options?.page || options?.limit) {
          const page = options.page || 1;
          const limit = options.limit || 50;
          const offset = (page - 1) * limit;

          const { eq, and } = await import("drizzle-orm");
          const { parcels } = await import("@/lib/database/schema");

          const result = await this.parcelRepository.findWithPagination({
            where: and(eq(parcels.userId, userId), eq(parcels.isActive, 1)),
            limit,
            offset,
            orderBy: "createdAt",
            orderDirection: "desc"
          });

          return {
            data: result.data,
            total: result.total,
            limit: result.limit,
            page: Math.floor(result.offset / result.limit) + 1
          };
        }

        const parcelles = await this.parcelRepository.findByUserId(userId);

        this.logger.debug("Retrieved parcelles from repository", {
          userId,
          count: parcelles.length,
          sample: parcelles.length > 0 ? parcelles[0] : null,
        });

        return parcelles;
      },
      { userId, ...options },
    );
  }

  /**
   * Get a parcelle by ID
   */
  async getParcelleById(id: string, userId?: string): Promise<Parcel | null> {
    return this.executeOperation(
      "getParcelleById",
      async () => {
        this.validateUUID(id, "id");

        if (userId) {
          this.validateUUID(userId, "userId");
        }

        const parcelle = await this.parcelRepository.findById(id);

        // Check user access if userId is provided
        if (parcelle && userId && parcelle.userId !== userId) {
          this.logger.warn("Unauthorized access attempt to parcelle", {
            parcelleId: id,
            requestingUserId: userId,
            parcelleOwnerId: parcelle.userId,
          });

          throw this.createAuthorizationError(
            "Unauthorized access to this parcelle",
          );
        }

        this.logger.debug("Retrieved parcelle from repository", {
          parcelleId: id,
          userId,
          found: !!parcelle,
        });

        return parcelle;
      },
      { parcelleId: id, ...(userId && { userId }) },
    );
  }

  /**
   * Create a new parcelle
   */
  async createParcelle(
    userId: string,
    data: CreateParcelInput,
  ): Promise<Parcel> {
    return this.executeOperation(
      "createParcelle",
      async () => {
        this.validateUUID(userId, "userId");

        // Validate data with Zod
        const validatedData = this.validateWithSchema(
          createParcelSchema,
          data,
        ) as CreateParcelFormData;

        this.logger.debug("Parcelle data validated successfully", {
          userId,
          numero: validatedData.superbuyId,
          transporteur: validatedData.carrier,
        });

        // Check uniqueness of parcelle number for this user (only if numero is being updated)
        if (validatedData.superbuyId) {
          await this.validateUniqueParcelleNumber(userId, validatedData.superbuyId);
        }

        // Prepare create data - the schema already handles transformations
        const parcelleData: NewParcel = {
          ...validatedData,
          superbuyId: validatedData.superbuyId!, // Zod schema guarantees this
          userId,
          isActive: validatedData.isActive === false ? 0 : 1,
        };

        const newParcelle = await this.parcelRepository.create(
          parcelleData,
        );

        // Record shipping price history if we have price per gram
        if (newParcelle.pricePerGram && newParcelle.carrier) {
          try {
            await shippingHistoryService.recordPrice(userId, {
              carrier: newParcelle.carrier,
              pricePerGram: newParcelle.pricePerGram,
              totalWeight: newParcelle.weight ?? undefined,
              totalPrice: newParcelle.totalPrice ?? undefined,
              parcelId: newParcelle.id,
              source: "parcel_update",
            });
          } catch (error) {
            // Log but don't fail parcel creation if history recording fails
            this.logger.warn("Failed to record shipping history", { error });
          }
        }

        this.logger.debug("Parcelle created successfully", {
          userId,
          parcelleId: newParcelle.id,
          numero: newParcelle.superbuyId,
        });

        return newParcelle;
      },
      {
        userId,
        numero: data.superbuyId,
        transporteur: data.carrier,
      },
    );
  }

  /**
   * Update an existing parcelle
   */
  async updateParcelle(
    id: string,
    userId: string,
    data: UpdateParcelInput,
  ): Promise<Parcel | null> {
    return this.executeOperation(
      "updateParcelle",
      async () => {
        this.validateUUID(id, "id");
        this.validateUUID(userId, "userId");

        return await databaseService.executeTransaction(async () => {
          // Ensure parcelle exists and belongs to user
          const existingParcelle = await this.getParcelleById(id, userId);
          if (!existingParcelle) {
            throw this.createNotFoundError("Parcelle", id);
          }

          // Validate data with Zod if data is provided
          let validatedData: UpdateParcelInput = {};
          if (Object.keys(data).length > 0) {
            const rawValidatedData = this.validateWithSchema(updateParcelSchema, data);

            // Filter out undefined values for exactOptionalPropertyTypes compatibility
            validatedData = Object.fromEntries(
              Object.entries(rawValidatedData).filter(([_, value]) => value !== undefined)
            ) as UpdateParcelInput;

            this.logger.debug("Update data validated successfully", {
              parcelleId: id,
              userId,
              updateFields: Object.keys(validatedData),
            });
          }

          // Check uniqueness of parcelle number if being updated
          if (
            validatedData.superbuyId &&
            validatedData.superbuyId !== existingParcelle.superbuyId
          ) {
            await this.validateUniqueParcelleNumber(
              userId,
              validatedData.superbuyId,
              id,
            );
          }

          // Use repository method that handles prix par gramme calculation
          // Convert boolean actif to number for SQLite
          const updateData: Partial<NewParcel> = { ...validatedData };
          if (validatedData.isActive !== undefined) {
            updateData.isActive = validatedData.isActive ? 1 : 0;
          }

          const updatedParcelle =
            await this.parcelRepository.updateWithCalculation(
              id,
              updateData,
            );

          // Record shipping price history if price per gram changed
          if (updatedParcelle?.pricePerGram && updatedParcelle.carrier) {
            const priceChanged = existingParcelle.pricePerGram !== updatedParcelle.pricePerGram;
            const carrierChanged = existingParcelle.carrier !== updatedParcelle.carrier;

            if (priceChanged || carrierChanged) {
              try {
                await shippingHistoryService.recordPrice(userId, {
                  carrier: updatedParcelle.carrier,
                  pricePerGram: updatedParcelle.pricePerGram,
                  totalWeight: updatedParcelle.weight ?? undefined,
                  totalPrice: updatedParcelle.totalPrice ?? undefined,
                  parcelId: updatedParcelle.id,
                  source: "parcel_update",
                });
              } catch (error) {
                // Log but don't fail parcel update if history recording fails
                this.logger.warn("Failed to record shipping history", { error });
              }
            }
          }

          this.logger.debug("Parcelle updated successfully", {
            parcelleId: id,
            userId,
            updated: !!updatedParcelle,
          });

          return updatedParcelle;
        });
      },
      { parcelleId: id, userId },
    );
  }

  /**
   * Delete a parcelle
   */
  async deleteParcelle(id: string, userId: string): Promise<boolean> {
    return this.executeOperation(
      "deleteParcelle",
      async () => {
        this.validateUUID(id, "id");
        this.validateUUID(userId, "userId");

        return await databaseService.executeTransaction(async () => {
          // Ensure parcelle exists and belongs to user
          const existingParcelle = await this.getParcelleById(id, userId);
          if (!existingParcelle) {
            throw this.createNotFoundError("Parcelle", id);
          }

          // Check if there are products associated with this parcelle
          const productCount = await this.parcelRepository.countProductsByParcelId(id);

          if (productCount > 0) {
            this.logger.warn(
              "Attempt to delete parcelle with associated products",
              {
                parcelleId: id,
                userId,
                productCount,
              },
            );

            throw this.createBusinessError(
              `Impossible de supprimer cette parcelle car ${productCount} produit(s) y sont associé(s).`,
            );
          }

          const deleted = await this.parcelRepository.delete(id);

          this.logger.debug("Parcelle deleted successfully", {
            parcelleId: id,
            userId,
            deleted,
          });

          return deleted;
        });
      },
      { parcelleId: id, userId },
    );
  }

  /**
   * Get parcelle statistics for a user
   */
  async getParcelleStats(userId: string) {
    return this.executeOperation(
      "getParcelleStats",
      async () => {
        this.validateUUID(userId, "userId");

        const stats = await this.parcelRepository.getParcelStats(userId);

        this.logger.debug("Retrieved parcelle statistics", {
          userId,
          totalParcels: stats.totalParcels,
        });

        return stats;
      },
      { userId },
    );
  }

  /**
   * Get unique transporteurs for a user
   */
  async getUserTransporteurs(userId: string): Promise<string[]> {
    return this.executeOperation(
      "getUserTransporteurs",
      async () => {
        this.validateUUID(userId, "userId");

        const transporteurs =
          await this.parcelRepository.getUserCarriers(userId);

        this.logger.debug("Retrieved user transporteurs", {
          userId,
          count: transporteurs.length,
        });

        return transporteurs;
      },
      { userId },
    );
  }

  /**
   * Bulk create parcelles (skips duplicates based on numero)
   */
  async bulkCreateParcelles(
    userId: string,
    inputs: CreateParcelInput[],
  ): Promise<{ created: Parcel[]; skipped: number }> {
    return this.executeOperation(
      "bulkCreateParcelles",
      async () => {
        this.validateUUID(userId, "userId");

        if (inputs.length === 0) {
          return { created: [], skipped: 0 };
        }

        // 1. Validate all inputs
        const validInputs = inputs.map((input) => {
          const validated = this.validateWithSchema(createParcelSchema, input) as CreateParcelFormData;
          return { ...validated, userId };
        });

        // 2. Check for existing parcelles
        const numeros = validInputs.map((i) => i.superbuyId).filter(Boolean) as string[];
        const existingParcelles = await this.parcelRepository.findBySuperbuyIds(
          userId,
          numeros,
        );
        const existingNumeros = new Set(existingParcelles.map((p) => p.superbuyId));

        // 3. Filter out duplicates
        const newParcellesData = validInputs.filter(
          (p): p is typeof p & { superbuyId: string } => !!p.superbuyId && !existingNumeros.has(p.superbuyId),
        );

        if (newParcellesData.length === 0) {
          return { created: [], skipped: inputs.length };
        }

        // 4. Bulk create
        const bulkData: NewParcel[] = newParcellesData.map(data => {
          // TS check fails to see that superbuyId is required in NewParcel even though we filtered it
          // We construct the object explicitly to satisfy TypeScript
          const newParcel: NewParcel = {
            userId,
            superbuyId: data.superbuyId as string, // Guaranteed by filter above
            name: data.name,
            trackingNumber: data.trackingNumber,
            carrier: data.carrier,
            weight: typeof data.weight === 'string' ? parseInt(data.weight) : data.weight,
            pricePerGram: data.pricePerGram,
            totalPrice: typeof data.totalPrice === 'string' ? parseFloat(data.totalPrice) : data.totalPrice,
            status: data.status,
            isActive: data.isActive === false ? 0 : 1,
            // Add optional fields if they exist in schema but not in input
          };
          return newParcel;
        });

        const createdParcelles = await this.parcelRepository.createMany(
          bulkData,
        );

        this.logger.info("Bulk created parcelles", {
          userId,
          requested: inputs.length,
          created: createdParcelles.length,
          skipped: inputs.length - createdParcelles.length,
        });

        return {
          created: createdParcelles,
          skipped: inputs.length - createdParcelles.length,
        };
      },
      { userId, count: inputs.length },
    );
  }

  // =============================================================================
  // PRIVATE UTILITY METHODS
  // =============================================================================

  /**
   * Validate uniqueness of parcelle number for a user
   */
  private async validateUniqueParcelleNumber(
    userId: string,
    numero: string,
    excludeParcelleId?: string,
  ): Promise<void> {
    try {
      this.logger.debug("Validating parcelle number uniqueness", {
        userId,
        numero,
        excludeParcelleId,
      });

      const exists = await this.parcelRepository.superbuyIdExists(
        numero,
        userId,
        excludeParcelleId,
      );

      if (exists) {
        throw this.createBusinessError(
          `A parcelle with number "${numero}" already exists`,
        );
      }
    } catch (error: unknown) {
      this.handleError(error, "validateUniqueParcelleNumber", {
        userId,
        numero,
      });
    }
  }
}
