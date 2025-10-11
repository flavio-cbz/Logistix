/**
 * PostgreSQL Implementation of IProduitRepository
 * 
 * Implémente l'interface IProduitRepository avec node-postgres (pg)
 * Compatible avec le schema products de la DB
 */

import { Pool, PoolClient } from 'pg';
import { Product, ProductStatus } from '@/lib/shared/types/entities';
import {
  IProduitRepository,
  CreateProduitDto,
  UpdateProduitDto,
} from '@/lib/repositories/interfaces/produit-repository.interface';
import { DatabaseError, NotFoundError, ValidationError } from '@/lib/errors/custom-error';

/**
 * Configuration de connexion PostgreSQL
 */
export interface PostgresConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  connectionTimeoutMillis?: number;
  idleTimeoutMillis?: number;
  max?: number;
}

/**
 * Type row de la table products PostgreSQL
 */
interface ProductRow {
  id: string;
  user_id: string;
  parcelle_id?: string;
  name: string;
  description?: string;
  brand?: string;
  category?: string;
  subcategory?: string;
  size?: string;
  color?: string;
  material?: string;
  condition: string;
  poids: number;
  price: number;
  currency: string;
  cout_livraison?: number;
  selling_price?: number;
  prix_vente?: number;
  plateforme?: string;
  vinted_item_id?: string;
  external_id?: string;
  url?: string;
  photo_url?: string;
  status: string;
  vendu: string;
  created_at: string;
  updated_at: string;
  date_mise_en_ligne?: string;
  listed_at?: string;
  date_vente?: string;
  sold_at?: string;
}

/**
 * Repository PostgreSQL pour les produits
 */
export class PostgresProduitRepository implements IProduitRepository {
  private pool: Pool;

