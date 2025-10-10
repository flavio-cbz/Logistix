import { Product } from "@/lib/shared/types/entities";
import { ProduitRepository } from "@/lib/application/ports/produit-repository.port";
import { ValidationError } from "@/lib/shared/errors/base-errors";
import { logCreate, sanitizeForAudit } from "@/lib/utils/logging/audit-mutations";
import { measureOperation } from "@/lib/monitoring/performance-metrics";

export interface CreateProduitInput {
  nom: string;
  prix?: number | null;
  quantite?: number | null;
  parcelleId?: number | null;
  userId: string;
  username?: string;
  traceId?: string;
}

export interface CreateProduitOutput {
  produit: Product;
}

export class CreateProduitUseCase {
  constructor(private readonly repo: ProduitRepository) {}

  async execute(input: CreateProduitInput): Promise<CreateProduitOutput> {
    return measureOperation('CreateProduitUseCase', async () => {
      if (!input.nom || !input.nom.trim()) {
        throw new ValidationError('Le nom du produit est requis', { field: 'nom' });
      }
    
    const produit = await this.repo.create({
      nom: input.nom.trim(),
      prix: input.prix ?? null,
      quantite: input.quantite ?? null,
      parcelleId: input.parcelleId ?? null,
      userId: input.userId,
    });

    // Audit log de création
    const auditOptions: { username?: string; traceId?: string; metadata?: Record<string, any> } = {
      metadata: { name: produit.name, price: produit.price },
    };
    if (input.username) auditOptions.username = input.username;
    if (input.traceId) auditOptions.traceId = input.traceId;

      logCreate(
        'produit',
        produit.id.toString(),
        input.userId,
        sanitizeForAudit(produit),
        auditOptions
      );

      return { produit };
    }, { userId: input.userId, nom: input.nom });
  }
}
