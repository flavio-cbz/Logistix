import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import path from 'path'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest-setup.js'],
    alias: {
      'server-only': path.resolve(__dirname, './vitest-setup.js')
    },
    // Enhanced test execution settings
    testTimeout: 30000,
    hookTimeout: 30000,
    teardownTimeout: 10000,
    isolate: true,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 4,
        minThreads: 1
      }
    },
    // Comprehensive coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov', 'text-summary'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'dist/',
        '.next/',
        'coverage/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/test-utils.ts',
        '**/vitest-setup.js',
        '**/vitest-setup.d.ts',
        'e2e/**',
        'scripts/**',
        'public/**',
        'docs/**',
        'logs/**',
        'data/**',
        'downloads/**',
        '**/*.stories.*',
        '**/*.test.*',
        '**/*.spec.*',
        '**/mock*',
        '**/__mocks__/**',
        '**/__tests__/**',
        '**/tests/**'
      ],
      include: [
        'app/**/*.{ts,tsx}',
        'components/**/*.{ts,tsx}',
        'lib/**/*.{ts,tsx}',
        'hooks/**/*.{ts,tsx}',
        'types/**/*.{ts,tsx}'
      ],
      // Enhanced coverage thresholds
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        },
        // Per-file thresholds for critical components
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
      // Coverage reporting options
      all: true,
      skipFull: false,
      clean: true,
      cleanOnRerun: true
    },
    // Test file patterns
    include: [
      '**/__tests__/**/*.{test,spec}.{js,ts,tsx}',
      '**/tests/unit/**/*.{test,spec}.{js,ts,tsx}',
      '**/*.{test,spec}.{js,ts,tsx}'
    ],
    exclude: [
      'node_modules',
      'e2e',
      'tests/e2e/**',
      'tests/integration/**',
      'scripts/tests/**',
      '.next/**',
      'dist/**',
      'coverage/**',
      'public/**',
      'docs/**'
    ],
    // Enhanced reporting
    reporter: ['verbose', 'json', 'html'],
    outputFile: {
      json: './test-results/unit-test-results.json',
      html: './test-results/unit-test-report.html'
    },
    // Mock configuration
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
    // Watch mode settings
    watch: false,
    // Retry configuration for flaky tests
    retry: 2,
    // Bail on first failure in CI
    bail: process.env.CI ? 1 : 0
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      '@/components': path.resolve(__dirname, './components'),
      '@/lib': path.resolve(__dirname, './lib'),
      '@/hooks': path.resolve(__dirname, './hooks'),
      '@/types': path.resolve(__dirname, './types'),
      '@/app': path.resolve(__dirname, './app'),
      '@/test-utils': path.resolve(__dirname, './tests/utils')
    },
  },
})