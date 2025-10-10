import type { ParcelleRepository, CreateParcelleDTO, UpdateParcelleDTO } from '@/lib/application/ports/parcelle-repository.port';
import { Parcelle } from '@/lib/domain/entities/parcelle';
import { databaseService } from '@/lib/services/database/db';
import { InfrastructureError } from '@/lib/shared/errors/base-errors';

interface ParcelleRow {
  id: string;
  userId: string;
  numero: string;
  transporteur: string;
  nom: string;
  statut: string;
  actif: number | boolean;
  prixAchat: number | null;
  poids: number | null;
  prixTotal: number | null;
  prixParGramme: number | null;
  createdAt: string;
  updatedAt: string;
}

export class SQLiteParcelleRepository implements ParcelleRepository {
  async create(data: CreateParcelleDTO): Promise<Parcelle> {
    try {
      await databaseService.execute(
        `INSERT INTO parcelles (id, user_id, numero, transporteur, nom, statut, prix_achat, poids, prix_total, prix_par_gramme, actif)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.id,
          data.userId,
          data.numero,
          data.transporteur,
          data.nom,
          data.statut,
          data.prixAchat ?? null,
          data.poids ?? null,
          data.prixTotal ?? null,
          data.prixParGramme ?? null,
          (data.actif ?? true) ? 1 : 0,
        ],
        'repo:parcelles:create',
      );

      const row = await databaseService.queryOne<ParcelleRow>(
        `SELECT id, user_id as userId, numero, transporteur, nom, statut, actif, prix_achat as prixAchat, poids, prix_total as prixTotal, prix_par_gramme as prixParGramme, created_at as createdAt, updated_at as updatedAt
         FROM parcelles WHERE id = ? AND user_id = ?`,
        [data.id, data.userId],
        'repo:parcelles:fetchCreated',
      );

      if (!row) {
        throw new InfrastructureError('Parcelle non retrouvée après création');
      }

      return this.mapRowToEntity(row);
    } catch (error: any) {
      throw new InfrastructureError('Erreur création parcelle', { original: error?.message });
    }
  }

  async findAllByUser(userId: string): Promise<Parcelle[]> {
    const rows = await databaseService.query<ParcelleRow>(
      `SELECT id, user_id as userId, numero, transporteur, nom, statut, actif, prixAchat, poids, prixTotal, prixParGramme, created_at as createdAt, updated_at as updatedAt
       FROM parcelles WHERE user_id = ? ORDER BY created_at DESC`,
      [userId],
      'repo:parcelles:listByUser',
    );

    return rows.map((row) => this.mapRowToEntity(row));
  }

  async findByNumero(numero: string, userId: string): Promise<Parcelle | null> {
    const row = await databaseService.queryOne<ParcelleRow>(
      `SELECT id, user_id as userId, numero, transporteur, nom, statut, actif, prix_achat as prixAchat, poids, prix_total as prixTotal, prix_par_gramme as prixParGramme, created_at as createdAt, updated_at as updatedAt
       FROM parcelles WHERE numero = ? AND user_id = ?`,
      [numero, userId],
      'repo:parcelles:findByNumero',
    );

    return row ? this.mapRowToEntity(row) : null;
  }

  async findById(id: string, userId: string): Promise<Parcelle | null> {
    const row = await databaseService.queryOne<ParcelleRow>(
      `SELECT id, user_id as userId, numero, transporteur, nom, statut, actif, prix_achat as prixAchat, poids, prix_total as prixTotal, prix_par_gramme as prixParGramme, created_at as createdAt, updated_at as updatedAt
       FROM parcelles WHERE id = ? AND user_id = ?`,
      [id, userId],
      'repo:parcelles:findById',
    );

    return row ? this.mapRowToEntity(row) : null;
  }

  async update(id: string, userId: string, patch: UpdateParcelleDTO): Promise<Parcelle> {
    try {
      const setClauses: string[] = [];
      const values: unknown[] = [];

      if (patch.numero !== undefined) {
        setClauses.push('numero = ?');
        values.push(patch.numero);
      }

      if (patch.transporteur !== undefined) {
        setClauses.push('transporteur = ?');
        values.push(patch.transporteur);
      }

      if (patch.nom !== undefined) {
        setClauses.push('nom = ?');
        values.push(patch.nom);
      }

      if (patch.statut !== undefined) {
        setClauses.push('statut = ?');
        values.push(patch.statut);
      }

      if (patch.prixAchat !== undefined) {
        setClauses.push('prixAchat = ?');
        values.push(patch.prixAchat);
      }

      if (patch.poids !== undefined) {
        setClauses.push('poids = ?');
        values.push(patch.poids);
      }

      if (patch.prixTotal !== undefined) {
        setClauses.push('prixTotal = ?');
        values.push(patch.prixTotal);
      }

      if (patch.prixParGramme !== undefined) {
        setClauses.push('prixParGramme = ?');
        values.push(patch.prixParGramme);
      }

      if (patch.actif !== undefined) {
        setClauses.push('actif = ?');
        values.push(patch.actif ? 1 : 0);
      }

      setClauses.push('updated_at = CURRENT_TIMESTAMP');

      values.push(id, userId);

      await databaseService.execute(
        `UPDATE parcelles SET ${setClauses.join(', ')} WHERE id = ? AND user_id = ?`,
        values,
        'repo:parcelles:update',
      );

      const row = await databaseService.queryOne<ParcelleRow>(
        `SELECT id, user_id as userId, numero, transporteur, nom, statut, actif, prixAchat, poids, prixTotal, prixParGramme, created_at as createdAt, updated_at as updatedAt
         FROM parcelles WHERE id = ? AND user_id = ?`,
        [id, userId],
        'repo:parcelles:fetchUpdated',
      );

      if (!row) {
        throw new InfrastructureError('Parcelle non retrouvée après mise à jour');
      }

      return this.mapRowToEntity(row);
    } catch (error: any) {
      throw new InfrastructureError('Erreur mise à jour parcelle', { original: error?.message });
    }
  }

  async delete(id: string, userId: string): Promise<void> {
    try {
      await databaseService.execute(
        `DELETE FROM parcelles WHERE id = ? AND user_id = ?`,
        [id, userId],
        'repo:parcelles:delete',
      );
    } catch (error: any) {
      throw new InfrastructureError('Erreur suppression parcelle', { original: error?.message });
    }
  }

  private mapRowToEntity(row: ParcelleRow): Parcelle {
    return Parcelle.create({
      id: row.id,
      userId: row.userId,
      numero: row.numero,
      transporteur: row.transporteur,
      nom: row.nom,
      statut: row.statut,
      actif: typeof row.actif === 'boolean' ? row.actif : row.actif === 1,
      prixAchat: row.prixAchat ?? null,
      poids: row.poids ?? null,
      prixTotal: row.prixTotal ?? null,
      prixParGramme: row.prixParGramme ?? null,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    });
  }
}
