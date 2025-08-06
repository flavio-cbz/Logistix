const { pathsToModuleNameMapper } = require('ts-jest')
const { compilerOptions } = require('./tsconfig.json')

module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // TypeScript support
  preset: 'ts-jest',
  
  // Test file patterns
  testMatch: [
    '**/tests/backend/**/*.test.{js,ts}'
  ],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/tests/e2e/',
    '<rootDir>/tests/puppeteer/',
    '<rootDir>/e2e/',
    '<rootDir>/tests/integration/',
    '<rootDir>/lib/',
    'vitest'
  ],
  
  // Module name mapping for TypeScript paths
  moduleNameMapper: {
    ...pathsToModuleNameMapper(compilerOptions.paths || {}, {
      prefix: '<rootDir>/'
    }),
    '^@/(.*)$': '<rootDir>/$1',
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/hooks/(.*)$': '<rootDir>/hooks/$1',
    '^@/types/(.*)$': '<rootDir>/types/$1',
    '^@/app/(.*)$': '<rootDir>/app/$1'
  },
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/backend/setup.ts'
  ],
  
  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx'
      }
    }]
  },
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Coverage configuration
  collectCoverage: false,
  coverageDirectory: '<rootDir>/coverage/backend',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  collectCoverageFrom: [
    'lib/**/*.{ts,tsx}',
    'app/api/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/*.config.*',
    '!**/*.test.*',
    '!**/*.spec.*',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**',
    '!**/tests/**',
    '!**/__tests__/**',
    '!**/__mocks__/**'
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    // Higher thresholds for critical services
    'lib/services/**': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    'app/api/**': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  
  // Test timeout
  testTimeout: 30000,
  
  // Globals
  globals: {
    'ts-jest': {
      useESM: false
    }
  },
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
  
  // Verbose output
  verbose: true,
  
  // Bail on first failure in CI
  bail: process.env.CI ? 1 : 0,
  
  // Max workers
  maxWorkers: process.env.CI ? 2 : '50%',
  
  // Cache directory
  cacheDirectory: '<rootDir>/.jest-cache',
  
  // Error on deprecated features
  errorOnDeprecated: true,
  
  // Notify mode (only in watch mode)
  notify: false,
  
  // Watch plugins
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],
  
  // Reporters
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: '<rootDir>/test-results',
      outputName: 'backend-test-results.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true
    }]
  ],
  
  // Force exit after tests complete
  forceExit: true,
  
  // Detect open handles
  detectOpenHandles: true,
  
  // Detect leaks
  detectLeaks: false,
  

  
  // Silent mode
  silent: false,
  
  // Update snapshots
  updateSnapshot: process.env.UPDATE_SNAPSHOTS === 'true',
  
  // Mock configuration
  automock: false,
  unmockedModulePathPatterns: [
    'node_modules'
  ],
  
  // Module directories
  moduleDirectories: ['node_modules', '<rootDir>'],
  
  // Resolver
  resolver: undefined,
  
  // Root directory
  rootDir: '.',
  
  // Roots
  roots: ['<rootDir>'],
  
  // Test results processor
  testResultsProcessor: undefined,
  
  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$))'
  ],
  
  // Watch ignore patterns
  watchPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/coverage/',
    '<rootDir>/test-results/'
  ]
}