# Unified Monitoring System

A comprehensive monitoring solution for the Logistix application that provides performance metrics, structured logging, health checks, and alerting capabilities.

## Features

- **Performance Monitoring**: Track response times, throughput, error rates, and system resources
- **Structured Logging**: Centralized logging with multiple levels and context correlation
- **Health Checks**: Automated system health monitoring with configurable checks
- **Alerting System**: Real-time alerts for critical issues with multiple severity levels
- **Metrics Collection**: Critical system metrics with trend analysis
- **API Endpoints**: RESTful APIs for accessing monitoring data
- **Dashboard Support**: Ready-to-use dashboard data aggregation

## Quick Start

### Basic Setup

```typescript
import { initializeMonitoring, getUnifiedMonitoring } from '@/lib/monitoring';

// Initialize with default configuration
const monitoring = initializeMonitoring();

// Or with custom configuration
const monitoring = initializeMonitoring({
  enablePerformanceTracking: true,
  enableHealthChecks: true,
  enableAlerting: true,
  logLevel: 'info',
});
```

### Performance Monitoring

```typescript
import { monitorPerformance, createOperationLogger } from '@/lib/monitoring';

// Using decorator
class UserService {
  @monitorPerformance('UserService.createUser')
  async createUser(userData: any) {
    // Your implementation
  }
}

// Using operation logger
const opLogger = createOperationLogger('database-query');
try {
  const result = await database.query('SELECT * FROM users');
  opLogger.success({ rowCount: result.length });
} catch (error) {
  opLogger.failure(error, { query: 'users' });
}
```

### Structured Logging

```typescript
import { logBusinessEvent, logSecurityEvent } from '@/lib/monitoring';

// Log business events
logBusinessEvent('user-created', 'user', userId, {
  email: user.email,
  role: user.role,
});

// Log security events
logSecurityEvent('failed-login-attempt', 'medium', {
  ip: request.ip,
  userAgent: request.headers['user-agent'],
});
```

### Health Checks

```typescript
import { quickHealthCheck } from '@/lib/monitoring';

// Get current system health
const health = await quickHealthCheck();
console.log(`System status: ${health.status}`);
```

### Custom Metrics

```typescript
const monitoring = getUnifiedMonitoring();

// Record custom metrics
monitoring.recordPerformance('custom-operation', 1500, true, {
  userId: '123',
  feature: 'analytics',
});

// Create custom alerts
await monitoring.createAlert(
  'system',
  'high',
  'Custom Alert',
  'Something important happened',
  { customData: 'value' }
);
```

## API Endpoints

The monitoring system provides several API endpoints:

### Health Endpoints

- `GET /api/health` - Basic health check
- `GET /api/health/ready` - Readiness probe (K8s compatible)
- `GET /api/health/live` - Liveness probe (K8s compatible)

### Metrics Endpoints

- `GET /api/metrics` - System metrics (JSON)
- `GET /api/metrics/prometheus` - Prometheus format metrics
- `GET /api/status` - System status overview

### Alerts Endpoints

- `GET /api/alerts` - Active alerts
- `POST /api/alerts/:id/resolve` - Resolve an alert

### Dashboard Endpoints

- `GET /api/dashboard` - Complete dashboard data
- `GET /api/monitoring/config` - Current configuration

## Configuration

### Environment Variables

```bash
# Monitoring settings
MONITORING_ENABLED=true
LOG_LEVEL=info
HEALTH_CHECK_INTERVAL=30000
METRICS_RETENTION_HOURS=24

# Alerting settings
ALERTING_ENABLED=true
RESPONSE_TIME_WARNING_MS=1000
RESPONSE_TIME_CRITICAL_MS=3000
MEMORY_WARNING_PERCENT=80
MEMORY_CRITICAL_PERCENT=90
```

### Configuration Files

```typescript
import { getCompleteMonitoringConfig } from '@/lib/monitoring/monitoring-config';

const config = getCompleteMonitoringConfig();
// Automatically adapts to NODE_ENV (development/production/test)
```

## Middleware Integration

### Express/Next.js Middleware

```typescript
import { createMonitoringMiddleware } from '@/lib/monitoring';

// Add to your middleware stack
app.use(createMonitoringMiddleware());
```

### Database Query Monitoring

```typescript
import { monitorDatabaseQuery } from '@/lib/monitoring';

const users = await monitorDatabaseQuery('get-users', async () => {
  return await db.select().from(usersTable);
});
```

