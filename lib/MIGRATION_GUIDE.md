# Library Restructuring Migration Guide

This document outlines the new library structure and provides migration paths for existing imports.

## New Architecture

The `/lib` directory has been reorganized following Clean Architecture principles:

```
lib/
├── core/                    # Core business logic
│   ├── domain/             # Domain entities and business rules
│   ├── application/        # Use cases and application services
│   └── infrastructure/     # Infrastructure implementations
├── shared/                 # Shared utilities and common code
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Utility functions
│   ├── constants/         # Global constants
│   └── errors/            # Error handling
├── features/              # Feature modules
│   ├── products/          # Product management
│   ├── parcelles/         # Parcelle management
│   ├── analytics/         # Analytics and metrics
│   └── vinted/            # Vinted integration
└── platform/             # Platform services
    ├── database/          # Database services
    ├── cache/             # Caching services
    ├── monitoring/        # Monitoring and observability
    └── security/          # Security services
```

## Migration Mappings

### Types and Interfaces

**Old imports:**
```typescript
import { Product, User } from '@/lib/types/entities'
import { ApiResponse } from '@/lib/types/api'
import { SortOrder } from '@/lib/types/common'
```

**New imports:**
```typescript
import { Product, User } from '@/lib/shared/types/entities'
import { ApiResponse } from '@/lib/shared/types/api'
import { SortOrder } from '@/lib/shared/types/common'
```

### Constants and Configuration

**Old imports:**
```typescript
import { LOG_LEVEL } from '@/lib/constants/config'
```

**New imports:**
```typescript
import { LOG_LEVEL } from '@/lib/shared/constants/config'
```

### Error Handling

**Old imports:**
```typescript
import { CustomError } from '@/lib/errors/custom-error'
```

**New imports:**
```typescript
import { CustomError } from '@/lib/shared/errors/custom-error'
```

### Analytics

**Old imports:**
```typescript
import { AdvancedAnalyticsEngine } from '@/lib/analytics/advanced-analytics-engine'
import { PriceRecommendationEngine } from '@/lib/analytics/price-recommendation-engine'
```

**New imports:**
```typescript
import { AdvancedAnalyticsEngine } from '@/lib/features/analytics/engines/advanced-analytics-engine'
import { PriceRecommendationEngine } from '@/lib/features/analytics/engines/price-recommendation-engine'
```

### Database Services

**Old imports:**
```typescript
import { DatabaseService } from '@/lib/database/database-service'
import { schema } from '@/lib/database/schema'
```

**New imports:**
```typescript
import { DatabaseService } from '@/lib/platform/database/database-service'
import { schema } from '@/lib/platform/database/schema'
```

### Cache Services

**Old imports:**
```typescript
import { SimpleCache } from '@/lib/cache/simple-cache'
import { cacheManager } from '@/lib/cache/cache-manager'
```

**New imports:**
```typescript
import { SimpleCache } from '@/lib/platform/cache/simple-cache'
import { cacheManager } from '@/lib/platform/cache/cache-manager'
```

### Monitoring

**Old imports:**
```typescript
import { performanceCollector } from '@/lib/monitoring/performance-metrics'
```

**New imports:**
```typescript
import { performanceCollector } from '@/lib/platform/monitoring/performance-metrics'
```

## Barrel Exports

You can also use the barrel exports for cleaner imports:

```typescript
// Import from main lib barrel
import { Product, DatabaseService, SimpleCache } from '@/lib'

// Import from specific modules
import { Product } from '@/lib/shared'
import { DatabaseService } from '@/lib/platform'
import { AdvancedAnalyticsEngine } from '@/lib/features'
```

## Benefits of New Structure

1. **Clear Separation of Concerns**: Each directory has a specific responsibility
2. **Better Discoverability**: Related functionality is grouped together
3. **Reduced Coupling**: Dependencies flow in one direction (platform → shared → core)
4. **Easier Testing**: Isolated modules are easier to test
5. **Scalability**: New features can be added without affecting existing structure

## Next Steps

1. Update import statements throughout the codebase
2. Remove old directory structure once migration is complete
3. Update documentation and README files
4. Configure path aliases in tsconfig.json for cleaner imports

## Compatibility

The old structure will remain temporarily for backward compatibility. A deprecation notice will be added to old files directing developers to use the new structure.