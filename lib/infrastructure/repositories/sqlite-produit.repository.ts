import { Product } from "@/lib/types/entities";
import { CreateProduitDTO, ProduitRepository } from "@/lib/application/ports/produit-repository.port";
import { databaseService } from "@/lib/services/database/db"; // Assuming a named export exists; adjust if needed
import { InfrastructureError, NotFoundError } from "@/lib/shared/errors/base-errors";

// NOTE: Adapter sur la table existante `produits` (si la structure diffère ajuster les colonnes)
export class SQLiteProduitRepository implements ProduitRepository {
  async create(data: CreateProduitDTO): Promise<Product> {
    try {
      await databaseService.execute(
        `INSERT INTO produits (nom, prix, quantite, parcelle_id, user_id) VALUES (?, ?, ?, ?, ?)`,
        [data.nom, data.prix ?? null, data.quantite ?? null, data.parcelleId ?? null, data.userId],
        'repo:produits:create'
      );
      const row = await databaseService.queryOne<any>(
        `SELECT id, nom, prix, quantite, parcelle_id as parcelleId, user_id as userId, created_at as createdAt FROM products WHERE rowid = last_insert_rowid()`,
        [],
        'repo:produits:fetchCreated'
      );
      if (!row) throw new InfrastructureError('Insertion produit non retrouvée');
      return {
        id: row.id,
        name: row.nom,
        price: row.prix ?? 0,
        poids: row.quantite ?? 0,
        currency: 'EUR',
        category: 'general',
        parcelleId: row.parcelleId,
        userId: row.userId,
        vendu: "0",
        status: 'draft' as any,
        createdAt: row.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } catch (e: any) {
      throw new InfrastructureError('Erreur création produit', { original: e?.message });
    }
  }

  async findById(id: string, userId: string): Promise<Product | null> {
    const numericId = Number(id);
    if (Number.isNaN(numericId)) return null;
    const row = await databaseService.queryOne<any>(
      `SELECT id, nom, prix, quantite, parcelle_id as parcelleId, user_id as userId, created_at as createdAt FROM products WHERE id = ? AND user_id = ?`,
      [numericId, userId],
      'repo:produits:findById'
    );
    if (!row) return null;
    return {
      id: row.id,
      name: row.nom,
      price: row.prix ?? 0,
      poids: row.quantite ?? 0,
      currency: 'EUR',
      category: 'general',
      parcelleId: row.parcelleId,
      userId: row.userId,
      vendu: "0",
      status: 'draft' as any,
      createdAt: row.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async findAllByUser(userId: string): Promise<Product[]> {
    const rows = await databaseService.query<any>(
      `SELECT id, nom, prix, quantite, parcelle_id as parcelleId, user_id as userId, created_at as createdAt FROM products WHERE user_id = ? ORDER BY created_at DESC`,
      [userId],
      'repo:produits:findAllByUser'
    );
    return rows.map((r: any) => ({
      id: r.id,
      name: r.nom,
      price: r.prix ?? 0,
      poids: r.quantite ?? 0,
      currency: 'EUR',
      category: 'general',
      parcelleId: r.parcelleId,
      userId: r.userId,
      vendu: "0",
      status: 'draft' as any,
      createdAt: r.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
  }

  async update(id: string, userId: string, patch: Partial<CreateProduitDTO>): Promise<Product> {
    const existing = await this.findById(id, userId);
    if (!existing) throw new NotFoundError('Produit introuvable');

    // Build dynamic update
    const fields: string[] = [];
    const values: any[] = [];
    if (patch.nom !== undefined) { fields.push('nom = ?'); values.push(patch.nom); }
    if (patch.prix !== undefined) { fields.push('prix = ?'); values.push(patch.prix); }
    if (patch.quantite !== undefined) { fields.push('quantite = ?'); values.push(patch.quantite); }
    if (patch.parcelleId !== undefined) { fields.push('parcelle_id = ?'); values.push(patch.parcelleId); }

    if (fields.length > 0) {
      const numericId = Number(id);
      values.push(numericId, userId);
      await databaseService.execute(
        `UPDATE produits SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
        values,
        'repo:produits:update'
      );
    }

    const refreshed = await this.findById(id, userId);
    if (!refreshed) throw new InfrastructureError('Produit mis à jour introuvable après update');
    return refreshed;
  }

  async delete(id: string, userId: string): Promise<void> {
    const numericId = Number(id);
    await databaseService.execute(
      `DELETE FROM products WHERE id = ? AND user_id = ?`,
      [numericId, userId],
      'repo:produits:delete'
    );
  }
}
