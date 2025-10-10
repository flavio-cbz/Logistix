import { randomUUID } from 'crypto';
import { Parcelle } from '@/lib/domain/entities/parcelle';
import type { ParcelleRepository, CreateParcelleDTO } from '@/lib/application/ports/parcelle-repository.port';
import { ConflictError, ValidationError } from '@/lib/shared/errors/base-errors';
import { logCreate, sanitizeForAudit } from '@/lib/utils/logging/audit-mutations';

export interface CreateParcelleInput {
  userId: string;
  numero: string;
  transporteur: string;
  nom: string;
  statut: string;
  prixAchat?: number | null;
  poids?: number | null;
  prixTotal?: number | null;
  prixParGramme?: number | null;
  actif?: boolean;
  username?: string;
  traceId?: string;
}

export interface CreateParcelleOutput {
  parcelle: Parcelle;
}

export class CreateParcelleUseCase {
  constructor(private readonly repo: ParcelleRepository) {}

  async execute(input: CreateParcelleInput): Promise<CreateParcelleOutput> {
    const numero = input.numero.trim();
    const transporteur = input.transporteur.trim();
    const nom = input.nom.trim();
    const statut = input.statut.trim();

    if (!numero) throw new ValidationError('Numéro de parcelle requis', { field: 'numero' });
    if (!transporteur) throw new ValidationError('Transporteur requis', { field: 'transporteur' });
    if (!nom) throw new ValidationError('Nom requis', { field: 'nom' });
    if (!statut) throw new ValidationError('Statut requis', { field: 'statut' });

    const existing = await this.repo.findByNumero(numero, input.userId);
    if (existing) {
      throw new ConflictError('Une parcelle avec ce numéro existe déjà', {
        numero,
      });
    }

    const createDto: CreateParcelleDTO = {
      id: randomUUID(),
      userId: input.userId,
      numero,
      transporteur,
      nom,
      statut,
      prixAchat: input.prixAchat ?? null,
      poids: input.poids ?? null,
      prixTotal: input.prixTotal ?? null,
      prixParGramme: input.prixParGramme ?? null,
      actif: input.actif ?? true,
    };

    const parcelle = await this.repo.create(createDto);

    // Audit log de création
    const auditOptions: { username?: string; traceId?: string; metadata?: Record<string, any> } = {
      metadata: { numero: parcelle.numero, transporteur: parcelle.transporteur },
    };
    if (input.username) auditOptions.username = input.username;
    if (input.traceId) auditOptions.traceId = input.traceId;

    logCreate(
      'parcelle',
      parcelle.id,
      input.userId,
      sanitizeForAudit(parcelle),
      auditOptions
    );

    return { parcelle };
  }
}
