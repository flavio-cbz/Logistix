import { Product } from "@/lib/shared/types/entities";
import { ProduitRepository } from "@/lib/application/ports/produit-repository.port";

export interface ListProduitsInput { userId: string; }
export interface ListProduitsOutput { produits: Product[]; }

export class ListProduitsUseCase {
  constructor(private readonly repo: ProduitRepository) {}
  async execute(input: ListProduitsInput): Promise<ListProduitsOutput> {
    const produits = await this.repo.findAllByUser(input.userId);
    return { produits };
  }
}
