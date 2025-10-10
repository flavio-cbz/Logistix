# Database Migration Guide

This guide helps migrate from the old fragmented database system to the new unified database architecture.

## What Changed

### 1. Schema Consolidation
- **Old**: Multiple schema files (`lib/db/schema.ts`, `lib/db/users.ts`, `lib/db/parcels.ts`, `lib/services/database/drizzle-schema.ts`)
- **New**: Single unified schema (`lib/database/schema.ts`)

### 2. Database Service
- **Old**: Multiple database clients and services
- **New**: Single `DatabaseService` with connection pooling, transactions, and monitoring

### 3. Repository Pattern
- **Old**: Direct database queries scattered throughout the codebase
- **New**: Standardized repository pattern with base repository and specific repositories

## Migration Steps

### 1. Update Imports

#### Schema Imports
```typescript
// OLD
import { Product } from '@/lib/db/schema'
import { User } from '@/lib/db/users'
import { Parcel } from '@/lib/db/parcels'
import { users, products } from '@/lib/services/database/drizzle-schema'

// NEW
import { Product, User, Parcelle, users, products } from '@/lib/database/schema'
// OR
import { Product, User, Parcelle } from '@/lib/database'
```

#### Database Client Imports
```typescript
// OLD
import { db } from '@/lib/services/database/drizzle-client'
import { databaseService } from '@/lib/services/database/db'

// NEW
import { databaseService } from '@/lib/database/database-service'
// OR
import { databaseService } from '@/lib/database'
```

### 2. Update Database Operations

#### Direct Queries
```typescript
// OLD
const products = await db.select().from(productsTable).where(eq(productsTable.userId, userId))

// NEW - Using Repository (Recommended)
const productRepo = new ProductRepository(databaseService)
const products = await productRepo.findByUserId(userId)

// NEW - Using Database Service (Advanced)
const products = await databaseService.executeQuery(
  (db) => db.select().from(productsTable).where(eq(productsTable.userId, userId))
)
```

#### Transactions
```typescript
// OLD
const result = await db.transaction(async (tx) => {
  // operations
})

// NEW
const result = await databaseService.executeTransaction((db) => {
  // operations
})
```

### 3. Repository Usage Examples

#### User Operations
```typescript
import { UserRepository } from '@/lib/database/repositories'

const userRepo = new UserRepository(databaseService)

// Find user by username
const user = await userRepo.findByUsername('john_doe')

// Check if username exists
const exists = await userRepo.usernameExists('john_doe')

// Update user profile
const updated = await userRepo.updateProfile(userId, { email: 'new@email.com' })
```

#### Product Operations
```typescript
import { ProductRepository } from '@/lib/database/repositories'

const productRepo = new ProductRepository(databaseService)

// Find products with filtering
const products = await productRepo.findProducts({
  userId: 'user-id',
  status: ['available', 'sold'],
  priceMin: 10,
  priceMax: 100,
  searchTerm: 'nike',
  limit: 20
})

// Mark as sold
const soldProduct = await productRepo.markAsSold(productId, 25.99, 'Vinted')

// Get statistics
const stats = await productRepo.getProductStats(userId)
```

#### Parcelle Operations
```typescript
import { ParcelleRepository } from '@/lib/database/repositories'

const parcelleRepo = new ParcelleRepository(databaseService)

// Find by numero
const parcelle = await parcelleRepo.findByNumero('ABC123', userId)

// Update with automatic calculation
const updated = await parcelleRepo.updateWithCalculation(parcelleId, {
  poids: 500,
  prixTotal: 25.99
}) // prixParGramme will be calculated automatically
```

## Backward Compatibility

The old imports will continue to work during the migration period:

- `lib/services/database/drizzle-client.ts` - Redirects to new unified service
- Old schema imports - Will show deprecation warnings but continue to work

## Benefits of New System

1. **Type Safety**: Better TypeScript integration with consistent types
2. **Performance**: Connection pooling and optimized queries
3. **Maintainability**: Centralized database logic with repository pattern
4. **Monitoring**: Built-in health checks and performance monitoring
5. **Error Handling**: Standardized error handling and logging
6. **Testing**: Easier to mock and test with repository pattern

## Files to Update

### High Priority
- API routes (`app/api/**/*.ts`)
- Service files (`lib/services/**/*.ts`)
- Hook files (`lib/hooks/**/*.ts`)

### Medium Priority
- Component files that import types
- Utility functions
- Scripts

### Low Priority
- Test files
- Documentation

## Testing Migration

1. Run existing tests to ensure compatibility
2. Test database operations in development
3. Monitor performance and error logs
4. Gradually migrate from old patterns to new repository pattern

## Rollback Plan

If issues arise:
1. The old database client still works as a fallback
2. Schema imports are backward compatible
3. Can revert specific files while keeping others migrated
4. Database structure remains unchanged