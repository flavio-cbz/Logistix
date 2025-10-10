/**
 * Test setup utilities for unit and integration tests
 * Provides common test configuration, mocks, and utilities
 */

import { vi, beforeEach, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

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
export * from './service-mocks';
export * from './test-data-factory';