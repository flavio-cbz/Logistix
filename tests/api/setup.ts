import { NextRequest, NextResponse } from 'next/server'
import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import supertest from 'supertest'
import { vi } from 'vitest'

// Test database setup
let testDb: any = null
let testServer: any = null
let testApp: any = null

// API test configuration
export const API_TEST_CONFIG = {
  baseURL: 'http://localhost:3001',
  timeout: 30000,
  retries: 2,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
}

// Test database configuration
export const TEST_DB_CONFIG = {
  filename: ':memory:', // Use in-memory database for tests
  options: {
    verbose: process.env.NODE_ENV === 'test' ? undefined : console.log
  }
}

// Initialize test server
export async function setupTestServer() {
  if (testServer) {
    return testServer
  }

  try {
    // Create Next.js app instance for testing
    const dev = process.env.NODE_ENV !== 'production'
    const app = next({ dev, dir: process.cwd() })
    const handle = app.getRequestHandler()

    await app.prepare()

    // Create HTTP server
    const server = createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url!, true)
        await handle(req, res, parsedUrl)
      } catch (err) {
        console.error('Error occurred handling', req.url, err)
        res.statusCode = 500
        res.end('internal server error')
      }
    })

    // Start server on test port
    await new Promise<void>((resolve, reject) => {
      server.listen(3001, (err?: any) => {
        if (err) reject(err)
        else resolve()
      })
    })

    testApp = app
    testServer = server
    
    return server
  } catch (error) {
    console.error('Failed to setup test server:', error)
    throw error
  }
}

// Teardown test server
export async function teardownTestServer() {
  if (testServer) {
    await new Promise<void>((resolve) => {
      testServer.close(() => resolve())
    })
    testServer = null
  }
  
  if (testApp) {
    await testApp.close()
    testApp = null
  }
}

// Create supertest instance
export function createApiClient() {
  if (!testServer) {
    throw new Error('Test server not initialized. Call setupTestServer() first.')
  }
  
  return supertest(testServer)
}

// Test database setup
export async function setupTestDatabase() {
  if (testDb) {
    return testDb
  }

  // Mock database for testing
  const Database = require('better-sqlite3')
  testDb = new Database(TEST_DB_CONFIG.filename, TEST_DB_CONFIG.options)
  
  // Initialize test schema
  await initializeTestSchema(testDb)
  
  return testDb
}

// Initialize test database schema
async function initializeTestSchema(db: any) {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      profile TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Parcelles table
  db.exec(`
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
    )
  `)

  // Products table
  db.exec(`
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
    )
  `)

  // Sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `)

  // Market analysis table
  db.exec(`
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
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `)
}

// Cleanup test database
export async function cleanupTestDatabase() {
  if (testDb) {
    // Clear all tables
    const tables = ['users', 'parcelles', 'products', 'sessions', 'market_analysis']
    
    for (const table of tables) {
      testDb.exec(`DELETE FROM ${table}`)
    }
  }
}

// Teardown test database
export async function teardownTestDatabase() {
  if (testDb) {
    testDb.close()
    testDb = null
  }
}

