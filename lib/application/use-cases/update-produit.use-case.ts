import { Product } from "@/lib/shared/types/entities";
import { ProduitRepository, type CreateProduitDTO } from "@/lib/application/ports/produit-repository.port";
import { NotFoundError, ValidationError } from "@/lib/shared/errors/base-errors";
import { logUpdate, sanitizeForAudit } from "@/lib/utils/logging/audit-mutations";
import { measureOperation } from "@/lib/monitoring/performance-metrics";

export interface UpdateProduitInput {
  id: string;
  userId: string;
  username?: string;
  traceId?: string;
  patch: {
    nom?: string | null;
    prix?: number | null;
    quantite?: number | null;
    parcelleId?: number | null;
  };
}

export interface UpdateProduitOutput { produit: Product; }

export class UpdateProduitUseCase {
  constructor(private readonly repo: ProduitRepository) {}

  async execute(input: UpdateProduitInput): Promise<UpdateProduitOutput> {
    return measureOperation('UpdateProduitUseCase', async () => {
  const existing = await this.repo.findById(input.id, input.userId);
      if (!existing) throw new NotFoundError("Produit introuvable", { id: input.id });

    if (input.patch.nom !== undefined && (!input.patch.nom || !input.patch.nom.trim())) {
      throw new ValidationError("Nom invalide", { field: "nom" });
    }

    const patch: Partial<CreateProduitDTO> = {
      userId: input.userId,
    };

    if (input.patch.nom !== undefined) {
      const nom = input.patch.nom;
      if (nom === null) {
        throw new ValidationError("Nom invalide", { field: "nom" });
      }
      patch.nom = nom.trim();
    }

    if (input.patch.prix !== undefined) {
      patch.prix = input.patch.prix;
    }

    if (input.patch.quantite !== undefined) {
      patch.quantite = input.patch.quantite;
    }

    if (input.patch.parcelleId !== undefined) {
      patch.parcelleId = input.patch.parcelleId;
    }

  const produit = await this.repo.update(input.id, input.userId, patch);

    // Audit log de mise à jour
    const auditOptions: { username?: string; traceId?: string; metadata?: Record<string, any> } = {
      metadata: { updatedFields: Object.keys(input.patch) },
    };
    if (input.username) auditOptions.username = input.username;
    if (input.traceId) auditOptions.traceId = input.traceId;

      logUpdate(
        'produit',
  produit.id.toString(),
        input.userId,
        sanitizeForAudit(existing),
        sanitizeForAudit(produit),
        auditOptions
      );

      return { produit };
    }, { userId: input.userId, produitId: input.id });
  }
}
