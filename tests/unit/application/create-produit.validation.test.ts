import { describe, it, expect } from 'vitest';
import { CreateProduitUseCase } from '@/lib/application/use-cases/create-produit.use-case';
import { ProduitRepository, CreateProduitDTO } from '@/lib/application/ports/produit-repository.port';
import { ValidationError } from '@/lib/shared/errors/base-errors';
import { Product, ProductStatus } from '../../../lib/types/entities';

class InMemoryRepo implements ProduitRepository {
  private id = 1; 
  private data: Product[] = [];

  async create(dto: CreateProduitDTO): Promise<Product> {
    const product: Product = {
      id: String(this.id++),
      userId: dto.userId,
      parcelleId: dto.parcelleId ? String(dto.parcelleId) : null,
      name: dto.nom,
      poids: 0,
      price: dto.prix ?? 0,
      currency: 'EUR',
      vendu: '0',
      status: ProductStatus.DRAFT,
      createdAt: new Date().toISOString(),
    };
    this.data.push(product);
    return product;
  }

  async findById(id: string, userId: string) {
    return this.data.find(p => p.id === id && p.userId === userId) ?? null;
  }

  async findAllByUser(userId: string) {
    return this.data.filter(p => p.userId === userId);
  }

  async update(id: string, userId: string): Promise<Product> {
    const existing = await this.findById(id, userId);
    if (!existing) {
      throw new Error('Product not found');
    }
    return existing;
  }

  async delete(id: string, userId: string): Promise<void> {
    this.data = this.data.filter(p => !(p.id === id && p.userId === userId));
  }
}

describe('CreateProduitUseCase Validation', () => {
  // TODO: Test nécessite la migration des use-cases vers Product
  it.skip('rejette un nom vide', async () => {
    const uc = new CreateProduitUseCase(new InMemoryRepo());
    await expect(uc.execute({ nom: '   ', userId: 'u1' })).rejects.toBeInstanceOf(ValidationError);
  });
});