// Seed test data
export async function seedTestData() {
  if (!testDb) {
    throw new Error('Test database not initialized')
  }

  // Seed test user
  const testUser = {
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
  }

  testDb.prepare(`
    INSERT OR REPLACE INTO users (id, username, email, password, role, profile)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(testUser.id, testUser.username, testUser.email, testUser.password, testUser.role, testUser.profile)

  // Seed test admin
  const testAdmin = {
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

  testDb.prepare(`
    INSERT OR REPLACE INTO users (id, username, email, password, role, profile)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(testAdmin.id, testAdmin.username, testAdmin.email, testAdmin.password, testAdmin.role, testAdmin.profile)

  // Seed test parcelle
  const testParcelle = {
    id: 'test-parcelle-1',
    numero: 'P001',
    transporteur: 'DHL',
    poids: 1.5,
    prix_achat: 25.50,
    user_id: testUser.id,
    notes: 'Test parcelle',
    status: 'active'
  }

  testDb.prepare(`
    INSERT OR REPLACE INTO parcelles (id, numero, transporteur, poids, prix_achat, user_id, notes, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(testParcelle.id, testParcelle.numero, testParcelle.transporteur, testParcelle.poids, testParcelle.prix_achat, testParcelle.user_id, testParcelle.notes, testParcelle.status)

  // Seed test product
  const testProduct = {
    id: 'test-product-1',
    nom: 'Test Product',
    prix: 15.99,
    quantite: 1,
    parcelle_id: testParcelle.id,
    description: 'Test product description',
    status: 'available'
  }

  testDb.prepare(`
    INSERT OR REPLACE INTO products (id, nom, prix, quantite, parcelle_id, description, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(testProduct.id, testProduct.nom, testProduct.prix, testProduct.quantite, testProduct.parcelle_id, testProduct.description, testProduct.status)

  return {
    user: testUser,
    admin: testAdmin,
    parcelle: testParcelle,
    product: testProduct
  }
}

// Authentication helpers
export class AuthHelper {
  private apiClient: supertest.SuperTest<supertest.Test>

  constructor(apiClient: supertest.SuperTest<supertest.Test>) {
    this.apiClient = apiClient
  }

  async login(email: string = 'test@example.com', password: string = 'password123') {
    const response = await this.apiClient
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200)

    return response.body
  }

  async loginAsAdmin() {
    return this.login('admin@example.com', 'password123')
  }

  async register(userData: any = {}) {
    const defaultData = {
      username: 'newuser',
      email: 'newuser@example.com',
      password: 'password123',
      confirmPassword: 'password123'
    }

    const response = await this.apiClient
      .post('/api/v1/auth/register')
      .send({ ...defaultData, ...userData })

    return response.body
  }

  async logout(token?: string) {
    const request = this.apiClient.post('/api/v1/auth/logout')
    
    if (token) {
      request.set('Authorization', `Bearer ${token}`)
    }

    return request.send()
  }

  withAuth(token: string) {
    return {
      get: (url: string) => this.apiClient.get(url).set('Authorization', `Bearer ${token}`),
      post: (url: string) => this.apiClient.post(url).set('Authorization', `Bearer ${token}`),
      put: (url: string) => this.apiClient.put(url).set('Authorization', `Bearer ${token}`),
      delete: (url: string) => this.apiClient.delete(url).set('Authorization', `Bearer ${token}`),
      patch: (url: string) => this.apiClient.patch(url).set('Authorization', `Bearer ${token}`)
    }
  }
}

// API test utilities
export class ApiTestUtils {
  static expectSuccessResponse(response: any, expectedData?: any) {
    expect(response.status).toBeLessThan(400)
    expect(response.body).toHaveProperty('success', true)
    
    if (expectedData) {
      expect(response.body.data).toMatchObject(expectedData)
    }
  }

  static expectErrorResponse(response: any, expectedStatus: number, expectedError?: string) {
    expect(response.status).toBe(expectedStatus)
    expect(response.body).toHaveProperty('success', false)
    
    if (expectedError) {
      expect(response.body.error).toContain(expectedError)
    }
  }

  static expectValidationError(response: any, field?: string) {
    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty('success', false)
    expect(response.body).toHaveProperty('error')
    
    if (field) {
      expect(response.body.error).toContain(field)
    }
  }

  static expectAuthenticationError(response: any) {
    expect(response.status).toBe(401)
    expect(response.body).toHaveProperty('success', false)
    expect(response.body.error).toContain('authentication')
  }

  static expectAuthorizationError(response: any) {
    expect(response.status).toBe(403)
    expect(response.body).toHaveProperty('success', false)
    expect(response.body.error).toContain('authorization')
  }

  static expectNotFoundError(response: any) {
    expect(response.status).toBe(404)
    expect(response.body).toHaveProperty('success', false)
  }
}

// Global test setup and teardown
export async function globalSetup() {
  await setupTestServer()
  await setupTestDatabase()
  await seedTestData()
}

export async function globalTeardown() {
  await cleanupTestDatabase()
  await teardownTestDatabase()
  await teardownTestServer()
}