# Debug Logger Service Documentation

## Overview

The Debug Logger service provides comprehensive logging capabilities for the Vinted Market Analysis Validation system. It implements detailed logging with TRACE/DEBUG levels, full payload capture for API requests/responses, database operation tracking, and calculation step logging.

## Requirements Coverage

This implementation covers the following requirements:

- **4.2**: Activate debug mode when tests fail
- **4.3**: Generate exhaustive logs (TRACE/DEBUG) when debug mode is activated
- **4.4**: Log API requests, responses, database states, and calculation steps
- **4.5**: Provide comprehensive error details and debug report generation

## Features

### Core Capabilities

1. **Singleton Pattern**: Ensures single instance across the application
2. **Debug Mode Management**: Enable/disable detailed logging
3. **API Request/Response Logging**: Full payload capture with header sanitization
4. **Database Operation Logging**: Track all database operations with state information
5. **Calculation Step Logging**: Log market metrics processing steps
6. **Error Handling**: Comprehensive error, warning, and info logging
7. **Debug Report Generation**: Create detailed reports for troubleshooting
8. **Session Management**: Track statistics and manage log data
9. **Scoped Logging**: Create loggers with specific scopes for better organization
10. **Security**: Automatic sanitization of sensitive headers

### API Reference

#### Core Methods

```typescript
// Get singleton instance
const logger = DebugLogger.getInstance();

// Debug mode management
logger.enableDebugMode();
logger.disableDebugMode();
logger.isDebugMode(): boolean;

// API logging
logger.logApiRequest(request: ApiRequest);
logger.logApiResponse(response: ApiResponse, requestContext?: { method: string; url: string });

// Database logging
logger.logDatabaseOperation(operation: DatabaseOperation);

// Calculation logging
logger.logCalculation(calculation: CalculationStep);

// Error logging
logger.logError(message: string, error?: Error | unknown, context?: any);
logger.logWarning(message: string, context?: any);
logger.logInfo(message: string, context?: any);

// Report generation
logger.generateDebugReport(): DebugReport;
logger.exportDebugData(): string;

// Session management
logger.getSessionStats();
logger.clearLogs();

// Scoped logging
const scopedLogger = logger.createScopedLogger('SCOPE_NAME');
```

#### Type Definitions

```typescript
interface ApiRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: any;
}

interface ApiResponse {
  status: number;
  headers: Record<string, string>;
  body?: any;
  duration: number;
}

interface DatabaseOperation {
  operation: string;
  table: string;
  query: string;
  parameters?: any[];
  affectedRows: number;
  duration: number;
}

interface CalculationStep {
  step: string;
  input: any;
  output: any;
  duration: number;
}

interface DebugReport {
  timestamp: string;
  apiCalls: ApiCallLog[];
  databaseOperations: DatabaseOperationLog[];
  calculations: CalculationLog[];
  errors: ErrorLog[];
}
```

## Usage Examples

### Basic Usage

```typescript
import { debugLogger } from '@/lib/services/validation';

// Enable debug mode for detailed logging
debugLogger.enableDebugMode();

// Log API request
debugLogger.logApiRequest({
  method: 'GET',
  url: 'https://api.vinted.com/v2/catalog/items',
  headers: { 'Content-Type': 'application/json' },
  body: { search_text: 'airpods' }
});

// Log API response
debugLogger.logApiResponse({
  status: 200,
  headers: { 'Content-Type': 'application/json' },
  body: { items: [...] },
  duration: 150
}, { method: 'GET', url: 'https://api.vinted.com/v2/catalog/items' });

// Generate debug report
const report = debugLogger.generateDebugReport();
console.log('Debug Report:', report);
```

### Database Operation Logging

```typescript
// Log database operations
debugLogger.logDatabaseOperation({
  operation: 'INSERT',
  table: 'market_analysis',
  query: 'INSERT INTO market_analysis (product, price) VALUES (?, ?)',
  parameters: ['airpods', 75],
  affectedRows: 1,
  duration: 25
});
```

### Calculation Step Logging

```typescript
// Log calculation steps
debugLogger.logCalculation({
  step: 'price_average_calculation',
  input: { prices: [50, 75, 100] },
  output: { average: 75, median: 75 },
  duration: 5
});
```

### Error Handling

```typescript
try {
  // Some operation that might fail
  await performMarketAnalysis();
} catch (error) {
  debugLogger.logError('Market analysis failed', error, {
    product: 'airpods',
    timestamp: new Date().toISOString()
  });
}
```

### Scoped Logging

```typescript
// Create scoped logger for specific operations
const productTestLogger = debugLogger.createScopedLogger('PRODUCT_TEST');

productTestLogger.logInfo('Starting product test');
productTestLogger.logCalculation({
  step: 'validation',
  input: { expectedRange: { min: 50, max: 100 } },
  output: { result: 'PASS' },
  duration: 3
});
```

## Integration with Validation System

The Debug Logger integrates seamlessly with other validation components:

### With API Token Manager

