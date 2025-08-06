import { expect, vi, beforeEach, afterEach } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';

// Extend expect with jest-dom matchers
expect.extend(matchers);

// Global test setup
beforeEach(() => {
  // Reset all mocks before each test
  vi.clearAllMocks();
  vi.clearAllTimers();
  
  // Setup fake timers if needed
  vi.useFakeTimers();
});

afterEach(() => {
  // Cleanup DOM after each test
  cleanup();
  
  // Restore real timers
  vi.useRealTimers();
  
  // Reset modules
  vi.resetModules();
});

// Mock pour server-only
// Ce fichier est utilisé dans vitest.config.ts pour remplacer le module 'server-only'
// qui ne peut pas être importé dans un environnement de test.

// Global mocks
global.fetch = vi.fn();
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock
});

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'mocked-url');
global.URL.revokeObjectURL = vi.fn();

// Mock File and FileReader
global.File = class MockFile {
  constructor(bits, name, options = {}) {
    this.bits = bits;
    this.name = name;
    this.size = bits.reduce((acc, bit) => acc + bit.length, 0);
    this.type = options.type || '';
    this.lastModified = options.lastModified || Date.now();
  }
};

global.FileReader = class MockFileReader {
  constructor() {
    this.readyState = 0;
    this.result = null;
    this.error = null;
    this.onload = null;
    this.onerror = null;
    this.onabort = null;
  }
  
  readAsText(file) {
    setTimeout(() => {
      this.readyState = 2;
      this.result = 'mocked file content';
      if (this.onload) this.onload({ target: this });
    }, 0);
  }
  
  readAsDataURL(file) {
    setTimeout(() => {
      this.readyState = 2;
      this.result = 'data:text/plain;base64,bW9ja2VkIGZpbGUgY29udGVudA==';
      if (this.onload) this.onload({ target: this });
    }, 0);
  }
  
  abort() {
    this.readyState = 2;
    if (this.onabort) this.onabort({ target: this });
  }
};

// Mock crypto for testing
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'mocked-uuid-' + Math.random().toString(36).substr(2, 9)),
    getRandomValues: vi.fn((arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }),
  },
});

// Mock Next.js modules
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
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    has: vi.fn(),
  })),
  headers: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    has: vi.fn(),
    delete: vi.fn(),
  })),
}));

vi.mock('next/image', () => ({
  default: vi.fn(({ src, alt, ...props }) => {
    return `<img src="${src}" alt="${alt}" {...props} />`;
  }),
}));

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = ':memory:';
process.env.NEXTAUTH_SECRET = 'test-secret';
process.env.NEXTAUTH_URL = 'http://localhost:3000';

// Console suppression for cleaner test output
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.error = (...args) => {
  // Suppress specific React warnings in tests
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning: ReactDOM.render is no longer supported') ||
     args[0].includes('Warning: An invalid form control'))
  ) {
    return;
  }
  originalConsoleError.call(console, ...args);
};

console.warn = (...args) => {
  // Suppress specific warnings in tests
  if (
    typeof args[0] === 'string' &&
    args[0].includes('componentWillReceiveProps has been renamed')
  ) {
    return;
  }
  originalConsoleWarn.call(console, ...args);
};