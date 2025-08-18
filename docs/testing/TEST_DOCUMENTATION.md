# LogistiX Testing Documentation

## Overview

> **Ce guide a été archivé. Toutes les informations de test sont désormais centralisées dans [`docs/TESTING.md`](../TESTING.md) et le [README.md](../../README.md). Ce fichier n’est plus maintenu.**

This document provides comprehensive documentation for all test suites in the LogistiX testing system. The testing infrastructure implements a multi-layered approach with four main testing methodologies to ensure complete coverage and precise error detection.

**Note**: This document consolidates information from multiple testing guides including best practices, onboarding procedures, and troubleshooting guidance.

## Testing Architecture

### Multi-Layer Testing Strategy

1. **Direct API Testing (Supertest)** - HTTP endpoint validation
2. **Classic Backend Testing (Jest)** - Business logic verification
3. **Puppeteer UI Testing** - Complete user workflow automation
4. **Integration Testing** - Cross-service communication validation

### Test Framework Stack

- **Vitest**: Unit testing for components and utilities
- **Jest**: Backend service testing with comprehensive mocking
- **Supertest**: Direct HTTP API endpoint testing
- **Puppeteer**: Browser automation and UI workflow testing
- **Playwright**: Cross-browser compatibility testing
- **Artillery.js**: Load testing and performance validation

## Test Suite Categories

### 1. Authentication & User Management Tests

#### Purpose
Validates all authentication features including login, logout, registration, profile management, and security measures.

#### Test Files
- `tests/api/auth.test.ts` - Direct API authentication tests
- `tests/backend/auth-services.test.ts` - Backend authentication services
- `tests/puppeteer/auth-workflows.test.ts` - UI authentication workflows
- `tests/security/vulnerability-tests.test.ts` - Security vulnerability tests

#### Coverage Areas
- Login/logout functionality
- Session management and validation
- Password hashing and security
- Profile management operations
- CSRF protection validation
- SQL injection prevention
- Authentication bypass attempts

#### Key Test Scenarios
```typescript
// API Tests
- POST /api/v1/auth/login with valid credentials
- POST /api/v1/auth/login with invalid credentials
- Session creation and validation
- Profile CRUD operations

// Backend Tests
- AuthService.validateCredentials()
- SessionService.createSession()
- ProfileService.updateProfile()
- AuditService.logUserAction()

// UI Tests
- Complete login workflow
- Registration with form validation
- Profile update with avatar upload
- Theme switching workflow
```

### 2. Parcel Management Tests

#### Purpose
Validates parcel CRUD operations, business logic calculations, and data integrity.

#### Test Files
- `tests/api/parcelles.test.ts` - Direct API parcel tests
- `tests/backend/parcelles.test.ts` - Backend parcel services
- `tests/puppeteer/parcelles-workflows.test.ts` - UI parcel workflows

#### Coverage Areas
- Parcel creation, reading, updating, deletion
- Price per gram calculations
- Product associations
- Data validation and constraints
- Business rule enforcement

#### Key Test Scenarios
```typescript
// API Tests
- GET /api/v1/parcelles with filtering
- POST /api/v1/parcelles with validation
- PUT /api/v1/parcelles/:id updates
- DELETE /api/v1/parcelles/:id operations

// Backend Tests
- ParcelService CRUD methods
- Calculation functions
- Data validation logic
- Transaction integrity

// UI Tests
- Parcel creation workflow
- List view with sorting/filtering
- Bulk operations
- Data export functionality
```

### 3. Product Management Tests

#### Purpose
Validates product catalog management, sales tracking, and financial calculations.

#### Test Files
- `tests/api/products.test.ts` - Direct API product tests
- `tests/backend/product-services.test.ts` - Backend product services
- `tests/puppeteer/product-workflows.test.ts` - UI product workflows

#### Coverage Areas
- Product catalog management
- Sales recording and tracking
- Financial calculations (ROI, margins)
- Inventory management
- Product lifecycle management

### 4. Market Analysis Tests

#### Purpose
Validates Vinted integration, market data analysis, and visualization features.

