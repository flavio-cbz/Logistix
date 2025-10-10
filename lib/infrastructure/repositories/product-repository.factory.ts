import { SQLiteProductRepository } from './product.repository';

let productRepository: SQLiteProductRepository | null = null;

export function getProductRepository(): SQLiteProductRepository {
  if (!productRepository) {
    productRepository = new SQLiteProductRepository();
  }
  return productRepository;
}