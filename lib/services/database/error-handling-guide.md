# Database Error Handling and Retry Mechanisms

This document describes the comprehensive error handling and retry mechanisms implemented for the LogistiX database connection pool system.

## Overview

The enhanced error handling system provides:

- **Intelligent Error Categorization**: Automatically categorizes SQLite errors into appropriate response strategies
- **Advanced Retry Logic**: Different retry strategies based on error types with exponential/linear backoff
- **Circuit Breaker Pattern**: Prevents cascading failures by temporarily stopping operations when too many errors occur
- **Comprehensive Logging**: Detailed logging for debugging and monitoring

## Error Categories

### 1. Retryable Lock Errors (`RETRYABLE_LOCK`)
- **Errors**: `SQLITE_BUSY`, `SQLITE_LOCKED`, `SQLITE_PROTOCOL`
- **Strategy**: Exponential backoff retry
- **Max Attempts**: Configurable (default: 5)
- **Use Case**: Database is temporarily locked by another process

```typescript
// Example: Database busy error
const error = { code: 'SQLITE_BUSY', message: 'database is busy' };
// Will retry with exponential backoff: 500ms, 1s, 2s, 4s, 8s
```

### 2. Retryable I/O Errors (`RETRYABLE_IO`)
- **Errors**: `SQLITE_IOERR`, `SQLITE_INTERRUPT`
- **Strategy**: Linear backoff retry
- **Max Attempts**: 3
- **Use Case**: Temporary I/O issues or interruptions

```typescript
// Example: I/O error
const error = { code: 'SQLITE_IOERR', message: 'disk i/o error' };
// Will retry with linear backoff: 250ms, 500ms, 750ms
```

### 3. Retryable Resource Errors (`RETRYABLE_RESOURCE`)
- **Errors**: `SQLITE_NOMEM`, `SQLITE_FULL`
- **Strategy**: Exponential backoff retry
- **Max Attempts**: 2
- **Use Case**: System resource exhaustion

```typescript
// Example: Memory error
const error = { code: 'SQLITE_NOMEM', message: 'out of memory' };
// Will retry with exponential backoff: 1s, 2s
```

### 4. Critical Errors (`CRITICAL`)
- **Errors**: `SQLITE_CORRUPT`, `SQLITE_NOTADB`
- **Strategy**: Circuit breaker activation
- **Max Attempts**: 1
- **Use Case**: Database corruption or structural issues

```typescript
// Example: Corruption error
const error = { code: 'SQLITE_CORRUPT', message: 'database disk image is malformed' };
// Will trigger circuit breaker after 2 critical errors
```

### 5. Non-Retryable Errors (`NON_RETRYABLE`)
- **Errors**: `SQLITE_READONLY`, `SQLITE_CANTOPEN`, `SQLITE_PERM`
- **Strategy**: Fail fast
- **Max Attempts**: 0
- **Use Case**: Configuration or permission issues

```typescript
// Example: Permission error
const error = { code: 'SQLITE_READONLY', message: 'readonly database' };
// Will fail immediately without retry
```

## Retry Strategies

### Exponential Backoff
- **Formula**: `baseDelay * 2^(attempt-1)`
- **Jitter**: ±10% randomization to prevent thundering herd
- **Max Delay**: 10x base delay
- **Best For**: Lock contention, resource conflicts

### Linear Backoff
- **Formula**: `baseDelay * attempt`
- **Jitter**: ±10% randomization
- **Max Delay**: 10x base delay
- **Best For**: I/O errors, temporary interruptions

### Fixed Delay
- **Formula**: `baseDelay`
- **Jitter**: ±10% randomization
- **Best For**: Critical errors (limited retries)

## Circuit Breaker

The circuit breaker prevents cascading failures by monitoring error patterns and temporarily stopping operations when the system is unhealthy.

### States

#### CLOSED (Normal Operation)
- All operations are allowed
- Failures are counted
- Transitions to OPEN when failure threshold is reached

#### OPEN (Failure Mode)
- All operations are rejected immediately
- Transitions to HALF_OPEN after recovery timeout
- Prevents further damage to the system

#### HALF_OPEN (Recovery Testing)
- Limited operations are allowed to test system health
- Transitions to CLOSED after successful operations
- Returns to OPEN immediately on any failure

### Configuration

```typescript
const circuitBreaker = new CircuitBreaker(
  5,      // failureThreshold: Open after 5 failures
  60000,  // recoveryTimeout: 1 minute recovery period
  2       // successThreshold: 2 successes to close
);
```

### Critical Error Handling

Critical errors (like database corruption) have special handling:
- Immediately trigger circuit breaker after 2 critical errors
- Bypass normal failure counting
- Require manual intervention or system restart

## Usage Examples

### Basic Error Handling

```typescript
import { connectionPool } from './connection-pool';
import { errorHandler } from './error-handler';

try {
  const result = await connectionPool.executeWithConnection(
    (db) => db.prepare('SELECT * FROM users').all(),
    RequestType.READ,
    RequestPriority.NORMAL,
    'get-users'
  );
} catch (error) {
  const errorInfo = errorHandler.analyzeError(error, 'get-users');
  
  if (errorInfo.isCritical) {
    // Handle critical errors
    console.error('Critical database error:', errorInfo.message);
    // Notify administrators, trigger alerts, etc.
  } else if (errorInfo.isRetryable) {
    // Error was already retried by the connection pool
    console.warn('Database operation failed after retries:', errorInfo.message);
  } else {
    // Non-retryable error
    console.error('Database configuration error:', errorInfo.message);
  }
}
```

