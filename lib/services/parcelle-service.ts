import { BaseService } from "./base-service";
import { ParcelleRepository } from "@/lib/repositories";
import {
  Parcelle,
  CreateParcelleInput,
  UpdateParcelleInput,
} from "@/lib/types/entities";
import {
  createParcelleSchema,
  updateParcelleSchema,
} from "@/lib/schemas/parcelle";
// Removed unused imports

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

// Schemas imported from shared location

// =============================================================================
// PARCELLE SERVICE
// =============================================================================

export class ParcelleService extends BaseService {
  constructor(private readonly parcelleRepository: ParcelleRepository) {
    super("ParcelleService");
  }

  /**
   * Get all parcelles for a user
   */
  async getAllParcelles(userId: string): Promise<Parcelle[]> {
    return this.executeOperation(
      "getAllParcelles",
      async () => {
        this.validateUUID(userId, "userId");

        const parcelles = await this.parcelleRepository.findByUserId(userId);

        this.logger.debug("Retrieved parcelles from repository", {
          userId,
          count: parcelles.length,
        });

        return parcelles;
      },
      { userId },
    );
  }

  /**
   * Get a parcelle by ID
   */
  async getParcelleById(id: string, userId?: string): Promise<Parcelle | null> {
    return this.executeOperation(
      "getParcelleById",
      async () => {
        this.validateUUID(id, "id");

        if (userId) {
          this.validateUUID(userId, "userId");
        }

        const parcelle = await this.parcelleRepository.findById(id);

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
    data: CreateParcelleInput,
  ): Promise<Parcelle> {
    return this.executeOperation(
      "createParcelle",
      async () => {
        this.validateUUID(userId, "userId");

        // Validate data with Zod
        const validatedData = this.validateWithSchema(
          createParcelleSchema,
          data,
        );

        this.logger.debug("Parcelle data validated successfully", {
          userId,
          numero: validatedData.numero,
          transporteur: validatedData.transporteur,
        });

        // Check uniqueness of parcelle number for this user (only if numero is being updated)
        if (validatedData.numero) {
          await this.validateUniqueParcelleNumber(userId, validatedData.numero);
        }

        // Prepare update data - the schema already handles transformations
        const parcelleData = {
          ...validatedData,
          userId,
        };

        const newParcelle = await this.parcelleRepository.create(
          parcelleData as any,
        );

        this.logger.debug("Parcelle created successfully", {
          userId,
          parcelleId: newParcelle.id,
          numero: newParcelle.numero,
        });

        return newParcelle;
      },
      {
        userId,
        numero: data.numero,
        transporteur: data.transporteur,
      },
    );
  }

  /**
   * Update an existing parcelle
   */
  async updateParcelle(
    id: string,
    userId: string,
    data: UpdateParcelleInput,
  ): Promise<Parcelle | null> {
    return this.executeOperation(
      "updateParcelle",
      async () => {
        this.validateUUID(id, "id");
        this.validateUUID(userId, "userId");

        // Ensure parcelle exists and belongs to user
        const existingParcelle = await this.getParcelleById(id, userId);
        if (!existingParcelle) {
          throw this.createNotFoundError("Parcelle", id);
        }

        // Validate data with Zod if data is provided
        let validatedData: UpdateParcelleInput = {};
        if (Object.keys(data).length > 0) {
          const rawValidatedData = this.validateWithSchema(updateParcelleSchema, data);
          
          // Filter out undefined values for exactOptionalPropertyTypes compatibility
          validatedData = Object.fromEntries(
            Object.entries(rawValidatedData).filter(([_, value]) => value !== undefined)
          ) as UpdateParcelleInput;

          this.logger.debug("Update data validated successfully", {
            parcelleId: id,
            userId,
            updateFields: Object.keys(validatedData),
          });
        }

        // Check uniqueness of parcelle number if being updated
        if (
          validatedData.numero &&
          validatedData.numero !== existingParcelle.numero
        ) {
          await this.validateUniqueParcelleNumber(
            userId,
            validatedData.numero,
            id,
          );
        }

        // Use repository method that handles prix par gramme calculation
        const updatedParcelle =
          await this.parcelleRepository.updateWithCalculation(
            id,
            validatedData,
          );

        this.logger.debug("Parcelle updated successfully", {
          parcelleId: id,
          userId,
          updated: !!updatedParcelle,
        });

        return updatedParcelle;
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

        // Ensure parcelle exists and belongs to user
        const existingParcelle = await this.getParcelleById(id, userId);
        if (!existingParcelle) {
          throw this.createNotFoundError("Parcelle", id);
        }

        // Check if there are products associated with this parcelle
        // TODO: Inject ProductRepository to check for associated products
        // const products = await this.productRepository.findByParcelleId(id);
        // const userProducts = products.filter((p: any) => p.userId === userId);

        // if (userProducts.length > 0) {
        //   this.logger.warn(
        //     "Attempt to delete parcelle with associated products",
        //     {
        //       parcelleId: id,
        //       userId,
        //       productCount: userProducts.length,
        //     },
        //   );

        //   throw this.createBusinessError(
        //     `Cannot delete this parcelle because ${userProducts.length} product(s) are associated with it.`,
        //   );
        // }

        const deleted = await this.parcelleRepository.delete(id);

        this.logger.debug("Parcelle deleted successfully", {
          parcelleId: id,
          userId,
          deleted,
        });

        return deleted;
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

        const stats = await this.parcelleRepository.getParcelleStats(userId);

        this.logger.debug("Retrieved parcelle statistics", {
          userId,
          totalParcelles: stats.totalParcelles,
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
          await this.parcelleRepository.getUserTransporteurs(userId);

        this.logger.debug("Retrieved user transporteurs", {
          userId,
          count: transporteurs.length,
        });

        return transporteurs;
      },
      { userId },
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

      const exists = await this.parcelleRepository.numeroExists(
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
