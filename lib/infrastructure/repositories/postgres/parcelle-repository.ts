/**
 * PostgreSQL Implementation of IParcelleRepository
 * 
 * Implémente l'interface IParcelleRepository avec node-postgres (pg)
 * Compatible avec le schema parcelles de la DB
 */

import { Pool, PoolClient } from 'pg';
import { Parcelle } from '@/lib/domain/entities/parcelle';
import {
  IParcelleRepository,
  CreateParcelleDto,
  UpdateParcelleDto,
} from '@/lib/repositories/interfaces/parcelle-repository.interface';
import { DatabaseError, NotFoundError, ValidationError } from '@/lib/errors/custom-error';

/**
 * Type row de la table parcelles PostgreSQL
 */
interface ParcelleRow {
  id: string;
  user_id: string;
  numero: string;
  transporteur: string;
  prix_achat?: number;
  poids?: number;
  prix_total?: number;
  prix_par_gramme?: number;
  created_at: string;
  updated_at: string;
}

/**
 * Repository PostgreSQL pour les parcelles
 * Réutilise la même config et structure que PostgresProduitRepository
 */
export class PostgresParcelleRepository implements IParcelleRepository {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Convertit une row PostgreSQL en entité Parcelle
   */
  private mapRowToParcelle(row: ParcelleRow): Parcelle {
    // Adapter selon l'entité Parcelle actuelle 
    // L'entité attend nom, statut, actif qui ne sont pas dans le schema DB
    // On utilise des valeurs par défaut
    return Parcelle.create({
      id: row.id,
      userId: row.user_id,
      numero: row.numero,
      transporteur: row.transporteur,
      nom: `Parcelle ${row.numero}`, // Valeur dérivée
      statut: 'livré', // Valeur par défaut
      actif: true, // Valeur par défaut
      prixAchat: row.prix_achat ?? null,
      poids: row.poids ?? null,
      prixTotal: row.prix_total ?? null,
      prixParGramme: row.prix_par_gramme ?? null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }

  /**
   * Exécute une query avec gestion d'erreurs
   */
  private async executeQuery<T>(
    query: string,
    params: any[] = [],
    operation: string
  ): Promise<T[]> {
    let client: PoolClient | null = null;
    
    try {
      client = await this.pool.connect();
      const result = await client.query(query, params);
      return result.rows as T[];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
      throw new DatabaseError(`${operation} failed: ${errorMessage}`, operation, {
        query,
        params,
      });
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  /**
   * Exécute une query qui retourne une seule row
   */
  private async executeQueryOne<T>(
    query: string,
    params: any[] = [],
    operation: string
  ): Promise<T | null> {
    const rows = await this.executeQuery<T>(query, params, operation);
    return rows.length > 0 ? rows[0] : null;
  }

  // =============================================================================
  // IMPLÉMENTATION IParcelleRepository
  // =============================================================================

  async create(data: CreateParcelleDto): Promise<Parcelle> {
    // Vérifier d'abord si le numéro existe déjà pour cet utilisateur
    const existing = await this.findByUserIdAndNumero(data.userId, data.numero);
    if (existing) {
      throw new ValidationError(`Parcelle with numero '${data.numero}' already exists for this user`, 'numero');
    }

    const query = `
      INSERT INTO parcelles (
        id, user_id, numero, transporteur,
        prix_achat, poids, prix_total, prix_par_gramme,
        created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3,
        $4, $5, $6, $7,
        NOW(), NOW()
      )
      RETURNING *;
    `;

    const params = [
      data.userId,
      data.numero,
      data.transporteur,
      data.prixAchat || null,
      data.poids || null,
      data.prixTotal || null,
      data.prixParGramme || null,
    ];

    const row = await this.executeQueryOne<ParcelleRow>(query, params, 'create');
    
    if (!row) {
      throw new DatabaseError('Failed to create parcelle: no row returned');
    }

    return this.mapRowToParcelle(row);
  }

  async findById(id: string): Promise<Parcelle | null> {
    const query = 'SELECT * FROM parcelles WHERE id = $1';
    const row = await this.executeQueryOne<ParcelleRow>(query, [id], 'findById');
    
    return row ? this.mapRowToParcelle(row) : null;
  }

  async findByUserId(userId: string): Promise<Parcelle[]> {
    const query = 'SELECT * FROM parcelles WHERE user_id = $1 ORDER BY created_at DESC';
    const rows = await this.executeQuery<ParcelleRow>(query, [userId], 'findByUserId');
    
    return rows.map(row => this.mapRowToParcelle(row));
  }

  async findByUserIdAndNumero(userId: string, numero: string): Promise<Parcelle | null> {
    const query = 'SELECT * FROM parcelles WHERE user_id = $1 AND numero = $2';
    const row = await this.executeQueryOne<ParcelleRow>(query, [userId, numero], 'findByUserIdAndNumero');
    
    return row ? this.mapRowToParcelle(row) : null;
  }

  async findByTransporteur(userId: string, transporteur: string): Promise<Parcelle[]> {
    const query = 'SELECT * FROM parcelles WHERE user_id = $1 AND transporteur = $2 ORDER BY created_at DESC';
    const rows = await this.executeQuery<ParcelleRow>(query, [userId, transporteur], 'findByTransporteur');
    
    return rows.map(row => this.mapRowToParcelle(row));
  }

  async update(id: string, userId: string, data: UpdateParcelleDto): Promise<Parcelle> {
    // Construire dynamiquement la requête UPDATE
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.numero !== undefined) {
      // Vérifier que le nouveau numéro n'existe pas déjà
      // On récupère d'abord la parcelle pour avoir l'userId
      const existing = await this.findById(id);
      if (!existing) {
        throw new NotFoundError('Parcelle', id);
      }

      // Vérifier que l'utilisateur est propriétaire de la parcelle
      if (existing.userId !== userId) {
        throw new NotFoundError('Parcelle', id);
      }
      
      const duplicate = await this.findByUserIdAndNumero(existing.userId, data.numero);
      if (duplicate && duplicate.id !== id) {
        throw new ValidationError(`Parcelle with numero '${data.numero}' already exists for this user`, 'numero');
      }
      
      updates.push(`numero = $${paramIndex++}`);
      params.push(data.numero);
    }
    
    if (data.transporteur !== undefined) {
      updates.push(`transporteur = $${paramIndex++}`);
      params.push(data.transporteur);
    }
    if (data.prixAchat !== undefined) {
      updates.push(`prix_achat = $${paramIndex++}`);
      params.push(data.prixAchat);
    }
    if (data.poids !== undefined) {
      updates.push(`poids = $${paramIndex++}`);
      params.push(data.poids);
    }
    if (data.prixTotal !== undefined) {
      updates.push(`prix_total = $${paramIndex++}`);
      params.push(data.prixTotal);
    }
    if (data.prixParGramme !== undefined) {
      updates.push(`prix_par_gramme = $${paramIndex++}`);
      params.push(data.prixParGramme);
    }

    if (updates.length === 0) {
      throw new ValidationError('No fields to update');
    }

    // Ajouter updated_at et l'id pour le WHERE
    updates.push(`updated_at = NOW()`);
    params.push(id);

    const query = `
      UPDATE parcelles 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *;
    `;

    const row = await this.executeQueryOne<ParcelleRow>(query, params, 'update');
    
    if (!row) {
      throw new NotFoundError('Parcelle', id);
    }

    return this.mapRowToParcelle(row);
  }

  async delete(id: string): Promise<void> {
    const query = 'DELETE FROM parcelles WHERE id = $1';
    
    let client: PoolClient | null = null;
    
    try {
      client = await this.pool.connect();
      const result = await client.query(query, [id]);
      
      if (result.rowCount === 0) {
        throw new NotFoundError('Parcelle', id);
      }
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
      throw new DatabaseError(`Delete failed: ${errorMessage}`, 'delete', {
        query,
        params: [id],
      });
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  async countByUserId(userId: string): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM parcelles WHERE user_id = $1';
    const row = await this.executeQueryOne<{ count: string }>(query, [userId], 'countByUserId');
    
    return row ? parseInt(row.count) : 0;
  }

  async searchByNumero(userId: string, searchTerm: string): Promise<Parcelle[]> {
    const query = `
      SELECT * FROM parcelles 
      WHERE user_id = $1 AND LOWER(numero) LIKE LOWER($2)
      ORDER BY created_at DESC
    `;
    const searchPattern = `%${searchTerm}%`;
    const rows = await this.executeQuery<ParcelleRow>(query, [userId, searchPattern], 'searchByNumero');
    
    return rows.map(row => this.mapRowToParcelle(row));
  }
}