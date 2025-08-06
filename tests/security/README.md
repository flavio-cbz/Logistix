# Security Testing Suite

This directory contains comprehensive security vulnerability tests and audit validation tests for the LogistiX application.

## Overview

The security testing suite implements comprehensive security testing across multiple categories:

1. **SQL Injection Prevention Tests** - Tests all endpoints for SQL injection vulnerabilities
2. **XSS Attack Prevention Tests** - Validates input sanitization and output encoding
3. **CSRF Protection Validation Tests** - Ensures proper CSRF protection implementation
4. **Authentication Bypass Attempts Tests** - Tests for authentication vulnerabilities
5. **Authorization Boundary Enforcement Tests** - Validates access control mechanisms
6. **Input Validation and Sanitization Tests** - Tests input validation across all endpoints
7. **Rate Limiting and DoS Protection Tests** - Validates rate limiting implementation
8. **Session Security Tests** - Tests session management security
9. **Audit and Validation Tests** - Comprehensive audit logging and compliance testing

## Test Files

### Core Security Tests

- **`vulnerability-tests.test.ts`** - Main security vulnerability testing suite
- **`audit-validation-tests.test.ts`** - Audit logging and compliance testing
- **`security-test-utils.ts`** - Utility functions and security test payloads
- **`security-config.ts`** - Configuration for security testing

### Test Structure

```
tests/security/
├── vulnerability-tests.test.ts      # Main security vulnerability tests
├── audit-validation-tests.test.ts   # Audit and compliance tests
├── security-test-utils.ts           # Security testing utilities
├── security-config.ts               # Security test configuration
└── README.md                        # This documentation
```

## Security Test Categories

### 1. SQL Injection Prevention Tests

Tests all API endpoints for SQL injection vulnerabilities using various payloads:

- Table drop attempts (`'; DROP TABLE users; --`)
- Authentication bypass (`' OR '1'='1' --`)
- Data extraction (`' UNION SELECT * FROM users --`)
- Privilege escalation (`'; UPDATE users SET role = 'admin'; --`)

**Endpoints Tested:**
- Authentication endpoints (`/api/v1/auth/login`)
- Parcel management (`/api/v1/parcelles`)
- Product management (`/api/v1/produits`)
- Search functionality (`/api/v1/search/global`)

### 2. XSS Attack Prevention Tests

Validates proper input sanitization and output encoding:

- Basic script injection (`<script>alert("xss")</script>`)
- Event handler injection (`<img src="x" onerror="alert('xss')" />`)
- JavaScript protocol (`javascript:alert("xss")`)
- Complex XSS payloads

**Areas Tested:**
- User profile updates
- Form inputs
- API responses
- Error messages

### 3. CSRF Protection Validation Tests

Ensures proper Cross-Site Request Forgery protection:

- Origin header validation
- Referer header checking
- CSRF token validation
- Same-origin policy enforcement

### 4. Authentication Bypass Attempts Tests

Tests for authentication vulnerabilities:

- Session token manipulation
- JWT token tampering
- Password reset token manipulation
- Privilege escalation attempts

### 5. Authorization Boundary Enforcement Tests

Validates access control mechanisms:

- User data access boundaries
- Role-based access control (RBAC)
- Horizontal privilege escalation prevention
- Vertical privilege escalation prevention

### 6. Input Validation and Sanitization Tests

Comprehensive input validation testing:

- File upload security
- Numeric input boundary conditions
- String length validation
- Special character handling

### 7. Rate Limiting and DoS Protection Tests

Tests for denial-of-service protection:

- Authentication attempt rate limiting
- API endpoint rate limiting
- Large payload protection
- Concurrent request handling

### 8. Session Security Tests

Session management security validation:

- Secure session attributes (HttpOnly, Secure, SameSite)
- Session fixation prevention
- Concurrent session limits
- Session timeout handling

## Audit and Validation Tests

### Complete Audit Log Generation and Storage

Tests comprehensive audit logging:

- User authentication events
- Data modification tracking
- Administrative actions
- Security events and violations
- Data export/import activities
- Audit log integrity and immutability

### User Action Traceability and Reporting

Validates user activity tracking:

- Complete session activity traces
- User activity report generation
- Data access pattern analysis
- Suspicious behavior detection
- Compliance reporting

### Security Report Generation and Analysis

Tests security monitoring capabilities:

- Security incident report generation
- Security trend analysis
- Automated security alerts
- Security metrics and KPIs

## Security Test Utilities

### SecurityTestAnalyzer

Provides analysis methods for different vulnerability types:

- `analyzeSQLInjection()` - Analyzes responses for SQL injection indicators
- `analyzeXSS()` - Checks for XSS vulnerabilities in responses
- `analyzePathTraversal()` - Detects path traversal vulnerabilities
- `analyzeCommandInjection()` - Identifies command injection risks

### RateLimitTester

Utilities for testing rate limiting:

- `testRateLimit()` - Tests endpoint rate limiting effectiveness

### SessionSecurityTester

Session security testing utilities:

- `testSessionFixation()` - Tests for session fixation vulnerabilities
- `testSessionCookieSecurity()` - Validates session cookie security attributes

