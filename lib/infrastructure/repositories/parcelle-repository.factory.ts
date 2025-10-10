import type { ParcelleRepository, CreateParcelleDTO, UpdateParcelleDTO } from '@/lib/application/ports/parcelle-repository.port';
import { SQLiteParcelleRepository } from '@/lib/infrastructure/repositories/sqlite/parcelle-repository';
import { Parcelle } from '@/lib/domain/entities/parcelle';

class ParcelleRepositoryAdapter implements ParcelleRepository {
  constructor(private readonly repo: SQLiteParcelleRepository) {}

  async create(data: CreateParcelleDTO): Promise<Parcelle> {
    const createData: any = {
      userId: data.userId,
      numero: data.numero,
      transporteur: data.transporteur,
      nom: data.nom,
      statut: data.statut,
      prixAchat: data.prixAchat === null ? undefined : data.prixAchat,
      poids: data.poids === null ? undefined : data.poids,
      prixTotal: data.prixTotal === null ? undefined : data.prixTotal,
      prixParGramme: data.prixParGramme === null ? undefined : data.prixParGramme,
    };

    if (data.id) {
      createData.id = data.id;
    }

    return this.repo.create(createData);
  }

  async findAllByUser(userId: string): Promise<Parcelle[]> {
    return this.repo.findByUserId(userId);
  }

  async findByNumero(numero: string, userId: string): Promise<Parcelle | null> {
    return this.repo.findByUserIdAndNumero(userId, numero);
  }

  async findById(id: string, userId: string): Promise<Parcelle | null> {
    const parcelle = await this.repo.findById(id);
    return parcelle && parcelle.userId === userId ? parcelle : null;
  }

  async update(id: string, userId: string, patch: UpdateParcelleDTO): Promise<Parcelle> {
    // Vérifier que la parcelle appartient à l'utilisateur
    const existing = await this.findById(id, userId);
    if (!existing) {
      throw new Error(`Parcelle ${id} not found or access denied`);
    }

    const updateData: any = {};
    if (patch.numero !== undefined) updateData.numero = patch.numero;
    if (patch.transporteur !== undefined) updateData.transporteur = patch.transporteur;
    if (patch.nom !== undefined) updateData.nom = patch.nom;
    if (patch.statut !== undefined) updateData.statut = patch.statut;
    if (patch.prixAchat !== undefined) updateData.prixAchat = patch.prixAchat === null ? undefined : patch.prixAchat;
    if (patch.poids !== undefined) updateData.poids = patch.poids === null ? undefined : patch.poids;
    if (patch.prixTotal !== undefined) updateData.prixTotal = patch.prixTotal === null ? undefined : patch.prixTotal;
    if (patch.prixParGramme !== undefined) updateData.prixParGramme = patch.prixParGramme === null ? undefined : patch.prixParGramme;

    return this.repo.update(id, userId, updateData);
  }

  async delete(id: string, userId: string): Promise<void> {
    // Vérifier que la parcelle appartient à l'utilisateur
    const existing = await this.findById(id, userId);
    if (!existing) {
      throw new Error(`Parcelle ${id} not found or access denied`);
    }

    return this.repo.delete(id);
  }
}

export function getParcelleRepository(): ParcelleRepository {
  const sqliteRepo = new SQLiteParcelleRepository();
  return new ParcelleRepositoryAdapter(sqliteRepo);
}
