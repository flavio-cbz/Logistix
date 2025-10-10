import { describe, it, expect, beforeEach } from 'vitest';
import { CreateParcelleUseCase } from '@/lib/application/use-cases/create-parcelle.use-case';
import { ListParcellesUseCase } from '@/lib/application/use-cases/list-parcelles.use-case';
import { UpdateParcelleUseCase } from '@/lib/application/use-cases/update-parcelle.use-case';
import { DeleteParcelleUseCase } from '@/lib/application/use-cases/delete-parcelle.use-case';
import type { ParcelleRepository, CreateParcelleDTO, UpdateParcelleDTO } from '@/lib/application/ports/parcelle-repository.port';
import { Parcelle } from '@/lib/domain/entities/parcelle';
import { ConflictError, NotFoundError } from '@/lib/shared/errors/base-errors';

class InMemoryParcelleRepository implements ParcelleRepository {
  private storage: Parcelle[] = [];

  async create(data: CreateParcelleDTO): Promise<Parcelle> {
    const parcelle = Parcelle.create({
      id: data.id ?? `parcelle_${this.storage.length + 1}`,
      userId: data.userId,
      numero: data.numero,
      transporteur: data.transporteur,
      nom: data.nom,
      statut: data.statut,
      actif: data.actif ?? true,
      prixAchat: data.prixAchat ?? null,
      poids: data.poids ?? null,
      prixTotal: data.prixTotal ?? null,
      prixParGramme: data.prixParGramme ?? null,
    });
    this.storage.push(parcelle);
    return parcelle;
  }

  async findAllByUser(userId: string): Promise<Parcelle[]> {
    return this.storage.filter((p) => p.userId === userId);
  }

  async findByNumero(numero: string, userId: string): Promise<Parcelle | null> {
    return (
      this.storage.find(
        (p) => p.numero === numero && p.userId === userId,
      ) ?? null
    );
  }

  async findById(id: string, userId: string): Promise<Parcelle | null> {
    return (
      this.storage.find(
        (p) => p.id === id && p.userId === userId,
      ) ?? null
    );
  }

  async update(id: string, userId: string, patch: UpdateParcelleDTO): Promise<Parcelle> {
    const index = this.storage.findIndex((p) => p.id === id && p.userId === userId);
    if (index === -1) {
      throw new NotFoundError('Parcelle introuvable', { id });
    }

    const current = this.storage[index];
    const updated = Parcelle.create({
      id: current.id,
      userId: current.userId,
      numero: patch.numero ?? current.numero,
      transporteur: patch.transporteur ?? current.transporteur,
      nom: patch.nom ?? current.nom,
      statut: patch.statut ?? current.statut,
      actif: patch.actif ?? current.actif,
      prixAchat: patch.prixAchat !== undefined ? patch.prixAchat : current.prixAchat,
      poids: patch.poids !== undefined ? patch.poids : current.poids,
      prixTotal: patch.prixTotal !== undefined ? patch.prixTotal : current.prixTotal,
      prixParGramme: patch.prixParGramme !== undefined ? patch.prixParGramme : current.prixParGramme,
      createdAt: current.createdAt,
      updatedAt: new Date(),
    });

    this.storage[index] = updated;
    return updated;
  }

  async delete(id: string, userId: string): Promise<void> {
    const index = this.storage.findIndex((p) => p.id === id && p.userId === userId);
    if (index === -1) {
      throw new NotFoundError('Parcelle introuvable', { id });
    }

    this.storage.splice(index, 1);
  }
}

