# TestController Documentation

## Overview

The `TestController` is the main validation orchestrator for the Vinted market analysis validation system. It coordinates all validation services and manages the complete validation workflow from token validation to final reporting.

## Requirements Covered

- **4.1**: Generate validation report when tests succeed
- **4.2**: Activate debug mode when tests fail  
- **4.3**: Validation result aggregation and analysis
- **4.4**: Comprehensive error details and logging
- **4.5**: Error handling and recovery mechanisms

## Architecture

The TestController follows a singleton pattern and orchestrates the following services:

```text
TestController
├── ApiTokenManager (token validation & API connection)
├── ProductTestSuite (product analysis testing)
├── DatabaseIntegrityChecker (data integrity validation)
└── DebugLogger (comprehensive logging)
```

It now leverages a centralized error handling and recovery module:

- `error-types.ts`: Defines custom error classes (`ApiError`, `ValidationError`, `SystemError`) and a categorization function.
- `recovery-strategies.ts`: Provides robust recovery mechanisms like `withExponentialBackoff` and `withTimeout`.

## Key Features

### 1. Sequential Test Execution

- Executes product tests one by one to avoid API rate limiting.
- Provides detailed progress tracking and error reporting.

### 2. Advanced Error Handling & Recovery (Requirement 4.5)

- **Exponential Backoff**: API calls automatically retry on transient errors (network issues, rate limits, server errors) with increasing delays to maximize success chances.
- **Timeout Management**: All critical async operations are wrapped in timeouts to prevent indefinite hangs.
- **Error Categorization**: Errors are classified into specific categories (`ApiConnection`, `ApiAuthentication`, `ValidationPrice`, `SystemConfiguration`, etc.) for precise reporting and root cause analysis.
- **Custom Error Types**: `ApiError`, `ValidationError`, and `SystemError` provide rich, contextual error information throughout the system.
- **Graceful Degradation**: The system can continue parts of the validation even if some non-critical operations fail.

### 3. Validation Result Aggregation

- Combines results from all validation services.
- Calculates overall success based on configurable thresholds.
- Generates actionable recommendations based on specific error categories.

## Error Handling Strategy

### Retry with Exponential Backoff

API calls are wrapped in the `withExponentialBackoff` utility, which automatically retries failed requests based on a configurable strategy. This handles most transient network and API issues seamlessly.

```typescript
// Example from similar-sales-service.ts
const response = await withExponentialBackoff(() => fetch(url));
```

### Error Categorization

All caught errors are passed through `categorizeError` to be classified. This allows the `TestController` to make intelligent decisions and provide targeted feedback.

```typescript
// Example from TestController
try {
  // ... operation
} catch (error) {
  const categorized = categorizeError(error);
  logger.error(`Operation failed: ${categorized.message}`, { category: categorized.category });
  // ... handle based on category
}
```

**Error Categories:**

- **API Errors**: `ApiConnection`, `ApiAuthentication`, `ApiRateLimit`, `ApiNotFound`, `ApiServerError`, `ApiInvalidResponse`
- **Validation Errors**: `ValidationPrice`, `ValidationIntegrity`, `ValidationTimeout`
- **System Errors**: `SystemConfiguration`, `SystemDatabase`, `SystemInternal`

## Recommendations Engine

The TestController generates more precise and actionable recommendations based on the categorized errors:

### Success Scenarios

- "Tous les tests ont réussi. Le système semble opérationnel."

### Failure Scenarios

- **Token Issues**: "Vérifiez la validité du token API Vinted et ses permissions."
  - "Erreur d'authentification (401/403). Le token est probablement invalide ou expiré."
- **API/Network Issues**: "Des erreurs de connexion API ont été détectées. Le service Vinted est peut-être indisponible ou des problèmes réseau sont survenus."
  - "L'API Vinted a répondu avec une erreur serveur (5xx). Réessayez plus tard."
- **Test Failures**: "X test(s) de produit ont échoué. Vérifiez les logs de débogage."
- **Timeout Issues**: "Des timeouts ont été détectés. Augmentez les timeouts ou vérifiez la performance de l'API."
- **Price Range Issues**: "Vérifiez les fourchettes de prix attendues pour les produits en échec."

## Usage Examples

### Basic Validation

```typescript
import { TestController } from '@/lib/services/validation';

const testController = TestController.getInstance();
// The token can be provided here or through environment variables
const report = await testController.executeCompleteValidation('your-token');

if (report.overallSuccess) {
  console.log('✅ Validation successful!');
} else {
  console.log('❌ Validation failed. Recommendations:', report.recommendations);
}
```

### Custom Configuration

```typescript
const customConfig = {
  vintedApiToken: 'your-token',
  testProducts: [
    {
      name: 'Custom Product',
      expectedPriceRange: { min: 20, max: 80, currency: 'EUR' },
      description: 'Custom test product'
    }
  ],
  debugMode: true,
  timeoutSettings: {
    apiCallTimeout: 45000, // Now used within withTimeout
    analysisTimeout: 180000,
    pollingInterval: 3000,
    maxRetries: 4 // Used by withExponentialBackoff
  }
};

const testController = TestController.getInstance();
testController.updateConfiguration(customConfig);
const report = await testController.executeCompleteValidation();
```

## Troubleshooting

### Common Issues

1. **Token validation fails**:
    - Check token format and validity.
    - Verify API permissions.
    - Check for network connectivity issues.
2. **Product tests timeout**:
    - The `withTimeout` wrapper will now throw a `TimeoutError`.
    - Increase `timeoutSettings.apiCallTimeout` in the configuration.
    - Check for API rate-limiting (now handled by backoff, but could still be an issue).
3. **Persistent API Errors**:
    - If `withExponentialBackoff` fails after all retries, it indicates a persistent issue.
    - Check Vinted's status page or your network connection.
    - The error category in the report will specify the type of API error (e.g., `ApiAuthentication`, `ApiServerError`).
