# Configuration Management

This directory contains the centralized configuration management system for the Logistix application.

## Overview

The configuration system provides:
- Type-safe environment variable parsing and validation
- Default value handling with comprehensive documentation
- Configuration caching and refresh capabilities
- Feature flag management
- Centralized access to all application settings

## Files

### `config-service.ts`
The main configuration service that provides singleton access to all configuration values. It automatically loads, validates, and caches configuration from environment variables.

### `schemas.ts`
Zod schemas that define the structure and validation rules for all configuration sections. Includes comprehensive documentation and default values.

### `README.md`
This documentation file explaining the configuration system.

## Usage

### Basic Usage

```typescript
import { configService } from '@/lib/config/config-service';

// Get database configuration
const dbPath = configService.getDatabasePath();
const dbConfig = configService.getDatabaseConfig();

// Get authentication settings
const jwtSecret = configService.getJwtSecret();
const cookieName = configService.getCookieName();

// Check feature flags
const isVintedEnabled = configService.isVintedIntegrationEnabled();
const isCachingEnabled = configService.isCachingEnabled();

// Environment checks
if (configService.isDevelopment()) {
  console.log('Running in development mode');
}
```

### Advanced Usage

```typescript
import { configService } from '@/lib/config/config-service';

// Get complete configuration sections
const authConfig = configService.getAuthConfig();
const featureFlags = configService.getFeatureFlags();

// Validate configuration
const validation = configService.validateConfiguration();
if (!validation.valid) {
  console.error('Configuration errors:', validation.errors);
}

// Refresh configuration (useful for runtime updates)
configService.refreshConfiguration();
```

## Environment Variables

### Database Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `DATABASE_PATH` | string | `./data/logistix.db` | Path to SQLite database file |
| `DATABASE_MAX_CONNECTIONS` | number | `10` | Maximum concurrent connections |
| `DATABASE_CONNECTION_TIMEOUT` | number | `30000` | Connection timeout in milliseconds |
| `DATABASE_ENABLE_WAL` | boolean | `true` | Enable Write-Ahead Logging |
| `DATABASE_ENABLE_LOGGING` | boolean | `false` | Enable query logging |

### Authentication Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `JWT_SECRET` | string | **Required** | JWT signing secret (min 32 chars) |
| `COOKIE_NAME` | string | `logistix_session` | Authentication cookie name |
| `SESSION_TIMEOUT` | number | `3600` | Session timeout in seconds |
| `BCRYPT_ROUNDS` | number | `12` | Password hashing rounds |
| `MAX_LOGIN_ATTEMPTS` | number | `5` | Max login attempts before lockout |
| `LOCKOUT_DURATION` | number | `900` | Account lockout duration in seconds |

### Application Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `NODE_ENV` | enum | `development` | Environment: development, production, test |
| `PORT` | number | `3000` | Server port number |
| `LOG_LEVEL` | enum | `info` | Log level: error, warn, info, debug |
| `ENABLE_METRICS` | boolean | `false` | Enable performance metrics |
| `ENABLE_DEBUG` | boolean | `false` | Enable debug mode |
| `CORS_ORIGINS` | string[] | `http://localhost:3000` | Comma-separated CORS origins |

### Admin Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `ADMIN_DEFAULT_PASSWORD` | string | **Required** | Default admin password (min 8 chars) |
| `ADMIN_FORCE_PASSWORD_CHANGE` | boolean | `true` | Force password change on first login |
| `ENABLE_ADMIN_API` | boolean | `false` | Enable admin API endpoints |

### Feature Flags

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `ENABLE_VINTED_INTEGRATION` | boolean | `true` | Enable Vinted marketplace features |
| `ENABLE_ANALYTICS` | boolean | `false` | Enable analytics tracking |
| `ENABLE_CACHING` | boolean | `false` | Enable caching layer |
| `ENABLE_RATE_LIMIT` | boolean | `true` | Enable API rate limiting |
| `ENABLE_METRICS_COLLECTION` | boolean | `false` | Enable detailed metrics |

## Configuration Sections

### Database (`DatabaseConfig`)
- Connection management settings
- Performance optimization options
- Logging and monitoring configuration

### Authentication (`AuthConfig`)
- Security settings for JWT and sessions
- Password policies and lockout rules
- Cookie configuration

### Application (`AppConfig`)
- Runtime environment settings
- Logging and debug configuration
- CORS and networking options

### Admin (`AdminConfig`)
- Administrative access settings
- Default credentials management
- Admin-specific feature toggles

### Features (`FeatureFlags`)
- Toggleable application features
- A/B testing capabilities
- Gradual rollout controls

## Validation and Defaults

All configuration values are validated using Zod schemas with:
- Type checking and coercion
- Range validation for numeric values
- Required field validation
- Default value assignment
- Comprehensive error messages

## Security Considerations

### Required Values
- `JWT_SECRET`: Must be at least 32 characters in production
- `ADMIN_DEFAULT_PASSWORD`: Must be at least 8 characters and changed in production

### Sensitive Values
- JWT secrets should be cryptographically secure
- Database paths should be properly secured
- Admin passwords should follow strong password policies

### Environment-Specific Settings
- Development: Enable debug logging and metrics
- Production: Disable debug features, enable security measures
- Test: Use isolated database and minimal logging

## Error Handling

The configuration system provides comprehensive error handling:
- Validation errors with specific field information
- Missing required value detection
- Type conversion error reporting
- Fallback to default values where appropriate

## Performance

- Configuration is cached after initial load
- Automatic refresh every 60 seconds (configurable)
- Lazy loading of configuration sections
- Minimal runtime overhead

## Testing

Configuration can be tested by providing mock environment variables:

```typescript
// In tests
process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long';
process.env.DATABASE_PATH = ':memory:';

const config = configService.getFullConfig();
expect(config.auth.jwtSecret).toBe('test-secret-that-is-at-least-32-characters-long');
```

## Migration from Hardcoded Values

When migrating from hardcoded configuration values:

1. Identify hardcoded values in the codebase
2. Add corresponding environment variables
3. Update code to use `configService` methods
4. Add environment variables to `.env` files
5. Update deployment configurations

Example migration:

```typescript
// Before
const dbPath = './data/logistix.db';
const cookieName = 'logistix_session';

// After
const dbPath = configService.getDatabasePath();
const cookieName = configService.getCookieName();
```