#### Test Files
- `tests/api/market-analysis.test.ts` - Direct API market analysis tests
- `tests/backend/market-analysis-services.test.ts` - Backend analysis services
- `tests/puppeteer/market-analysis-workflows.test.ts` - UI analysis workflows
- `tests/integration/vinted-integration.test.ts` - Vinted integration tests

#### Coverage Areas
- Vinted API integration
- Market data collection and processing
- Search functionality
- Data visualization
- External API error handling

### 5. Dashboard & Statistics Tests

#### Purpose
Validates dashboard widgets, data visualization, and statistical calculations.

#### Test Files
- `tests/api/dashboard.test.ts` - Direct API dashboard tests
- `tests/backend/statistics-service.test.ts` - Backend statistics services
- `tests/puppeteer/dashboard-workflows.test.ts` - UI dashboard workflows

#### Coverage Areas
- Dashboard widget functionality
- Statistical calculations
- Data aggregation
- Interactive visualizations
- Real-time updates

### 6. Import/Export Data Tests

#### Purpose
Validates data import/export functionality, format handling, and data integrity.

#### Test Files
- `tests/api/import-export.test.ts` - Direct API import/export tests
- `tests/backend/import-export-services.test.ts` - Backend import/export services
- `tests/puppeteer/import-export-workflows.test.ts` - UI import/export workflows

#### Coverage Areas
- Data export in multiple formats
- Data import with validation
- File processing and streaming
- Data integrity verification
- Conflict resolution

### 7. Administration & Maintenance Tests

#### Purpose
Validates admin functionality, system monitoring, and maintenance operations.

#### Test Files
- `tests/api/administration.test.ts` - Direct API administration tests
- `tests/backend/administration-services.test.ts` - Backend admin services
- `tests/puppeteer/administration-workflows.test.ts` - UI admin workflows

#### Coverage Areas
- Database administration
- System health monitoring
- Maintenance operations
- Backup and restore functionality
- Log management

### 8. Search & Navigation Tests

#### Purpose
Validates search functionality, navigation elements, and user experience features.

#### Test Files
- `tests/api/search.test.ts` - Direct API search tests
- `tests/backend/search-service.test.ts` - Backend search services
- `tests/puppeteer/search-navigation.test.ts` - UI search and navigation

#### Coverage Areas
- Global search functionality
- Search suggestions and autocomplete
- Navigation menu accuracy
- Keyboard shortcuts
- Mobile navigation

### 9. Security & Validation Tests

#### Purpose
Validates security measures, vulnerability prevention, and audit systems.

#### Test Files
- `tests/security/vulnerability-tests.test.ts` - Security vulnerability tests
- `tests/security/audit-validation-tests.test.ts` - Audit and validation tests
- `tests/api/security-vulnerabilities.test.ts` - API security tests

#### Coverage Areas
- SQL injection prevention
- XSS attack prevention
- CSRF protection
- Authentication security
- Audit log generation
- Input validation and sanitization

### 10. Performance & Load Tests

#### Purpose
Validates system performance under various load conditions and identifies bottlenecks.

#### Test Files
- `tests/performance/load-testing.test.ts` - Load testing scenarios
- `tests/performance/optimization-tests.test.ts` - Performance optimization tests
- `tests/backend/system-performance-monitoring.test.ts` - System performance monitoring

#### Coverage Areas
- Concurrent user load testing
- Database query performance
- API response times
- Memory and CPU usage
- Resource utilization tracking

### 11. Integration & End-to-End Tests

#### Purpose
Validates complete user workflows and cross-service communication.

#### Test Files
- `tests/e2e/end-to-end-workflows.test.ts` - Complete workflow tests
- `tests/integration/cross-service-integration.test.ts` - Service integration tests
- `tests/integration/service-communication.test.ts` - Communication tests

#### Coverage Areas
- Complete user journeys
- Frontend-backend integration
- External service integration
- Real-time features
- Cross-browser compatibility

## Test Data Management

### Test Data Factories

Located in `tests/fixtures/test-data.ts`, provides comprehensive test data generation:

