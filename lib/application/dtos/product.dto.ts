import { Product } from '@/lib/domain/entities/product.entity';

export interface ProductDTO {
  id: string;
  userId: string;
  parcelleId?: string;
  name: string;
  brand?: string;
  category?: string;
  subcategory?: string;
  size?: string;
  color?: string;
  poids: number;
  price: number;
  currency: string;
  coutLivraison?: number;
  sellingPrice?: number;
  prixVente?: number;
  plateforme?: string;
  vintedItemId?: string;
  externalId?: string;
  url?: string;
  photoUrl?: string;
  status: string;
  vendu: '0' | '1';
  createdAt: string;
  updatedAt: string;
  dateMiseEnLigne?: string;
  listedAt?: string;
  dateVente?: string;
  soldAt?: string;
}

export class ProductDTOTransformer {
  static fromEntity(product: Product): ProductDTO {
    const dto: ProductDTO = {
      id: product.id,
      userId: product.userId,
      name: product.name,
      poids: product.poids,
      price: product.price,
      currency: 'EUR',
      status: product.status,
      vendu: product.isSold ? '1' : '0',
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };

    // Add optional properties only if they exist
    if (product.parcelleId) dto.parcelleId = product.parcelleId;
    if (product.brand) dto.brand = product.brand;
    if (product.category) dto.category = product.category;

    return dto;
  }

  static fromEntities(products: Product[]): ProductDTO[] {
    return products.map(product => this.fromEntity(product));
  }

  static toSummary(product: Product) {
    return {
      id: product.id,
      name: product.name,
      brand: product.brand,
      category: product.category,
      price: product.price,
      status: product.status,
      createdAt: product.createdAt,
    };
  }

  static toSummaries(products: Product[]) {
    return products.map(product => this.toSummary(product));
  }
}