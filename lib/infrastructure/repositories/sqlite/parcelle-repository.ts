/**
 * Repository SQLite pour les Parcelles
 * 
 * Implémentation SQLite de l'interface IParcelleRepository
 * Utilise better-sqlite3 pour l'accès aux données
 */

import { randomUUID } from 'crypto';
import { 
  IParcelleRepository, 
  CreateParcelleDto, 
  UpdateParcelleDto 
} from '@/lib/repositories/interfaces/parcelle-repository.interface';
import { Parcelle } from '@/lib/domain/entities/parcelle';
import { databaseService } from '@/lib/database/database-service';
import { DatabaseError, NotFoundError, ConflictError } from '@/lib/errors/custom-error';

export class SQLiteParcelleRepository implements IParcelleRepository {

  // Type interne décrivant une ligne brute de la table parcelles
  private static readonly FIELDS = `id, user_id, numero, transporteur, nom, statut, actif, prix_achat, poids, prix_total, prix_par_gramme, created_at, updated_at`;

  private buildSelectAll(base: string = 'parcelles'): string {
    return `SELECT ${SQLiteParcelleRepository.FIELDS} FROM ${base}`;
  }

  /**
   * Crée une nouvelle parcelle dans la base SQLite
   */
  async create(data: CreateParcelleDto): Promise<Parcelle> {
    const operationId = `create_parcelle_${Date.now()}`;
    
    try {
  // Logging simplifié (logger supprimé dans refactor précédent)
      
      // Générer un ID si pas fourni
      const parcelleId = data.id || randomUUID();
      
      // Vérifier l'unicité du numéro pour cet utilisateur
      const existingParcelle = await this.findByUserIdAndNumero(data.userId, data.numero);
      if (existingParcelle) {
        throw new ConflictError(`Parcelle with numero ${data.numero} already exists for this user`);
      }
      
      // Insérer la parcelle
      await databaseService.executeRun(
        `INSERT INTO parcelles (
          id, user_id, numero, transporteur, nom, statut, prix_achat, 
          poids, prix_total, prix_par_gramme, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [
          parcelleId,
          data.userId,
          data.numero,
          data.transporteur,
          data.nom,
          data.statut,
          data.prixAchat || null,
          data.poids || null,
          data.prixTotal || null,
          data.prixParGramme || null
        ]
      );

      // Récupérer la parcelle créée
      const row = await databaseService.executeRawQueryOne<any>(
        `${this.buildSelectAll()} WHERE id = ?`,
        [parcelleId]
      );

      if (!row) {
        throw new DatabaseError('Failed to retrieve created parcelle', operationId);
      }

      const parcelle = this.mapRowToParcelle(row);
      
      return parcelle;
    } catch (error) {
      
      if (error instanceof DatabaseError || error instanceof ConflictError) {
        throw error;
      }
      
      throw new DatabaseError(
        `Failed to create parcelle: ${error instanceof Error ? error.message : 'Unknown error'}`,
        operationId,
        { originalError: error }
      );
    }
  }

  /**
   * Récupère une parcelle par ID
   */
  async findById(id: string): Promise<Parcelle | null> {
    const operationId = `find_parcelle_${id}_${Date.now()}`;
    
    try {
      const row = await databaseService.executeRawQueryOne<any>(
        `${this.buildSelectAll()} WHERE id = ?`,
        [id]
      );

      return row ? this.mapRowToParcelle(row) : null;
    } catch (error) {
      throw new DatabaseError(
        `Failed to find parcelle: ${error instanceof Error ? error.message : 'Unknown error'}`,
        operationId,
        { parcelleId: id }
      );
    }
  }

  /**
   * Récupère toutes les parcelles d'un utilisateur
   */
  async findByUserId(userId: string): Promise<Parcelle[]> {
    const operationId = `find_parcelles_user_${userId}_${Date.now()}`;
    
    try {
      const rows = await databaseService.executeRawQuery<any>(
        `${this.buildSelectAll()} WHERE user_id = ? ORDER BY created_at DESC`,
        [userId]
      );

      return rows.map(row => this.mapRowToParcelle(row));
    } catch (error) {
      throw new DatabaseError(
        `Failed to find parcelles: ${error instanceof Error ? error.message : 'Unknown error'}`,
        operationId,
        { userId }
      );
    }
  }

  /**
   * Récupère une parcelle par utilisateur et numéro (pour validation unicité)
   */
  async findByUserIdAndNumero(userId: string, numero: string): Promise<Parcelle | null> {
    const operationId = `find_parcelle_numero_${userId}_${Date.now()}`;
    
    try {
      const row = await databaseService.executeRawQueryOne<any>(
        `${this.buildSelectAll()} WHERE user_id = ? AND numero = ?`,
        [userId, numero]
      );

      return row ? this.mapRowToParcelle(row) : null;
    } catch (error) {
      throw new DatabaseError(
        `Failed to find parcelle: ${error instanceof Error ? error.message : 'Unknown error'}`,
        operationId,
        { userId, numero }
      );
    }
  }

  /**
   * Filtre les parcelles par transporteur
   */
  async findByTransporteur(userId: string, transporteur: string): Promise<Parcelle[]> {
    const operationId = `find_parcelles_transporteur_${userId}_${Date.now()}`;
    
    try {
      const rows = await databaseService.executeRawQuery<any>(
        `${this.buildSelectAll()} WHERE user_id = ? AND transporteur = ? ORDER BY created_at DESC`,
        [userId, transporteur]
      );

      return rows.map(row => this.mapRowToParcelle(row));
    } catch (error) {
      throw new DatabaseError(
        `Failed to find parcelles: ${error instanceof Error ? error.message : 'Unknown error'}`,
        operationId,
        { userId, transporteur }
      );
    }
  }

  /**
   * Met à jour une parcelle
   */
  async update(id: string, userId: string, data: UpdateParcelleDto): Promise<Parcelle> {
    const operationId = `update_parcelle_${id}_${Date.now()}`;
    
    try {
      // Vérifier que la parcelle existe et appartient à l'utilisateur
      const existingParcelle = await this.findById(id);
      if (!existingParcelle) {
        throw new NotFoundError(`Parcelle with id ${id} not found`);
      }

      // Vérifier que l'utilisateur est propriétaire de la parcelle
      if (existingParcelle.userId !== userId) {
        throw new NotFoundError(`Parcelle with id ${id} not found for user ${userId}`);
      }

      // Si on change le numéro, vérifier l'unicité
      if (data.numero && data.numero !== existingParcelle.numero) {
        const conflictParcelle = await this.findByUserIdAndNumero(existingParcelle.userId, data.numero);
        if (conflictParcelle) {
          throw new ConflictError(`Parcelle with numero ${data.numero} already exists for this user`);
        }
      }

      // Construire la requête dynamiquement
      const updateFields: string[] = [];
      const updateValues: any[] = [];

      if (data.numero !== undefined) {
        updateFields.push('numero = ?');
        updateValues.push(data.numero);
      }
      if (data.transporteur !== undefined) {
        updateFields.push('transporteur = ?');
        updateValues.push(data.transporteur);
      }
      if (data.nom !== undefined) {
        updateFields.push('nom = ?');
        updateValues.push(data.nom);
      }
      if (data.statut !== undefined) {
        updateFields.push('statut = ?');
        updateValues.push(data.statut);
      }
      if (data.actif !== undefined) {
        updateFields.push('actif = ?');
        updateValues.push(data.actif ? 1 : 0);
      }
      if (data.prixAchat !== undefined) {
        updateFields.push('prix_achat = ?');
        updateValues.push(data.prixAchat);
      }
      if (data.poids !== undefined) {
        updateFields.push('poids = ?');
        updateValues.push(data.poids);
      }
      if (data.prixTotal !== undefined) {
        updateFields.push('prix_total = ?');
        updateValues.push(data.prixTotal);
      }
      if (data.prixParGramme !== undefined) {
        updateFields.push('prix_par_gramme = ?');
        updateValues.push(data.prixParGramme);
      }

      if (updateFields.length === 0) {
        // Aucun champ à mettre à jour, retourner la parcelle existante
        return existingParcelle;
      }

      // Ajouter updated_at
      updateFields.push('updated_at = datetime(\'now\')');
      updateValues.push(id); // Pour la clause WHERE

      await databaseService.executeRun(
        `UPDATE parcelles SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      // Récupérer la parcelle mise à jour
      const updatedParcelle = await this.findById(id);
      if (!updatedParcelle) {
        throw new DatabaseError('Failed to retrieve updated parcelle', operationId);
      }

      return updatedParcelle;
    } catch (error) {
      
      if (error instanceof NotFoundError || error instanceof ConflictError || error instanceof DatabaseError) {
        throw error;
      }
      
      throw new DatabaseError(
        `Failed to update parcelle: ${error instanceof Error ? error.message : 'Unknown error'}`,
        operationId,
        { parcelleId: id }
      );
    }
  }

  /**
   * Supprime une parcelle
   */
  async delete(id: string): Promise<void> {
    const operationId = `delete_parcelle_${id}_${Date.now()}`;
    
    try {
      // Vérifier que la parcelle existe
      const existingParcelle = await this.findById(id);
      if (!existingParcelle) {
        throw new NotFoundError(`Parcelle with id ${id} not found`);
      }

      await databaseService.executeRun(
        'DELETE FROM parcelles WHERE id = ?',
        [id]
      );

    } catch (error) {
      
      if (error instanceof NotFoundError) {
        throw error;
      }
      
      throw new DatabaseError(
        `Failed to delete parcelle: ${error instanceof Error ? error.message : 'Unknown error'}`,
        operationId,
        { parcelleId: id }
      );
    }
  }

  /**
   * Compte les parcelles d'un utilisateur
   */
  async countByUserId(userId: string): Promise<number> {
    const operationId = `count_parcelles_user_${userId}_${Date.now()}`;
    
    try {
      const row = await databaseService.executeRawQueryOne<{ count: number }>(
        'SELECT COUNT(*) as count FROM parcelles WHERE user_id = ?',
        [userId]
      );

      return row?.count ?? 0;
    } catch (error) {
      throw new DatabaseError(
        `Failed to count parcelles: ${error instanceof Error ? error.message : 'Unknown error'}`,
        operationId,
        { userId }
      );
    }
  }

  /**
   * Recherche des parcelles par numéro (partiel)
   */
  async searchByNumero(userId: string, searchTerm: string): Promise<Parcelle[]> {
    const operationId = `search_parcelles_${userId}_${Date.now()}`;
    
    try {
      const rows = await databaseService.executeRawQuery<any>(
        `${this.buildSelectAll()} 
         WHERE user_id = ? AND numero LIKE ? 
         ORDER BY created_at DESC`,
        [userId, `%${searchTerm}%`]
      );

      return rows.map(row => this.mapRowToParcelle(row));
    } catch (error) {
      throw new DatabaseError(
        `Failed to search parcelles: ${error instanceof Error ? error.message : 'Unknown error'}`,
        operationId,
        { userId, searchTerm }
      );
    }
  }

  /**
   * Mappe une ligne de DB vers une entité Parcelle
   */
  private mapRowToParcelle(row: any): Parcelle {
    return Parcelle.create({
      id: row.id,
      userId: row.user_id,
      numero: row.numero,
      transporteur: row.transporteur,
      nom: row.nom || `${row.transporteur} - ${row.numero}`,
      statut: row.statut || 'en_transit',
      actif: row.actif === 1 || row.actif === true,
      prixAchat: row.prix_achat ?? null,
      poids: row.poids ?? null,
      prixTotal: row.prix_total ?? null,
      prixParGramme: row.prix_par_gramme ?? null,
      createdAt: new Date(row.created_at),
      updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(row.created_at)
    });
  }
}