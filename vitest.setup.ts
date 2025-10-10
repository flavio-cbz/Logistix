import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import { TEST_CONFIG } from './tests/config/test-config';

// Extend expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Global test configuration
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

// Configuration centralisée via TEST_CONFIG
process.env.BASE_URL = TEST_CONFIG.BASE_URL;
process.env.DATABASE_URL = TEST_CONFIG.DATABASE_URL;
process.env.JWT_SECRET = TEST_CONFIG.JWT_SECRET;
process.env.COOKIE_NAME = TEST_CONFIG.COOKIE_NAME;
