/**
 * API integration test setup utilities
 * Provides utilities for testing API routes with real HTTP requests
 */

import { NextRequest } from 'next/server';
import { createMocks } from 'node-mocks-http';
import { setupInMemoryDatabase, cleanupInMemoryDatabase } from '../setup/database-mocks';
import { createTestUser, createTestProduct, createTestParcelle } from '../setup/test-data-factory';

/**
 * Create a mock NextRequest for testing API routes
 */
export const createMockRequest = (
  method: string = 'GET',
  url: string = 'http://localhost:3000/api/test',
  body?: any,
  headers?: Record<string, string>
): NextRequest => {
  const requestInit: RequestInit = {
    method,
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
  };

  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    requestInit.body = JSON.stringify(body);
  }

  return new NextRequest(url, requestInit);
};

/**
 * Extract JSON response from NextResponse
 */
export const extractJsonResponse = async (response: Response) => {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { text };
  }
};

/**
 * Setup test database with sample data
 */
export const setupTestDatabase = async () => {
  const { db, sqlite } = await setupInMemoryDatabase();
  
  // Create test users
  const testUser = createTestUser();
  const adminUser = createTestUser({ username: 'admin' });
  
  // Insert test users
  await db.run(`
    INSERT INTO users (id, username, email, password_hash, encryption_secret, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [
    testUser.id,
    testUser.username,
    testUser.email,
    testUser.passwordHash,
    testUser.encryptionSecret,
    testUser.createdAt,
    testUser.updatedAt
  ]);

  await db.run(`
    INSERT INTO users (id, username, email, password_hash, encryption_secret, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [
    adminUser.id,
    adminUser.username,
    adminUser.email,
    adminUser.passwordHash,
    adminUser.encryptionSecret,
    adminUser.createdAt,
    adminUser.updatedAt
  ]);

  // Create test parcelles
  const testParcelle = createTestParcelle({ userId: testUser.id });
  
  await db.run(`
    INSERT INTO parcelles (id, user_id, numero, transporteur, poids, prix_achat, prix_total, prix_par_gramme, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    testParcelle.id,
    testParcelle.userId,
    testParcelle.numero,
    testParcelle.transporteur,
    testParcelle.poids,
    testParcelle.prixAchat,
    testParcelle.prixTotal,
    testParcelle.prixParGramme,
    testParcelle.createdAt,
    testParcelle.updatedAt
  ]);

  // Create test products
  const testProduct = createTestProduct({ 
    userId: testUser.id, 
    parcelleId: testParcelle.id 
  });
  
  await db.run(`
    INSERT INTO products (
      id, userId, parcelleId, name, titre, description, brand, marque, 
      category, size, taille, color, couleur, condition, weight, poids,
      purchasePrice, prix, sellingPrice, prixVente, currency, status,
      createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    testProduct.id,
    testProduct.userId,
    testProduct.parcelleId,
    testProduct.name,
    testProduct.titre,
    testProduct.description,
    testProduct.brand,
    testProduct.marque,
    testProduct.category,
    testProduct.size,
    testProduct.taille,
    testProduct.color,
    testProduct.couleur,
    testProduct.condition,
    testProduct.weight,
    testProduct.poids,
    testProduct.purchasePrice,
    testProduct.prix,
    testProduct.sellingPrice,
    testProduct.prixVente,
    testProduct.currency,
    testProduct.status,
    testProduct.createdAt,
    testProduct.updatedAt
  ]);

  return {
    db,
    sqlite,
    testUser,
    adminUser,
    testParcelle,
    testProduct,
    cleanup: () => cleanupInMemoryDatabase(sqlite)
  };
};

/**
 * Create a session for testing authenticated routes
 */
export const createTestSession = async (db: any, userId: string) => {
  const sessionId = 'test-session-' + Date.now();
  const expiresAt = new Date(Date.now() + 86400000).toISOString(); // 24 hours
  const createdAt = new Date().toISOString();

  await db.run(`
    INSERT INTO sessions (id, user_id, expires_at, created_at)
    VALUES (?, ?, ?, ?)
  `, [sessionId, userId, expiresAt, createdAt]);

  return sessionId;
};

/**
 * Create authenticated request with session cookie
 */
export const createAuthenticatedRequest = (
  method: string,
  url: string,
  sessionId: string,
  body?: any,
  additionalHeaders?: Record<string, string>
): NextRequest => {
  return createMockRequest(method, url, body, {
    cookie: `logistix_session=${sessionId}`,
    ...additionalHeaders,
  });
};

/**
 * Assert API response structure
 */
export const assertApiResponse = (
  response: any,
  expectedStatus: 'success' | 'error',
  expectedStatusCode?: number
) => {
  expect(response).toHaveProperty('success');
  expect(response.success).toBe(expectedStatus === 'success');
  
  if (expectedStatus === 'success') {
    expect(response).toHaveProperty('data');
    expect(response).not.toHaveProperty('error');
  } else {
    expect(response).toHaveProperty('error');
    expect(response.error).toHaveProperty('code');
    expect(response.error).toHaveProperty('message');
    expect(response).not.toHaveProperty('data');
  }
  
  expect(response).toHaveProperty('meta');
  expect(response.meta).toHaveProperty('timestamp');
  expect(response.meta).toHaveProperty('requestId');
};

/**
 * Assert validation error response
 */
export const assertValidationError = (
  response: any,
  expectedField?: string,
  expectedMessage?: string
) => {
  assertApiResponse(response, 'error');
  expect(response.error.code).toBe('VALIDATION_ERROR');
  
  if (expectedField) {
    expect(response.error.field).toBe(expectedField);
  }
  
  if (expectedMessage) {
    expect(response.error.message).toContain(expectedMessage);
  }
};

/**
 * Assert authentication error response
 */
export const assertAuthError = (response: any, expectedMessage?: string) => {
  assertApiResponse(response, 'error');
  expect(response.error.code).toBe('AUTH_ERROR');
  
  if (expectedMessage) {
    expect(response.error.message).toContain(expectedMessage);
  }
};

/**
 * Assert not found error response
 */
export const assertNotFoundError = (response: any, expectedResource?: string) => {
  assertApiResponse(response, 'error');
  expect(response.error.code).toBe('NOT_FOUND');
  
  if (expectedResource) {
    expect(response.error.message).toContain(expectedResource);
  }
};