```typescript
// User test data
export const createTestUser = (overrides?: Partial<TestUser>): TestUser => {
  return {
    id: faker.string.uuid(),
    username: faker.internet.userName(),
    email: faker.internet.email(),
    password: 'password123',
    role: 'user',
    ...overrides
  }
}

// Parcel test data
export const createTestParcelle = (overrides?: Partial<TestParcelle>): TestParcelle => {
  return {
    id: faker.string.uuid(),
    numero: faker.string.alphanumeric(8),
    transporteur: faker.company.name(),
    poids: faker.number.float({ min: 0.1, max: 100 }),
    prixAchat: faker.number.float({ min: 10, max: 1000 }),
    dateCreation: faker.date.recent(),
    ...overrides
  }
}
```

### Database Isolation

Each test suite uses isolated database instances:

- **API Tests**: Isolated test database with automatic cleanup
- **Backend Tests**: In-memory database with transaction rollback
- **UI Tests**: Dedicated test database with seeded data
- **Integration Tests**: Shared test database with careful cleanup

### Mock Data Management

Comprehensive mocking system in `tests/mocks/`:

- `auth.ts` - Authentication mocks
- `database.ts` - Database operation mocks
- `backend/service-mocks.ts` - Service layer mocks

## Test Execution Patterns

### Running Individual Test Suites

```bash
# Unit tests
npm run test

# Backend tests
npm run test:backend

# API tests
npm run test:api

# UI tests
npm run test:puppeteer

# E2E tests
npm run test:e2e

# Performance tests
npm run test:performance

# Security tests
npm run test:security
```

### Running Specific Test Categories

```bash
# Authentication tests
npm run test:backend -- --testPathPattern=auth
npm run test:api -- --testPathPattern=auth
npm run test:puppeteer -- --testPathPattern=auth

# Parcel management tests
npm run test:backend -- --testPathPattern=parcelles
npm run test:api -- --testPathPattern=parcelles

# Market analysis tests
npm run test:backend -- --testPathPattern=market-analysis
npm run test:integration -- --testPathPattern=vinted
```

### Debug Mode Execution

```bash
# Enable debug output
DEBUG_TESTS=true npm run test:backend

# Run with verbose logging
npm run test:backend -- --verbose

# Run single test file
npm run test:backend -- tests/backend/auth-services.test.ts

# Run specific test pattern
npm run test:backend -- --testNamePattern="should validate credentials"
```

## Test Configuration

### Environment Configuration

Test environments are configured in:

- `vitest.config.ts` - Vitest configuration
- `jest.backend.config.js` - Jest backend configuration
- `tests/puppeteer/config.ts` - Puppeteer configuration
- `playwright.config.ts` - Playwright configuration

### Database Configuration

```typescript
// Test database setup
export const setupTestDatabase = async (): Promise<Database> => {
  const db = new Database(':memory:')
  await initializeSchema(db)
  await seedTestData(db)
  return db
}
```

### Authentication Configuration

```typescript
// Test authentication setup
export class AuthHelper {
  async createTestUser(): Promise<TestUser> {
    const user = createTestUser()
    await this.registerUser(user)
    return user
  }

  async loginAsTestUser(): Promise<AuthSession> {
    const user = await this.createTestUser()
    return await this.login(user.email, user.password)
  }
}
```

## Error Handling & Debugging

### Test Failure Analysis

When tests fail, the system provides:

1. **Detailed Error Messages**: Specific component, function, and line information
2. **Context Capture**: Request/response data, database state, DOM snapshots
3. **Screenshot Capture**: Visual evidence of UI test failures
4. **Log Aggregation**: Console logs, network activity, error traces

### Common Failure Patterns

#### Database Connection Issues
```bash
# Symptoms: Connection timeout, database locked
# Solution: Check database isolation setup
npm run test:backend -- --testPathPattern=setup
```

#### Authentication Failures
```bash
# Symptoms: 401 Unauthorized, session expired
# Solution: Verify auth helper configuration
DEBUG_AUTH=true npm run test:api -- --testPathPattern=auth
```

#### UI Test Timeouts
```bash
# Symptoms: Element not found, page load timeout
# Solution: Increase timeouts, check selectors
npm run test:puppeteer -- --timeout=30000
```

