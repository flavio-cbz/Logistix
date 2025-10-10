# Guide de Test - LogistiX

Ce guide détaille la stratégie de test complète de l'application LogistiX.

## 🎯 Stratégie de Test

### Pyramide de Test

```text
    /\
   /  \     E2E Tests (10%)
  /____\    - Tests end-to-end
 /      \   - Tests cross-browser
/________\  Integration Tests (20%)
           - Tests API
           - Tests services
           Unit Tests (70%)
           - Tests composants
           - Tests utilitaires
```

## 🧪 Types de Tests

### Tests Unitaires (Vitest)

- **Composants React** avec React Testing Library
- **Services et utilitaires** avec mocks
- **Hooks personnalisés** avec renderHook
- **Fonctions pures** avec assertions simples

### Tests d'Intégration

- **API endpoints** avec requêtes réelles
- **Services de base de données** avec DB de test
- **Middlewares** avec contexte complet

### Tests End-to-End (Playwright)

- **Workflows utilisateur** complets
- **Tests cross-browser** (Chrome, Firefox, Safari)
- **Tests d'accessibilité** avec axe-core
- **Tests de performance** avec métriques

## 🛠️ Configuration

### Vitest (Tests Unitaires)

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest-setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      threshold: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        }
      }
    }
  }
})
```#
## Playwright (Tests E2E)

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
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
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

## 📝 Écriture des Tests

### Tests de Composants

```typescript
// components/ui/__tests__/button.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../button';

describe('Button Component', () => {
  it('should render with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  it('should handle click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled button</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

### Tests de Services

```typescript
// lib/services/__tests__/auth.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../auth';

// Mock des dépendances
vi.mock('bcrypt', () => ({
  hash: vi.fn(() => Promise.resolve('hashed-password')),
  compare: vi.fn(() => Promise.resolve(true))
}));

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    vi.clearAllMocks();
  });

  it('should hash password correctly', async () => {
    const password = 'password123';
    const hashedPassword = await authService.hashPassword(password);
    
    expect(hashedPassword).toBe('hashed-password');
  });

  it('should verify password correctly', async () => {
    const password = 'password123';
    const hashedPassword = 'hashed-password';
    
    const isValid = await authService.verifyPassword(password, hashedPassword);
    expect(isValid).toBe(true);
  });
});
```

### Tests d'API

```typescript
// tests/integration/api/auth.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { POST } from '@/app/api/v1/auth/login/route';

describe('Auth API', () => {
  it('should login with valid credentials', async () => {
    const request = new Request('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.token).toBeDefined();
  });

  it('should reject invalid credentials', async () => {
    const request = new Request('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'wrongpassword'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
  });
});
```

### Tests E2E

```typescript
// tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should login successfully', async ({ page }) => {
    await page.goto('/auth/login');
    
    await page.fill('[data-testid="email"]', 'test@example.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/auth/login');
    
    await page.fill('[data-testid="email"]', 'test@example.com');
    await page.fill('[data-testid="password"]', 'wrongpassword');
    await page.click('[data-testid="login-button"]');
    
    await expect(page.locator('[data-testid="error-message"]'))
      .toContainText('Invalid credentials');
  });
});
```

## 🎭 Mocking

### Mock des Services

```typescript
// tests/mocks/auth-service.ts
export const mockAuthService = {
  login: vi.fn(),
  logout: vi.fn(),
  verifyToken: vi.fn(),
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
};
```

### Mock de la Base de Données

```typescript
// tests/mocks/database.ts
export const mockDb = {
  prepare: vi.fn(() => ({
    get: vi.fn(),
    all: vi.fn(),
    run: vi.fn()
  })),
  transaction: vi.fn(),
  close: vi.fn()
};
```

### Mock des API Externes

```typescript
// tests/mocks/vinted-api.ts
import { http, HttpResponse } from 'msw';

export const vintedApiHandlers = [
  http.get('https://www.vinted.fr/api/v2/catalog/items', () => {
    return HttpResponse.json({
      items: [
        { id: 1, title: 'Test Item', price: '10.00' }
      ]
    });
  }),
];
```

## 🔧 Utilitaires de Test

### Test Utils

```typescript
// tests/utils/test-utils.tsx
import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { ThemeProvider } from 'next-themes';

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      {children}
    </ThemeProvider>
  );
};

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };
```

### Fixtures de Test

```typescript
// tests/fixtures/user.ts
export const createMockUser = (overrides = {}) => ({
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  createdAt: new Date('2024-01-01'),
  ...overrides
});

export const createMockProduct = (overrides = {}) => ({
  id: 'product-123',
  nom: 'Test Product',
  prix: 10.50,
  quantite: 100,
  userId: 'user-123',
  parcelleId: 'parcelle-123',
  ...overrides
});
```

## 📊 Couverture de Code

### Configuration

```json
// package.json
{
  "scripts": {
    "test:coverage": "vitest run --coverage",
    "test:coverage:ui": "vitest --ui --coverage"
  }
}
```

### Seuils de Couverture

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      threshold: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        },
        // Seuils spécifiques par fichier
        'src/components/': {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    }
  }
});
```

## 🚀 CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run test:coverage
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run build
      - run: npx playwright test
      
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

## 🎯 Bonnes Pratiques

### Nommage des Tests

```typescript
// ✅ Bon
describe('UserService', () => {
  describe('createUser', () => {
    it('should create user with valid data', () => {});
    it('should throw error when email already exists', () => {});
    it('should hash password before saving', () => {});
  });
});

