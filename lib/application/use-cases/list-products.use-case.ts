import { ProductRepository } from '@/lib/application/ports/product-repository.port';
import { Product } from '@/lib/domain/entities/product.entity';

export class ListProductsUseCase {
  constructor(private productRepository: ProductRepository) {}

  async execute(userId: string): Promise<Product[]> {
    return this.productRepository.findByUserId(userId);
  }
}