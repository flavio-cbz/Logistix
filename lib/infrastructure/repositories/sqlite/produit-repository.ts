/**
 * Repository SQLite pour les Produits
 * 
 * Implémentation SQLite de l'interface IProduitRepository
 * Utilise databaseService pour l'accès aux données
 */

import { 
  IProduitRepository, 
  CreateProduitDto, 
  UpdateProduitDto 
} from '@/lib/repositories/interfaces/produit-repository.interface';
import { Product, ProductStatus } from '@/lib/shared/types/entities';
import { databaseService } from '@/lib/database/database-service';
import { DatabaseError, NotFoundError } from '@/lib/errors/custom-error';

export class SQLiteProduitRepository implements IProduitRepository {

  /**
   * Crée un nouveau produit dans la base SQLite
   */
  async create(data: CreateProduitDto): Promise<Product> {
    const operationId = `create_produit_${Date.now()}`;
    
    try {
  // debug log removed (logger not wired in simplified refactor)
      
      // Insérer le produit
      await databaseService.executeRun(
        `INSERT INTO produits (
          user_id, parcelle_id, commande_id, nom, details, 
          prix_article, prix_article_ttc, poids, prix_livraison,
          vendu, date_vente, temps_en_ligne, prix_vente, 
          plateforme, benefices, pourcentage_benefice, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [
          data.userId,
          data.parcelleId || null,
          data.commandeId,
          data.nom,
          data.details || null,
          data.prixArticle,
          data.prixArticleTTC || null,
          data.poids,
          data.prixLivraison,
          data.vendu ? 1 : 0,
          data.dateVente || null,
          data.tempsEnLigne || null,
          data.prixVente || null,
          data.plateforme || null,
          data.benefices || null,
          data.pourcentageBenefice || null
        ]
      );

      // Récupérer le produit créé
      const row = await databaseService.executeRawQueryOne<any>(
        'SELECT * FROM products WHERE id = last_insert_rowid()'
      );

      if (!row) {
        throw new DatabaseError('Failed to retrieve created produit', operationId);
      }

      const produit = this.mapRowToProduit(row);
      
      return produit;
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error;
      }
      
      throw new DatabaseError(
        `Failed to create produit: ${error instanceof Error ? error.message : 'Unknown error'}`,
        operationId,
        { originalError: error }
      );
    }
  }

  /**
   * Récupère un produit par ID
   */
  async findById(id: string): Promise<Product | null> {
    const operationId = `find_produit_${id}_${Date.now()}`;
    
    try {
      const row = await databaseService.executeRawQueryOne<any>(
        'SELECT * FROM products WHERE id = ?',
        [id]
      );

      return row ? this.mapRowToProduit(row) : null;
    } catch (error) {
      throw new DatabaseError(
        `Failed to find produit: ${error instanceof Error ? error.message : 'Unknown error'}`,
        operationId,
        { productId: id }
      );
    }
  }

  /**
   * Récupère tous les produits d'un utilisateur
   */
  async findByUserId(userId: string): Promise<Product[]> {
    const operationId = `find_produits_user_${userId}_${Date.now()}`;
    
    try {
      const rows = await databaseService.executeRawQuery<any>(
        'SELECT * FROM products WHERE user_id = ? ORDER BY created_at DESC',
        [userId]
      );

      return rows.map(row => this.mapRowToProduit(row));
    } catch (error) {
      throw new DatabaseError(
        `Failed to find produits: ${error instanceof Error ? error.message : 'Unknown error'}`,
        operationId,
        { userId }
      );
    }
  }

  /**
   * Récupère tous les produits d'une parcelle
   */
  async findByParcelleId(parcelleId: string): Promise<Product[]> {
    const operationId = `find_produits_parcelle_${parcelleId}_${Date.now()}`;
    
    try {
      const rows = await databaseService.executeRawQuery<any>(
        'SELECT * FROM products WHERE parcelle_id = ? ORDER BY created_at DESC',
        [parcelleId]
      );

      return rows.map(row => this.mapRowToProduit(row));
    } catch (error) {
      throw new DatabaseError(
        `Failed to find produits: ${error instanceof Error ? error.message : 'Unknown error'}`,
        operationId,
        { parcelleId }
      );
    }
  }

  /**
   * Met à jour un produit
   */
  async update(id: string, data: UpdateProduitDto): Promise<Product> {
    const operationId = `update_produit_${id}_${Date.now()}`;
    
    try {
      // Vérifier que le produit existe
      const existingProduit = await this.findById(id);
      if (!existingProduit) {
        throw new NotFoundError(`Produit with id ${id} not found`);
      }

      // Construire la requête dynamiquement
      const updateFields: string[] = [];
      const updateValues: any[] = [];

      if (data.parcelleId !== undefined) {
        updateFields.push('parcelle_id = ?');
        updateValues.push(data.parcelleId);
      }
      if (data.commandeId !== undefined) {
        updateFields.push('commande_id = ?');
        updateValues.push(data.commandeId);
      }
      if (data.nom !== undefined) {
        updateFields.push('nom = ?');
        updateValues.push(data.nom);
      }
      if (data.details !== undefined) {
        updateFields.push('details = ?');
        updateValues.push(data.details);
      }
      if (data.prixArticle !== undefined) {
        updateFields.push('prix_article = ?');
        updateValues.push(data.prixArticle);
      }
      if (data.prixArticleTTC !== undefined) {
        updateFields.push('prix_article_ttc = ?');
        updateValues.push(data.prixArticleTTC);
      }
      if (data.poids !== undefined) {
        updateFields.push('poids = ?');
        updateValues.push(data.poids);
      }
      if (data.prixLivraison !== undefined) {
        updateFields.push('prix_livraison = ?');
        updateValues.push(data.prixLivraison);
      }
      if (data.vendu !== undefined) {
        updateFields.push('vendu = ?');
        updateValues.push(data.vendu ? 1 : 0);
      }
      if (data.dateVente !== undefined) {
        updateFields.push('date_vente = ?');
        updateValues.push(data.dateVente);
      }
      if (data.tempsEnLigne !== undefined) {
        updateFields.push('temps_en_ligne = ?');
        updateValues.push(data.tempsEnLigne);
      }
      if (data.prixVente !== undefined) {
        updateFields.push('prix_vente = ?');
        updateValues.push(data.prixVente);
      }
      if (data.plateforme !== undefined) {
        updateFields.push('plateforme = ?');
        updateValues.push(data.plateforme);
      }
      if (data.benefices !== undefined) {
        updateFields.push('benefices = ?');
        updateValues.push(data.benefices);
      }
      if (data.pourcentageBenefice !== undefined) {
        updateFields.push('pourcentage_benefice = ?');
        updateValues.push(data.pourcentageBenefice);
      }

      if (updateFields.length === 0) {
        // Aucun champ à mettre à jour, retourner le produit existant
        return existingProduit;
      }

      // Ajouter updated_at
      updateFields.push('updated_at = datetime(\'now\')');
      updateValues.push(id); // Pour la clause WHERE

      await databaseService.executeRun(
        `UPDATE produits SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      // Récupérer le produit mis à jour
      const updatedProduit = await this.findById(id);
      if (!updatedProduit) {
        throw new DatabaseError('Failed to retrieve updated produit', operationId);
      }

      return updatedProduit;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof DatabaseError) {
        throw error;
      }
      
      throw new DatabaseError(
        `Failed to update produit: ${error instanceof Error ? error.message : 'Unknown error'}`,
        operationId,
        { productId: id }
      );
    }
  }

