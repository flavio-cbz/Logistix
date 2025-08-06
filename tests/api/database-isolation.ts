import Database from 'better-sqlite3'
import { vi } from 'vitest'
import path from 'path'
import fs from 'fs'

// Database isolation manager for API tests
export class DatabaseIsolationManager {
  private testDatabases: Map<string, any> = new Map()
  private originalDatabase: any = null
  private testCounter = 0

  // Create isolated test database for each test
  async createIsolatedDatabase(testName?: string): Promise<any> {
    const dbName = testName || `test-${++this.testCounter}-${Date.now()}`
    const dbPath = `:memory:` // Use in-memory database for speed
    
    const db = new Database(dbPath, {
      verbose: process.env.DEBUG_SQL ? console.log : undefined
    })

    // Initialize schema
    await this.initializeSchema(db)
    
    // Store reference
    this.testDatabases.set(dbName, db)
    
    return db
  }

  // Initialize database schema
  private async initializeSchema(db: any) {
    const schemaSQL = `
      -- Users table
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        profile TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Parcelles table
      CREATE TABLE IF NOT EXISTS parcelles (
        id TEXT PRIMARY KEY,
        numero TEXT UNIQUE NOT NULL,
        transporteur TEXT NOT NULL,
        poids REAL NOT NULL,
        prix_achat REAL NOT NULL,
        date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
        user_id TEXT NOT NULL,
        notes TEXT,
        status TEXT DEFAULT 'active',
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );

      -- Products table
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        nom TEXT NOT NULL,
        prix REAL NOT NULL,
        quantite INTEGER NOT NULL,
        parcelle_id TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'available',
        date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
        date_vente DATETIME,
        prix_vente REAL,
        plateforme TEXT,
        frais_vente REAL DEFAULT 0,
        benefice REAL,
        images TEXT,
        tags TEXT,
        FOREIGN KEY (parcelle_id) REFERENCES parcelles (id) ON DELETE CASCADE
      );

      -- Sessions table
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );

      -- Market analysis table
      CREATE TABLE IF NOT EXISTS market_analysis (
        id TEXT PRIMARY KEY,
        query TEXT NOT NULL,
        brand TEXT,
        category TEXT,
        min_price REAL,
        max_price REAL,
        condition TEXT,
        results TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        user_id TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );

      -- Statistics cache table
      CREATE TABLE IF NOT EXISTS statistics_cache (
        id TEXT PRIMARY KEY,
        cache_key TEXT UNIQUE NOT NULL,
        data TEXT NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Audit log table
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        action TEXT NOT NULL,
        resource_type TEXT NOT NULL,
        resource_id TEXT,
        old_values TEXT,
        new_values TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
      );

      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_parcelles_user_id ON parcelles(user_id);
      CREATE INDEX IF NOT EXISTS idx_parcelles_numero ON parcelles(numero);
      CREATE INDEX IF NOT EXISTS idx_products_parcelle_id ON products(parcelle_id);
      CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
      CREATE INDEX IF NOT EXISTS idx_market_analysis_user_id ON market_analysis(user_id);
      CREATE INDEX IF NOT EXISTS idx_statistics_cache_key ON statistics_cache(cache_key);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
    `

    db.exec(schemaSQL)
  }