### Debug Utilities

```typescript
// Screenshot capture for failed UI tests
export const captureFailureScreenshot = async (page: Page, testName: string) => {
  const screenshot = await page.screenshot({
    path: `tests/screenshots/failures/${testName}-${Date.now()}.png`,
    fullPage: true
  })
  console.log(`Screenshot saved for failed test: ${testName}`)
}

// Database state inspection
export const inspectDatabaseState = async (db: Database, tableName: string) => {
  const rows = await db.all(`SELECT * FROM ${tableName}`)
  console.log(`Database state for ${tableName}:`, rows)
}
```

## Test Reporting

### Coverage Reports

Generated automatically with each test run:

- **Unit Test Coverage**: `coverage/unit/index.html`
- **Backend Test Coverage**: `coverage/backend/index.html`
- **Integration Coverage**: `coverage/integration/index.html`

### Test Result Reports

- **JUnit XML**: `test-results/junit.xml`
- **HTML Reports**: `test-results/html-report/index.html`
- **JSON Results**: `test-results/results.json`

### Performance Reports

- **Load Test Results**: `test-results/performance/load-test-report.html`
- **Performance Metrics**: `test-results/performance/metrics.json`
- **Bottleneck Analysis**: `test-results/performance/bottlenecks.md`

## Continuous Integration

### Pre-commit Hooks

```bash
# Runs before each commit
npm run test:quick          # Fast unit tests
npm run lint               # Code quality checks
npm run type-check         # TypeScript validation
```

### Pull Request Validation

```bash
# Runs on PR creation/update
npm run test:full          # Complete test suite
npm run test:security      # Security vulnerability tests
npm run test:performance   # Performance regression tests
```

### Nightly Test Runs

```bash
# Comprehensive nightly testing
npm run test:comprehensive # All test suites
npm run test:load         # Load testing
npm run test:e2e:full     # Complete E2E testing
```

## Best Practices

### Writing Effective Tests

1. **Test Isolation**: Each test should be independent and not rely on other tests
2. **Descriptive Names**: Use clear, descriptive test names that explain the scenario
3. **Arrange-Act-Assert**: Structure tests with clear setup, execution, and validation phases
4. **Mock External Dependencies**: Use mocks for external services and APIs
5. **Use Test Data Factories**: Generate consistent, realistic test data
6. **Clean Up Resources**: Always clean up databases, files, and connections

### Test Data Best Practices

1. **Use Factories**: Generate test data using factory functions
2. **Avoid Hard-coded Values**: Use dynamic data generation
3. **Test Edge Cases**: Include boundary conditions and error scenarios
4. **Maintain Data Consistency**: Ensure related data maintains referential integrity

### Performance Testing Best Practices

1. **Establish Baselines**: Record performance baselines for comparison
2. **Test Realistic Scenarios**: Use realistic user loads and data volumes
3. **Monitor Resource Usage**: Track CPU, memory, and database performance
4. **Identify Bottlenecks**: Focus on the slowest components first

### Security Testing Best Practices

1. **Test Input Validation**: Verify all inputs are properly sanitized
2. **Test Authentication**: Verify authentication cannot be bypassed
3. **Test Authorization**: Ensure users can only access authorized resources
4. **Test for Common Vulnerabilities**: Include OWASP Top 10 vulnerability tests

## Troubleshooting Guide

### Common Issues and Solutions

#### Test Database Issues

**Problem**: Database connection errors or locked database
```bash
# Solution: Reset test database
npm run db:reset:test
npm run test:backend -- --forceExit
```

**Problem**: Data persistence between tests
```bash
# Solution: Verify cleanup in test setup
npm run test:backend -- --testPathPattern=setup --verbose
```

#### Authentication Test Issues

**Problem**: Authentication failures in API tests
```bash
# Solution: Check auth helper configuration
DEBUG_AUTH=true npm run test:api -- --testPathPattern=auth
```

**Problem**: Session management issues
```bash
# Solution: Verify session cleanup
npm run test:backend -- --testPathPattern=session --verbose
```

#### UI Test Issues

