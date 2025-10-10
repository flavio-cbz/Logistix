/**
 * Database mocking utilities for testing
 * Provides mock implementations of database services and repositories
 */

import { vi } from 'vitest';
import type { DatabaseService } from '../../lib/database/database-service';
import type { ProductRepository } from '../../lib/repositories/product-repository';
import type { ParcelleRepository } from '../../lib/repositories/parcelle-repository';

// Mock database service
export const createMockDatabaseService = () => ({
  getDb: vi.fn(),
  executeQuery: vi.fn(),
  executeTransaction: vi.fn(),
  healthCheck: vi.fn().mockResolvedValue(true),
  getConnectionStats: vi.fn().mockReturnValue({
    activeConnections: 1,
    totalConnections: 1,
    idleConnections: 0,
  }),
  close: vi.fn(),
});

// Mock product repository
export const createMockProductRepository = () => ({
  findAllByUserId: vi.fn(),
  findById: vi.fn(),
  findByParcelleId: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  search: vi.fn(),
});

// Mock parcelle repository
export const createMockParcelleRepository = () => ({
  findAllByUserId: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  countProductsByParcelleId: vi.fn(),
});

// In-memory database setup for integration tests
export const setupInMemoryDatabase = async () => {
  const Database = require('better-sqlite3');
  const { drizzle } = require('drizzle-orm/better-sqlite3');
  
  // Import schema using ES module syntax pour que l'alias @ fonctionne
  const schema = await import('../../lib/database/schema');
  
  // Create in-memory database
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite, { schema });
  
  // Create tables (you would run migrations here in a real setup)
  // This is a simplified version - in practice, you'd run your actual migrations
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT,
      passwordHash TEXT NOT NULL,
      encryptionSecret TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS parcelles (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      numero TEXT NOT NULL,
      transporteur TEXT NOT NULL,
      poids REAL NOT NULL,
      prixAchat REAL NOT NULL,
      prixTotal REAL,
      prixParGramme REAL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id)
    );
    
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      parcelleId TEXT,
      name TEXT,
      titre TEXT,
      description TEXT,
      brand TEXT,
      marque TEXT,
      category TEXT,
      subcategory TEXT,
      size TEXT,
      taille TEXT,
      color TEXT,
      couleur TEXT,
      material TEXT,
      condition TEXT,
      weight REAL,
      poids REAL,
      purchasePrice REAL,
      prix REAL,
      sellingPrice REAL,
      prixVente REAL,
      currency TEXT DEFAULT 'EUR',
      status TEXT DEFAULT 'available',
      platform TEXT,
      plateforme TEXT,
      externalId TEXT,
      vintedItemId TEXT,
      url TEXT,
      photoUrl TEXT,
      fraisPort REAL,
      vendu TEXT,
      dateMiseEnLigne TEXT,
      dateVente TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      listedAt TEXT,
      soldAt TEXT,
      FOREIGN KEY (userId) REFERENCES users(id),
      FOREIGN KEY (parcelleId) REFERENCES parcelles(id)
    );
  `);
  
  return { db, sqlite };
};

// Cleanup in-memory database
export const cleanupInMemoryDatabase = (sqlite: any) => {
  if (sqlite) {
    sqlite.close();
  }
};