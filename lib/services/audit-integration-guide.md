# User Action and Audit Logging Integration Guide

This guide explains how to integrate the comprehensive user action and audit logging system into your LogistiX application.

## Overview

The audit logging system consists of several integrated components:

1. **User Action Audit Middleware** - Tracks all user interactions
2. **Performance Metrics Collection** - Monitors system performance
3. **Error Tracking** - Captures and analyzes errors with detailed stack traces
4. **Comprehensive Audit Logging** - Integrates all systems together

## Quick Start

### 1. Basic API Route Integration

For most API routes, simply wrap your handler with the comprehensive audit logging middleware:

```typescript
import { withComprehensiveAuditLogging } from '@/lib/middlewares/comprehensive-audit-logging';

async function myApiHandler(request: NextRequest): Promise<NextResponse> {
  // Your existing API logic
  return NextResponse.json({ success: true });
}

export const POST = withComprehensiveAuditLogging(myApiHandler);
```

### 2. Authentication Routes

For authentication-related routes (login, logout), use the specialized middleware:

```typescript
import { withAuthenticationAuditLogging } from '@/lib/middlewares/comprehensive-audit-logging';

async function loginHandler(request: NextRequest): Promise<NextResponse> {
  // Your login logic
  return NextResponse.json({ success: true, userId: 'user123' });
}

export const POST = withAuthenticationAuditLogging(loginHandler);
```

### 3. Data Access Routes

For routes that handle sensitive data operations, use the data access middleware:

```typescript
import { withDataAccessAuditLogging } from '@/lib/middlewares/comprehensive-audit-logging';

async function userDataHandler(request: NextRequest): Promise<NextResponse> {
  // Your data handling logic
  return NextResponse.json({ data: userData });
}

export const GET = withDataAccessAuditLogging('users', userDataHandler);
export const POST = withDataAccessAuditLogging('users', userDataHandler);
```

## Service Layer Integration

### 1. Service Method Decoration

Use decorators to automatically log service method calls:

```typescript
import { auditUserActionMethod } from '@/lib/middlewares/user-action-audit';
import { monitorPerformance } from '@/lib/services/performance-metrics';
import { withErrorTracking } from '@/lib/services/error-tracking';

class UserService {
  @auditUserActionMethod('users', 'create_user')
  @monitorPerformance('user_service_create')
  @withErrorTracking('user_creation')
  async createUser(userData: any, userId: string): Promise<User> {
    // Your service logic
    return newUser;
  }
}
```

### 2. Manual Logging

For more control, use the logging services directly:

```typescript
import { 
  logUserAction, 
  logDataAccessEvent,
  recordOperationDuration,
  trackError 
} from '@/lib/middlewares/comprehensive-audit-logging';

class ProductService {
  async updateProduct(productId: string, updates: any, userId: string): Promise<Product> {
    const startTime = Date.now();
    
    try {
      // Log data access
      await logDataAccessEvent(
        {
          userId,
          sessionId: 'session123',
          requestId: 'req123',
          timestamp: new Date()
        },
        'update',
        'products',
        productId,
        {
          fields: Object.keys(updates),
          newValues: updates
        }
      );

      // Your business logic
      const updatedProduct = await this.repository.update(productId, updates);
      
      // Record performance
      recordOperationDuration('product_update', Date.now() - startTime, {
        userId,
        metadata: { productId, fieldCount: Object.keys(updates).length }
      });

      return updatedProduct;
    } catch (error) {
      // Track error
      await trackError(error, { userId }, { 
        operation: 'product_update',
        productId,
        updates: Object.keys(updates)
      });
      throw error;
    }
  }
}
```

## Database Integration

### 1. Database Operation Logging

Wrap database operations to automatically log queries and performance:

```typescript
import { withDatabaseOperationLogging } from '@/lib/middlewares/enhanced-request-logging';
import { recordDatabaseOperation } from '@/lib/services/performance-metrics';

class DatabaseService {
  async executeQuery(query: string, params: any[]): Promise<any> {
    const startTime = Date.now();
    
    try {
      const result = await this.db.query(query, params);
      const duration = Date.now() - startTime;
      
      // Record database metrics
      recordDatabaseOperation('select', duration, {
        table: this.extractTableName(query),
        rowCount: result.length,
        queryLength: query.length
      });
      
      return result;
    } catch (error) {
      await trackDatabaseError(error, {
        query,
        params,
        operation: 'select',
        table: this.extractTableName(query)
      });
      throw error;
    }
  }
}
```

## Performance Monitoring

### 1. Custom Metrics

Record custom performance metrics:

