import { vi, beforeAll, beforeEach, afterEach, afterAll } from 'vitest'
import Database from 'better-sqlite3'

// Global test setup for backend tests
beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test'
  process.env.DATABASE_URL = ':memory:'
  process.env.JWT_SECRET = 'test-jwt-secret'
  process.env.BCRYPT_ROUNDS = '4' // Faster hashing for tests
  
  // Suppress console output in tests unless debugging
  if (!process.env.DEBUG_TESTS) {
    console.log = vi.fn()
    console.info = vi.fn()
    console.warn = vi.fn()
    console.error = vi.fn()
  }
})

beforeEach(() => {
  // Clear all mocks before each test
  vi.clearAllMocks()
  vi.clearAllTimers()
  
  // Use fake timers for consistent testing
  vi.useFakeTimers()
})

afterEach(() => {
  // Restore real timers
  vi.useRealTimers()
  
  // Reset modules to ensure clean state
  vi.resetModules()
})

afterAll(async () => {
  // Cleanup any global resources
  await new Promise(resolve => setTimeout(resolve, 100))
})

// Global mocks
global.fetch = vi.fn()

// Mock Next.js modules
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    has: vi.fn()
  })),
  headers: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    has: vi.fn(),
    delete: vi.fn()
  }))
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
  notFound: vi.fn()
}))

// Mock database
vi.mock('better-sqlite3', () => {
  return vi.fn().mockImplementation(() => ({
    prepare: vi.fn().mockReturnValue({
      run: vi.fn(),
      get: vi.fn(),
      all: vi.fn()
    }),
    exec: vi.fn(),
    close: vi.fn(),
    pragma: vi.fn(),
    transaction: vi.fn().mockImplementation((fn) => fn)
  }))
})

// Mock bcrypt
vi.mock('bcrypt', () => ({
  hash: vi.fn().mockResolvedValue('hashed-password'),
  compare: vi.fn().mockResolvedValue(true),
  genSalt: vi.fn().mockResolvedValue('salt')
}))

// Mock jsonwebtoken
vi.mock('jsonwebtoken', () => ({
  sign: vi.fn().mockReturnValue('mock-jwt-token'),
  verify: vi.fn().mockReturnValue({ userId: 'test-user-id', role: 'user' }),
  decode: vi.fn().mockReturnValue({ userId: 'test-user-id', role: 'user' })
}))

// Mock winston logger
vi.mock('winston', () => ({
  createLogger: vi.fn().mockReturnValue({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }),
  format: {
    combine: vi.fn(),
    timestamp: vi.fn(),
    errors: vi.fn(),
    json: vi.fn(),
    printf: vi.fn()
  },
  transports: {
    Console: vi.fn(),
    File: vi.fn()
  }
}))

// Mock winston-daily-rotate-file
vi.mock('winston-daily-rotate-file', () => vi.fn())

// Test utilities
export const createMockRequest = (overrides = {}) => ({
  method: 'GET',
  url: '/test',
  headers: {},
  body: null,
  query: {},
  params: {},
  ...overrides
})

export const createMockResponse = () => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    end: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
    getHeader: vi.fn(),
    headers: {},
    statusCode: 200
  }
  return res
}

export const createMockDatabase = () => {
  const mockDb = {
    prepare: vi.fn().mockImplementation((sql) => {
      // Mock different responses based on SQL query
      if (sql.includes('sqlite_master')) {
        return {
          all: vi.fn().mockReturnValue([
            { name: 'users' },
            { name: 'parcelles' },
            { name: 'products' },
            { name: 'sessions' }
          ])
        }
      } else if (sql.includes('COUNT(*)')) {
        return {
          get: vi.fn().mockReturnValue({ count: 1 })
        }
      } else {
        return {
          run: vi.fn().mockReturnValue({ changes: 1, lastInsertRowid: 1 }),
          get: vi.fn().mockReturnValue({ id: '1', name: 'test' }),
          all: vi.fn().mockReturnValue([{ id: '1', name: 'test' }])
        }
      }
    }),
    exec: vi.fn(),
    close: vi.fn(),
    pragma: vi.fn(),
    transaction: vi.fn().mockImplementation((fn) => fn)
  }
  
  return mockDb
}

export const createMockUser = (overrides = {}) => ({
  id: 'test-user-id',
  username: 'testuser',
  email: 'test@example.com',
  password: 'hashed-password',
  role: 'user',
  profile: JSON.stringify({
    firstName: 'Test',
    lastName: 'User',
    theme: 'system'
  }),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides
})

export const createMockParcelle = (overrides = {}) => ({
  id: 'test-parcelle-id',
  numero: 'P001',
  transporteur: 'DHL',
  poids: 1.5,
  prix_achat: 25.50,
  date_creation: new Date().toISOString(),
  user_id: 'test-user-id',
  notes: 'Test parcelle',
  status: 'active',
  ...overrides
})