### Manual Retry with Error Analysis

```typescript
import { RetryManager } from './retry-manager';
import { errorHandler } from './error-handler';

const retryManager = new RetryManager(poolConfig);

const result = await retryManager.executeWithRetry(
  async () => {
    // Your database operation
    return await someDbOperation();
  },
  'custom-operation'
);

if (!result.success) {
  const errorInfo = errorHandler.analyzeError(result.error, 'custom-operation');
  const userMessage = errorHandler.generateUserMessage(errorInfo);
  
  // Show user-friendly message
  console.log(userMessage);
}
```

### Circuit Breaker Monitoring

```typescript
import { connectionPool } from './connection-pool';

// Get detailed statistics
const stats = connectionPool.getDetailedStats();

console.log('Circuit Breaker State:', stats.circuitBreaker.state);
console.log('Failures by Category:', stats.circuitBreaker.failuresByCategory);
console.log('Time Until Recovery:', stats.circuitBreaker.timeUntilRecovery);

// Check if system is healthy
const isHealthy = stats.circuitBreaker.state === 'CLOSED' && 
                  stats.circuitBreaker.consecutiveFailures === 0;

if (!isHealthy) {
  console.warn('Database system is not healthy');
  // Take appropriate action (alerts, fallback, etc.)
}
```

## Configuration

### Pool Configuration

```typescript
const poolConfig: PoolConfig = {
  maxConnections: 5,
  connectionTimeout: 30000,  // 30 seconds
  idleTimeout: 300000,       // 5 minutes
  retryAttempts: 5,          // Default retry attempts
  retryDelay: 500,           // Base delay in milliseconds
};
```

### Environment Variables

```bash
# Enable debug logging
DB_DEBUG=true

# Production mode (less verbose logging)
NODE_ENV=production
```

## Monitoring and Alerting

### Key Metrics to Monitor

1. **Circuit Breaker State**: Should be 'CLOSED' in normal operation
2. **Failure Rate**: High failure rates indicate system issues
3. **Critical Error Count**: Any critical errors require immediate attention
4. **Average Retry Attempts**: High retry counts indicate contention
5. **Connection Pool Utilization**: High utilization may require scaling

### Log Analysis

The system provides structured logging for easy analysis:

```json
{
  "level": "error",
  "message": "Critical database error: database disk image is malformed",
  "type": "SQLITE_CORRUPT",
  "category": "critical",
  "strategy": "circuit_break",
  "context": "user-query",
  "timestamp": "2025-01-08T15:30:00.000Z"
}
```

### Health Check Endpoint

```typescript
// Example health check implementation
app.get('/health/database', async (req, res) => {
  const stats = connectionPool.getDetailedStats();
  const isHealthy = await connectionPool.healthCheck();
  
  res.json({
    healthy: isHealthy,
    circuitBreakerState: stats.circuitBreaker.state,
    activeConnections: stats.pool.activeConnections,
    waitingRequests: stats.pool.waitingRequests,
    lastError: stats.circuitBreaker.lastFailureTime
  });
});
```

## Best Practices

### 1. Error Handling
- Always analyze errors using the `DatabaseErrorHandler`
- Provide user-friendly error messages
- Log errors with appropriate context
- Monitor critical errors closely

### 2. Retry Logic
- Don't implement custom retry logic - use the built-in mechanisms
- Set appropriate timeouts for operations
- Use context strings for better debugging

### 3. Circuit Breaker
- Monitor circuit breaker state in production
- Set up alerts for OPEN state
- Plan for graceful degradation when circuit is open

### 4. Performance
- Use appropriate request types (READ/WRITE/TRANSACTION)
- Set request priorities for critical operations
- Monitor connection pool utilization

### 5. Testing
- Test error scenarios in development
- Simulate database failures
- Verify circuit breaker behavior
- Test recovery scenarios

## Troubleshooting

### Common Issues

#### High Retry Rates
- **Cause**: Database contention, slow queries
- **Solution**: Optimize queries, increase connection pool size, check for long-running transactions

#### Circuit Breaker Frequently Open
- **Cause**: Underlying database issues, resource exhaustion
- **Solution**: Check database health, monitor system resources, review error logs

#### Critical Errors
- **Cause**: Database corruption, file system issues
- **Solution**: Check database integrity, verify file permissions, restore from backup if needed

#### Connection Timeouts
- **Cause**: Pool exhaustion, slow operations
- **Solution**: Increase pool size, optimize slow queries, check for connection leaks

### Debug Mode

Enable debug mode for detailed logging:

```bash
export DB_DEBUG=true
```

This will provide detailed information about:
- Retry attempts and delays
- Circuit breaker state changes
- Connection pool operations
- Error categorization decisions

## Migration Guide

If you're upgrading from the basic error handling system:

1. **Update imports**: Import from the new error handling modules
2. **Review error handling**: Update error handling code to use the new error analysis
3. **Configure monitoring**: Set up monitoring for the new metrics
4. **Test thoroughly**: Test all error scenarios with the new system
5. **Update documentation**: Update your application's error handling documentation

The new system is backward compatible, but you'll get better error handling by using the new APIs.