import { ProduitRepository } from "@/lib/application/ports/produit-repository.port";
import { NotFoundError } from "@/lib/shared/errors/base-errors";
import { logDelete, sanitizeForAudit } from "@/lib/utils/logging/audit-mutations";
import { measureOperation } from "@/lib/monitoring/performance-metrics";

export interface DeleteProduitInput { id: string; userId: string; username?: string; traceId?: string; }
export interface DeleteProduitOutput { success: true; }

export class DeleteProduitUseCase {
  constructor(private readonly repo: ProduitRepository) {}

  async execute(input: DeleteProduitInput): Promise<DeleteProduitOutput> {
    return measureOperation('DeleteProduitUseCase', async () => {
      const existing = await this.repo.findById(input.id, input.userId);
      if (!existing) throw new NotFoundError("Produit introuvable", { id: input.id });
    
  await this.repo.delete(input.id, input.userId);

    // Audit log de suppression
    const auditOptions: { username?: string; traceId?: string } = {};
    if (input.username) auditOptions.username = input.username;
    if (input.traceId) auditOptions.traceId = input.traceId;

      logDelete(
        'produit',
  input.id,
        input.userId,
        sanitizeForAudit(existing),
        auditOptions
      );

      return { success: true };
    }, { userId: input.userId, produitId: input.id });
  }
}
