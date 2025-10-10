import { ProductRepository } from '@/lib/application/ports/product-repository.port';

export class DeleteProductUseCase {
  constructor(private productRepository: ProductRepository) {}

  async execute(id: string): Promise<void> {
    return this.productRepository.delete(id);
  }
}