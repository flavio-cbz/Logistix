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
          sample: parcelles.length > 0 ? parcelles[0] : null,
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
        // Convert boolean actif to number for SQLite
        const updateData: any = { ...validatedData };
        if (validatedData.actif !== undefined) {
          updateData.actif = validatedData.actif ? 1 : 0;
        }

        const updatedParcelle =
          await this.parcelleRepository.updateWithCalculation(
            id,
            updateData,
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
        const productCount = await this.parcelleRepository.countProductsByParcelleId(id);

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

  /**
   * Bulk create parcelles (skips duplicates based on numero)
   */
  async bulkCreateParcelles(
    userId: string,
    inputs: CreateParcelleInput[],
  ): Promise<{ created: Parcelle[]; skipped: number }> {
    return this.executeOperation(
      "bulkCreateParcelles",
      async () => {
        this.validateUUID(userId, "userId");

        if (inputs.length === 0) {
          return { created: [], skipped: 0 };
        }

        // 1. Validate all inputs
        const validInputs = inputs.map((input) => {
          const validated = this.validateWithSchema(createParcelleSchema, input);
          return { ...validated, userId };
        });

        // 2. Check for existing parcelles
        const numeros = validInputs.map((i) => i.numero).filter(Boolean) as string[];
        const existingParcelles = await this.parcelleRepository.findByNumeros(
          userId,
          numeros,
        );
        const existingNumeros = new Set(existingParcelles.map((p) => p.numero));

        // 3. Filter out duplicates
        const newParcellesData = validInputs.filter(
          (p) => !existingNumeros.has(p.numero),
        );

        if (newParcellesData.length === 0) {
          return { created: [], skipped: inputs.length };
        }

        // 4. Bulk create
        const createdParcelles = await this.parcelleRepository.createMany(
          newParcellesData as any,
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
