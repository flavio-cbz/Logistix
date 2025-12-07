import { Product } from '@/lib/domain/entities/product.entity';
import { UpdateProductInput } from '@/lib/shared/types/entities';

export interface CreateProductDTO {
  name: string;
  brand?: string;
  category?: string;
  price: number;
  poids?: number;
  userId: string;
  parcelleId?: string;
}

export interface UpdateProductDTO {
  name?: string;
  brand?: string;
  category?: string;
  price?: number;
  poids?: number;
  currency?: string;
  coutLivraison?: number;
  vendu?: "0" | "1"; // Simplified: 0=not sold, 1=sold
  dateMiseEnLigne?: string;
  dateVente?: string;
  prixVente?: number;
  plateforme?: string;
  status?: string;
  subcategory?: string;
  size?: string;
  color?: string;
  url?: string;
  photoUrl?: string;
}

export interface ProductRepository {
  create(data: CreateProductDTO): Promise<Product>;
  findById(id: string): Promise<Product | null>;
  findByUserId(userId: string): Promise<Product[]>;
  findByParcelleId(parcelleId: string): Promise<Product[]>;
  update(id: string, data: UpdateProductInput): Promise<Product>;
  delete(id: string): Promise<void>;
}