**Problem**: Element not found errors
```bash
# Solution: Update selectors or increase timeouts
npm run test:puppeteer -- --timeout=30000 --verbose
```

**Problem**: Screenshot capture failures
```bash
# Solution: Check screenshot directory permissions
mkdir -p tests/screenshots/failures
chmod 755 tests/screenshots
```

#### Performance Test Issues

**Problem**: Performance tests timing out
```bash
# Solution: Increase test timeouts and check system resources
npm run test:performance -- --timeout=60000
```

**Problem**: Inconsistent performance results
```bash
# Solution: Run tests multiple times and average results
npm run test:performance -- --repeat=5
```

### Debug Commands Reference

```bash
# Run single test with debug output
DEBUG=* npm run test:backend -- tests/backend/auth-services.test.ts

# Run tests with specific pattern
npm run test:backend -- --testNamePattern="should validate"

# Run tests with coverage
npm run test:backend -- --coverage

# Run tests in watch mode
npm run test:backend -- --watch

# Run tests with verbose output
npm run test:backend -- --verbose

# Force exit after tests (useful for hanging tests)
npm run test:backend -- --forceExit

# Run tests with specific timeout
npm run test:backend -- --timeout=30000
```

## Contributing to Tests

### Adding New Test Suites

1. **Choose Appropriate Framework**: Select the right testing framework for your needs
2. **Follow Naming Conventions**: Use descriptive file names and test descriptions
3. **Use Existing Patterns**: Follow established patterns for setup, mocking, and assertions
4. **Add Documentation**: Document new test suites in this file
5. **Update CI/CD**: Ensure new tests are included in automated runs

### Modifying Existing Tests

1. **Understand Test Purpose**: Review existing test documentation
2. **Maintain Backward Compatibility**: Ensure changes don't break existing functionality
3. **Update Related Tests**: Modify related tests if necessary
4. **Run Full Test Suite**: Verify all tests still pass
5. **Update Documentation**: Update documentation for any changes

### Test Review Checklist

- [ ] Tests are isolated and independent
- [ ] Test names are descriptive and clear
- [ ] Appropriate mocking is used
- [ ] Edge cases are covered
- [ ] Error scenarios are tested
- [ ] Performance impact is considered
- [ ] Documentation is updated
- [ ] CI/CD integration works correctly

This comprehensive documentation provides detailed information about all test suites, their purposes, execution patterns, and troubleshooting guidance. Use this as a reference for understanding, maintaining, and extending the LogistiX testing infrastructure.
## Qui
ck Start Guide

### Prerequisites
- JavaScript/TypeScript fundamentals
- Node.js and npm
- Basic understanding of testing concepts
- Familiarity with SQL databases
- Basic command line usage

### Environment Setup
```bash
# Clone and install dependencies
npm install

# Set up test environment
cp .env.local.example .env.local
echo "NODE_ENV=test" >> .env.test.local

# Run health check
npm run test:health
```

### First Test Run
```bash
# Unit tests (fastest)
npm run test

# Backend tests
npm run test:backend

# API tests
npm run test:api

# UI tests (slowest)
npm run test:puppeteer
```

## Troubleshooting Quick Reference

### Common Issues
1. **Database locked**: `pkill -f "npm.*test" && npm run db:reset:test`
2. **Auth failures**: `DEBUG_AUTH=true npm run test:api -- --testPathPattern=auth`
3. **UI timeouts**: `npm run test:puppeteer -- --timeout=30000`
4. **Port conflicts**: `TEST_PORT=3001 npm run test:api`

### Debug Commands
```bash
# Health check
npm run test:health

# Debug specific test
DEBUG=* npm run test:backend -- specific-test.ts

# Run with verbose output
npm run test:backend -- --verbose
```

## Best Practices Summary

1. **Test Independence**: Each test should be completely independent
2. **Descriptive Names**: Use clear, descriptive test names
3. **Arrange-Act-Assert**: Structure tests with clear phases
4. **Mock External Dependencies**: Use mocks for external services
5. **Clean Up Resources**: Always clean up databases and connections
6. **Test Error Scenarios**: Include failure and edge cases