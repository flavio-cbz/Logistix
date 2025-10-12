/**
 * Test data factory for generating consistent test data
 * Provides factory functions for creating test entities and data
 */

import { faker } from '@faker-js/faker';
import type { Product } from '@/lib/core/entities/product';
import type { Parcelle } from '@/lib/core/entities/parcelle';
import type { User } from '@/lib/types/entities';

// Seed faker for consistent test data
faker.seed(12345);

/**
 * User factory
 */
export const createTestUser = (overrides: Partial<User> = {}): User => ({
  id: faker.string.uuid(),
  username: faker.internet.userName(),
  email: faker.internet.email(),
  passwordHash: faker.string.alphanumeric(60),
  encryptionSecret: faker.string.alphanumeric(32),
  profile: {
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    avatar: faker.image.avatar(),
  },
  preferences: {
    theme: 'light',
    language: 'fr',
  },
  createdAt: faker.date.past().toISOString(),
  updatedAt: faker.date.recent().toISOString(),
  ...overrides,
});

/**
 * Parcelle factory
 */
export const createTestParcelle = (overrides: Partial<Parcelle> = {}): Parcelle => ({
  id: faker.string.uuid(),
  userId: faker.string.uuid(),
  numero: faker.string.alphanumeric(8).toUpperCase(),
  transporteur: faker.helpers.arrayElement(['DHL', 'UPS', 'FedEx', 'La Poste', 'Chronopost']),
  poids: faker.number.float({ min: 0.1, max: 5.0, fractionDigits: 2 }),
  prixAchat: faker.number.float({ min: 10, max: 500, fractionDigits: 2 }),
  prixTotal: faker.number.float({ min: 15, max: 600, fractionDigits: 2 }),
  prixParGramme: faker.number.float({ min: 0.01, max: 10, fractionDigits: 4 }),
  createdAt: faker.date.past().toISOString(),
  updatedAt: faker.date.recent().toISOString(),
  ...overrides,
});

/**
 * Product factory
 */
export const createTestProduct = (overrides: Partial<Product> = {}): Product => {
  const baseProduct = {
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    parcelleId: faker.string.uuid(),
    name: faker.commerce.productName(),
    titre: faker.commerce.productName(),
    description: faker.commerce.productDescription(),
    brand: faker.company.name(),
    marque: faker.company.name(),
    category: faker.helpers.arrayElement(['Vêtements', 'Chaussures', 'Accessoires', 'Sacs']),
    subcategory: faker.helpers.arrayElement(['Femme', 'Homme', 'Enfant']),
    size: faker.helpers.arrayElement(['XS', 'S', 'M', 'L', 'XL', 'XXL']),
    taille: faker.helpers.arrayElement(['XS', 'S', 'M', 'L', 'XL', 'XXL']),
    color: faker.color.human(),
    couleur: faker.color.human(),
    material: faker.helpers.arrayElement(['Coton', 'Polyester', 'Laine', 'Soie', 'Lin']),
    condition: faker.helpers.arrayElement(['neuf', 'excellent', 'bon', 'satisfaisant', 'usage']),
    weight: faker.number.float({ min: 0.1, max: 2.0, fractionDigits: 2 }),
    poids: faker.number.float({ min: 0.1, max: 2.0, fractionDigits: 2 }),
    purchasePrice: faker.number.float({ min: 5, max: 200, fractionDigits: 2 }),
    prix: faker.number.float({ min: 5, max: 200, fractionDigits: 2 }),
    sellingPrice: faker.number.float({ min: 10, max: 300, fractionDigits: 2 }),
    prixVente: faker.number.float({ min: 10, max: 300, fractionDigits: 2 }),
    currency: 'EUR',
    status: faker.helpers.arrayElement(['available', 'sold', 'reserved', 'removed', 'en_stock', 'vendu']),
    platform: faker.helpers.arrayElement(['Vinted', 'leboncoin', 'autre']),
    plateforme: faker.helpers.arrayElement(['Vinted', 'leboncoin', 'autre']),
    externalId: faker.string.alphanumeric(10),
    vintedItemId: faker.string.alphanumeric(10),
    url: faker.internet.url(),
    photoUrl: faker.image.url(),
    fraisPort: faker.number.float({ min: 2, max: 15, fractionDigits: 2 }),
    vendu: faker.helpers.arrayElement(['0', '1']),
    dateMiseEnLigne: faker.date.past().toISOString(),
    dateVente: faker.date.recent().toISOString(),
    createdAt: faker.date.past().toISOString(),
    updatedAt: faker.date.recent().toISOString(),
    listedAt: faker.date.past().toISOString(),
    soldAt: faker.date.recent().toISOString(),
  };

  return {
    ...baseProduct,
    ...overrides,
  };
};

/**
 * Create multiple test entities
 */
export const createTestUsers = (count: number, overrides: Partial<User> = {}): User[] => {
  return Array.from({ length: count }, () => createTestUser(overrides));
};

export const createTestParcelles = (count: number, overrides: Partial<Parcelle> = {}): Parcelle[] => {
  return Array.from({ length: count }, () => createTestParcelle(overrides));
};

export const createTestProducts = (count: number, overrides: Partial<Product> = {}): Product[] => {
  return Array.from({ length: count }, () => createTestProduct(overrides));
};

/**
 * Create related test data (products belonging to a parcelle, etc.)
 */
export const createTestParcelleWithProducts = (productCount: number = 3) => {
  const user = createTestUser();
  const parcelle = createTestParcelle({ userId: user.id });
  const products = createTestProducts(productCount, { 
    userId: user.id, 
    parcelleId: parcelle.id 
  });

  return { user, parcelle, products };
};

/**
 * API request/response factories
 */
export const createTestApiRequest = (overrides: Record<string, unknown> = {}) => ({
  method: 'POST',
  headers: {
    'content-type': 'application/json',
  },
  body: JSON.stringify({}),
  ...overrides,
});

export const createTestApiResponse = (data: Record<string, unknown> = {}, status: number = 200) => ({
  success: status < 400,
  data: status < 400 ? data : undefined,
  error: status >= 400 ? { 
    code: 'TEST_ERROR', 
    message: 'Test error message' 
  } : undefined,
  meta: {
    timestamp: new Date().toISOString(),
    requestId: faker.string.uuid(),
    version: '1.0.0',
  },
});

/**
 * Validation error factories
 */
export const createValidationError = (field: string, message: string) => ({
  code: 'VALIDATION_ERROR',
  message,
  field,
  details: { value: 'invalid-value' },
});

export const createNotFoundError = (resource: string, id: string) => ({
  code: 'NOT_FOUND',
  message: `${resource} not found`,
  details: { id },
});

/**
 * Database operation result factories
 */
export const createDatabaseResult = <T>(data: T) => ({
  success: true,
  data,
  rowsAffected: 1,
});

export const createDatabaseError = (message: string) => ({
  success: false,
  error: new Error(message),
  rowsAffected: 0,
});