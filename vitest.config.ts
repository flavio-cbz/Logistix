import { defineConfig } from 'vitest/config';
import path from 'path';
import fs from 'fs';
import tsconfigPaths from 'vite-tsconfig-paths';

const tsconfig: {
  compilerOptions?: {
    paths?: Record<string, string[]>;
  };
} = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, 'tsconfig.json'), 'utf-8'),
);

const aliasFromTsconfig = Object.entries(tsconfig.compilerOptions?.paths ?? {}).reduce(
  (acc, [key, values]) => {
    if (!values?.length) {
      return acc;
    }

    const normalizedKey = key.replace(/\/\*$/, '');
    const target = values[0]?.replace(/\/\*$/, '');

    if (!normalizedKey || !target) {
      return acc;
    }

    acc[normalizedKey] = path.resolve(__dirname, target);
    return acc;
  },
  {} as Record<string, string>,
);

if (!aliasFromTsconfig['@']) {
  aliasFromTsconfig['@'] = path.resolve(__dirname, './');
}

export default defineConfig({
  plugins: [
    tsconfigPaths({ projects: ['./tsconfig.vitest.json', './tsconfig.json'] })
  ],
  resolve: {
    alias: aliasFromTsconfig
  },
  test: {
    environment: (process.env.VITEST_NODE_ENV === 'true' ? 'node' : 'jsdom'),
    setupFiles: ['./vitest.setup.ts', './tests/setup/test-setup.ts'],
    globals: true,
    include: [
      '**/*.test.ts',
      '**/*.test.tsx',
      'tests/**/*.test.ts',
      'tests/**/*.test.tsx'
    ],
    exclude: [
      'node_modules/**',
      'dist/**',
      '.next/**',
      'coverage/**'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/**',
        'tests/**',
        '**/*.test.ts',
        '**/*.test.tsx',
        'coverage/**',
        '.next/**',
        'dist/**',
        'scripts/**',
        'vitest.config.ts',
        'vitest.setup.ts',
        '**/*.d.ts',
        'tailwind.config.ts',
        'next.config.mjs',
        'middleware.ts' // Exclure temporairement
      ],
      // Seuils de couverture minimaux
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    testTimeout: 30000, // Augmenté pour les tests E2E/DB
    hookTimeout: 30000,
    // Options supplémentaires pour la stabilité
    pool: 'forks', // Isolation des tests
    isolate: true,
    passWithNoTests: true
  },
  esbuild: {
    target: 'node18'
  }
});