// ❌ Éviter
describe('UserService', () => {
  it('test1', () => {});
  it('test2', () => {});
});
```

### Structure des Tests

```typescript
// Pattern AAA (Arrange, Act, Assert)
it('should calculate total price correctly', () => {
  // Arrange
  const items = [
    { price: 10, quantity: 2 },
    { price: 5, quantity: 3 }
  ];
  
  // Act
  const total = calculateTotal(items);
  
  // Assert
  expect(total).toBe(35);
});
```

### Tests d'Accessibilité

```typescript
// tests/e2e/accessibility.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('should not have accessibility violations', async ({ page }) => {
  await page.goto('/dashboard');
  
  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  
  expect(accessibilityScanResults.violations).toEqual([]);
});
```

## 📈 Performance Testing

### Tests de Performance

```typescript
// tests/performance/load.spec.ts
import { test, expect } from '@playwright/test';

test('should load dashboard within 2 seconds', async ({ page }) => {
  const startTime = Date.now();
  
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
  
  const loadTime = Date.now() - startTime;
  expect(loadTime).toBeLessThan(2000);
});
```

### Métriques Web Vitals

```typescript
test('should have good Core Web Vitals', async ({ page }) => {
  await page.goto('/dashboard');
  
  const vitals = await page.evaluate(() => {
    return new Promise((resolve) => {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        resolve(entries.map(entry => ({
          name: entry.name,
          value: entry.value
        })));
      }).observe({ entryTypes: ['measure'] });
    });
  });
  
  // Vérifier les métriques
  expect(vitals).toBeDefined();
});
```

## 🐛 Debugging des Tests

### Debug avec VSCode

```json
// .vscode/launch.json
{
  "configurations": [
    {
      "name": "Debug Vitest Tests",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/vitest/vitest.mjs",
      "args": ["run", "--reporter=verbose"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

### Debug Playwright

```bash
# Mode debug interactif
npx playwright test --debug

# Mode headed (avec navigateur visible)
npx playwright test --headed

# Trace viewer
npx playwright show-trace trace.zip
```

## 📋 Commandes Utiles

```bash
# Tests unitaires
npm run test                 # Exécuter tous les tests
npm run test:watch          # Mode watch
npm run test:coverage       # Avec couverture
npm run test:ui             # Interface graphique

# Tests E2E
npx playwright test         # Tous les tests E2E
npx playwright test --headed # Avec navigateur visible
npx playwright test --debug # Mode debug
npx playwright show-report  # Rapport HTML

# Utilitaires
npm run test:lint           # Linter les tests
npm run test:type-check     # Vérification TypeScript
```

---

Pour plus d'informations, consultez la [documentation complète](../README.md).