### Cache Operation Monitoring

```typescript
import { monitorCacheOperation } from '@/lib/monitoring';

const cachedData = await monitorCacheOperation('get', 'user:123', async () => {
  return await cache.get('user:123');
});
```

## Dashboard Integration

### React Component Example

```typescript
import { useEffect, useState } from 'react';

function MonitoringDashboard() {
  const [dashboardData, setDashboardData] = useState(null);

  useEffect(() => {
    fetch('/api/dashboard')
      .then(res => res.json())
      .then(data => setDashboardData(data.data));
  }, []);

  if (!dashboardData) return <div>Loading...</div>;

  return (
    <div>
      <h1>System Status: {dashboardData.summary.overall}</h1>
      <p>Uptime: {Math.floor(dashboardData.summary.uptime / 1000)}s</p>
      <p>Active Alerts: {dashboardData.summary.activeAlerts}</p>
      <p>Memory Usage: {dashboardData.summary.memoryUsage.toFixed(1)}%</p>
      <p>Response Time: {dashboardData.summary.responseTime}ms</p>
    </div>
  );
}
```

## Performance Thresholds

The system uses environment-specific thresholds:

### Production

- Response Time: Warning 1s, Critical 3s
- Database Query: Warning 500ms, Critical 2s
- Memory Usage: Warning 80%, Critical 90%
- Error Rate: Warning 1%, Critical 5%

### Development

- Response Time: Warning 1.5s, Critical 4.5s
- Database Query: Warning 750ms, Critical 3s
- Memory Usage: Warning 80%, Critical 90%
- Error Rate: Warning 5%, Critical 10%

## Alerting

### Alert Severities

- **Critical**: Immediate attention required, system may be down
- **High**: Important issues that need quick resolution
- **Medium**: Issues that should be addressed soon
- **Low**: Minor issues or informational alerts

### Alert Channels

- Console logging (always enabled)
- Email notifications (production only)
- Webhook notifications (production only)
- Slack integration (production only)

## Best Practices

### 1. Use Structured Logging

```typescript
// Good
monitoring.logEvent('business', 'order-created', 'info', {
  orderId: '123',
  userId: '456',
  amount: 99.99,
  currency: 'USD',
});

// Avoid
console.log('Order created for user 456 with amount $99.99');
```

### 2. Monitor Critical Operations

```typescript
// Monitor database operations
const result = await monitorDatabaseQuery('create-order', async () => {
  return await db.insert(orders).values(orderData);
});

// Monitor external API calls
const opLogger = createOperationLogger('payment-api-call');
try {
  const payment = await paymentApi.charge(amount);
  opLogger.success({ paymentId: payment.id });
} catch (error) {
  opLogger.failure(error, { amount });
}
```

### 3. Set Appropriate Thresholds

```typescript
// Record custom metrics with meaningful thresholds
monitoring.recordCriticalMetric(
  'order-processing-time',
  processingTime,
  5000, // 5 second threshold
  { orderId, complexity: 'high' }
);
```

### 4. Use Correlation IDs

```typescript
// In API routes
const monitoring = getUnifiedMonitoring();
monitoring.logEvent('system', 'API request started', 'info', {
  requestId: req.headers['x-request-id'],
  method: req.method,
  path: req.path,
});
```

## Troubleshooting

### High Memory Usage

1. Check the metrics retention period
2. Verify no memory leaks in custom metrics
3. Monitor the number of stored alerts

### Performance Issues

1. Reduce health check frequency in development
2. Disable verbose logging in production
3. Use sampling for high-volume metrics

### Missing Metrics

1. Verify monitoring is initialized
2. Check environment variables
3. Ensure proper middleware setup

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 Unified Monitoring Service                  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ Structured      │  │ Metrics         │  │ Performance  │ │
│  │ Logging         │  │ Collection      │  │ Monitoring   │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ Health Checks   │  │ Alerting        │  │ API          │ │
│  │ Service         │  │ System          │  │ Endpoints    │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Requirements Compliance

This monitoring system fulfills the following requirements:

- **11.1**: Comprehensive error logging with context and stack traces
- **11.2**: Performance metrics tracking and alerting system
- **11.3**: Structured logging with consistent format and levels
- **11.5**: Critical system metrics monitoring and health tracking

## License

This monitoring system is part of the Logistix application and follows the same licensing terms.