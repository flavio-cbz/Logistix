import { v4 as uuidv4 } from 'uuid';

export const createTestUser = (overrides: any = {}) => {
  const now = new Date().toISOString();
  return {
    // Use plain UUIDs to satisfy validators that expect RFC4122 UUIDs
    id: overrides.id ?? uuidv4(),
    username: overrides.username ?? `user_${Math.random().toString(36).slice(2, 8)}`,
    email: overrides.email ?? `user+${Math.random().toString(36).slice(2,6)}@example.com`,
    passwordHash: overrides.passwordHash ?? 'hashed-password',
    encryptionSecret: overrides.encryptionSecret ?? 'enc-secret',
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    // legacy fields used by some tests
    password: overrides.password ?? 'password',
    preferences: overrides.preferences ?? {},
  } as const;
};

export const createTestParcelle = (overrides: any = {}) => {
  const now = new Date().toISOString();
  return {
    id: overrides.id ?? uuidv4(),
    userId: overrides.userId ?? uuidv4(),
    numero: overrides.numero ?? `P-${Math.floor(Math.random()*10000)}`,
    transporteur: overrides.transporteur ?? 'La Poste',
    poids: overrides.poids ?? 1000,
    prixAchat: overrides.prixAchat ?? 10,
    prixTotal: overrides.prixTotal ?? 100,
    prixParGramme: overrides.prixParGramme ?? 0.1,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    nom: overrides.nom ?? overrides.numero ?? 'Parcelle',
  statut: overrides.statut ?? 'En attente',
  } as const;
};

export const createTestProduct = (overrides: any = {}) => {
  const now = new Date().toISOString();
  const id = overrides.id ?? uuidv4();
  return {
    id,
    userId: overrides.userId ?? uuidv4(),
    parcelleId: overrides.parcelleId ?? uuidv4(),
    name: overrides.name ?? `Product ${id}`,
    titre: overrides.titre ?? `Titre ${id}`,
    description: overrides.description ?? 'Lorem ipsum',
    brand: overrides.brand ?? null,
    marque: overrides.marque ?? null,
    category: overrides.category ?? 'clothing',
    size: overrides.size ?? 'M',
    taille: overrides.taille ?? 'M',
    color: overrides.color ?? 'blue',
    couleur: overrides.couleur ?? 'blue',
    condition: overrides.condition ?? 'new',
    weight: overrides.weight ?? 200,
    poids: overrides.poids ?? 200,
    purchasePrice: overrides.purchasePrice ?? 5,
    price: overrides.price ?? 5,
    prix: overrides.prix ?? 20,
    sellingPrice: overrides.sellingPrice ?? 25,
    prixVente: overrides.prixVente ?? 25,
    currency: overrides.currency ?? 'EUR',
    status: overrides.status ?? 'available',
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  } as const;
};

// Helper to create multiple parcelles
export const createTestParcelles = (count: number, overrides: Partial<any> = {}) => {
  const arr = [] as ReturnType<typeof createTestParcelle>[];
  for (let i = 0; i < count; i++) {
    arr.push(createTestParcelle({ ...overrides }));
  }
  return arr;
};

export default {
  createTestUser,
  createTestParcelle,
  createTestProduct,
  createTestParcelles,
};
