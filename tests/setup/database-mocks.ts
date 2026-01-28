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
  // Create tables (you would run migrations here in a real setup)
  sqlite.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        encryption_secret TEXT,
        email TEXT,
        bio TEXT,
        avatar TEXT,
        language TEXT,
        theme TEXT,
        ai_config TEXT,
        last_login_at TEXT,
        preferences TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      
      -- New parcels table (replacing legacy parcelles)
      CREATE TABLE IF NOT EXISTS parcels (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        superbuy_id TEXT NOT NULL,
        name TEXT,
        tracking_number TEXT,
        weight REAL,
        status TEXT NOT NULL DEFAULT 'Pending',
        carrier TEXT,
        total_price REAL,
        price_per_gram REAL,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      -- Legacy parcelles table kept if needed by other tests, but should ideally be removed
      CREATE TABLE IF NOT EXISTS parcelles (
        id TEXT PRIMARY KEY,
        user_id TEXT, -- Legacy compatibility
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
        user_id TEXT NOT NULL,
        parcel_id TEXT,
        name TEXT NOT NULL,
        description TEXT,
        brand TEXT,
        category TEXT,
        subcategory TEXT,
        size TEXT,
        color TEXT,
        poids REAL DEFAULT 0,
        price REAL NOT NULL,
        currency TEXT DEFAULT 'EUR',
        cout_livraison REAL,
        selling_price REAL,
        plateforme TEXT,
        external_id TEXT,
        url TEXT,
        photo_url TEXT,
        photo_urls TEXT,
        enrichment_data TEXT,
        vinted_stats TEXT,
        source_order_id TEXT,
        source_item_id TEXT,
        source_url TEXT,
        status TEXT NOT NULL DEFAULT 'draft',
        vendu TEXT DEFAULT '0',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        listed_at TEXT,
        sold_at TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (parcel_id) REFERENCES parcels(id)
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