import { Parcelle } from '@/lib/domain/entities/parcelle';
import type { ParcelleRepository, UpdateParcelleDTO } from '@/lib/application/ports/parcelle-repository.port';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/shared/errors/base-errors';
import { logUpdate, sanitizeForAudit } from '@/lib/utils/logging/audit-mutations';

export interface UpdateParcelleInput {
  id: string;
  userId: string;
  username?: string;
  traceId?: string;
  patch: {
    numero?: string | undefined;
    transporteur?: string | undefined;
    nom?: string | undefined;
    statut?: string | undefined;
    prixAchat?: number | null | undefined;
    poids?: number | null | undefined;
    prixTotal?: number | null | undefined;
    prixParGramme?: number | null | undefined;
    actif?: boolean | undefined;
  };
}

export interface UpdateParcelleOutput {
  parcelle: Parcelle;
}

export class UpdateParcelleUseCase {
  constructor(private readonly repo: ParcelleRepository) {}

  async execute(input: UpdateParcelleInput): Promise<UpdateParcelleOutput> {
    const existing = await this.repo.findById(input.id, input.userId);
    if (!existing) {
      throw new NotFoundError('Parcelle introuvable', { id: input.id });
    }

    const sanitizedPatch: UpdateParcelleDTO = {};

    if (input.patch.numero !== undefined) {
      const numero = input.patch.numero.trim();
      if (!numero) {
        throw new ValidationError('Numéro de parcelle invalide', { field: 'numero' });
      }

      if (numero !== existing.numero) {
        const duplicate = await this.repo.findByNumero(numero, input.userId);
        if (duplicate && duplicate.id !== input.id) {
          throw new ConflictError('Une parcelle avec ce numéro existe déjà', { numero });
        }
      }

      sanitizedPatch.numero = numero;
    }

    if (input.patch.transporteur !== undefined) {
      const transporteur = input.patch.transporteur.trim();
      if (!transporteur) {
        throw new ValidationError('Transporteur invalide', { field: 'transporteur' });
      }
      sanitizedPatch.transporteur = transporteur;
    }

    if (input.patch.nom !== undefined) {
      const nom = input.patch.nom.trim();
      if (!nom) {
        throw new ValidationError('Nom invalide', { field: 'nom' });
      }
      sanitizedPatch.nom = nom;
    }

    if (input.patch.statut !== undefined) {
      const statut = input.patch.statut.trim();
      if (!statut) {
        throw new ValidationError('Statut invalide', { field: 'statut' });
      }
      sanitizedPatch.statut = statut;
    }

    if (input.patch.prixAchat !== undefined) {
      sanitizedPatch.prixAchat = input.patch.prixAchat;
    }

    if (input.patch.poids !== undefined) {
      sanitizedPatch.poids = input.patch.poids;
    }

    if (input.patch.prixTotal !== undefined) {
      sanitizedPatch.prixTotal = input.patch.prixTotal;
    }

    if (input.patch.prixParGramme !== undefined) {
      sanitizedPatch.prixParGramme = input.patch.prixParGramme;
    }

    if (input.patch.actif !== undefined) {
      sanitizedPatch.actif = input.patch.actif;
    }

    if (Object.keys(sanitizedPatch).length === 0) {
      throw new ValidationError('Aucun champ valide à mettre à jour');
    }

    const parcelle = await this.repo.update(input.id, input.userId, sanitizedPatch);

    // Audit log de mise à jour
    const auditOptions: { username?: string; traceId?: string; metadata?: Record<string, any> } = {
      metadata: { updatedFields: Object.keys(input.patch) },
    };
    if (input.username) auditOptions.username = input.username;
    if (input.traceId) auditOptions.traceId = input.traceId;

    logUpdate(
      'parcelle',
      parcelle.id,
      input.userId,
      sanitizeForAudit(existing),
      sanitizeForAudit(parcelle),
      auditOptions
    );

    return { parcelle };
  }
}
