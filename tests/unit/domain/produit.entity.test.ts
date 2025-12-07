import { describe, it, expect } from 'vitest';
import { Product, ProductStatus } from '../../../lib/types/entities';

describe('Product Entity (Modern Interface)', () => {
  it('crée un produit valide avec interface Product', () => {
    const product: Product = {
      id: '1',
      userId: 'u1',
      name: 'Test Product',
      poids: 100,
      price: 10,
      currency: 'EUR',
      vendu: '0',
      status: ProductStatus.DRAFT,
      createdAt: new Date().toISOString(),
    };
    
    expect(product.name).toBe('Test Product');
    expect(product.price).toBe(10);
    expect(product.status).toBe(ProductStatus.DRAFT);
  });

  it('valide les champs obligatoires', () => {
    const product: Product = {
      id: '2',
      userId: 'u1',
      name: 'Required Fields Product',
      poids: 200,
      price: 20,
      currency: 'EUR',
      vendu: '0',
      status: ProductStatus.AVAILABLE,
      createdAt: new Date().toISOString(),
    };
    
    expect(product.id).toBeDefined();
    expect(product.userId).toBeDefined();
    expect(product.name).toBeDefined();
  });
});
