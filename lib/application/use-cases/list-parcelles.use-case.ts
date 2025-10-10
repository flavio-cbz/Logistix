import type { ParcelleRepository } from '@/lib/application/ports/parcelle-repository.port';
import { Parcelle } from '@/lib/domain/entities/parcelle';

export interface ListParcellesInput {
  userId: string;
}

export interface ListParcellesOutput {
  parcelles: Parcelle[];
}

export class ListParcellesUseCase {
  constructor(private readonly repo: ParcelleRepository) {}

  async execute(input: ListParcellesInput): Promise<ListParcellesOutput> {
    const parcelles = await this.repo.findAllByUser(input.userId);
    return { parcelles };
  }
}
