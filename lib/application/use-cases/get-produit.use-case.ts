import { ProduitRepository } from "@/lib/application/ports/produit-repository.port";
import { Product } from "@/lib/shared/types/entities";
import { NotFoundError } from "@/lib/shared/errors/base-errors";

export interface GetProduitInput { id: string; userId: string; }
export interface GetProduitOutput { produit: Product; }

export class GetProduitUseCase {
  constructor(private readonly repo: ProduitRepository) {}
  async execute(input: GetProduitInput): Promise<GetProduitOutput> {
    const produit = await this.repo.findById(input.id, input.userId);
    if (!produit) throw new NotFoundError('Produit introuvable', { id: input.id });
    return { produit };
  }
}
