import { ProductRepository } from '@/lib/application/ports/product-repository.port';
import { Product } from '@/lib/domain/entities/product.entity';
import { ProfitCalculatorService } from '@/lib/services/profit-calculator-service';

export class CreateProductUseCase {
  constructor(
    private productRepository: ProductRepository,
    private profitCalculator?: ProfitCalculatorService,
  ) {}

  async execute(data: {
    name: string;
    brand?: string;
    category?: string;
    price: number;
    poids?: number;
    userId: string;
    parcelleId?: string;
  }): Promise<Product> {
    const createData: any = {
      name: data.name,
      price: data.price,
      userId: data.userId,
    };

    if (data.brand !== undefined) createData.brand = data.brand;
    if (data.category !== undefined) createData.category = data.category;
    if (data.poids !== undefined) createData.poids = data.poids;
    if (data.parcelleId !== undefined) createData.parcelleId = data.parcelleId;

    // Calculate shipping cost automatically if profit calculator is available
    if (
      this.profitCalculator &&
      data.parcelleId &&
      data.poids &&
      data.poids > 0
    ) {
      const shippingCost = await this.profitCalculator.calculateShippingCost({
        poids: data.poids,
        parcelleId: data.parcelleId,
      });
      createData.coutLivraison = shippingCost;
    }

    return this.productRepository.create(createData);
  }
}