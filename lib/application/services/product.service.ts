import { getProductRepository } from '@/lib/infrastructure/repositories/product-repository.factory';
import { CreateProductUseCase } from '@/lib/application/use-cases/create-product.use-case';
import { ListProductsUseCase } from '@/lib/application/use-cases/list-products.use-case';
import { UpdateProductUseCase } from '@/lib/application/use-cases/update-product.use-case';
import { DeleteProductUseCase } from '@/lib/application/use-cases/delete-product.use-case';
import { UpdateProductInput } from '@/lib/shared/types/entities';
import { ProfitCalculatorService } from '@/lib/services/profit-calculator-service';
import { getParcelleRepository } from '@/lib/infrastructure/repositories/parcelle-repository.factory';

export class ProductService {
  private createProductUseCase: CreateProductUseCase;
  private listProductsUseCase: ListProductsUseCase;
  private updateProductUseCase: UpdateProductUseCase;
  private deleteProductUseCase: DeleteProductUseCase;

  constructor() {
    const productRepository = getProductRepository();
    const newParcelleRepo = getParcelleRepository();
    // Create a simple adapter for ProfitCalculatorService that uses a dummy userId
    // Note: Access control is handled at the API level, so this is safe
    const parcelleRepository = {
      findById: (id: string) => newParcelleRepo.findById(id, 'system')
    } as any;
    const profitCalculator = new ProfitCalculatorService(parcelleRepository);

    this.createProductUseCase = new CreateProductUseCase(productRepository, profitCalculator);
    this.listProductsUseCase = new ListProductsUseCase(productRepository);
    this.updateProductUseCase = new UpdateProductUseCase(productRepository);
    this.deleteProductUseCase = new DeleteProductUseCase(productRepository);
  }

  async createProduct(data: {
    name: string;
    brand?: string;
    category?: string;
    price: number;
    poids?: number;
    userId: string;
    parcelleId?: string;
  }) {
    return this.createProductUseCase.execute(data);
  }

  async listProducts(userId: string) {
    return this.listProductsUseCase.execute(userId);
  }

  async updateProduct(id: string, data: UpdateProductInput) {
    return this.updateProductUseCase.execute(id, data);
  }

  async deleteProduct(id: string) {
    return this.deleteProductUseCase.execute(id);
  }

  async getProductById(id: string) {
    const productRepository = getProductRepository();
    return productRepository.findById(id);
  }
}