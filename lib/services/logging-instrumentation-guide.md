# Service-Level Logging Instrumentation Guide

This document explains the comprehensive service-level logging instrumentation implemented for the LogistiX application.

## Overview

The logging instrumentation provides:
- **Detailed operation logging** for all service classes
- **Database query logging** with performance metrics
- **API request/response logging** middleware
- **User action audit logging**
- **Performance monitoring** and slow operation detection
- **Security event logging**

## Components

### 1. Core Logging Infrastructure

#### Specialized Loggers (`lib/utils/logging/specialized-loggers.ts`)
- `databaseLogger` - Database operations
- `apiLogger` - API requests/responses
- `authLogger` - Authentication operations
- `marketAnalysisLogger` - Market analysis operations
- `vintedLogger` - Vinted integration
- `performanceLogger` - Performance metrics
- `securityLogger` - Security events

#### Performance Timer (`lib/utils/logging/specialized-loggers.ts`)
```typescript
const timer = new PerformanceTimer('OPERATION_NAME', logger);
// ... operation execution ...
const duration = timer.end({ metadata });
```

### 2. Service Instrumentation

#### Database Service Instrumentation (`lib/services/logging-instrumentation.ts`)
```typescript
// Instrument database queries
DatabaseServiceInstrumentation.instrumentQuery(
  'queryName',
  () => executeQuery(),
  sqlQuery
);

// Instrument transactions
DatabaseServiceInstrumentation.instrumentTransaction(
  'transactionName',
  () => executeTransaction()
);
```

#### Authentication Service Instrumentation
```typescript
// Instrument login operations
AuthServiceInstrumentation.instrumentLogin(
  loginFunction,
  credentials
);

// Log logout events
AuthServiceInstrumentation.instrumentLogout(userId, sessionId);
```

#### Market Analysis Instrumentation
```typescript
// Instrument analysis operations
MarketAnalysisInstrumentation.instrumentAnalysis(
  'analysisType',
  analysisFunction,
  parameters
);
```

#### Vinted Integration Instrumentation
```typescript
// Instrument API calls
VintedIntegrationInstrumentation.instrumentApiCall(
  endpoint,
  method,
  apiFunction,
  payload
);
```

### 3. Comprehensive Service Instrumentation

#### Service Class Decorator (`lib/services/comprehensive-service-instrumentation.ts`)
```typescript
@ServiceClass('serviceName', 'serviceType')
class MyService {
  async myMethod() {
    // Automatically instrumented
  }
}
```

#### Method Decorator
```typescript
class MyService {
  @ServiceMethod('serviceName', 'serviceType')
  async myMethod() {
    // Automatically instrumented
  }
}
```

#### Manual Instrumentation
```typescript
const result = await serviceInstrumentation.instrumentOperation(
  {
    serviceName: 'myService',
    operationName: 'myOperation',
    userId: 'user123',
    sessionId: 'session456',
    metadata: { key: 'value' }
  },
  () => performOperation(),
  'api'
);
```

### 4. API Request/Response Logging

#### Enhanced Request Logging Middleware (`lib/middlewares/enhanced-request-logging.ts`)
```typescript
// Apply to API routes
export const POST = withEnhancedRequestLogging(handler);
export const GET = withEnhancedRequestLogging(handler);
```

Features:
- Request/response timing
- Request body logging (with sanitization)
- Response size tracking
- User context extraction
- Error logging with stack traces
- Audit trail integration

### 5. Database Query Logging

#### Enhanced Database Query Logger (`lib/services/database/enhanced-query-logging.ts`)
```typescript
// Log individual queries
await enhancedDbQueryLogger.logQuery(
  query,
  params,
  {
    operation: 'getUserById',
    userId: 'user123',
    context: 'authentication'
  },
  () => executeQuery()
);

// Log transactions
await enhancedDbQueryLogger.logTransaction(
  'createUserWithProfile',
  context,
  async (transactionId) => {
    // Execute multiple queries
  }
);
```

Features:
- Query performance metrics
- Parameter sanitization
- Slow query detection
- Transaction logging
- Connection event logging

### 6. Audit Logging

#### User Action Logging (`lib/services/audit-logger.ts`)
```typescript
// Log user actions
await auditLogger.logUserAction(
  userId,
  {
    action: 'CREATE_PRODUCT',
    resource: 'products',
    resourceId: 'product123',
    details: { name: 'Product Name' }
  },
  {
    sessionId: 'session456',
    ip: '192.168.1.1',
    userAgent: 'Mozilla/5.0...'
  }
);

// Log security events
await auditLogger.logSecurityEvent(
  {
    type: 'failed_login',
    severity: 'medium',
    details: { reason: 'invalid_password' }
  },
  { userId, ip, userAgent }
);
```

## Implementation Examples

### 1. Instrumented Database Service

The database service (`lib/services/database/db.ts`) has been enhanced with:
- Query instrumentation for all operations
- Transaction logging
- Performance metrics
- Error tracking

### 2. Instrumented Authentication Service

The auth service (`lib/services/auth/auth.ts`) includes:
- Login attempt logging
- Session creation tracking
- Security event logging
- Performance monitoring

### 3. Enhanced API Route Example

See `app/api/v1/auth/login/enhanced-route.ts` for a complete example of:
- Request/response logging
- Service operation instrumentation
- Audit trail integration
- Security event logging

## Configuration

### Log Levels
- `error` - Errors and failures
- `warn` - Warnings and slow operations
- `info` - General information and successful operations
- `http` - HTTP requests and responses
- `debug` - Detailed debugging information

### Performance Thresholds
- Database queries > 1000ms logged as slow
- API requests > 1000ms logged as slow
- Automatic performance event logging

### Security Events
- Login attempts (successful/failed)
- Permission denied events
- Suspicious activity detection
- Password changes

## Monitoring and Metrics

### Available Metrics
- Operation success/failure rates
- Average response times
- Slow operation detection
- Error rates by service
- User activity patterns

### Log Files
- `logs/application-YYYY-MM-DD.log` - General application logs
- `logs/error-YYYY-MM-DD.log` - Error logs only
- `logs/performance-YYYY-MM-DD.log` - Performance metrics
- `logs/http-YYYY-MM-DD.log` - HTTP request/response logs

## Best Practices

### 1. Service Implementation
- Use appropriate service type for instrumentation
- Include relevant metadata in operations
- Handle errors gracefully with proper logging

### 2. API Routes
- Apply enhanced request logging middleware
- Extract user context when available
- Log security-relevant events

### 3. Database Operations
- Use descriptive operation names
- Include user context in queries
- Monitor transaction performance

### 4. Security
- Sanitize sensitive data in logs
- Log authentication events
- Monitor for suspicious patterns

## Usage Guidelines

### Adding Instrumentation to New Services

1. **Choose the appropriate instrumentation method:**
   - Use decorators for class-based services
   - Use manual instrumentation for functional services
   - Apply middleware for API routes

2. **Include relevant context:**
   - User ID when available
   - Session ID for user actions
   - Request ID for tracing
   - Relevant metadata

3. **Handle errors properly:**
   - Log errors with full context
   - Include stack traces for debugging
   - Maintain audit trail for failures

### Monitoring Performance

1. **Set appropriate thresholds:**
   - Database queries: 1000ms
   - API requests: 1000ms
   - Custom operations: as needed

2. **Monitor key metrics:**
   - Success/failure rates
   - Average response times
   - Error patterns
   - User activity

3. **Review logs regularly:**
   - Check for slow operations
   - Monitor error trends
   - Analyze security events

This comprehensive instrumentation provides full visibility into application operations, performance, and security events while maintaining data privacy and system performance.