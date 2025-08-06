import { jest } from '@jest/globals'
import Database from 'better-sqlite3'

// Test data seeder for backend tests
export class TestDataSeeder {
  private db: any
  private seededData: Map<string, any[]> = new Map()

  constructor(database: any) {
    this.db = database
  }

  // Seed users
  async seedUsers(count: number = 5, overrides: Partial<any> = {}): Promise<any[]> {
    const users = []
    
    for (let i = 0; i < count; i++) {
      const user = {
        id: `user-${i + 1}`,
        username: `user${i + 1}`,
        email: `user${i + 1}@example.com`,
        password: '$2b$04$rQZ9QmjQZ9QmjQZ9QmjQZO', // hashed 'password123'
        role: i === 0 ? 'admin' : 'user',
        profile: JSON.stringify({
          firstName: `User${i + 1}`,
          lastName: 'Test',
          theme: 'system'
        }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...overrides
      }

      const stmt = this.db.prepare(`
        INSERT INTO users (id, username, email, password, role, profile, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      
      stmt.run(
        user.id, user.username, user.email, user.password,
        user.role, user.profile, user.created_at, user.updated_at
      )

      users.push(user)
    }

    this.seededData.set('users', users)
    return users
  }

  // Seed parcelles
  async seedParcelles(count: number = 10, userId?: string, overrides: Partial<any> = {}): Promise<any[]> {
    const users = this.seededData.get('users') || []
    const parcelles = []

    for (let i = 0; i < count; i++) {
      const parcelle = {
        id: `parcelle-${i + 1}`,
        numero: `P${String(i + 1).padStart(3, '0')}`,
        transporteur: ['DHL', 'UPS', 'FedEx', 'Colissimo', 'Chronopost'][i % 5],
        poids: parseFloat((Math.random() * 5 + 0.5).toFixed(2)),
        prix_achat: parseFloat((Math.random() * 100 + 10).toFixed(2)),
        date_creation: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        user_id: userId || (users[i % users.length]?.id || 'user-1'),
        notes: `Test parcelle ${i + 1}`,
        status: ['active', 'completed', 'cancelled'][i % 3],
        ...overrides
      }

      const stmt = this.db.prepare(`
        INSERT INTO parcelles (id, numero, transporteur, poids, prix_achat, date_creation, user_id, notes, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      
      stmt.run(
        parcelle.id, parcelle.numero, parcelle.transporteur, parcelle.poids,
        parcelle.prix_achat, parcelle.date_creation, parcelle.user_id,
        parcelle.notes, parcelle.status
      )

      parcelles.push(parcelle)
    }

    this.seededData.set('parcelles', parcelles)
    return parcelles
  }

  // Seed products
  async seedProducts(count: number = 20, parcelleId?: string, overrides: Partial<any> = {}): Promise<any[]> {
    const parcelles = this.seededData.get('parcelles') || []
    const products = []

    const productNames = [
      'T-shirt vintage', 'Jean délavé', 'Sneakers rétro', 'Veste en cuir',
      'Robe d\'été', 'Pull en laine', 'Chaussures de sport', 'Sac à main',
      'Montre classique', 'Lunettes de soleil', 'Écharpe en soie', 'Bottes d\'hiver'
    ]

    for (let i = 0; i < count; i++) {
      const isAvailable = Math.random() > 0.3 // 70% available, 30% sold
      const prix = parseFloat((Math.random() * 80 + 5).toFixed(2))
      const prixVente = isAvailable ? null : parseFloat((prix * (1 + Math.random() * 0.5)).toFixed(2))
      const fraisVente = prixVente ? parseFloat((prixVente * 0.1).toFixed(2)) : 0
      const benefice = prixVente ? parseFloat((prixVente - prix - fraisVente).toFixed(2)) : null

      const product = {
        id: `product-${i + 1}`,
        nom: productNames[i % productNames.length],
        prix,
        quantite: Math.floor(Math.random() * 3) + 1,
        parcelle_id: parcelleId || (parcelles[i % parcelles.length]?.id || 'parcelle-1'),
        description: `Description du produit ${i + 1}`,
        status: isAvailable ? 'available' : 'sold',
        date_creation: new Date(Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000).toISOString(),
        date_vente: isAvailable ? null : new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000).toISOString(),
        prix_vente: prixVente,
        plateforme: isAvailable ? null : ['Vinted', 'eBay', 'LeBonCoin', 'Facebook'][Math.floor(Math.random() * 4)],
        frais_vente: fraisVente,
        benefice,
        images: JSON.stringify([`image${i + 1}.jpg`]),
        tags: JSON.stringify(['vintage', 'rare', 'popular'].slice(0, Math.floor(Math.random() * 3) + 1)),
        ...overrides
      }

      const stmt = this.db.prepare(`
        INSERT INTO products (
          id, nom, prix, quantite, parcelle_id, description, status,
          date_creation, date_vente, prix_vente, plateforme, frais_vente,
          benefice, images, tags
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      
      stmt.run(
        product.id, product.nom, product.prix, product.quantite, product.parcelle_id,
        product.description, product.status, product.date_creation, product.date_vente,
        product.prix_vente, product.plateforme, product.frais_vente, product.benefice,
        product.images, product.tags
      )

      products.push(product)
    }

    this.seededData.set('products', products)
    return products
  }

  // Seed sessions
  async seedSessions(count: number = 3, userId?: string, overrides: Partial<any> = {}): Promise<any[]> {
    const users = this.seededData.get('users') || []
    const sessions = []

    for (let i = 0; i < count; i++) {
      const session = {
        id: `session-${i + 1}`,
        user_id: userId || (users[i % users.length]?.id || 'user-1'),
        token: `jwt-token-${i + 1}-${Date.now()}`,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        ...overrides
      }

      const stmt = this.db.prepare(`
        INSERT INTO sessions (id, user_id, token, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?)
      `)
      
      stmt.run(session.id, session.user_id, session.token, session.expires_at, session.created_at)
      sessions.push(session)
    }

    this.seededData.set('sessions', sessions)
    return sessions
  }

  // Seed market analysis data
  async seedMarketAnalysis(count: number = 5, userId?: string, overrides: Partial<any> = {}): Promise<any[]> {
    const users = this.seededData.get('users') || []
    const analyses = []

    const queries = [
      'T-shirt Nike', 'Jean Levi\'s', 'Sneakers Adidas', 'Veste Zara', 'Robe H&M'
    ]

    for (let i = 0; i < count; i++) {
      const analysis = {
        id: `analysis-${i + 1}`,
        query: queries[i % queries.length],
        brand: ['Nike', 'Adidas', 'Zara', 'H&M', 'Levi\'s'][i % 5],
        category: ['Vêtements', 'Chaussures', 'Accessoires'][i % 3],
        min_price: Math.floor(Math.random() * 20) + 5,
        max_price: Math.floor(Math.random() * 80) + 50,
        condition: ['Neuf', 'Très bon état', 'Bon état'][i % 3],
        results: JSON.stringify({
          totalResults: Math.floor(Math.random() * 100) + 10,
          averagePrice: parseFloat((Math.random() * 50 + 20).toFixed(2)),
          items: []
        }),
        created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        user_id: userId || (users[i % users.length]?.id || 'user-1'),
        ...overrides
      }

      const stmt = this.db.prepare(`
        INSERT INTO market_analysis (id, query, brand, category, min_price, max_price, condition, results, created_at, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      
      stmt.run(
        analysis.id, analysis.query, analysis.brand, analysis.category,
        analysis.min_price, analysis.max_price, analysis.condition,
        analysis.results, analysis.created_at, analysis.user_id
      )

      analyses.push(analysis)
    }

    this.seededData.set('market_analysis', analyses)
    return analyses
  }

  // Seed complete dataset
  async seedCompleteDataset(options: {
    users?: number
    parcelles?: number
    products?: number
    sessions?: number
    marketAnalysis?: number
  } = {}): Promise<{
    users: any[]
    parcelles: any[]
    products: any[]
    sessions: any[]
    marketAnalysis: any[]
  }> {
    const {
      users: userCount = 3,
      parcelles: parcelleCount = 8,
      products: productCount = 15,
      sessions: sessionCount = 2,
      marketAnalysis: analysisCount = 3
    } = options

    const users = await this.seedUsers(userCount)
    const parcelles = await this.seedParcelles(parcelleCount, users[0].id)
    const products = await this.seedProducts(productCount, parcelles[0].id)
    const sessions = await this.seedSessions(sessionCount, users[0].id)
    const marketAnalysis = await this.seedMarketAnalysis(analysisCount, users[0].id)

    return {
      users,
      parcelles,
      products,
      sessions,
      marketAnalysis
    }
  }

  // Get seeded data
  getSeededData(type: string): any[] {
    return this.seededData.get(type) || []
  }

  getAllSeededData(): Record<string, any[]> {
    const result: Record<string, any[]> = {}
    this.seededData.forEach((value, key) => {
      result[key] = value
    })
    return result
  }

  // Clear seeded data tracking
  clearSeededDataTracking() {
    this.seededData.clear()
  }

  // Clean database
  async cleanDatabase() {
    const tables = [
      'market_analysis',
      'sessions',
      'products',
      'parcelles',
      'users'
    ]

    // Disable foreign key constraints temporarily
    this.db.exec('PRAGMA foreign_keys = OFF')

    // Clear all tables
    for (const table of tables) {
      this.db.exec(`DELETE FROM ${table}`)
    }

    // Re-enable foreign key constraints
    this.db.exec('PRAGMA foreign_keys = ON')

    // Clear tracking
    this.clearSeededDataTracking()
  }
}

// Test data cleanup utilities
export class TestDataCleanup {
  private db: any

  constructor(database: any) {
    this.db = database
  }

  // Clean specific table
  async cleanTable(tableName: string) {
    this.db.exec(`DELETE FROM ${tableName}`)
  }

  // Clean all tables
  async cleanAllTables() {
    const tables = [
      'market_analysis',
      'sessions', 
      'products',
      'parcelles',
      'users'
    ]

    this.db.exec('PRAGMA foreign_keys = OFF')
    
    for (const table of tables) {
      this.db.exec(`DELETE FROM ${table}`)
    }
    
    this.db.exec('PRAGMA foreign_keys = ON')
  }

  // Reset auto-increment counters
  async resetCounters() {
    this.db.exec('DELETE FROM sqlite_sequence')
  }

  // Vacuum database
  async vacuum() {
    this.db.exec('VACUUM')
  }

  // Get table row counts
  async getTableCounts(): Promise<Record<string, number>> {
    const tables = ['users', 'parcelles', 'products', 'sessions', 'market_analysis']
    const counts: Record<string, number> = {}

    for (const table of tables) {
      const result = this.db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get()
      counts[table] = result.count
    }

    return counts
  }

  // Check if database is clean
  async isDatabaseClean(): Promise<boolean> {
    const counts = await this.getTableCounts()
    return Object.values(counts).every(count => count === 0)
  }
}

// Factory functions for easy use
export const createTestDataSeeder = (database: any) => new TestDataSeeder(database)
export const createTestDataCleanup = (database: any) => new TestDataCleanup(database)

// Predefined test scenarios
export const TestScenarios = {
  // Minimal dataset for basic tests
  minimal: {
    users: 1,
    parcelles: 2,
    products: 3,
    sessions: 1,
    marketAnalysis: 1
  },

  // Small dataset for unit tests
  small: {
    users: 2,
    parcelles: 5,
    products: 8,
    sessions: 2,
    marketAnalysis: 2
  },

  // Medium dataset for integration tests
  medium: {
    users: 5,
    parcelles: 15,
    products: 30,
    sessions: 5,
    marketAnalysis: 5
  },

  // Large dataset for performance tests
  large: {
    users: 20,
    parcelles: 100,
    products: 500,
    sessions: 20,
    marketAnalysis: 50
  }
}

// Helper to seed data for specific test scenario
export const seedTestScenario = async (
  seeder: TestDataSeeder,
  scenario: keyof typeof TestScenarios
) => {
  const config = TestScenarios[scenario]
  return seeder.seedCompleteDataset(config)
}