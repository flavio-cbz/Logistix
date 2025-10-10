# Testing Infrastructure for Logistix

This document describes the comprehensive testing infrastructure implemented for the Logistix project as part of the refactoring effort.

## Overview

The testing infrastructure provides comprehensive coverage for:
- **Unit Tests**: Service layer, repository layer, and database utilities
- **Integration Tests**: API routes and database operations
- **Test Utilities**: Mocks, factories, and helper functions

## Test Structure

```
tests/
├── setup/                          # Test setup and utilities
│   ├── test-setup.ts               # Global test configuration
│   ├── database-mocks.ts           # Database mocking utilities
│   ├── service-mocks.ts            # Service layer mocks
│   └── test-data-factory.ts        # Test data generation
├── utils/                          # Test helper utilities
│   └── test-helpers.ts             # Common testing patterns
├── unit/                           # Unit tests
│   ├── services/                   # Service layer tests
│   │   ├── base-service.test.ts
│   │   ├── product-service.test.ts
│   │   ├── parcelle-service.test.ts
│   │   └── auth-service.test.ts
│   ├── repositories/               # Repository layer tests
│   │   └── base-repository.test.ts
│   └── database/                   # Database utility tests
│       └── database-service.test.ts
└── integration/                    # Integration tests
    ├── api-test-setup.ts           # API testing utilities
    ├── auth-api.test.ts            # Authentication API tests
    ├── products-api.test.ts        # Products API tests
    ├── parcelles-api.test.ts       # Parcelles API tests
    └── database-integration.test.ts # Database integration tests
```

## Test Categories

### 1. Unit Tests - Services (`tests/unit/services/`)

Tests for business logic in service classes:

- **BaseService**: Core service functionality, validation, error handling
- **ProductService**: Product CRUD operations, validation, business rules
- **ParcelleService**: Parcelle management, validation, relationships
- **AuthService**: Authentication, session management, security

**Coverage includes:**
- Input validation and sanitization
- Business rule enforcement
- Error handling and custom exceptions
- Logging and correlation IDs
- UUID and data type validation

### 2. Unit Tests - Repositories (`tests/unit/repositories/`)

Tests for data access layer:

- **BaseRepository**: Common CRUD operations, pagination, transactions
- Repository pattern implementation
- Database query building and execution
- Error handling and connection management

### 3. Unit Tests - Database (`tests/unit/database/`)

Tests for database utilities and services:

- **DatabaseService**: Connection management, query execution, transactions
- Health checks and monitoring
- Performance tracking
- Configuration validation

### 4. Integration Tests (`tests/integration/`)

End-to-end testing of API routes and database operations:

- **Authentication API**: Login, logout, session management
- **Products API**: CRUD operations, validation, authorization
- **Parcelles API**: CRUD operations, relationships, constraints
- **Database Integration**: Schema validation, relationships, transactions

## Test Utilities

### Mock Factories (`tests/setup/`)

- **Database Mocks**: In-memory database setup, mock repositories
- **Service Mocks**: Mock service implementations with configurable behavior
- **Test Data Factory**: Consistent test data generation using Faker.js

### Helper Functions (`tests/utils/`)

- **Error Assertions**: Helpers for testing custom error types
- **API Response Validation**: Structured API response testing
- **Performance Testing**: Timing and performance measurement utilities
- **Console Mocking**: Safe console output testing

## Configuration

### Vitest Configuration (`vitest.config.ts`)

```typescript
export default defineConfig({
  test: {
    environment: 'node', // or 'jsdom' for frontend tests
    setupFiles: ['./vitest.setup.ts', './tests/setup/test-setup.ts'],
    environmentMatchGlobs: [
      ['tests/unit/services/**/*.test.ts', 'node'],
      ['tests/integration/**/*.test.ts', 'node']
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html']
    }
  }
});
```

### Test Scripts (`package.json`)

```json
{
  "scripts": {
    "test": "vitest run --passWithNoTests",
    "test:unit": "vitest run tests/unit --passWithNoTests",
    "test:integration": "vitest run tests/integration --passWithNoTests",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest run --coverage",
    "test:runner": "ts-node scripts/run-tests.ts"
  }
}
```

## Running Tests

### Basic Commands

```bash
# Run all tests
npm run test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Use custom test runner
npm run test:runner
```

### Test Runner Script

The custom test runner (`scripts/run-tests.ts`) provides:
- Organized test suite execution
- Coverage report generation
- Detailed logging and progress tracking
- Selective test suite running

```bash
# Run with coverage
npm run test:runner -- --coverage

# Run specific test suite
npm run test:runner -- --suite=services

# Show help
npm run test:runner -- --help
```

## Test Patterns and Best Practices

### 1. Service Testing Pattern

```typescript
describe('ServiceName', () => {
  let service: ServiceName;
  let mockRepository: jest.Mocked<RepositoryType>;

  beforeEach(() => {
    mockRepository = createMockRepository();
    service = new ServiceName(mockRepository);
    service.setRequestId('test-request-id');
  });

  it('should perform operation successfully', async () => {
    // Arrange
    mockRepository.method.mockResolvedValue(expectedResult);

    // Act
    const result = await service.method(input);

    // Assert
    expect(result).toEqual(expectedResult);
    expect(mockRepository.method).toHaveBeenCalledWith(input);
  });
});
```

### 2. API Testing Pattern

```typescript
describe('API Route', () => {
  let testDb: any;

  beforeEach(async () => {
    testDb = await setupTestDatabase();
  });

  it('should handle request successfully', async () => {
    // Arrange
    const request = createMockRequest('POST', '/api/endpoint', data);

    // Act
    const response = await handler(request);
    const responseData = await extractJsonResponse(response);

    // Assert
    expect(response.status).toBe(200);
    assertApiResponse(responseData, 'success');
  });
});
```

### 3. Error Testing Pattern

```typescript
it('should throw ValidationError for invalid input', async () => {
  await expectValidationError(
    () => service.method('invalid-input'),
    'fieldName',
    'Expected error message'
  );
});
```

## Current Status

### ✅ Implemented

- Complete test infrastructure setup
- Unit tests for all major service classes
- Integration tests for API routes
- Database testing utilities
- Mock factories and test data generation
- Custom test runner with reporting
- Comprehensive error testing patterns

### ⚠️ Known Issues

1. **Module Resolution**: Some tests fail due to module import issues
2. **Mock Configuration**: Database and service mocks need refinement
3. **Schema Dependencies**: Missing database schema references

### 🔧 Fixes Needed

1. **Fix Import Paths**: Resolve module resolution issues in test files
2. **Update Mocks**: Ensure all mocks properly implement interfaces
3. **Schema Setup**: Create proper database schema for testing
4. **Logger Conflicts**: Resolve duplicate export issues in logger module

## Next Steps

1. **Fix Test Failures**: Address the module resolution and mock issues
2. **Add E2E Tests**: Implement end-to-end tests using Playwright
3. **Performance Tests**: Add performance benchmarking tests
4. **CI/CD Integration**: Set up automated testing in CI pipeline
5. **Coverage Goals**: Achieve 80%+ test coverage across all modules

## Benefits

This testing infrastructure provides:

- **Confidence**: Comprehensive coverage ensures code reliability
- **Maintainability**: Well-structured tests make refactoring safer
- **Documentation**: Tests serve as living documentation of expected behavior
- **Quality Assurance**: Automated testing prevents regressions
- **Developer Experience**: Fast feedback loop with watch mode and detailed reporting

The testing infrastructure is designed to support the ongoing refactoring effort and ensure the stability and reliability of the Logistix application.