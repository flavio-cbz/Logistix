/**
 * Database mocking utilities for testing
 * Provides mock implementations of database services and repositories
 */

import { vi } from 'vitest';

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
  // Enforce foreign key constraints for integration tests (Better-SQLite3 requires explicit PRAGMA)
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });

  // Bridge helpers: expose run/get/all/exec compatible with Better-SQLite3 for tests
  (db as any).run = (sql: string, params: any[] = []) => {
    const stmt = sqlite.prepare(sql);
    if (Array.isArray(params)) {
      return stmt.run(...params);
    }
    return stmt.run(params);
  };
  (db as any).get = (sql: string, params: any[] = []) => {
    const stmt = sqlite.prepare(sql);
    return stmt.get(...(Array.isArray(params) ? params : [params]));
  };
  (db as any).all = (sql: string, params: any[] = []) => {
    const stmt = sqlite.prepare(sql);
    return stmt.all(...(Array.isArray(params) ? params : [params]));
  };
  (db as any).exec = (sql: string) => {
    return sqlite.exec(sql);
  };
  
  // Create tables (you would run migrations here in a real setup)
  // This is a simplified version - in practice, you'd run your actual migrations
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT,
      -- keep canonical snake_case columns used by test SQL inserts
      password_hash TEXT,
      encryption_secret TEXT,
      created_at TEXT,
      updated_at TEXT
    );
    
    CREATE TABLE IF NOT EXISTS parcelles (
      id TEXT PRIMARY KEY,
      -- user_id / userId compatibility
      user_id TEXT,
      userId TEXT,
      numero TEXT NOT NULL,
      transporteur TEXT NOT NULL,
      poids REAL NOT NULL,
      prix_achat REAL,
      prixAchat REAL,
      prix_total REAL,
      prixTotal REAL,
      prix_par_gramme REAL,
      prixParGramme REAL,
      created_at TEXT,
      createdAt TEXT,
      updated_at TEXT,
      updatedAt TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      -- userId / user_id compatibility
      user_id TEXT,
      userId TEXT,
      parcelle_id TEXT,
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
      purchase_price REAL,
      purchasePrice REAL,
      prix REAL,
      price REAL,
      selling_price REAL,
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
      frais_port REAL,
      fraisPort REAL,
      vendu TEXT,
      dateMiseEnLigne TEXT,
      dateVente TEXT,
      created_at TEXT,
      updated_at TEXT,
      createdAt TEXT,
      updatedAt TEXT,
      listedAt TEXT,
      soldAt TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (parcelle_id) REFERENCES parcelles(id)
    );

    -- Sessions table for authentication
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Per-device user sessions (used by /api/v1/sessions)
    CREATE TABLE IF NOT EXISTS user_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      device_name TEXT,
      device_type TEXT,
      ip_address TEXT,
      user_agent TEXT,
      last_activity_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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