import { BaseService } from "./base-service";
import { ParcelRepository } from "@/lib/repositories";
import type { Product } from "@/lib/types/entities";

export interface ProfitCalculation {
  coutLivraison: number;
  profit: number;
  profitMargin: number;
}

export class ProfitCalculatorService extends BaseService {
  constructor(private readonly parcelRepository: ParcelRepository) {
    super("ProfitCalculatorService");
  }

  /**
   * Calculates shipping cost based on product weight and parcelle pricing
   * 
   * @description Computes shipping cost by multiplying product weight with the price per gram
   * from the associated parcelle. Returns 0 if parcelle is not found or has no pricing.
   * @param {Pick<Product, "poids" | "parcelleId">} product - Product with weight and parcelle ID
   * @returns {Promise<number>} Promise resolving to shipping cost in euros
   * @throws {CustomError} When database operation fails
   * @example
   * ```typescript
   * const cost = await service.calculateShippingCost({ poids: 250, parcelleId: 'abc-123' });
   * ```
   * @since 1.0.0
   */
  async calculateShippingCost(
    product: Pick<Product, "poids" | "parcelId">,
  ): Promise<number> {
    return this.executeOperation(
      "calculateShippingCost",
      async () => {
        if (!product.parcelId || !product.poids || product.poids <= 0) {
          return 0;
        }

        const parcel = await this.parcelRepository.findById(
          product.parcelId,
        );

        if (!parcel || !parcel.pricePerGram) {
          return 0;
        }

        const shippingCost = product.poids * parcel.pricePerGram;

        this.logger.debug("Shipping cost calculated", {
          productWeight: product.poids,
          parcelPricePerGram: parcel.pricePerGram,
          shippingCost,
        });

        return shippingCost;
      },
      {
        parcelId: product.parcelId,
        poids: product.poids,
      },
    );
  }

  /**
   * Calculates profit metrics for a product
   * 
   * @description Computes profit, profit margin, and includes shipping cost in the calculation.
   * Uses existing shipping cost or calculates based on product weight and parcelle pricing.
   * @param {Pick<Product, "price" | "coutLivraison" | "prixVente">} product - Product with pricing data
   * @returns {ProfitCalculation} Object containing profit metrics
   * @example
   * ```typescript
   * const metrics = service.calculateProfit({ price: 25, coutLivraison: 3.5, prixVente: 35 });
   * // metrics.profit will be 6.5
   * ```
   * @since 1.0.0
   */
  calculateProfit(product: Pick<Product, "price" | "coutLivraison" | "prixVente">): ProfitCalculation {
    const totalCost = (product.price || 0) + (product.coutLivraison || 0);
    const revenue = product.prixVente || 0;
    const profit = revenue - totalCost;
    const profitMargin = totalCost > 0 ? (profit / totalCost) * 100 : 0;

    return {
      coutLivraison: product.coutLivraison || 0,
      profit,
      profitMargin,
    };
  }

  /**
   * Calculates profit with automatic shipping cost calculation
   * 
   * @description Computes comprehensive profit metrics, automatically calculating shipping cost
   * if not provided. Uses parcelle pricing data to determine shipping costs based on weight.
   * @param {Pick<Product, "price" | "poids" | "parcelleId" | "prixVente" | "coutLivraison">} product - Product data
   * @returns {Promise<ProfitCalculation>} Promise resolving to complete profit calculation
   * @throws {CustomError} When database operations fail
   * @example
   * ```typescript
   * const metrics = await service.calculateProfitWithShipping({
   *   price: 25, poids: 250, parcelleId: 'abc-123', prixVente: 35
   * });
   * ```
   * @since 1.0.0
   */
  async calculateProfitWithShipping(
    product: Pick<Product, "price" | "poids" | "parcelId" | "prixVente" | "coutLivraison">,
  ): Promise<ProfitCalculation> {
    return this.executeOperation(
      "calculateProfitWithShipping",
      async () => {
        // Use provided shipping cost or calculate it
        let shippingCost = product.coutLivraison || 0;

        if (!shippingCost && product.parcelId && product.poids) {
          shippingCost = await this.calculateShippingCost({
            poids: product.poids,
            parcelId: product.parcelId,
          });
        }

        const totalCost = (product.price || 0) + shippingCost;
        const revenue = product.prixVente || 0;
        const profit = revenue - totalCost;
        const profitMargin = totalCost > 0 ? (profit / totalCost) * 100 : 0;

        this.logger.debug("Profit calculated with shipping", {
          price: product.price,
          shippingCost,
          prixVente: product.prixVente,
          totalCost,
          profit,
          profitMargin,
        });

        return {
          coutLivraison: shippingCost,
          profit,
          profitMargin,
        };
      },
      {
        price: product.price,
        poids: product.poids,
        parcelId: product.parcelId,
        prixVente: product.prixVente,
      },
    );
  }
}