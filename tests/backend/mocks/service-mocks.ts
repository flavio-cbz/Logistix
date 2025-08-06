import { vi } from 'vitest'

// Authentication Service Mock
export const createAuthServiceMock = () => ({
  // Authentication methods
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
  validateCredentials: vi.fn(),
  hashPassword: vi.fn(),
  comparePassword: vi.fn(),
  
  // Token management
  generateToken: vi.fn(),
  validateToken: vi.fn(),
  refreshToken: vi.fn(),
  
  // Session management
  createSession: vi.fn(),
  validateSession: vi.fn(),
  destroySession: vi.fn(),
  refreshSession: vi.fn(),
  
  // User management
  getCurrentUser: vi.fn(),
  updateProfile: vi.fn(),
  changePassword: vi.fn(),
  deleteAccount: vi.fn(),
  
  // Security
  checkRateLimit: vi.fn(),
  logSecurityEvent: vi.fn(),
  validateCSRF: vi.fn()
})

// Database Service Mock
export const createDatabaseServiceMock = () => ({
  // Connection management
  connect: vi.fn(),
  disconnect: vi.fn(),
  isConnected: vi.fn(),
  
  // Transaction management
  beginTransaction: vi.fn(),
  commitTransaction: vi.fn(),
  rollbackTransaction: vi.fn(),
  transaction: vi.fn(),
  
  // User operations
  users: {
    findById: vi.fn(),
    findByEmail: vi.fn(),
    findByUsername: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    list: vi.fn(),
    search: vi.fn()
  },
  
  // Parcelle operations
  parcelles: {
    findById: vi.fn(),
    findByUserId: vi.fn(),
    findByNumero: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    list: vi.fn(),
    search: vi.fn(),
    getStatistics: vi.fn()
  },
  
  // Product operations
  products: {
    findById: vi.fn(),
    findByParcelleId: vi.fn(),
    findByUserId: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    list: vi.fn(),
    search: vi.fn(),
    markAsSold: vi.fn(),
    getStatistics: vi.fn()
  },
  
  // Session operations
  sessions: {
    findById: vi.fn(),
    findByToken: vi.fn(),
    findByUserId: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    cleanup: vi.fn()
  },
  
  // Statistics operations
  statistics: {
    getROI: vi.fn(),
    getSalesData: vi.fn(),
    getPerformanceMetrics: vi.fn(),
    getDashboardData: vi.fn(),
    getRevenueData: vi.fn(),
    getProfitData: vi.fn()
  },
  
  // Migration operations
  migrate: vi.fn(),
  rollback: vi.fn(),
  getVersion: vi.fn(),
  
  // Maintenance operations
  vacuum: vi.fn(),
  analyze: vi.fn(),
  backup: vi.fn(),
  restore: vi.fn()
})

// Service Factory
export class ServiceMockFactory {
  private static mocks = new Map()

  static createMock<T>(serviceName: string, mockFactory: () => T): T {
    if (!this.mocks.has(serviceName)) {
      this.mocks.set(serviceName, mockFactory())
    }
    return this.mocks.get(serviceName)
  }

  static resetMock(serviceName: string) {
    if (this.mocks.has(serviceName)) {
      const mock = this.mocks.get(serviceName)
      Object.values(mock).forEach((fn: any) => {
        if (vi.isMockFunction(fn)) {
          fn.mockReset()
        }
      })
    }
  }

  static resetAllMocks() {
    this.mocks.forEach((mock, serviceName) => {
      this.resetMock(serviceName)
    })
  }

  static clearMocks() {
    this.mocks.clear()
  }

  // Predefined service mocks
  static getAuthService() {
    return this.createMock('auth', createAuthServiceMock)
  }

  static getDatabaseService() {
    return this.createMock('database', createDatabaseServiceMock)
  }
}