  constructor(config: PostgresConfig) {
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: config.connectionTimeoutMillis ?? 5000,
      idleTimeoutMillis: config.idleTimeoutMillis ?? 30000,
      max: config.max ?? 20,
    });
  }

  /**
   * Ferme le pool de connexions
   */
  async close(): Promise<void> {
    await this.pool.end();
  }

  /**
   * Convertit une row PostgreSQL en interface Product moderne
   */
  private mapRowToProduit(row: ProductRow): Product {
    return {
      id: row.id,
      userId: row.user_id,
      parcelleId: row.parcelle_id || null,
      
      // Basic information
      name: row.name,
      poids: row.poids,
      
      // Financial information
      price: row.price,
      currency: row.currency,
      coutLivraison: row.cout_livraison || null,
      benefices: null, // À calculer côté applicatif
      
      // Vinted/Order information
      vintedItemId: row.vinted_item_id || null,
      
      // Sale status (legacy compatibility)
      vendu: (row.vendu || '0') as '0' | '1' | '2' | '3',
      dateMiseEnLigne: row.date_mise_en_ligne || row.listed_at || null,
      dateVente: row.date_vente || row.sold_at || null,
      prixVente: row.prix_vente || row.selling_price || null,
      plateforme: (row.plateforme || null) as any,
      
      // Modern status system
      status: row.status as ProductStatus,
      
      // Additional product details
      brand: row.brand || null,
      category: row.category || null,
      subcategory: row.subcategory || null,
      size: row.size || null,
      color: row.color || null,
      url: row.url || null,
      photoUrl: row.photo_url || null,
      
      // Timestamps
      createdAt: row.created_at,
      updatedAt: row.updated_at || null,
      soldAt: row.sold_at || null,
    };
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
    return rows.length > 0 ? rows[0]! : null;
  }

  // =============================================================================
  // IMPLÉMENTATION IProduitRepository
  // =============================================================================

  async create(data: CreateProduitDto): Promise<Product> {
    const query = `
      INSERT INTO products (
        id, user_id, parcelle_id, name, description, 
        price, poids, cout_livraison, status, condition,
        currency, vendu, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4,
        $5, $6, $7, 'draft', 'bon',
        'EUR', '0', NOW(), NOW()
      )
      RETURNING *;
    `;

    const params = [
      data.userId,
      data.parcelleId || null,
      data.nom,
      data.details || null,
      data.prixArticle,
      data.poids,
      data.prixLivraison || null,
    ];

    const row = await this.executeQueryOne<ProductRow>(query, params, 'create');
    
    if (!row) {
      throw new DatabaseError('Failed to create product: no row returned');
    }

    return this.mapRowToProduit(row);
  }

  async findById(id: string): Promise<Product | null> {
    const query = 'SELECT * FROM products WHERE id = $1';
    const row = await this.executeQueryOne<ProductRow>(query, [id], 'findById');
    
    return row ? this.mapRowToProduit(row) : null;
  }

  async findByUserId(userId: string): Promise<Product[]> {
    const query = 'SELECT * FROM products WHERE user_id = $1 ORDER BY created_at DESC';
    const rows = await this.executeQuery<ProductRow>(query, [userId], 'findByUserId');
    
    return rows.map(row => this.mapRowToProduit(row));
  }

  async findByParcelleId(parcelleId: string): Promise<Product[]> {
    const query = 'SELECT * FROM products WHERE parcelle_id = $1 ORDER BY created_at DESC';
    const rows = await this.executeQuery<ProductRow>(query, [parcelleId], 'findByParcelleId');
    
    return rows.map(row => this.mapRowToProduit(row));
  }

  async update(id: string, data: UpdateProduitDto): Promise<Product> {
    // Construire dynamiquement la requête UPDATE
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.nom !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(data.nom);
    }
    if (data.details !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      params.push(data.details);
    }
    if (data.prixArticle !== undefined) {
      updates.push(`price = $${paramIndex++}`);
      params.push(data.prixArticle);
    }
    if (data.poids !== undefined) {
      updates.push(`poids = $${paramIndex++}`);
      params.push(data.poids);
    }
    if (data.prixLivraison !== undefined) {
      updates.push(`cout_livraison = $${paramIndex++}`);
      params.push(data.prixLivraison);
    }
    if (data.parcelleId !== undefined) {
      updates.push(`parcelle_id = $${paramIndex++}`);
      params.push(data.parcelleId);
    }
    if (data.vendu !== undefined) {
      updates.push(`vendu = $${paramIndex++}`);
      params.push(data.vendu ? '1' : '0');
    }
    if (data.dateVente !== undefined) {
      updates.push(`date_vente = $${paramIndex++}`);
      params.push(data.dateVente);
    }
    if (data.prixVente !== undefined) {
      updates.push(`selling_price = $${paramIndex++}`);
      params.push(data.prixVente);
    }

    if (updates.length === 0) {
      throw new ValidationError('No fields to update');
    }

    // Ajouter updated_at et l'id pour le WHERE
    updates.push(`updated_at = NOW()`);
    params.push(id);

    const query = `
      UPDATE products 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *;
    `;

    const row = await this.executeQueryOne<ProductRow>(query, params, 'update');
    
    if (!row) {
      throw new NotFoundError('Product', id);
    }

    return this.mapRowToProduit(row);
  }

  async delete(id: string): Promise<void> {
    const query = 'DELETE FROM products WHERE id = $1';
    
    let client: PoolClient | null = null;
    
    try {
      client = await this.pool.connect();
      const result = await client.query(query, [id]);
      
      if (result.rowCount === 0) {
        throw new NotFoundError('Product', id);
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
    const query = 'SELECT COUNT(*) as count FROM products WHERE user_id = $1';
    const row = await this.executeQueryOne<{ count: string }>(query, [userId], 'countByUserId');
    
    return row ? parseInt(row.count) : 0;
  }

  async searchByName(userId: string, searchTerm: string): Promise<Product[]> {
    const query = `
      SELECT * FROM products 
      WHERE user_id = $1 AND LOWER(name) LIKE LOWER($2)
      ORDER BY created_at DESC
    `;
    const searchPattern = `%${searchTerm}%`;
    const rows = await this.executeQuery<ProductRow>(query, [userId, searchPattern], 'searchByName');
    
    return rows.map(row => this.mapRowToProduit(row));
  }
}