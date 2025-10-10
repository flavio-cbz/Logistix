# API Route Testing

This directory contains comprehensive tests for all API routes in the Logistix application.

## Test Files

- `auth.test.ts` - Tests for authentication-related routes
- `products.test.ts` - Tests for product-related routes  
- `parcelles.test.ts` - Tests for parcelle-related routes
- `other-routes.test.ts` - Tests for other API routes
- `basic-api.test.ts` - Basic connectivity and functionality tests
- `test-config.ts` - Configuration for API testing
- `run-all-api-tests.ts` - Comprehensive test runner script

## Running Tests

### Run all tests with vitest:
```bash
npm test
# or
npm run test
# or run specific test
npx vitest tests/api/
```

### Run the comprehensive API test suite:
```bash
npm run test:runner
# This will start the dev server and run all API tests
```

### Run specific test files:
```bash
npx vitest tests/api/auth.test.ts
npx vitest tests/api/products.test.ts
```

## Test Coverage

The tests cover:

- **Authentication routes**: Login, logout, session validation
- **Product routes**: Product creation, listing, statistics
- **Parcelle routes**: Parcelle management and statistics
- **Market analysis routes**: Price analysis, predictions
- **User management routes**: Profile, settings, preferences
- **Data management routes**: Import, export, sync, statistics
- **Vinted integration routes**: Category management, cache clearing
- **System routes**: Health checks, metrics

## Test Results

The comprehensive test runner (`run-all-api-tests.ts`) will:

1. Start the development server
2. Run tests against all API routes
3. Generate a detailed report showing:
   - Working routes
   - Failing routes
   - Success rate percentage
   - Individual route status codes
4. Save the detailed report as JSON in the `reports/` directory

## Expected Results

Most routes will return 401/403 (unauthorized) without proper authentication, which is expected behavior. The tests verify that the server responds appropriately rather than crashes or unexpected errors.

Public endpoints like `/api/health` should return 200 status codes.