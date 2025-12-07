<<<<<<< HEAD
# API Route Testing

This directory contains comprehensive tests for all API routes in the Logistix application.

## Test Files

- `auth.test.ts` - Tests for authentication-related routes
- `products.test.ts` - Tests for product-related routes
- `parcelles.test.ts` - Tests for parcelle-related routes
- `other-routes.test.ts` - Tests for other API routes
- `basic-api.test.ts` - Basic connectivity and functionality tests
- `test-config.ts` - Configuration for API testing

## Running Tests

### Run all tests with vitest

```bash
npm test
# or
npm run test
# or run specific test
npx vitest tests/api/
```

### Run the comprehensive API test suite

```bash
npm run test:runner
# This will start the dev server and run all API tests
```

### Run specific test files

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

Note: the legacy comprehensive runner `run-all-api-tests.ts` was removed as part of test cleanup.
Use the project scripts to run tests:

- `npm test` or `npm run test` — run vitest suites
- `npm run test:runner` — start the dev server and run the scripted runner (`scripts/run-tests.ts`)
- For API tests use: `npx vitest tests/api/`

The recommended CI-friendly runner remains `npm run test:runner` which delegates to `scripts/run-tests.ts`.

## Expected Results

Most routes will return 401/403 (unauthorized) without proper authentication, which is expected behavior. The tests verify that the server responds appropriately rather than crashes or unexpected errors.

Public endpoints like `/api/health` should return 200 status codes.
=======
# API Route Testing

This directory contains comprehensive tests for all API routes in the Logistix application.

## Test Files

- `auth.test.ts` - Tests for authentication-related routes
- `products.test.ts` - Tests for product-related routes
- `parcelles.test.ts` - Tests for parcelle-related routes
- `other-routes.test.ts` - Tests for other API routes
- `basic-api.test.ts` - Basic connectivity and functionality tests
- `test-config.ts` - Configuration for API testing

## Running Tests

### Run all tests with vitest

```bash
npm test
# or
npm run test
# or run specific test
npx vitest tests/api/
```

### Run the comprehensive API test suite

```bash
npm run test:runner
# This will start the dev server and run all API tests
```

### Run specific test files

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

Note: the legacy comprehensive runner `run-all-api-tests.ts` was removed as part of test cleanup.
Use the project scripts to run tests:

- `npm test` or `npm run test` — run vitest suites
- `npm run test:runner` — start the dev server and run the scripted runner (`scripts/run-tests.ts`)
- For API tests use: `npx vitest tests/api/`

The recommended CI-friendly runner remains `npm run test:runner` which delegates to `scripts/run-tests.ts`.

## Expected Results

Most routes will return 401/403 (unauthorized) without proper authentication, which is expected behavior. The tests verify that the server responds appropriately rather than crashes or unexpected errors.

Public endpoints like `/api/health` should return 200 status codes.
>>>>>>> ad32518644f2ab77a7c59429e3df905bfcc3ef94
