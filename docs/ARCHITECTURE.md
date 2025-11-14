# Architecture Technique - Logistix

## Vue d'ensemble

Logistix est une application Next.js 14 construite selon les principes de Clean Architecture et Domain-Driven Design. Cette documentation décrit l'architecture cible après refactorisation et les patterns utilisés.

## Structure du Projet

### Organisation des Dossiers

```tree
logistix/
├── app/                    # Next.js App Router
│   ├── (dashboard)/       # Routes groupées dashboard
│   ├── api/              # API Routes
│   ├── login/            # Authentification
│   └── globals.css       # Styles globaux
├── components/           # Composants React réutilisables
│   ├── auth/            # Composants d'authentification
│   ├── features/        # Composants spécifiques aux fonctionnalités
│   ├── layout/          # Composants de mise en page
│   ├── search/          # Composants de recherche
│   └── ui/              # Composants UI de base
├── lib/                 # Logique métier et services
│   ├── core/           # Logique métier centrale
│   ├── shared/         # Utilitaires partagés
│   ├── features/       # Modules fonctionnels
│   └── platform/       # Services plateforme
├── types/              # Définitions TypeScript
├── config/             # Configuration
├── data/               # Base de données SQLite
├── scripts/            # Scripts utilitaires
└── tests/              # Tests automatisés
```

### Architecture en Couches

#### 1. Couche Présentation (app/, components/)

- **Responsabilité**: Interface utilisateur et interactions
- **Technologies**: Next.js 14, React, Tailwind CSS
- **Patterns**:
  - Server Components pour les performances
  - Client Components pour l'interactivité
  - Composition de composants réutilisables

#### 2. Couche Application (lib/core/application/)

- **Responsabilité**: Orchestration des use cases
- **Patterns**:
  - Command/Query Separation (CQRS)
  - Use Cases pour la logique applicative
  - Services applicatifs pour l'orchestration

#### 3. Couche Domaine (lib/core/domain/)

- **Responsabilité**: Règles métier et entités
- **Patterns**:
  - Domain Entities avec encapsulation
  - Value Objects pour les concepts métier
  - Domain Services pour la logique complexe
  - Repository Interfaces pour l'abstraction des données

#### 4. Couche Infrastructure (lib/core/infrastructure/)

- **Responsabilité**: Implémentations techniques
- **Technologies**: Drizzle ORM, SQLite, APIs externes
- **Patterns**:
  - Repository Pattern pour l'accès aux données
  - Adapter Pattern pour les services externes
  - Factory Pattern pour la création d'objets

## Patterns Architecturaux

### 1. Clean Architecture

```typescript
// Exemple de structure d'un module
lib/features/products/
├── domain/
│   ├── entities/
│   │   └── product.entity.ts
│   ├── repositories/
│   │   └── product.repository.ts
│   └── services/
│       └── product.service.ts
├── application/
│   ├── use-cases/
│   │   ├── create-product.use-case.ts
│   │   └── get-product.use-case.ts
│   └── dto/
│       └── product.dto.ts
└── infrastructure/
    ├── repositories/
    │   └── drizzle-product.repository.ts
    └── adapters/
        └── vinted-product.adapter.ts
```

### 2. Dependency Injection

```typescript
// Container de dépendances
export class DIContainer {
  private static instance: DIContainer;
  private services = new Map<string, any>();

  static getInstance(): DIContainer {
    if (!DIContainer.instance) {
      DIContainer.instance = new DIContainer();
    }
    return DIContainer.instance;
  }

  register<T>(token: string, implementation: T): void {
    this.services.set(token, implementation);
  }

  resolve<T>(token: string): T {
    return this.services.get(token);
  }
}
```

### 3. Repository Pattern

```typescript
// Interface du repository (domaine)
export interface ProductRepository {
  findById(id: string): Promise<Product | null>;
  findAll(filters?: ProductFilters): Promise<Product[]>;
  save(product: Product): Promise<void>;
  delete(id: string): Promise<void>;
}

// Implémentation Drizzle (infrastructure)
export class DrizzleProductRepository implements ProductRepository {
  constructor(private db: DrizzleDB) {}

  async findById(id: string): Promise<Product | null> {
    const result = await this.db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1);
    
    return result[0] ? this.toDomain(result[0]) : null;
  }
}
```

## Gestion des Erreurs

### Stratégie Centralisée

