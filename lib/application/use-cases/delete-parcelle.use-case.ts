import type { ParcelleRepository } from '@/lib/application/ports/parcelle-repository.port';
import { NotFoundError } from '@/lib/shared/errors/base-errors';
import { logDelete, sanitizeForAudit } from '@/lib/utils/logging/audit-mutations';

export interface DeleteParcelleInput {
  id: string;
  userId: string;
  username?: string;
  traceId?: string;
}

export interface DeleteParcelleOutput {
  success: true;
}

export class DeleteParcelleUseCase {
  constructor(private readonly repo: ParcelleRepository) {}

  async execute(input: DeleteParcelleInput): Promise<DeleteParcelleOutput> {
    const existing = await this.repo.findById(input.id, input.userId);
    if (!existing) {
      throw new NotFoundError('Parcelle introuvable', { id: input.id });
    }

    await this.repo.delete(input.id, input.userId);

    // Audit log de suppression
    const auditOptions: { username?: string; traceId?: string } = {};
    if (input.username) auditOptions.username = input.username;
    if (input.traceId) auditOptions.traceId = input.traceId;

    logDelete(
      'parcelle',
      input.id,
      input.userId,
      sanitizeForAudit(existing),
      auditOptions
    );

    return { success: true };
  }
}