  /**
   * Supprime un produit
   */
  async delete(id: string): Promise<void> {
    const operationId = `delete_produit_${id}_${Date.now()}`;
    
    try {
      // Vérifier que le produit existe
      const existingProduit = await this.findById(id);
      if (!existingProduit) {
        throw new NotFoundError(`Produit with id ${id} not found`);
      }

      await databaseService.executeRun(
        'DELETE FROM products WHERE id = ?',
        [id]
      );
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      
      throw new DatabaseError(
        `Failed to delete produit: ${error instanceof Error ? error.message : 'Unknown error'}`,
        operationId,
        { productId: id }
      );
    }
  }

  /**
   * Compte les produits d'un utilisateur
   */
  async countByUserId(userId: string): Promise<number> {
    const operationId = `count_produits_user_${userId}_${Date.now()}`;
    
    try {
      const row = await databaseService.executeRawQueryOne<{ count: number }>(
        'SELECT COUNT(*) as count FROM products WHERE user_id = ?',
        [userId]
      );

      return row?.count ?? 0;
    } catch (error) {
      throw new DatabaseError(
        `Failed to count produits: ${error instanceof Error ? error.message : 'Unknown error'}`,
        operationId,
        { userId }
      );
    }
  }

  /**
   * Recherche des produits par nom
   */
  async searchByName(userId: string, searchTerm: string): Promise<Product[]> {
    const operationId = `search_produits_${userId}_${Date.now()}`;
    
    try {
      const rows = await databaseService.executeRawQuery<any>(
        `SELECT * FROM products 
         WHERE user_id = ? AND nom LIKE ? 
         ORDER BY created_at DESC`,
        [userId, `%${searchTerm}%`]
      );

      return rows.map(row => this.mapRowToProduit(row));
    } catch (error) {
      throw new DatabaseError(
        `Failed to search produits: ${error instanceof Error ? error.message : 'Unknown error'}`,
        operationId,
        { userId, searchTerm }
      );
    }
  }

  /**
   * Mappe une ligne de DB vers une entité Product moderne
   */
  private mapRowToProduit(row: any): Product {
    // Mapping vers l'interface Product moderne
    return {
      id: String(row.id),
      userId: row.user_id,
      parcelleId: row.parcelle_id || null,
      
      // Basic information
      name: row.nom, // Legacy: nom -> name
      poids: row.poids,
      
      // Financial information
      price: row.prix_article, // Legacy: prix_article -> price
      currency: 'EUR',
      coutLivraison: row.prix_livraison || null, // Legacy: prix_livraison -> coutLivraison
      benefices: row.benefices || null,
      
      // Vinted/Order information
      vintedItemId: row.vinted_item_id || null,
      
      // Sale status (legacy compatibility)
      vendu: row.vendu ? '1' : '0', // Boolean -> string enum
      dateMiseEnLigne: row.date_mise_en_ligne || null,
      dateVente: row.date_vente || null,
      prixVente: row.prix_vente || null,
      plateforme: row.plateforme || null,
      
      // Modern status system
      status: row.vendu ? ProductStatus.SOLD : ProductStatus.AVAILABLE,
      
      // Timestamps
      createdAt: row.created_at,
      updatedAt: row.updated_at || null,
      soldAt: row.date_vente || null,
    };
  }
}