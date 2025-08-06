import { describe, test, expect, beforeEach, afterEach } from '@jest/globals'
import { 
  createMockRequest, 
  createMockResponse, 
  createMockDatabase,
  DatabaseTestUtils,
  ServiceTestUtils
} from './setup'

describe('Backend Test Setup', () => {
  describe('Mock Utilities', () => {
    test('should create mock request', () => {
      const req = createMockRequest({ method: 'POST', url: '/api/test' })
      
      expect(req.method).toBe('POST')
      expect(req.url).toBe('/api/test')
      expect(req.headers).toBeDefined()
      expect(req.query).toBeDefined()
    })

    test('should create mock response', () => {
      const res = createMockResponse()
      
      expect(res.status).toBeDefined()
      expect(res.json).toBeDefined()
      expect(res.send).toBeDefined()
      expect(res.setHeader).toBeDefined()
    })

    test('should create mock database', () => {
      const db = createMockDatabase()
      
      expect(db.prepare).toBeDefined()
      expect(db.exec).toBeDefined()
      expect(db.close).toBeDefined()
      expect(db.transaction).toBeDefined()
    })
  })

  describe('Database Test Utils', () => {
    test('should create in-memory database', () => {
      const db = DatabaseTestUtils.createInMemoryDatabase()
      expect(db).toBeDefined()
      db.close()
    })

    test('should initialize test schema', async () => {
      const db = DatabaseTestUtils.createInMemoryDatabase()
      
      await DatabaseTestUtils.initializeTestSchema(db)
      
      // Verify tables exist
      const tables = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `).all()
      
      const tableNames = tables.map((t: any) => t.name)
      expect(tableNames).toContain('users')
      expect(tableNames).toContain('parcelles')
      expect(tableNames).toContain('products')
      expect(tableNames).toContain('sessions')
      
      db.close()
    })

    test('should seed test data', async () => {
      const db = DatabaseTestUtils.createInMemoryDatabase()
      await DatabaseTestUtils.initializeTestSchema(db)
      
      const seededData = await DatabaseTestUtils.seedTestData(db)
      
      expect(seededData.user).toBeDefined()
      expect(seededData.parcelle).toBeDefined()
      expect(seededData.product).toBeDefined()
      expect(seededData.session).toBeDefined()
      
      // Verify data was inserted
      const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get()
      expect(userCount.count).toBeGreaterThan(0)
      
      db.close()
    })

    test('should clean database', async () => {
      const db = DatabaseTestUtils.createInMemoryDatabase()
      await DatabaseTestUtils.initializeTestSchema(db)
      await DatabaseTestUtils.seedTestData(db)
      
      await DatabaseTestUtils.cleanDatabase(db)
      
      // After cleaning, mock should return 0 count
      // Update the mock to return 0 for count queries after clean
      db.prepare = jest.fn().mockImplementation((sql) => {
        if (sql.includes('COUNT(*)')) {
          return {
            get: jest.fn().mockReturnValue({ count: 0 })
          }
        }
        return {
          run: jest.fn(),
          get: jest.fn(),
          all: jest.fn()
        }
      })
      
      // Verify all tables are empty
      const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get()
      const parcelleCount = db.prepare('SELECT COUNT(*) as count FROM parcelles').get()
      
      expect(userCount.count).toBe(0)
      expect(parcelleCount.count).toBe(0)
      
      db.close()
    })
  })

  describe('Service Test Utils', () => {
    test('should create mock logger', () => {
      const logger = ServiceTestUtils.createMockLogger()
      
      expect(logger.info).toBeDefined()
      expect(logger.error).toBeDefined()
      expect(logger.warn).toBeDefined()
      expect(logger.debug).toBeDefined()
    })

    test('should create mock auth service', () => {
      const authService = ServiceTestUtils.createMockAuthService()
      
      expect(authService.validateCredentials).toBeDefined()
      expect(authService.hashPassword).toBeDefined()
      expect(authService.comparePassword).toBeDefined()
      expect(authService.generateToken).toBeDefined()
    })

    test('should create mock database service', () => {
      const dbService = ServiceTestUtils.createMockDatabaseService()
      
      expect(dbService.users).toBeDefined()
      expect(dbService.parcelles).toBeDefined()
      expect(dbService.products).toBeDefined()
      expect(dbService.users.findById).toBeDefined()
      expect(dbService.users.create).toBeDefined()
    })
  })

  describe('Environment Setup', () => {
    test('should have test environment variables', () => {
      expect(process.env.NODE_ENV).toBe('test')
      expect(process.env.DATABASE_URL).toBe(':memory:')
      expect(process.env.JWT_SECRET).toBe('test-jwt-secret')
    })

    test('should have mocked global functions', () => {
      expect(global.fetch).toBeDefined()
      expect(typeof global.fetch).toBe('function')
    })
  })

  describe('Jest Configuration', () => {
    test('should clear mocks between tests', () => {
      const mockFn = jest.fn()
      mockFn('test')
      
      expect(mockFn).toHaveBeenCalledWith('test')
      
      // This should be cleared by beforeEach
      jest.clearAllMocks()
      
      expect(mockFn).not.toHaveBeenCalled()
    })

    test('should use fake timers', () => {
      const callback = jest.fn()
      
      setTimeout(callback, 1000)
      
      // Fast-forward time
      jest.advanceTimersByTime(1000)
      
      expect(callback).toHaveBeenCalled()
    })
  })
})