# Centralized Error Handling System

This document describes the unified error handling system based on `CleanupError` for the LogistiX application.

## Overview

The centralized error handling system provides:

- **Unified Error Classes**: All errors inherit from `CleanupError`
- **Contextual Information**: Rich error context with operation details
- **Automatic Logging**: Integrated logging with appropriate severity levels
- **User-Friendly Messages**: Conversion to user-displayable error messages
- **Retry Logic**: Built-in retry mechanisms for transient errors
- **Migration Support**: Tools to migrate existing services

## Core Components

### CleanupError

The base error class that all application errors should inherit from:

```typescript
import { CleanupError } from '@/lib/shared/errors';

const error = new CleanupError(
  'Something went wrong',
  'OPERATION_FAILED',
  { operation: 'createUser', userId: 'user123' },
  'email', // field that caused the error
  400,     // HTTP status code
  true,    // is operational (recoverable)
  'medium' // severity level
);
```

### Specialized Error Classes

- **ValidationError**: For input validation failures
- **NotFoundError**: For missing resources
- **AuthError**: For authentication failures
- **AuthorizationError**: For permission failures
- **DatabaseError**: For database operation failures
- **NetworkError**: For network-related failures
- **TimeoutError**: For operation timeouts

### Error Handler Service

The `CentralizedErrorHandler` provides unified error processing:

```typescript
import { errorHandler } from '@/lib/shared/errors';

// Handle any error and convert to CleanupError
const cleanupError = errorHandler.handleError(
  error,
  'createUser',
  { userId: 'user123' }
);

// Format for user display
const userError = errorHandler.formatUserFriendlyError(cleanupError);

// Retry with backoff
const result = await errorHandler.retryWithBackoff(
  () => riskyOperation(),
  'riskyOperation'
);
```

## Migration Guide

### Step 1: Extend BaseService

```typescript
import { migrationService } from '@/lib/shared/errors';

class MyService extends migrationService.createBaseService() {
  constructor(requestId?: string, userId?: string) {
    super(requestId, userId);
  }
}
```

### Step 2: Replace Legacy Error Patterns

**Before:**
```typescript
if (!user) {
  throw new Error('User not found');
}
```

**After:**
```typescript
if (!user) {
  throw this.createNotFoundError('User', userId);
}
```

### Step 3: Use executeOperation for Automatic Handling

**Before:**
```typescript
async createUser(data: UserData) {
  try {
    // operation logic
    return result;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}
```

**After:**
```typescript
async createUser(data: UserData) {
  return this.executeOperation(async () => {
    // operation logic
    return result;
  }, 'createUser');
}
```

### Step 4: Add Proper Validation

```typescript
async createUser(data: UserData) {
  return this.executeOperation(async () => {
    if (!data.email) {
      throw this.createValidationError('Email is required', 'email');
    }
    
    if (!data.email.includes('@')) {
      throw this.createValidationError('Invalid email format', 'email');
    }
    
    // Continue with operation
  }, 'createUser');
}
```

## Error Context

Always provide rich context for better debugging:

```typescript
const context = {
  operation: 'updateProduct',
  userId: 'user123',
  requestId: 'req456',
  productId: 'prod789',
  additionalData: { 
    originalPrice: 100,
    newPrice: 150 
  }
};

throw new ValidationError('Price increase too high', 'price', context);
```

## React Hook Usage

```typescript
import { useErrorHandler } from '@/lib/shared/errors';

function MyComponent() {
  const { handleError, retryOperation } = useErrorHandler();
  
  const handleSubmit = async () => {
    try {
      await retryOperation(
        () => submitData(),
        'submitData'
      );
    } catch (error) {
      const userError = handleError(error, 'submitData');
      setErrorMessage(userError.message);
    }
  };
}
```

## Migration Checklist

Use the migration service to analyze your services:

```typescript
import { migrationService } from '@/lib/shared/errors';

const status = migrationService.analyzeService(myService, 'MyService');
console.log('Migration score:', status.migrationScore);
console.log('Recommendations:', status.recommendations);
```

## Best Practices

1. **Always use specific error types** instead of generic Error
2. **Provide rich context** for debugging
3. **Use executeOperation** for automatic logging and error handling
4. **Validate inputs** and throw ValidationError for invalid data
5. **Don't retry** validation, auth, or not found errors
6. **Log errors** with correlation IDs for tracing
7. **Convert to user-friendly messages** before displaying to users

## Testing

```typescript
import { ValidationError, isCleanupError } from '@/lib/shared/errors';

describe('MyService', () => {
  it('should throw ValidationError for invalid input', async () => {
    await expect(service.createUser({}))
      .rejects
      .toThrow(ValidationError);
  });
  
  it('should provide proper error context', async () => {
    try {
      await service.createUser({});
    } catch (error) {
      expect(isCleanupError(error)).toBe(true);
      expect(error.context.operation).toBe('createUser');
    }
  });
});
```