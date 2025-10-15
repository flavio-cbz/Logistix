import { defineConfig, devices } from '@playwright/test';

/**
 * Configuration Playwright pour LogistiX
 * Tests E2E avec configuration robuste et CI/CD ready
 */
export default defineConfig({
  // Répertoire des tests
  testDir: './tests/e2e',
  testIgnore: ['**/archive/**'],
  
  // Timeout global pour les tests
  timeout: 30000,
  
  // Timeout pour les assertions expect
  expect: {
    timeout: 5000,
  },
  
  // Configuration globale
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 1 : '50%',
  
  // Reporter configuration
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ['junit', { outputFile: 'playwright-report/results.xml' }],
  process.env['CI'] ? ['github'] : ['list'],
  ],
  
  // Configuration globale des tests
  use: {
    // Base URL de l'application
  baseURL: process.env['PLAYWRIGHT_BASE_URL'] || 'http://localhost:3000',
    
    // Trace configuration
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // Navigation timeouts
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  // Configuration des projets (browsers)
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    
    // Tests mobiles
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  // Configuration du serveur de développement
  webServer: {
    command: 'npm run dev',
    port: 3000,
  reuseExistingServer: !process.env['CI'],
    timeout: 120000,
  },

  // Dossiers de sortie
  outputDir: 'test-results/',
  
  // Configuration globale pour tous les tests
  globalSetup: require.resolve('./tests/e2e/global-setup.ts'),
  globalTeardown: require.resolve('./tests/e2e/global-teardown.ts'),
});