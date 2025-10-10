import { ProductRepository } from '@/lib/application/ports/product-repository.port';
import { Product } from '@/lib/domain/entities/product.entity';
import { UpdateProductInput } from '@/lib/types/entities';

export class UpdateProductUseCase {
  constructor(private productRepository: ProductRepository) {}

  async execute(id: string, data: UpdateProductInput): Promise<Product> {
    return this.productRepository.update(id, data);
  }
}