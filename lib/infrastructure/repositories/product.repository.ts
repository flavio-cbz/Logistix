import { Product } from '@/lib/domain/entities/product.entity';
import { CreateProductDTO, ProductRepository as IProductRepository } from '@/lib/application/ports/product-repository.port';
import { UpdateProductInput } from '@/lib/shared/types/entities';
import { AbstractRepository } from './base/abstract-repository';
import { getDatabaseAdapter } from './base/database-adapter-factory';

export class SQLiteProductRepository extends AbstractRepository implements IProductRepository {
  constructor() {
    super(getDatabaseAdapter());
  }

  async create(data: CreateProductDTO): Promise<Product> {
    const dbData = {
      id: `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user_id: data.userId,
      parcelle_id: data.parcelleId || null,
      vinted_item_id: data.vintedItemId || null,
      name: data.name,
      brand: data.brand || null,
      category: data.category || null,
      poids: data.poids ?? 0,
      price: data.price,
      currency: 'EUR',
      status: 'draft',
      vendu: '0',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return (this as any).createRecord(
      'products',
      dbData,
      (row: any) => this.buildProductEntity(row),
      'repo:products:create'
    );
  }

  async findById(id: string): Promise<Product | null> {
    const rows = await (this as any).db.query(
      'SELECT * FROM products WHERE id = ?',
      [id],
      'repo:products:findById'
    );

    return rows.length > 0 ? this.buildProductEntity(rows[0]) : null;
  }

  async findByUserId(userId: string): Promise<Product[]> {
    const rows = await (this as any).db.query(
      'SELECT * FROM products WHERE user_id = ? ORDER BY created_at DESC',
      [userId],
      'repo:products:findByUserId'
    );

    return rows.map((row: any) => this.buildProductEntity(row));
  }

  async findByParcelleId(parcelleId: string): Promise<Product[]> {
    const rows = await (this as any).db.query(
      'SELECT * FROM products WHERE parcelle_id = ? ORDER BY created_at DESC',
      [parcelleId],
      'repo:products:findByParcelleId'
    );

    return rows.map((row: any) => this.buildProductEntity(row));
  }

  async update(id: string, data: UpdateProductInput): Promise<Product> {
    const updateFields: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updateFields.push('name = ?');
      values.push(data.name);
    }
    if (data.brand !== undefined) {
      updateFields.push('brand = ?');
      values.push(data.brand);
    }
    if (data.category !== undefined) {
      updateFields.push('category = ?');
      values.push(data.category);
    }
    if (data.price !== undefined) {
      updateFields.push('price = ?');
      values.push(data.price);
    }
    if (data.poids !== undefined) {
      updateFields.push('poids = ?');
      values.push(data.poids);
    }
    if (data.currency !== undefined) {
      updateFields.push('currency = ?');
      values.push(data.currency);
    }
    if (data.coutLivraison !== undefined) {
      updateFields.push('cout_livraison = ?');
      values.push(data.coutLivraison);
    }
    if (data.vintedItemId !== undefined) {
      updateFields.push('vinted_item_id = ?');
      values.push(data.vintedItemId);
    }
    if (data.vendu !== undefined) {
      updateFields.push('vendu = ?');
      values.push(data.vendu);
    }
    if (data.dateMiseEnLigne !== undefined) {
      updateFields.push('date_mise_en_ligne = ?');
      values.push(data.dateMiseEnLigne);
    }
    if (data.dateVente !== undefined) {
      updateFields.push('date_vente = ?');
      values.push(data.dateVente);
    }
    if (data.prixVente !== undefined) {
      updateFields.push('prix_vente = ?');
      values.push(data.prixVente);
    }
    if (data.plateforme !== undefined) {
      updateFields.push('plateforme = ?');
      values.push(data.plateforme);
    }
    if (data.status !== undefined) {
      updateFields.push('status = ?');
      values.push(data.status);
    }
    if (data.brand !== undefined) {
      updateFields.push('brand = ?');
      values.push(data.brand);
    }
    if (data.category !== undefined) {
      updateFields.push('category = ?');
      values.push(data.category);
    }
    if (data.subcategory !== undefined) {
      updateFields.push('subcategory = ?');
      values.push(data.subcategory);
    }
    if (data.size !== undefined) {
      updateFields.push('size = ?');
      values.push(data.size);
    }
    if (data.color !== undefined) {
      updateFields.push('color = ?');
      values.push(data.color);
    }
    if (data.url !== undefined) {
      updateFields.push('url = ?');
      values.push(data.url);
    }
    if (data.photoUrl !== undefined) {
      updateFields.push('photo_url = ?');
      values.push(data.photoUrl);
    }

    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }

    updateFields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    await (this as any).db.execute(
      `UPDATE products SET ${updateFields.join(', ')} WHERE id = ?`,
      values,
      'repo:products:update'
    );

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Product not found after update');
    }

    return updated;
  }

  async delete(id: string): Promise<void> {
    await (this as any).db.execute(
      'DELETE FROM products WHERE id = ?',
      [id],
      'repo:products:delete'
    );
  }

  private buildProductEntity(row: any): Product {
    return Product.fromDatabase({
      id: row.id,
      userId: row.user_id,
      parcelleId: row.parcelle_id,
      name: row.name,
      brand: row.brand,
      category: row.category,
      subcategory: row.subcategory,
      size: row.size,
      color: row.color,
      poids: row.poids,
      price: row.price,
      currency: row.currency,
  // Some migrations / legacy scripts used the column name `prix_livraison`.
  // Read either `cout_livraison` or `prix_livraison` to preserve backward compatibility.
  coutLivraison: row.cout_livraison ?? row.prix_livraison,
      sellingPrice: row.selling_price,
      prixVente: row.prix_vente,
      plateforme: row.plateforme,
      vintedItemId: row.vinted_item_id,
      externalId: row.external_id,
      url: row.url,
      photoUrl: row.photo_url,
      status: row.status,
      vendu: row.vendu,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      dateMiseEnLigne: row.date_mise_en_ligne,
      listedAt: row.listed_at,
      dateVente: row.date_vente,
      soldAt: row.sold_at,
    });
  }
}