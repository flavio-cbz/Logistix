/**
 * Service layer mocking utilities for testing
 * Provides mock implementations of services and their dependencies
 */

import { vi } from 'vitest';

import type { ParcelleService } from '@/lib/services/parcelle-service';
import type { AuthService } from '@/lib/services/auth-service';

// Mock logger
export const createMockLogger = () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  trace: vi.fn(),
});

// Mock configuration service
export const createMockConfigService = () => ({
  getDatabaseUrl: vi.fn().mockReturnValue(':memory:'),
  getDatabasePoolSize: vi.fn().mockReturnValue(5),
  getJwtSecret: vi.fn().mockReturnValue('test-jwt-secret-that-is-at-least-32-characters-long'),
  getSessionTimeout: vi.fn().mockReturnValue(3600),
  getCookieName: vi.fn().mockReturnValue('test_session'),
  getEnvironment: vi.fn().mockReturnValue('test'),
  getLogLevel: vi.fn().mockReturnValue('debug'),
  isFeatureEnabled: vi.fn().mockReturnValue(true),
});

// Mock product service
export const createMockProductService = (): jest.Mocked<ProductService> => {
  const mockService = {
    getAllProducts: vi.fn(),
    getProductById: vi.fn(),
    getProductsByParcelleId: vi.fn(),
    createProduct: vi.fn(),
    updateProduct: vi.fn(),
    deleteProduct: vi.fn(),
    updateProductStatus: vi.fn(),
    searchProducts: vi.fn(),
    setRequestId: vi.fn(),
    setUserId: vi.fn(),
  } as any;
  
  return mockService;
};

// Mock parcelle service
export const createMockParcelleService = (): jest.Mocked<ParcelleService> => {
  const mockService = {
    getAllParcelles: vi.fn(),
    getParcelleById: vi.fn(),
    createParcelle: vi.fn(),
    updateParcelle: vi.fn(),
    deleteParcelle: vi.fn(),
    setRequestId: vi.fn(),
    setUserId: vi.fn(),
  } as any;
  
  return mockService;
};

// Mock auth service
export const createMockAuthService = (): jest.Mocked<AuthService> => {
  const mockService = {
    verifyCredentials: vi.fn(),
    createSession: vi.fn(),
    validateSession: vi.fn(),
    deleteSession: vi.fn(),
    createUser: vi.fn(),
    getUserById: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
    hashPassword: vi.fn(),
    verifyPassword: vi.fn(),
    setRequestId: vi.fn(),
    setUserId: vi.fn(),
  } as any;
  
  return mockService;
};

// Mock service container
export const createMockServiceContainer = () => ({
  register: vi.fn(),
  get: vi.fn(),
  resolve: vi.fn(),
});

// Mock base service functionality
export const createMockBaseService = (serviceName: string) => ({
  serviceName,
  logger: createMockLogger(),
  setRequestId: vi.fn(),
  setUserId: vi.fn(),
  validateUUID: vi.fn(),
  validateId: vi.fn(),
  validatePositiveNumber: vi.fn(),
  validateNonNegativeNumber: vi.fn(),
  validateString: vi.fn(),
  handleError: vi.fn(),
  createNotFoundError: vi.fn(),
  createAuthError: vi.fn(),
  createAuthorizationError: vi.fn(),
  createBusinessError: vi.fn(),
  createValidationError: vi.fn(),
  validateWithSchema: vi.fn(),
  executeOperation: vi.fn(),
  executeOperationSync: vi.fn(),
});

// Mock parcelle repository
export const createMockParcelleRepository = () => ({
  findById: vi.fn(),
  findAll: vi.fn(),
  findAllByUserId: vi.fn(), // Pour getAllParcelles
  findByUserId: vi.fn(),
  findByNumero: vi.fn(),
  numeroExists: vi.fn(), // Pour validateUniqueParcelleNumber
  create: vi.fn(),
  update: vi.fn(),
  updateWithCalculation: vi.fn(), // Pour updateParcelle avec calculs automatiques
  delete: vi.fn(),
  count: vi.fn(),
  exists: vi.fn(),
  hasAssociatedProducts: vi.fn(),
  countProductsByParcelleId: vi.fn(), // Pour deleteParcelle validation
});