describe('Parcelles use-cases', () => {
  let repo: InMemoryParcelleRepository;
  let createUseCase: CreateParcelleUseCase;
  let listUseCase: ListParcellesUseCase;
  let updateUseCase: UpdateParcelleUseCase;
  let deleteUseCase: DeleteParcelleUseCase;

  beforeEach(() => {
    repo = new InMemoryParcelleRepository();
    createUseCase = new CreateParcelleUseCase(repo);
    listUseCase = new ListParcellesUseCase(repo);
    updateUseCase = new UpdateParcelleUseCase(repo);
    deleteUseCase = new DeleteParcelleUseCase(repo);
  });

  it('crée une parcelle et normalise les champs', async () => {
    const { parcelle } = await createUseCase.execute({
      userId: 'user-1',
      numero: '  TRACK123  ',
      transporteur: ' DHL ',
      nom: ' Colis Test ',
      statut: ' en_transit ',
      poids: 1.2,
    });

    expect(parcelle.id).toBeTruthy();
    expect(parcelle.numero).toBe('TRACK123');
    expect(parcelle.transporteur).toBe('DHL');
    expect(parcelle.nom).toBe('Colis Test');
    expect(parcelle.statut).toBe('en_transit');
    expect(parcelle.poids).toBe(1.2);
  });

  it('refuse la création si le numéro existe déjà pour l’utilisateur', async () => {
    await createUseCase.execute({
      userId: 'user-1',
      numero: 'TRACK123',
      transporteur: 'DHL',
      nom: 'Colis 1',
      statut: 'en_transit',
    });

    await expect(
      createUseCase.execute({
        userId: 'user-1',
        numero: 'TRACK123',
        transporteur: 'DHL',
        nom: 'Colis 2',
        statut: 'en_transit',
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('liste les parcelles de l’utilisateur', async () => {
    await createUseCase.execute({
      userId: 'user-1',
      numero: 'TRACK123',
      transporteur: 'DHL',
      nom: 'Colis 1',
      statut: 'en_transit',
    });
    await createUseCase.execute({
      userId: 'user-1',
      numero: 'TRACK456',
      transporteur: 'UPS',
      nom: 'Colis 2',
      statut: 'en_transit',
    });
    await createUseCase.execute({
      userId: 'user-2',
      numero: 'TRACK789',
      transporteur: 'FedEx',
      nom: 'Autre',
      statut: 'livré',
    });

    const { parcelles } = await listUseCase.execute({ userId: 'user-1' });
    expect(parcelles).toHaveLength(2);
    const numeros = parcelles.map((p: Parcelle) => p.numero);
    expect(numeros).toEqual(['TRACK123', 'TRACK456']);
  });

  it('met à jour une parcelle existante', async () => {
    const { parcelle: created } = await createUseCase.execute({
      userId: 'user-1',
      numero: 'TRACK123',
      transporteur: 'DHL',
      nom: 'Colis 1',
      statut: 'en_transit',
    });

    const { parcelle: updated } = await updateUseCase.execute({
      id: created.id,
      userId: 'user-1',
      patch: {
        nom: 'Colis Modifié',
        statut: 'livré',
        poids: 2.5,
        actif: false,
      },
    });

    expect(updated.nom).toBe('Colis Modifié');
    expect(updated.statut).toBe('livré');
    expect(updated.poids).toBe(2.5);
    expect(updated.actif).toBe(false);
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(created.updatedAt.getTime());
  });

  it('refuse la mise à jour avec un numéro déjà utilisé', async () => {
    await createUseCase.execute({
      userId: 'user-1',
      numero: 'TRACK123',
      transporteur: 'DHL',
      nom: 'Colis 1',
      statut: 'en_transit',
    });

    const { parcelle } = await createUseCase.execute({
      userId: 'user-1',
      numero: 'TRACK999',
      transporteur: 'UPS',
      nom: 'Colis 2',
      statut: 'en_transit',
    });

    await expect(
      updateUseCase.execute({
        id: parcelle.id,
        userId: 'user-1',
        patch: { numero: 'TRACK123' },
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('supprime une parcelle existante', async () => {
    const { parcelle } = await createUseCase.execute({
      userId: 'user-1',
      numero: 'TRACK123',
      transporteur: 'DHL',
      nom: 'Colis 1',
      statut: 'en_transit',
    });

    await deleteUseCase.execute({ id: parcelle.id, userId: 'user-1' });

    const { parcelles } = await listUseCase.execute({ userId: 'user-1' });
    expect(parcelles).toHaveLength(0);
  });

  it('lève une erreur lors de la suppression d’une parcelle inexistante', async () => {
    await expect(
      deleteUseCase.execute({ id: 'unknown', userId: 'user-1' }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
