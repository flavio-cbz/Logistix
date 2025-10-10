/**
 * Abstracted Parcelle Repository (No SQL)
 * Uses AbstractRepository for complete database abstraction
 */

import { Parcelle } from '@/lib/domain/entities/parcelle';
import { CreateParcelleDTO, UpdateParcelleDTO, ParcelleRepository } from '@/lib/application/ports/parcelle-repository.port';
import { AbstractRepository } from '../base/abstract-repository';
import { getDatabaseAdapter } from '../base/database-adapter-factory';

export class AbstractedParcelleRepository extends AbstractRepository implements ParcelleRepository {
  constructor() {
    super(getDatabaseAdapter());
  }

  async create(data: CreateParcelleDTO): Promise<Parcelle> {
    const dbData = {
      id: data.id || `parcelle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user_id: data.userId,
      numero: data.numero,
      transporteur: data.transporteur,
      nom: data.nom || '',
      statut: data.statut || 'en_transit',
      prix_achat: data.prixAchat ?? 0,
      poids: data.poids ?? 0,
      prix_total: data.prixTotal ?? 0,
      prix_par_gramme: data.prixParGramme ?? 0,
      actif: data.actif ? 1 : 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return this.createRecord(
      'parcelles',
      dbData,
      (row: any) => this.buildParcelleEntity(row),
      'repo:parcelles:create'
    );
  }

  async findAllByUser(userId: string): Promise<Parcelle[]> {
    return this.findRecordsByUser(
      'parcelles',
      userId,
      (row: any) => this.buildParcelleEntity(row),
      'repo:parcelles:findAllByUser'
    );
  }

  async findByNumero(numero: string, userId: string): Promise<Parcelle | null> {
    const rows = await this.db.query(
      'SELECT * FROM parcelles WHERE numero = ? AND user_id = ?',
      [numero, userId],
      'repo:parcelles:findByNumero'
    );
    
    return rows.length > 0 ? this.buildParcelleEntity(rows[0]) : null;
  }

  async findById(id: string, userId: string): Promise<Parcelle | null> {
    return this.findRecordById(
      'parcelles',
      id,
      userId,
      (row: any) => this.buildParcelleEntity(row),
      'repo:parcelles:findById'
    );
  }

  async update(id: string, userId: string, patch: UpdateParcelleDTO): Promise<Parcelle> {
    // Convert DTO patch to database format
    const dbPatch: any = {};
    if (patch.numero !== undefined) dbPatch.numero = patch.numero;
    if (patch.transporteur !== undefined) dbPatch.transporteur = patch.transporteur;
    if (patch.nom !== undefined) dbPatch.nom = patch.nom;
    if (patch.statut !== undefined) dbPatch.statut = patch.statut;
    if (patch.prixAchat !== undefined) dbPatch.prix_achat = patch.prixAchat;
    if (patch.poids !== undefined) dbPatch.poids = patch.poids;
    if (patch.prixTotal !== undefined) dbPatch.prix_total = patch.prixTotal;
    if (patch.prixParGramme !== undefined) dbPatch.prix_par_gramme = patch.prixParGramme;
    if (patch.actif !== undefined) dbPatch.actif = patch.actif ? 1 : 0;
    
    // Always update the timestamp
    dbPatch.updated_at = new Date().toISOString();

    return this.updateRecord(
      'parcelles',
      id,
      userId,
      dbPatch,
      (row: any) => this.buildParcelleEntity(row),
      'repo:parcelles:update'
    );
  }

  async delete(id: string, userId: string): Promise<void> {
    return this.deleteRecord('parcelles', id, userId, 'repo:parcelles:delete');
  }

  // Private helper to build domain entity from database row
  private buildParcelleEntity(row: any): Parcelle {
    return Parcelle.create({
      id: row.id,
      userId: row.user_id,
      numero: row.numero,
      transporteur: row.transporteur,
      nom: row.nom,
      statut: row.statut,
      prixAchat: row.prix_achat,
      poids: row.poids,
      prixTotal: row.prix_total,
      prixParGramme: row.prix_par_gramme,
      actif: row.actif,
      createdAt: new Date(row.created_at || Date.now()),
      updatedAt: new Date(row.updated_at || Date.now()),
    });
  }
}