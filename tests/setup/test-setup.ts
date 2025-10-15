/**
 * Test setup utilities for unit and integration tests
 * Provides common test configuration, mocks, and utilities
 */

import React from 'react';
import { vi, beforeEach, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Make React available globally for JSX
global.React = React;

// Mock server-only to avoid import errors in tests
vi.mock('server-only', () => ({}));

// Mock Next.js modules that are not available in test environment
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
  headers: vi.fn(() => new Map()),
}));

// Global test setup
beforeEach(() => {
  // Reset all mocks before each test
  vi.clearAllMocks();
});

afterEach(() => {
  // Cleanup React Testing Library
  cleanup();
  
  // Clear all timers
  vi.clearAllTimers();
});

// Export common test utilities
export * from './database-mocks';
export * from './test-data-factory';

/**
 * Helpers centralisés pour les tests d'intégration et E2E
 */

import { setupInMemoryDatabase, cleanupInMemoryDatabase } from './database-mocks';

/**
 * Initialise une BDD de test idempotente et retourne un handle cleanup.
 */
export async function initTestDb() {
  const { sqlite, db } = await setupInMemoryDatabase();
  return {
    db,
    sqlite,
    cleanup: () => cleanupInMemoryDatabase(sqlite)
  };
}

/**
 * Crée un utilisateur de test et une session valide dans la DB de test.
 * Retourne { user, token }
 */
export async function createTestUserAndSession(db: any, overrides: any = {}) {
  // Réutiliser les factories de test-data-factory si besoin
  const { createTestUser } = await import('./test-data-factory');
  const user = createTestUser(overrides);
  await db.run(`
    INSERT INTO users (id, username, email, password_hash, encryption_secret, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [
    user.id,
    user.username,
    user.email ?? 'test@example.com',
    user.passwordHash,
    user.encryptionSecret ?? 'test-secret',
    user.createdAt,
    user.updatedAt
  ]);

  // Créer une session
  const sessionId = 'test-session-' + Date.now();
  const expiresAt = new Date(Date.now() + 86400000).toISOString();
  const createdAt = new Date().toISOString();
  await db.run(`
    INSERT INTO sessions (id, user_id, expires_at, created_at)
    VALUES (?, ?, ?, ?)
  `, [sessionId, user.id, expiresAt, createdAt]);

  return { user, token: sessionId };
}

/**
 * Injecte un cookie de session valide dans une requête/résponse Playwright context/page.
 * responseOrRequest peut être une Page ou un API request context (support basique).
 */
export function setAuthCookie(pageOrContext: any, token: string) {
  // Si c'est une page Playwright
  if (typeof pageOrContext.addInitScript === 'function' || typeof pageOrContext.context === 'function') {
    // page
    const page = pageOrContext;
    return page.context().addCookies([{
      name: 'logistix_session',
      value: token,
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax'
    }]);
  }

  // Si c'est un context/request mock, on renvoie un header cookie pour utilisation
  return { cookie: `logistix_session=${token}` };
}