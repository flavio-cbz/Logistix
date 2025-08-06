import { vi } from 'vitest'

// Mock database service
export const mockDatabase = {
  // User operations
  users: {
    findById: vi.fn(),
    findByEmail: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    list: vi.fn()
  },
  
  // Parcelle operations
  parcelles: {
    findById: vi.fn(),
    findByUserId: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    list: vi.fn(),
    search: vi.fn()
  },
  
  // Product operations
  products: {
    findById: vi.fn(),
    findByParcelleId: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    list: vi.fn(),
    search: vi.fn(),
    markAsSold: vi.fn()
  },
  
  // Statistics operations
  statistics: {
    getROI: vi.fn(),
    getSalesData: vi.fn(),
    getPerformanceMetrics: vi.fn(),
    getDashboardData: vi.fn()
  },
  
  // Transaction operations
  transaction: vi.fn(),
  beginTransaction: vi.fn(),
  commitTransaction: vi.fn(),
  rollbackTransaction: vi.fn(),
  
  // Connection management
  connect: vi.fn(),
  disconnect: vi.fn(),
  isConnected: vi.fn(),
  
  // Migration operations
  migrate: vi.fn(),
  rollback: vi.fn(),
  
  // Cleanup operations
  cleanup: vi.fn(),
  reset: vi.fn()
}

// Mock database connection
export const mockConnection = {
  prepare: vi.fn(),
  exec: vi.fn(),
  close: vi.fn(),
  pragma: vi.fn()
}

// Database mock factory
export const createDatabaseMock = () => {
  const mock = { ...mockDatabase }
  
  // Reset all mocks
  Object.values(mock).forEach(category => {
    if (typeof category === 'object') {
      Object.values(category).forEach(fn => {
        if (vi.isMockFunction(fn)) {
          fn.mockReset()
        }
      })
    } else if (vi.isMockFunction(category)) {
      category.mockReset()
    }
  })
  
  return mock
}

// Common mock implementations
export const mockDatabaseImplementations = {
  // Successful operations
  success: {
    users: {
      findById: vi.fn().mockResolvedValue({ id: '1', email: 'test@example.com' }),
      findByEmail: vi.fn().mockResolvedValue({ id: '1', email: 'test@example.com' }),
      create: vi.fn().mockResolvedValue({ id: '1', email: 'test@example.com' }),
      update: vi.fn().mockResolvedValue({ id: '1', email: 'test@example.com' }),
      delete: vi.fn().mockResolvedValue(true),
      list: vi.fn().mockResolvedValue([])
    },
    parcelles: {
      findById: vi.fn().mockResolvedValue({ id: '1', numero: 'P001' }),
      create: vi.fn().mockResolvedValue({ id: '1', numero: 'P001' }),
      update: vi.fn().mockResolvedValue({ id: '1', numero: 'P001' }),
      delete: vi.fn().mockResolvedValue(true),
      list: vi.fn().mockResolvedValue([])
    },
    products: {
      findById: vi.fn().mockResolvedValue({ id: '1', nom: 'Test Product' }),
      create: vi.fn().mockResolvedValue({ id: '1', nom: 'Test Product' }),
      update: vi.fn().mockResolvedValue({ id: '1', nom: 'Test Product' }),
      delete: vi.fn().mockResolvedValue(true),
      list: vi.fn().mockResolvedValue([])
    }
  },
  
  // Error scenarios
  error: {
    users: {
      findById: vi.fn().mockRejectedValue(new Error('User not found')),
      findByEmail: vi.fn().mockRejectedValue(new Error('User not found')),
      create: vi.fn().mockRejectedValue(new Error('Email already exists')),
      update: vi.fn().mockRejectedValue(new Error('User not found')),
      delete: vi.fn().mockRejectedValue(new Error('User not found'))
    },
    parcelles: {
      findById: vi.fn().mockRejectedValue(new Error('Parcelle not found')),
      create: vi.fn().mockRejectedValue(new Error('Numero already exists')),
      update: vi.fn().mockRejectedValue(new Error('Parcelle not found')),
      delete: vi.fn().mockRejectedValue(new Error('Parcelle not found'))
    },
    products: {
      findById: vi.fn().mockRejectedValue(new Error('Product not found')),
      create: vi.fn().mockRejectedValue(new Error('Invalid parcelle')),
      update: vi.fn().mockRejectedValue(new Error('Product not found')),
      delete: vi.fn().mockRejectedValue(new Error('Product not found'))
    }
  }
}

// Test database setup utilities
export const setupTestDatabase = async () => {
  // Mock database initialization
  mockDatabase.connect.mockResolvedValue(true)
  mockDatabase.isConnected.mockReturnValue(true)
  mockDatabase.migrate.mockResolvedValue(true)
  
  return mockDatabase
}

export const teardownTestDatabase = async () => {
  // Mock database cleanup
  mockDatabase.cleanup.mockResolvedValue(true)
  mockDatabase.disconnect.mockResolvedValue(true)
  
  // Reset all mocks
  Object.values(mockDatabase).forEach(category => {
    if (typeof category === 'object') {
      Object.values(category).forEach(fn => {
        if (vi.isMockFunction(fn)) {
          fn.mockReset()
        }
      })
    } else if (vi.isMockFunction(category)) {
      category.mockReset()
    }
  })
}