```typescript
import { performanceMetrics } from '@/lib/services/performance-metrics';

// Record a custom metric
performanceMetrics.recordMetric('custom_operation_count', 1, 'count', {
  operation: 'data_export',
  format: 'csv'
});

// Record operation duration
performanceMetrics.recordOperationDuration('file_upload', 1500, {
  userId: 'user123',
  metadata: { fileSize: 1024000, fileType: 'image' }
});

// Record memory usage
performanceMetrics.recordMemoryUsage({ operation: 'bulk_import' });
```

### 2. Performance Thresholds

Set custom performance thresholds:

```typescript
import { performanceMetrics } from '@/lib/services/performance-metrics';

// Set custom thresholds for specific operations
performanceMetrics.setThreshold('file_upload', 2000, 10000, 'ms');
performanceMetrics.setThreshold('data_export', 5000, 30000, 'ms');
```

## Error Tracking

### 1. Comprehensive Error Tracking

Track errors with full context:

```typescript
import { trackError, trackApiError } from '@/lib/services/error-tracking';

try {
  // Your code that might throw
  await riskyOperation();
} catch (error) {
  // Track with context
  const errorId = await trackError(error, {
    userId: 'user123',
    sessionId: 'session456',
    ip: '192.168.1.1',
    userAgent: 'Mozilla/5.0...'
  }, {
    operation: 'risky_operation',
    additionalData: 'context'
  });
  
  console.log(`Error tracked with ID: ${errorId}`);
  throw error;
}
```

### 2. Global Error Handling

The system automatically sets up global error handlers, but you can customize them:

```typescript
import { setupGlobalErrorHandling } from '@/lib/services/error-tracking';

// This is called automatically, but you can call it manually if needed
setupGlobalErrorHandling();
```

## Authentication Events

### 1. Login/Logout Tracking

```typescript
import { logAuthenticationEvent } from '@/lib/services/user-action-logger';

// Log successful login
await logAuthenticationEvent(
  'login',
  {
    userId: 'user123',
    sessionId: 'session456',
    ip: '192.168.1.1',
    userAgent: 'Mozilla/5.0...',
    timestamp: new Date()
  },
  {
    method: 'password',
    provider: 'local'
  }
);

// Log failed login
await logAuthenticationEvent(
  'login_failed',
  {
    userId: 'unknown',
    ip: '192.168.1.1',
    userAgent: 'Mozilla/5.0...',
    timestamp: new Date()
  },
  {
    reason: 'Invalid password',
    method: 'password',
    provider: 'local'
  }
);
```

## Monitoring and Analytics

### 1. Get Performance Summary

```typescript
import { performanceMetrics } from '@/lib/services/performance-metrics';

const summary = performanceMetrics.getPerformanceSummary(
  new Date(Date.now() - 3600000), // Last hour
  new Date()
);

console.log('Performance Summary:', summary);
```

### 2. Get User Activity

```typescript
import { userActionLogger } from '@/lib/services/user-action-logger';

const activity = userActionLogger.getUserActivitySummary(
  'user123',
  {
    start: new Date(Date.now() - 86400000), // Last 24 hours
    end: new Date()
  }
);

console.log('User Activity:', activity);
```

### 3. Export Metrics

```typescript
import { performanceMetrics } from '@/lib/services/performance-metrics';

// Export as JSON
const jsonMetrics = performanceMetrics.exportMetrics('json');

// Export as Prometheus format
const prometheusMetrics = performanceMetrics.exportMetrics('prometheus');
```

## Configuration

### 1. Environment Variables

Set these environment variables for optimal configuration:

```env
# Logging level
LOG_LEVEL=info

# Application version for error tracking
APP_VERSION=1.0.0

# Environment for context
NODE_ENV=production
```

### 2. Log File Locations

Logs are automatically written to:
- `logs/application-YYYY-MM-DD.log` - General application logs
- `logs/error-YYYY-MM-DD.log` - Error logs only
- `logs/performance-YYYY-MM-DD.log` - Performance metrics
- `logs/http-YYYY-MM-DD.log` - HTTP request logs

## Best Practices

1. **Always use middleware** - Wrap API routes with appropriate middleware for automatic logging
2. **Include context** - Always provide user ID, session ID, and request ID when available
3. **Sanitize sensitive data** - The system automatically sanitizes passwords and tokens
4. **Monitor performance** - Set appropriate thresholds for your operations
5. **Review logs regularly** - Use the analytics functions to monitor system health
6. **Handle errors gracefully** - Let the error tracking system capture details while handling errors appropriately

## Troubleshooting

### Common Issues

1. **Missing user context** - Ensure your authentication system provides user ID in requests
2. **Performance overhead** - Adjust log levels and disable verbose logging in production
3. **Log file size** - The system automatically rotates logs, but monitor disk space
4. **Memory usage** - The system keeps recent metrics in memory; adjust limits if needed

### Debug Mode

Enable debug logging to see detailed information:

```env
LOG_LEVEL=debug
```

This will provide verbose logging for troubleshooting integration issues.