```typescript
// Hiérarchie d'erreurs
export abstract class DomainError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;
}

export class ValidationError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
  readonly statusCode = 400;
}

export class NotFoundError extends DomainError {
  readonly code = 'NOT_FOUND';
  readonly statusCode = 404;
}

// Gestionnaire global d'erreurs
export class ErrorHandler {
  static handle(error: Error): ErrorResponse {
    if (error instanceof DomainError) {
      return {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode
      };
    }
    
    // Log des erreurs inattendues
    logger.error('Unexpected error', { error });
    
    return {
      code: 'INTERNAL_ERROR',
      message: 'Une erreur interne est survenue',
      statusCode: 500
    };
  }
}
```

## Gestion des Données

### Base de Données

- **SGBD**: SQLite avec Drizzle ORM
- **Migrations**: Versionnées et réversibles
- **Connexions**: Pool de connexions configuré
- **Transactions**: Support des transactions ACID

### Schéma de Base

```typescript
// Exemple de schéma Drizzle
export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  price: real('price').notNull(),
  status: text('status', { enum: ['draft', 'active', 'sold'] }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});
```

## Sécurité

### Authentification et Autorisation

- **Stratégie**: JWT avec refresh tokens
- **Middleware**: Validation automatique des tokens
- **RBAC**: Contrôle d'accès basé sur les rôles

### Validation des Données

```typescript
// Schémas Zod pour la validation
export const createProductSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  price: z.number().positive(),
  categoryId: z.string().uuid(),
});

// Middleware de validation
export function validateRequest<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          code: 'VALIDATION_ERROR',
          errors: error.errors
        });
      }
      next(error);
    }
  };
}
```

## Performance et Optimisation

### Stratégies de Cache

```typescript
// Service de cache Redis
export class CacheService {
  constructor(private redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    const cached = await this.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }

  async invalidate(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
```

### Optimisations Next.js

- **Server Components**: Rendu côté serveur par défaut
- **Streaming**: Chargement progressif des composants
- **Image Optimization**: Composant Image optimisé
- **Bundle Splitting**: Division automatique du code

## Monitoring et Observabilité

### Logging Structuré

```typescript
// Configuration Winston
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});
```

### Métriques de Performance

```typescript
// Collecte de métriques
export class MetricsCollector {
  private static metrics = new Map<string, number>();

  static recordDuration(operation: string, duration: number): void {
    this.metrics.set(`${operation}_duration`, duration);
  }

  static increment(counter: string): void {
    const current = this.metrics.get(counter) || 0;
    this.metrics.set(counter, current + 1);
  }

  static getMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics);
  }
}
```

## Tests

### Stratégie de Tests

1. **Tests Unitaires**: Logique métier et utilitaires
2. **Tests d'Intégration**: API et base de données
3. **Tests E2E**: Parcours utilisateur complets
4. **Tests de Performance**: Charge et stress

### Configuration Vitest

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      threshold: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    }
  }
});
```

## Déploiement

### Environnements

- **Development**: Local avec hot reload
- **Staging**: Environnement de test
- **Production**: Déploiement optimisé

### Pipeline CI/CD

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test
      - run: npm run build
```

## Migration et Évolution

### Stratégie de Migration

1. **Phase 1**: Restructuration progressive
2. **Phase 2**: Migration des services
3. **Phase 3**: Optimisation et nettoyage
4. **Phase 4**: Documentation et formation

### Compatibilité Ascendante

- Maintien des APIs existantes pendant la transition
- Versioning des interfaces critiques
- Tests de régression automatisés
- Rollback automatique en cas d'échec

## Bonnes Pratiques

### Code Quality

- **ESLint**: Règles strictes de qualité
- **Prettier**: Formatage automatique
- **TypeScript**: Typage strict sans `any`
- **Husky**: Hooks Git pour la validation

### Conventions de Nommage

- **Fichiers**: kebab-case pour les fichiers
- **Classes**: PascalCase
- **Fonctions**: camelCase
- **Constantes**: SCREAMING_SNAKE_CASE
- **Types**: PascalCase avec suffixe approprié

### Documentation du Code

```typescript
/**
 * Crée un nouveau produit dans le système
 * 
 * @param productData - Les données du produit à créer
 * @returns Promise résolvant vers le produit créé
 * @throws {ValidationError} Si les données sont invalides
 * @throws {DuplicateError} Si le produit existe déjà
 * 
 * @example
 * ```typescript
 * const product = await createProduct({
 *   title: "iPhone 14",
 *   price: 999.99,
 *   categoryId: "electronics"
 * });
 * ```
 */
export async function createProduct(
  productData: CreateProductDTO
): Promise<Product> {
  // Implémentation...
}
