import { Product } from "@/lib/shared/types/entities";

export interface CreateProduitDTO {
  nom: string;
  prix?: number | null;
  quantite?: number | null;
  parcelleId?: number | null;
  userId: string;
}

export interface ProduitRepository {
  create(data: CreateProduitDTO): Promise<Product>;
  findById(id: string, userId: string): Promise<Product | null>;
  findAllByUser(userId: string): Promise<Product[]>;
  update(id: string, userId: string, patch: Partial<CreateProduitDTO>): Promise<Product>;
  delete(id: string, userId: string): Promise<void>;
}