```typescript
import { debugLogger } from '@/lib/services/validation';

class ApiTokenManager {
  async validateToken(token: string) {
    debugLogger.logInfo('Starting token validation');
    
    try {
      const response = await this.makeApiCall(token);
      debugLogger.logApiResponse(response);
      return { isValid: true };
    } catch (error) {
      debugLogger.logError('Token validation failed', error);
      return { isValid: false };
    }
  }
}
```

### With Product Test Suite

```typescript
class ProductTestSuite {
  async testProduct(productName: string) {
    const scopedLogger = debugLogger.createScopedLogger(`PRODUCT_${productName.toUpperCase()}`);
    
    scopedLogger.logInfo('Starting product test');
    
    // Log calculation steps
    scopedLogger.logCalculation({
      step: 'price_analysis',
      input: { product: productName },
      output: { priceRange: { min: 50, max: 100 } },
      duration: 100
    });
    
    return testResult;
  }
}
```

### With Database Integrity Checker

```typescript
class DatabaseIntegrityChecker {
  async checkPreDeletion(taskId: string) {
    debugLogger.logDatabaseOperation({
      operation: 'SELECT',
      table: 'market_analysis',
      query: 'SELECT COUNT(*) FROM market_analysis WHERE task_id = ?',
      parameters: [taskId],
      affectedRows: 1,
      duration: 15
    });
    
    return preDeletionState;
  }
}
```

## Security Features

### Header Sanitization

The Debug Logger automatically sanitizes sensitive headers:

```typescript
// Input headers
const headers = {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer secret-token',
  'X-API-Key': 'secret-key',
  'Cookie': 'session=secret'
};

// Logged headers (sanitized)
const sanitizedHeaders = {
  'Content-Type': 'application/json',
  'Authorization': '[REDACTED]',
  'X-API-Key': '[REDACTED]',
  'Cookie': '[REDACTED]'
};
```

### Sensitive Data Protection

- API tokens and keys are automatically redacted
- Cookie values are masked
- Custom sanitization for additional sensitive fields

## Performance Considerations

### Memory Management

- Logs are stored in memory during the session
- Use `clearLogs()` to free memory when needed
- Debug mode can be disabled to reduce overhead

### Efficient Logging

- Minimal performance impact when debug mode is disabled
- Asynchronous logging operations where possible
- Structured data for efficient processing

## Testing

The Debug Logger includes comprehensive unit tests covering:

- Singleton pattern implementation
- Debug mode management
- API request/response logging
- Database operation logging
- Calculation step logging
- Error handling
- Debug report generation
- Session management
- Scoped logging functionality
- Header sanitization

Run tests with:

```bash
npm test lib/services/validation/__tests__/debug-logger.test.ts
```

## Validation Scripts

### Validation Script

Run the validation script to verify implementation:

```bash
npx tsx lib/services/validation/debug-logger-validation.ts
```

### Demo Script

Run the demo script to see functionality in action:

```bash
npx tsx lib/services/validation/debug-logger-demo.ts
```

## Best Practices

### When to Enable Debug Mode

1. **Test Failures**: Automatically enable when validation tests fail
2. **Development**: Enable during development for detailed insights
3. **Troubleshooting**: Enable when investigating production issues
4. **Performance Analysis**: Use for analyzing API and database performance

### Logging Guidelines

1. **API Calls**: Always log both request and response
2. **Database Operations**: Include query, parameters, and timing
3. **Calculations**: Log input, output, and processing time
4. **Errors**: Include context and stack traces
5. **Scoped Logging**: Use scopes for better organization

### Memory Logs Management

1. **Clear Logs**: Regularly clear logs in long-running processes
2. **Debug Mode**: Disable debug mode in production unless needed
3. **Report Generation**: Generate reports periodically, not continuously
4. **Session Management**: Monitor session statistics

## Troubleshooting

### Common Issues

1. **Memory Usage**: High memory usage with debug mode enabled
   - Solution: Clear logs regularly or disable debug mode

2. **Performance Impact**: Slow performance with extensive logging
   - Solution: Use scoped logging and disable when not needed

3. **Missing Logs**: Logs not appearing in debug report
   - Solution: Ensure debug mode is enabled for detailed logging

4. **Sanitization Issues**: Sensitive data appearing in logs
   - Solution: Verify header sanitization is working correctly

### Debug Report Analysis

1. **API Performance**: Check API call durations and response times
2. **Database Efficiency**: Analyze database operation timing
3. **Calculation Performance**: Review calculation step durations
4. **Error Patterns**: Identify common error types and causes

## Future Enhancements

Potential improvements for future versions:

1. **Log Persistence**: Save logs to files or external storage
2. **Real-time Monitoring**: Stream logs to monitoring systems
3. **Advanced Filtering**: Filter logs by type, severity, or scope
4. **Performance Metrics**: Built-in performance analysis tools
5. **Custom Sanitization**: Configurable sanitization rules
6. **Log Rotation**: Automatic log rotation and archiving