  // Seed test data into isolated database
  async seedTestData(db: any, seedData?: any) {
    const defaultSeedData = {
      users: [
        {
          id: 'test-user-1',
          username: 'testuser',
          email: 'test@example.com',
          password: '$2b$10$rQZ9QmjQZ9QmjQZ9QmjQZO', // hashed 'password123'
          role: 'user',
          profile: JSON.stringify({
            firstName: 'Test',
            lastName: 'User',
            theme: 'system'
          })
        },
        {
          id: 'test-admin-1',
          username: 'admin',
          email: 'admin@example.com',
          password: '$2b$10$rQZ9QmjQZ9QmjQZ9QmjQZO', // hashed 'password123'
          role: 'admin',
          profile: JSON.stringify({
            firstName: 'Admin',
            lastName: 'User',
            theme: 'system'
          })
        }
      ],
      parcelles: [
        {
          id: 'test-parcelle-1',
          numero: 'P001',
          transporteur: 'DHL',
          poids: 1.5,
          prix_achat: 25.50,
          user_id: 'test-user-1',
          notes: 'Test parcelle',
          status: 'active'
        }
      ],
      products: [
        {
          id: 'test-product-1',
          nom: 'Test Product',
          prix: 15.99,
          quantite: 1,
          parcelle_id: 'test-parcelle-1',
          description: 'Test product description',
          status: 'available'
        }
      ]
    }

    const dataToSeed = { ...defaultSeedData, ...seedData }

    // Begin transaction for atomic seeding
    const transaction = db.transaction(() => {
      // Seed users
      const insertUser = db.prepare(`
        INSERT INTO users (id, username, email, password, role, profile)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      
      for (const user of dataToSeed.users) {
        insertUser.run(user.id, user.username, user.email, user.password, user.role, user.profile)
      }

      // Seed parcelles
      const insertParcelle = db.prepare(`
        INSERT INTO parcelles (id, numero, transporteur, poids, prix_achat, user_id, notes, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      
      for (const parcelle of dataToSeed.parcelles) {
        insertParcelle.run(
          parcelle.id, parcelle.numero, parcelle.transporteur, 
          parcelle.poids, parcelle.prix_achat, parcelle.user_id, 
          parcelle.notes, parcelle.status
        )
      }

      // Seed products
      const insertProduct = db.prepare(`
        INSERT INTO products (id, nom, prix, quantite, parcelle_id, description, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      
      for (const product of dataToSeed.products) {
        insertProduct.run(
          product.id, product.nom, product.prix, product.quantite,
          product.parcelle_id, product.description, product.status
        )
      }
    })

    transaction()
  }

  // Clean database between tests
  async cleanDatabase(db: any) {
    const tables = [
      'audit_logs',
      'statistics_cache', 
      'market_analysis',
      'sessions',
      'products',
      'parcelles',
      'users'
    ]

    const transaction = db.transaction(() => {
      // Disable foreign key constraints temporarily
      db.exec('PRAGMA foreign_keys = OFF')
      
      // Clear all tables
      for (const table of tables) {
        db.exec(`DELETE FROM ${table}`)
      }
      
      // Re-enable foreign key constraints
      db.exec('PRAGMA foreign_keys = ON')
    })

    transaction()
  }

  // Close and cleanup isolated database
  async cleanupDatabase(dbName: string) {
    const db = this.testDatabases.get(dbName)
    if (db) {
      db.close()
      this.testDatabases.delete(dbName)
    }
  }

  // Cleanup all test databases
  async cleanupAllDatabases() {
    for (const [name, db] of this.testDatabases) {
      try {
        db.close()
      } catch (error) {
        console.warn(`Error closing database ${name}:`, error)
      }
    }
    this.testDatabases.clear()
  }

  // Create database transaction for test isolation
  createTransaction(db: any) {
    return {
      begin: () => db.exec('BEGIN TRANSACTION'),
      commit: () => db.exec('COMMIT'),
      rollback: () => db.exec('ROLLBACK'),
      
      // Execute function within transaction
      execute: async (fn: () => Promise<any>) => {
        db.exec('BEGIN TRANSACTION')
        try {
          const result = await fn()
          db.exec('COMMIT')
          return result
        } catch (error) {
          db.exec('ROLLBACK')
          throw error
        }
      }
    }
  }

  // Mock database service for testing
  createMockDatabaseService(db: any) {
    return {
      // User operations
      users: {
        findById: (id: string) => {
          const stmt = db.prepare('SELECT * FROM users WHERE id = ?')
          return stmt.get(id)
        },
        findByEmail: (email: string) => {
          const stmt = db.prepare('SELECT * FROM users WHERE email = ?')
          return stmt.get(email)
        },
        create: (userData: any) => {
          const stmt = db.prepare(`
            INSERT INTO users (id, username, email, password, role, profile)
            VALUES (?, ?, ?, ?, ?, ?)
          `)
          stmt.run(userData.id, userData.username, userData.email, userData.password, userData.role, userData.profile)
          return userData
        },
        update: (id: string, updates: any) => {
          const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ')
          const values = Object.values(updates)
          const stmt = db.prepare(`UPDATE users SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
          stmt.run(...values, id)
          return this.users.findById(id)
        },
        delete: (id: string) => {
          const stmt = db.prepare('DELETE FROM users WHERE id = ?')
          const result = stmt.run(id)
          return result.changes > 0
        }
      },

      // Parcelle operations
      parcelles: {
        findById: (id: string) => {
          const stmt = db.prepare('SELECT * FROM parcelles WHERE id = ?')
          return stmt.get(id)
        },
        findByUserId: (userId: string) => {
          const stmt = db.prepare('SELECT * FROM parcelles WHERE user_id = ?')
          return stmt.all(userId)
        },
        create: (parcelleData: any) => {
          const stmt = db.prepare(`
            INSERT INTO parcelles (id, numero, transporteur, poids, prix_achat, user_id, notes, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `)
          stmt.run(
            parcelleData.id, parcelleData.numero, parcelleData.transporteur,
            parcelleData.poids, parcelleData.prix_achat, parcelleData.user_id,
            parcelleData.notes, parcelleData.status
          )
          return parcelleData
        },
        update: (id: string, updates: any) => {
          const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ')
          const values = Object.values(updates)
          const stmt = db.prepare(`UPDATE parcelles SET ${fields} WHERE id = ?`)
          stmt.run(...values, id)
          return this.parcelles.findById(id)
        },
        delete: (id: string) => {
          const stmt = db.prepare('DELETE FROM parcelles WHERE id = ?')
          const result = stmt.run(id)
          return result.changes > 0
        }
      },

      // Product operations
      products: {
        findById: (id: string) => {
          const stmt = db.prepare('SELECT * FROM products WHERE id = ?')
          return stmt.get(id)
        },
        findByParcelleId: (parcelleId: string) => {
          const stmt = db.prepare('SELECT * FROM products WHERE parcelle_id = ?')
          return stmt.all(parcelleId)
        },
        create: (productData: any) => {
          const stmt = db.prepare(`
            INSERT INTO products (id, nom, prix, quantite, parcelle_id, description, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `)
          stmt.run(
            productData.id, productData.nom, productData.prix, productData.quantite,
            productData.parcelle_id, productData.description, productData.status
          )
          return productData
        },
        update: (id: string, updates: any) => {
          const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ')
          const values = Object.values(updates)
          const stmt = db.prepare(`UPDATE products SET ${fields} WHERE id = ?`)
          stmt.run(...values, id)
          return this.products.findById(id)
        },
        delete: (id: string) => {
          const stmt = db.prepare('DELETE FROM products WHERE id = ?')
          const result = stmt.run(id)
          return result.changes > 0
        }
      },

      // Transaction support
      transaction: (fn: () => any) => {
        const transaction = db.transaction(fn)
        return transaction()
      }
    }
  }

  // Database state snapshot for rollback testing
  createSnapshot(db: any) {
    const snapshot = {
      users: db.prepare('SELECT * FROM users').all(),
      parcelles: db.prepare('SELECT * FROM parcelles').all(),
      products: db.prepare('SELECT * FROM products').all(),
      sessions: db.prepare('SELECT * FROM sessions').all()
    }

    return {
      data: snapshot,
      restore: () => {
        const transaction = db.transaction(() => {
          // Clear current data
          db.exec('DELETE FROM sessions')
          db.exec('DELETE FROM products')
          db.exec('DELETE FROM parcelles')
          db.exec('DELETE FROM users')

          // Restore snapshot data
          const insertUser = db.prepare(`
            INSERT INTO users (id, username, email, password, role, profile, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `)
          
          for (const user of snapshot.users) {
            insertUser.run(
              user.id, user.username, user.email, user.password, 
              user.role, user.profile, user.created_at, user.updated_at
            )
          }

          const insertParcelle = db.prepare(`
            INSERT INTO parcelles (id, numero, transporteur, poids, prix_achat, date_creation, user_id, notes, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `)
          
          for (const parcelle of snapshot.parcelles) {
            insertParcelle.run(
              parcelle.id, parcelle.numero, parcelle.transporteur, parcelle.poids,
              parcelle.prix_achat, parcelle.date_creation, parcelle.user_id, 
              parcelle.notes, parcelle.status
            )
          }

          const insertProduct = db.prepare(`
            INSERT INTO products (id, nom, prix, quantite, parcelle_id, description, status, date_creation)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `)
          
          for (const product of snapshot.products) {
            insertProduct.run(
              product.id, product.nom, product.prix, product.quantite,
              product.parcelle_id, product.description, product.status, product.date_creation
            )
          }

          const insertSession = db.prepare(`
            INSERT INTO sessions (id, user_id, token, expires_at, created_at)
            VALUES (?, ?, ?, ?, ?)
          `)
          
          for (const session of snapshot.sessions) {
            insertSession.run(
              session.id, session.user_id, session.token, 
              session.expires_at, session.created_at
            )
          }
        })

        transaction()
      }
    }
  }
}

// Global database isolation manager instance
export const dbIsolationManager = new DatabaseIsolationManager()

// Helper functions for test setup
export async function setupIsolatedDatabase(testName?: string) {
  return dbIsolationManager.createIsolatedDatabase(testName)
}

export async function cleanupIsolatedDatabase(dbName: string) {
  return dbIsolationManager.cleanupDatabase(dbName)
}

export async function seedDatabase(db: any, seedData?: any) {
  return dbIsolationManager.seedTestData(db, seedData)
}

export async function cleanDatabase(db: any) {
  return dbIsolationManager.cleanDatabase(db)
}