### InputValidationTester

Input validation testing utilities:

- `generateBoundaryValues()` - Creates boundary value test cases
- `generateMaliciousFileTests()` - Creates malicious file upload tests

## Security Test Payloads

### SQL Injection Payloads

- Table manipulation attempts
- Authentication bypass attempts
- Data extraction attempts
- Privilege escalation attempts

### XSS Payloads

- Script tag injection
- Event handler injection
- JavaScript protocol injection
- Attribute escape attempts

### Path Traversal Payloads

- Unix file system traversal
- Windows file system traversal
- URL encoded traversal
- Double encoding attempts

### Command Injection Payloads

- Unix command injection
- Windows command injection
- Pipe command injection
- Command substitution injection

## Configuration

### Security Test Configuration

The `security-config.ts` file provides comprehensive configuration:

- **Endpoints**: All API endpoints with their security test requirements
- **Authentication**: Test credentials and session configuration
- **Rate Limiting**: Rate limit testing parameters
- **Payload Sets**: Enabled/disabled payload categories
- **Reporting**: Test report generation settings

### Environment-Specific Configuration

Different configurations for different environments:

- **Development**: Aggressive testing with all payloads
- **Staging**: Full testing for pre-production validation
- **Production**: Conservative testing to avoid disruption

## Running Security Tests

### Individual Test Suites

```bash
# Run vulnerability tests
npm run test -- tests/security/vulnerability-tests.test.ts

# Run audit validation tests
npm run test -- tests/security/audit-validation-tests.test.ts
```

### All Security Tests

```bash
# Run all security tests
npm run test -- tests/security/
```

### With Coverage

```bash
# Run security tests with coverage
npm run test:coverage -- tests/security/
```

## Security Test Reports

### Report Generation

Security tests generate comprehensive reports including:

- **Summary**: Total tests, vulnerabilities found, severity breakdown
- **Vulnerabilities**: Detailed vulnerability information
- **Recommendations**: Security improvement recommendations

### Report Formats

- **JSON**: Machine-readable format for CI/CD integration
- **HTML**: Human-readable format for manual review
- **XML**: Compatible with security scanning tools

## Integration with CI/CD

### Automated Security Testing

Security tests are designed to integrate with CI/CD pipelines:

- **Pre-commit hooks**: Run critical security tests before commits
- **Pull request validation**: Full security test suite on PRs
- **Nightly builds**: Comprehensive security scanning
- **Production monitoring**: Synthetic security tests

### Security Gates

Security tests can act as quality gates:

- **Critical vulnerabilities**: Block deployment
- **High vulnerabilities**: Require manual approval
- **Medium/Low vulnerabilities**: Generate warnings

## OWASP Top 10 Mapping

Tests are mapped to OWASP Top 10 categories:

- **A01:2021 – Broken Access Control**: Authorization tests
- **A03:2021 – Injection**: SQL injection, XSS, command injection tests
- **A04:2021 – Insecure Design**: Rate limiting, file upload tests
- **A07:2021 – Identification and Authentication Failures**: Authentication tests

## Security Headers Validation

Tests validate security headers:

- **Content-Security-Policy**: CSP header presence and configuration
- **X-Frame-Options**: Clickjacking protection
- **X-Content-Type-Options**: MIME type sniffing protection
- **X-XSS-Protection**: XSS protection header
- **Strict-Transport-Security**: HSTS header
- **Referrer-Policy**: Referrer policy configuration

## Best Practices

### Test Development

1. **Comprehensive Coverage**: Test all endpoints and input vectors
2. **Realistic Payloads**: Use real-world attack patterns
3. **False Positive Handling**: Minimize false positives in detection
4. **Performance Impact**: Consider test performance impact

### Security Testing

1. **Regular Execution**: Run security tests regularly
2. **Environment Isolation**: Use isolated test environments
3. **Data Protection**: Protect test data and credentials
4. **Result Analysis**: Regularly analyze and act on results

### Compliance

1. **Audit Logging**: Ensure comprehensive audit logging
2. **Data Retention**: Maintain audit logs per compliance requirements
3. **Access Control**: Implement proper access controls
4. **Incident Response**: Have incident response procedures

## Troubleshooting

### Common Issues

1. **Test Setup Failures**: Check database and server configuration
2. **False Positives**: Review payload detection logic
3. **Performance Issues**: Optimize test execution
4. **Environment Issues**: Verify test environment setup

### Debug Mode

Enable debug mode for detailed test output:

```bash
DEBUG_TESTS=true npm run test -- tests/security/
```

## Contributing

When adding new security tests:

1. **Follow Patterns**: Use existing test patterns and utilities
2. **Document Tests**: Add comprehensive documentation
3. **Update Configuration**: Update security configuration as needed
4. **Test Coverage**: Ensure comprehensive test coverage
5. **Performance**: Consider test performance impact

## Security Considerations

### Test Data

- Use realistic but safe test data
- Avoid actual sensitive information
- Clean up test data after execution

### Test Environment

- Use isolated test environments
- Protect test credentials
- Monitor test execution

### Result Handling

- Secure test result storage
- Limit access to security test results
- Regular cleanup of old results