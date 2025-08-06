import { vi } from 'vitest'

// Mock authentication service
export const mockAuthService = {
  // Authentication methods
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
  validateCredentials: vi.fn(),
  hashPassword: vi.fn(),
  comparePassword: vi.fn(),
  
  // Session management
  createSession: vi.fn(),
  validateSession: vi.fn(),
  destroySession: vi.fn(),
  refreshSession: vi.fn(),
  
  // Token management
  generateToken: vi.fn(),
  validateToken: vi.fn(),
  refreshToken: vi.fn(),
  
  // User management
  getCurrentUser: vi.fn(),
  updateProfile: vi.fn(),
  changePassword: vi.fn(),
  deleteAccount: vi.fn(),
  
  // Security features
  checkRateLimit: vi.fn(),
  logSecurityEvent: vi.fn(),
  validateCSRF: vi.fn(),
  
  // Password reset
  requestPasswordReset: vi.fn(),
  validateResetToken: vi.fn(),
  resetPassword: vi.fn()
}

// Mock session data
export const mockSession = {
  id: 'session-123',
  userId: 'user-123',
  email: 'test@example.com',
  role: 'user',
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  isValid: true
}

// Mock user data
export const mockUser = {
  id: 'user-123',
  username: 'testuser',
  email: 'test@example.com',
  role: 'user',
  profile: {
    firstName: 'Test',
    lastName: 'User',
    avatar: null,
    theme: 'system'
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
}

// Mock admin user
export const mockAdminUser = {
  ...mockUser,
  id: 'admin-123',
  username: 'admin',
  email: 'admin@example.com',
  role: 'admin'
}

// Authentication mock implementations
export const mockAuthImplementations = {
  // Successful authentication
  success: {
    login: vi.fn().mockResolvedValue({
      success: true,
      user: mockUser,
      session: mockSession,
      token: 'jwt-token-123'
    }),
    logout: vi.fn().mockResolvedValue({ success: true }),
    register: vi.fn().mockResolvedValue({
      success: true,
      user: mockUser,
      session: mockSession
    }),
    validateCredentials: vi.fn().mockResolvedValue(true),
    hashPassword: vi.fn().mockResolvedValue('hashed-password'),
    comparePassword: vi.fn().mockResolvedValue(true),
    createSession: vi.fn().mockResolvedValue(mockSession),
    validateSession: vi.fn().mockResolvedValue(mockSession),
    getCurrentUser: vi.fn().mockResolvedValue(mockUser),
    updateProfile: vi.fn().mockResolvedValue(mockUser),
    changePassword: vi.fn().mockResolvedValue({ success: true })
  },
  
  // Authentication failures
  failure: {
    login: vi.fn().mockResolvedValue({
      success: false,
      error: 'Invalid credentials'
    }),
    register: vi.fn().mockResolvedValue({
      success: false,
      error: 'Email already exists'
    }),
    validateCredentials: vi.fn().mockResolvedValue(false),
    comparePassword: vi.fn().mockResolvedValue(false),
    validateSession: vi.fn().mockResolvedValue(null),
    getCurrentUser: vi.fn().mockResolvedValue(null)
  },
  
  // Error scenarios
  error: {
    login: vi.fn().mockRejectedValue(new Error('Database connection failed')),
    register: vi.fn().mockRejectedValue(new Error('Database connection failed')),
    validateSession: vi.fn().mockRejectedValue(new Error('Session validation failed')),
    getCurrentUser: vi.fn().mockRejectedValue(new Error('User lookup failed'))
  }
}

// Mock Next.js authentication
export const mockNextAuth = {
  getServerSession: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  useSession: vi.fn()
}

// Mock cookies
export const mockCookies = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
  has: vi.fn()
}

// Mock headers
export const mockHeaders = {
  get: vi.fn(),
  set: vi.fn(),
  has: vi.fn(),
  delete: vi.fn()
}

// Authentication test utilities
export const createMockAuthContext = (user = mockUser, isAuthenticated = true) => ({
  user: isAuthenticated ? user : null,
  isAuthenticated,
  isLoading: false,
  login: mockAuthService.login,
  logout: mockAuthService.logout,
  register: mockAuthService.register,
  updateProfile: mockAuthService.updateProfile
})

export const setupAuthMocks = (scenario: 'success' | 'failure' | 'error' = 'success') => {
  const implementations = mockAuthImplementations[scenario]
  
  Object.entries(implementations).forEach(([method, implementation]) => {
    if (mockAuthService[method as keyof typeof mockAuthService]) {
      (mockAuthService[method as keyof typeof mockAuthService] as any).mockImplementation(implementation)
    }
  })
  
  return mockAuthService
}

export const resetAuthMocks = () => {
  Object.values(mockAuthService).forEach(fn => {
    if (vi.isMockFunction(fn)) {
      fn.mockReset()
    }
  })
  
  Object.values(mockNextAuth).forEach(fn => {
    if (vi.isMockFunction(fn)) {
      fn.mockReset()
    }
  })
  
  Object.values(mockCookies).forEach(fn => {
    if (vi.isMockFunction(fn)) {
      fn.mockReset()
    }
  })
}

// Mock middleware
export const mockAuthMiddleware = vi.fn().mockImplementation((req, res, next) => {
  req.user = mockUser
  req.session = mockSession
  next()
})

// Mock CSRF protection
export const mockCSRFProtection = vi.fn().mockImplementation((req, res, next) => {
  next()
})

// Rate limiting mock
export const mockRateLimit = vi.fn().mockImplementation((req, res, next) => {
  next()
})