export const createMockProduct = (overrides = {}) => ({
  id: 'test-product-id',
  nom: 'Test Product',
  prix: 15.99,
  quantite: 1,
  parcelle_id: 'test-parcelle-id',
  description: 'Test product description',
  status: 'available',
  date_creation: new Date().toISOString(),
  date_vente: null,
  prix_vente: null,
  plateforme: null,
  frais_vente: 0,
  benefice: null,
  images: null,
  tags: null,
  ...overrides
})

export const createMockSession = (overrides = {}) => ({
  id: 'test-session-id',
  user_id: 'test-user-id',
  token: 'mock-jwt-token',
  expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  created_at: new Date().toISOString(),
  ...overrides
})

// Database test utilities
export class DatabaseTestUtils {
  static createInMemoryDatabase() {
    // In test environment, return a mock database
    return createMockDatabase()
  }

  static async initializeTestSchema(db: any) {
    const schema = `
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
        FOREIGN KEY (user_id) REFERENCES users (id)
      );

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
        FOREIGN KEY (parcelle_id) REFERENCES parcelles (id)
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      );
    `
    
    db.exec(schema)
  }

  static async seedTestData(db: any) {
    const user = createMockUser()
    const parcelle = createMockParcelle()
    const product = createMockProduct()
    const session = createMockSession()

    // Insert test data
    db.prepare(`
      INSERT INTO users (id, username, email, password, role, profile)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(user.id, user.username, user.email, user.password, user.role, user.profile)

    db.prepare(`
      INSERT INTO parcelles (id, numero, transporteur, poids, prix_achat, user_id, notes, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(parcelle.id, parcelle.numero, parcelle.transporteur, parcelle.poids, 
           parcelle.prix_achat, parcelle.user_id, parcelle.notes, parcelle.status)

    db.prepare(`
      INSERT INTO products (id, nom, prix, quantite, parcelle_id, description, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(product.id, product.nom, product.prix, product.quantite, 
           product.parcelle_id, product.description, product.status)

    db.prepare(`
      INSERT INTO sessions (id, user_id, token, expires_at)
      VALUES (?, ?, ?, ?)
    `).run(session.id, session.user_id, session.token, session.expires_at)

    return { user, parcelle, product, session }
  }

  static async cleanDatabase(db: any) {
    const tables = ['sessions', 'products', 'parcelles', 'users']
    
    for (const table of tables) {
      db.exec(`DELETE FROM ${table}`)
    }
  }
}

// Service test utilities
export class ServiceTestUtils {
  static createMockLogger() {
    return {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn()
    }
  }

  static createMockAuthService() {
    return {
      validateCredentials: vi.fn().mockResolvedValue(true),
      hashPassword: vi.fn().mockResolvedValue('hashed-password'),
      comparePassword: vi.fn().mockResolvedValue(true),
      generateToken: vi.fn().mockReturnValue('mock-token'),
      validateToken: vi.fn().mockReturnValue({ userId: 'test-user-id', role: 'user' }),
      createSession: vi.fn().mockResolvedValue(createMockSession()),
      validateSession: vi.fn().mockResolvedValue(createMockSession()),
      destroySession: vi.fn().mockResolvedValue(true)
    }
  }

  static createMockDatabaseService() {
    return {
      users: {
        findById: vi.fn().mockResolvedValue(createMockUser()),
        findByEmail: vi.fn().mockResolvedValue(createMockUser()),
        create: vi.fn().mockResolvedValue(createMockUser()),
        update: vi.fn().mockResolvedValue(createMockUser()),
        delete: vi.fn().mockResolvedValue(true)
      },
      parcelles: {
        findById: vi.fn().mockResolvedValue(createMockParcelle()),
        findByUserId: vi.fn().mockResolvedValue([createMockParcelle()]),
        create: vi.fn().mockResolvedValue(createMockParcelle()),
        update: vi.fn().mockResolvedValue(createMockParcelle()),
        delete: vi.fn().mockResolvedValue(true)
      },
      products: {
        findById: vi.fn().mockResolvedValue(createMockProduct()),
        findByParcelleId: vi.fn().mockResolvedValue([createMockProduct()]),
        create: vi.fn().mockResolvedValue(createMockProduct()),
        update: vi.fn().mockResolvedValue(createMockProduct()),
        delete: vi.fn().mockResolvedValue(true)
      }
    }
  }
}

// Async test utilities
export const waitForPromises = () => new Promise(resolve => setImmediate(resolve))

export const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0))

// Error testing utilities
export const expectToThrow = async (fn: () => Promise<any>, expectedError?: string) => {
  try {
    await fn()
    throw new Error('Expected function to throw')
  } catch (error) {
    if (expectedError && !error.message.includes(expectedError)) {
      throw new Error(`Expected error to contain "${expectedError}", got "${error.message}"`)
    }
  }
}

export const expectToResolve = async (fn: () => Promise<any>) => {
  try {
    return await fn()
  } catch (error) {
    throw new Error(`Expected function to resolve, but it threw: ${error.message}`)
  }
}
