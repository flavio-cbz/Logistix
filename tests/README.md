# LogistiX Testing Infrastructure

This directory contains the comprehensive testing infrastructure for LogistiX, implementing a multi-layered testing approach with different frameworks for different testing needs.

## Testing Frameworks

### 1. Vitest (Unit Testing)

- **Purpose**: Fast unit testing for components and utilities
- **Configuration**: `vitest.config.ts`
- **Command**: `npm run test` or `npm run test:watch`
- **Coverage**: `npm run test:coverage`

### 2. Jest (Backend Testing)

- **Purpose**: Classic backend service testing with mocking
- **Configuration**: `jest.backend.config.js`
- **Command**: `npm run test:backend`
- **Coverage**: `npm run test:backend:coverage`

### 3. Supertest (API Testing)

- **Purpose**: Direct HTTP API endpoint testing
- **Setup**: `tests/api/setup.ts`
- **Features**: Database isolation, authentication helpers

### 4. Puppeteer (UI Testing)

- **Purpose**: Browser automation and UI workflow testing
- **Configuration**: `tests/puppeteer/config.ts`
- **Features**: Page objects, screenshot capture, error handling

## Directory Structure

```
tests/
├── backend/           # Jest backend tests
│   ├── setup.ts      # Test setup and utilities
│   └── mocks/        # Service mocks
├── api/              # Supertest API tests
│   ├── setup.ts      # API test configuration
│   └── auth-helpers.ts # Authentication helpers
├── puppeteer/        # Puppeteer UI tests
│   ├── config.ts     # Puppeteer configuration
│   ├── page-objects/ # Page object models
│   └── utils/        # Screenshot and error utilities
├── fixtures/         # Test data factories
├── mocks/           # Global mocks
└── utils/           # Test utilities
```

## Test Data Management

### Factories

- `tests/fixtures/test-data.ts` - Comprehensive test data factories
- Uses Faker.js for realistic test data generation
- Supports different scenarios (minimal, small, medium, large)

### Database Isolation

- Each test gets an isolated in-memory database
- Automatic cleanup between tests
- Seeding utilities for consistent test data

## Running Tests

### All Tests

```bash
npm test                    # Run Vitest unit tests
npm run test:backend        # Run Jest backend tests
npm run test:e2e           # Run Playwright E2E tests
```

### Specific Test Types

```bash
npm run test:watch         # Watch mode for unit tests
npm run test:coverage      # Unit tests with coverage
npm run test:backend:watch # Watch mode for backend tests
```

### Test Debugging

```bash
DEBUG_TESTS=true npm run test:backend  # Enable debug output
npm run test:ui                        # Run tests with UI
```

## Writing Tests

### Backend Service Tests (Jest)

```typescript
import { describe, test, expect } from '@jest/globals'
import { ServiceMockFactory } from '../mocks/service-mocks'

describe('MyService', () => {
  test('should do something', async () => {
    const mockService = ServiceMockFactory.getAuthService()
    // Test implementation
  })
})
```

### API Tests (Supertest)

```typescript
import { setupTestServer, createApiClient, AuthHelper } from '../api/setup'

describe('API Tests', () => {
  beforeAll(async () => {
    await setupTestServer()
  })

  test('should authenticate user', async () => {
    const client = createApiClient()
    const auth = new AuthHelper(client)
    const result = await auth.login()
    expect(result.success).toBe(true)
  })
})
```

### UI Tests (Puppeteer)

```typescript
import { setupPuppeteerTest } from '../puppeteer/config'
import { LoginPage } from '../puppeteer/page-objects/login-page'

describe('Login Flow', () => {
  test('should login successfully', async () => {
    const page = await setupPuppeteerTest()
    const loginPage = new LoginPage(page)
    
    await loginPage.navigateToLogin()
    await loginPage.login('test@example.com', 'password123')
    
    expect(await loginPage.getCurrentUrl()).toContain('/dashboard')
  })
})
```

## Configuration

### Environment Variables

- `NODE_ENV=test` - Set automatically for tests
- `DATABASE_URL=:memory:` - Use in-memory database
- `DEBUG_TESTS=true` - Enable debug output

### Test Databases

- Isolated in-memory SQLite databases
- Automatic schema initialization
- Seeded with realistic test data
- Cleaned up between tests

## Best Practices

1. **Isolation**: Each test should be independent
2. **Mocking**: Mock external dependencies
3. **Data**: Use factories for consistent test data
4. **Cleanup**: Always clean up resources
5. **Assertions**: Use specific, meaningful assertions
6. **Documentation**: Document complex test scenarios

## Troubleshooting

### Common Issues

- **Database errors**: Check database isolation setup
- **Mock issues**: Verify mock implementations
- **Timeout errors**: Increase test timeouts
- **Coverage issues**: Check file inclusion patterns

### Debug Commands

```bash
# Run single test file
npm run test:backend -- tests/backend/setup.test.ts

# Run with verbose output
npm run test:backend -- --verbose

# Run specific test pattern
npm run test:backend -- --testNamePattern="should login"
```

## Contributing

When adding new tests:

1. Follow the existing patterns
2. Use appropriate test factories
3. Add proper cleanup
4. Update documentation
5. Ensure tests are deterministic
