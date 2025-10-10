/**
 * Abstracted Produit Repository (No SQL)
 * Uses AbstractRepository for complete database abstraction
 */

import { Product } from "@/lib/types/entities";
import { CreateProduitDTO, ProduitRepository } from "@/lib/application/ports/produit-repository.port";
import { AbstractRepository } from "../base/abstract-repository";
import { getDatabaseAdapter } from "../base/database-adapter-factory";

export class AbstractedProduitRepository extends AbstractRepository implements ProduitRepository {
  constructor() {
    super(getDatabaseAdapter());
  }

  async create(data: CreateProduitDTO): Promise<Product> {
    // Map DTO to actual database schema
    const dbData = {
      id: `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user_id: data.userId,
      parcelleId: data.parcelleId ?? null,
      commandeId: `cmd_${Date.now()}`,
      nom: data.nom,
      details: '',
      prixArticle: data.prix ?? 0,
      poids: data.quantite ?? 0, // Using quantite as poids for compatibility
      prixLivraison: 0,
      vendu: 0,
      plateforme: 'manual'
    };

    return this.createRecord(
      'produits',
      dbData,
      (row: any) => this.buildProduitEntity(row),
      'repo:produits:create'
    );
  }

  async findById(id: string, userId: string): Promise<Product | null> {
    return this.findRecordById(
      'produits',
      id,
      userId,
      (row: any) => this.buildProduitEntity(row),
      'repo:produits:findById'
    );
  }

  async findAllByUser(userId: string): Promise<Product[]> {
    return this.findRecordsByUser(
      'produits',
      userId,
      (row: any) => this.buildProduitEntity(row),
      'repo:produits:findAllByUser'
    );
  }

  async update(id: string, userId: string, patch: Partial<CreateProduitDTO>): Promise<Product> {
    // Convert DTO patch to database format
    const dbPatch: any = {};
    if (patch.nom !== undefined) dbPatch.nom = patch.nom;
    if (patch.prix !== undefined) dbPatch.prixArticle = patch.prix;
    if (patch.quantite !== undefined) dbPatch.poids = patch.quantite;
    if (patch.parcelleId !== undefined) dbPatch.parcelleId = patch.parcelleId;

    return this.updateRecord(
      'produits',
      id,
      userId,
      dbPatch,
      (row: any) => this.buildProduitEntity(row),
      'repo:produits:update'
    );
  }

  async delete(id: string, userId: string): Promise<void> {
    return this.deleteRecord('produits', id, userId, 'repo:produits:delete');
  }

  // Private helper to build domain entity from database row
  private buildProduitEntity(row: any): Product {
    return {
      id: row.id,
      name: row.nom,
      price: row.prixArticle, // Map actual column name
      poids: row.poids || 0,
      currency: 'EUR',
      category: 'general',
      parcelleId: row.parcelleId,
      userId: row.user_id,
      vendu: "0", // Default not sold
      status: 'draft' as any, // Default status
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString(),
    };
  }
}