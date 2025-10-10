# Guide de Développement - Logistix

## Configuration de l'Environnement de Développement

### Prérequis

- **Node.js**: Version 18.x ou supérieure
- **npm**: Version 9.x ou supérieure
- **Git**: Version 2.x ou supérieure
- **VSCode**: Recommandé avec les extensions suivantes

### Extensions VSCode Recommandées

```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-typescript-next",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense",
    "ms-vscode.vscode-json"
  ]
}
```

### Installation du Projet

```bash
# Cloner le repository
git clone <repository-url>
cd logistix

# Installer les dépendances
npm install

# Copier le fichier d'environnement
cp .env.example .env

# Configurer la base de données
npm run db:generate
npm run db:migrate

# Créer un utilisateur admin (optionnel)
npm run script:create-admin-user

# Démarrer le serveur de développement
npm run dev
```

### Configuration de l'Environnement

```bash
# .env
DATABASE_URL="file:./data/logistix.db"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
NODE_ENV="development"
LOG_LEVEL="debug"
```

## Structure du Code

### Organisation des Fichiers

#### Composants React

```typescript
// components/features/product/product-card.tsx
import { type Product } from '@/types/product';

interface ProductCardProps {
  product: Product;
  onEdit?: (product: Product) => void;
  onDelete?: (id: string) => void;
}

export function ProductCard({ product, onEdit, onDelete }: ProductCardProps) {
  return (
    <div className="border rounded-lg p-4">
      <h3 className="font-semibold">{product.title}</h3>
      <p className="text-gray-600">{product.description}</p>
      <div className="flex justify-between items-center mt-4">
        <span className="font-bold">{product.price}€</span>
        <div className="space-x-2">
          {onEdit && (
            <button onClick={() => onEdit(product)}>Modifier</button>
          )}
          {onDelete && (
            <button onClick={() => onDelete(product.id)}>Supprimer</button>
          )}
        </div>
      </div>
    </div>
  );
}
```

#### Services et Use Cases

```typescript
// lib/features/products/application/use-cases/create-product.use-case.ts
import { type ProductRepository } from '../domain/repositories/product.repository';
import { type CreateProductDTO } from '../dto/create-product.dto';
import { Product } from '../domain/entities/product.entity';

export class CreateProductUseCase {
  constructor(private productRepository: ProductRepository) {}

  async execute(data: CreateProductDTO): Promise<Product> {
    // Validation métier
    if (data.price <= 0) {
      throw new ValidationError('Le prix doit être positif');
    }

    // Création de l'entité
    const product = Product.create({
      title: data.title,
      description: data.description,
      price: data.price,
      categoryId: data.categoryId,
    });

    // Sauvegarde
    await this.productRepository.save(product);

    return product;
  }
}
```

#### Entités Domaine

```typescript
// lib/features/products/domain/entities/product.entity.ts
import { randomUUID } from 'crypto';

export interface ProductProps {
  id?: string;
  title: string;
  description?: string;
  price: number;
  status: ProductStatus;
  categoryId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Product {
  private constructor(private props: Required<ProductProps>) {}

  static create(data: Omit<ProductProps, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Product {
    return new Product({
      id: randomUUID(),
      ...data,
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static fromPersistence(data: Required<ProductProps>): Product {
    return new Product(data);
  }

  // Getters
  get id(): string { return this.props.id; }
  get title(): string { return this.props.title; }
  get price(): number { return this.props.price; }
  get status(): ProductStatus { return this.props.status; }

  // Méthodes métier
  updatePrice(newPrice: number): void {
    if (newPrice <= 0) {
      throw new ValidationError('Le prix doit être positif');
    }
    this.props.price = newPrice;
    this.props.updatedAt = new Date();
  }

  publish(): void {
    if (this.props.status === 'sold') {
      throw new BusinessError('Un produit vendu ne peut pas être republié');
    }
    this.props.status = 'active';
    this.props.updatedAt = new Date();
  }

  toJSON(): Required<ProductProps> {
    return { ...this.props };
  }
}
```

## Conventions de Code

### Nommage

#### Fichiers et Dossiers

```
✅ Correct
components/product-card.tsx
lib/features/products/
hooks/use-product-form.ts
types/product.types.ts

❌ Incorrect
components/ProductCard.tsx
lib/features/Products/
hooks/useProductForm.ts
types/productTypes.ts
```

#### Variables et Fonctions

```typescript
✅ Correct
const productList = [];
const isProductValid = true;
function calculateTotalPrice() {}
const handleProductSubmit = () => {};

❌ Incorrect
const ProductList = [];
const is_product_valid = true;
function CalculateTotalPrice() {}
const HandleProductSubmit = () => {};
```

#### Types et Interfaces

```typescript
✅ Correct
interface ProductProps {}
type ProductStatus = 'draft' | 'active' | 'sold';
class ProductService {}
enum ProductCategory {}

❌ Incorrect
interface productProps {}
type productStatus = 'draft' | 'active' | 'sold';
class productService {}
enum productCategory {}
```

### Structure des Imports

```typescript
// 1. Imports externes
import React from 'react';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// 2. Imports internes (alias)
import { Button } from '@/components/ui/button';
import { ProductService } from '@/lib/features/products';
import { type Product } from '@/types/product';

// 3. Imports relatifs
import { ProductCard } from './product-card';
import { useProductForm } from '../hooks/use-product-form';
```

### Documentation JSDoc

```typescript
/**
 * Calcule le prix total d'une commande avec les taxes
 * 
 * @param items - Liste des articles de la commande
 * @param taxRate - Taux de taxe (par défaut 0.20 pour 20%)
 * @returns Le prix total incluant les taxes
 * 
 * @example
 * ```typescript
 * const total = calculateOrderTotal([
 *   { price: 100, quantity: 2 },
 *   { price: 50, quantity: 1 }
 * ], 0.20);
 * console.log(total); // 300
 * ```
 */
export function calculateOrderTotal(
  items: OrderItem[],
  taxRate: number = 0.20
): number {
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  return subtotal * (1 + taxRate);
}
```

## Gestion des Erreurs

### Hiérarchie d'Erreurs

```typescript
// lib/shared/errors/base.error.ts
export abstract class BaseError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;
  
  constructor(
    message: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

// lib/shared/errors/domain.errors.ts
export class ValidationError extends BaseError {
  readonly code = 'VALIDATION_ERROR';
  readonly statusCode = 400;
}

export class NotFoundError extends BaseError {
  readonly code = 'NOT_FOUND';
  readonly statusCode = 404;
}

export class BusinessError extends BaseError {
  readonly code = 'BUSINESS_ERROR';
  readonly statusCode = 422;
}
```

### Gestion dans les API Routes

```typescript
// app/api/products/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ErrorHandler } from '@/lib/shared/errors/error-handler';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const product = await createProductUseCase.execute(data);
    
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    return ErrorHandler.handleApiError(error);
  }
}
```

### Gestion dans les Composants

```typescript
// components/features/product/product-form.tsx
export function ProductForm() {
  const [error, setError] = useState<string | null>(null);
  
  const handleSubmit = async (data: ProductFormData) => {
    try {
      setError(null);
      await createProduct(data);
      // Redirection ou notification de succès
    } catch (error) {
      if (error instanceof ValidationError) {
        setError(error.message);
      } else {
        setError('Une erreur inattendue est survenue');
        console.error('Unexpected error:', error);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      {/* Formulaire */}
    </form>
  );
}
```

## Tests

### Configuration des Tests

```typescript
// vitest.setup.ts
import { beforeEach, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Nettoyage automatique après chaque test
afterEach(() => {
  cleanup();
});

// Configuration globale des mocks
beforeEach(() => {
  // Reset des mocks
});
```

### Tests Unitaires

```typescript
// lib/features/products/domain/entities/__tests__/product.entity.test.ts
import { describe, it, expect } from 'vitest';
import { Product } from '../product.entity';
import { ValidationError, BusinessError } from '@/lib/shared/errors';

describe('Product Entity', () => {
  describe('create', () => {
    it('should create a product with valid data', () => {
      const productData = {
        title: 'iPhone 14',
        price: 999.99,
        categoryId: 'electronics',
      };

      const product = Product.create(productData);

      expect(product.title).toBe(productData.title);
      expect(product.price).toBe(productData.price);
      expect(product.status).toBe('draft');
      expect(product.id).toBeDefined();
    });
  });

  describe('updatePrice', () => {
    it('should update price when valid', () => {
      const product = Product.create({
        title: 'Test Product',
        price: 100,
        categoryId: 'test',
      });

      product.updatePrice(150);

      expect(product.price).toBe(150);
    });

    it('should throw ValidationError when price is negative', () => {
      const product = Product.create({
        title: 'Test Product',
        price: 100,
        categoryId: 'test',
      });

      expect(() => product.updatePrice(-10)).toThrow(ValidationError);
    });
  });
});
```

### Tests d'Intégration

```typescript
// tests/integration/api/products.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { testClient } from '@/tests/utils/test-client';
import { createTestProduct, cleanupDatabase } from '@/tests/utils/test-helpers';

describe('Products API', () => {
  beforeEach(async () => {
    await cleanupDatabase();
  });

  describe('POST /api/products', () => {
    it('should create a product with valid data', async () => {
      const productData = {
        title: 'Test Product',
        description: 'A test product',
        price: 99.99,
        categoryId: 'test-category',
      };

      const response = await testClient.post('/api/products', productData);

      expect(response.status).toBe(201);
      expect(response.data).toMatchObject({
        title: productData.title,
        price: productData.price,
        status: 'draft',
      });
    });

    it('should return 400 for invalid data', async () => {
      const invalidData = {
        title: '', // Titre vide
        price: -10, // Prix négatif
      };

      const response = await testClient.post('/api/products', invalidData);

      expect(response.status).toBe(400);
      expect(response.data.code).toBe('VALIDATION_ERROR');
    });
  });
});
```

### Tests E2E

```typescript
// tests/e2e/product-management.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Product Management', () => {
  test('should create, edit and delete a product', async ({ page }) => {
    // Navigation vers la page des produits
    await page.goto('/dashboard/products');

    // Création d'un produit
    await page.click('[data-testid="create-product-button"]');
    await page.fill('[data-testid="product-title"]', 'Test Product');
    await page.fill('[data-testid="product-price"]', '99.99');
    await page.click('[data-testid="submit-button"]');

    // Vérification de la création
    await expect(page.locator('[data-testid="product-list"]')).toContainText('Test Product');

    // Modification du produit
    await page.click('[data-testid="edit-product-button"]');
    await page.fill('[data-testid="product-title"]', 'Updated Product');
    await page.click('[data-testid="submit-button"]');

    // Vérification de la modification
    await expect(page.locator('[data-testid="product-list"]')).toContainText('Updated Product');

    // Suppression du produit
    await page.click('[data-testid="delete-product-button"]');
    await page.click('[data-testid="confirm-delete-button"]');

    // Vérification de la suppression
    await expect(page.locator('[data-testid="product-list"]')).not.toContainText('Updated Product');
  });
});
```

## Outils de Développement

### Scripts NPM

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint . --ext .ts,.tsx --fix",
    "format": "prettier --write .",
    "type-check": "tsc --noEmit",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test",
    "db:generate": "drizzle-kit generate:sqlite",
    "db:migrate": "drizzle-kit push:sqlite",
    "db:studio": "drizzle-kit studio"
  }
}
```

### Configuration ESLint

```javascript
// eslint.config.js
module.exports = {
  extends: [
    'next/core-web-vitals',
    '@typescript-eslint/recommended',
    'prettier'
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/prefer-const': 'error',
    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'prefer-template': 'error'
  }
};
```

### Configuration Prettier

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false
}
```

## Debugging

### Configuration VSCode

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: debug server-side",
      "type": "node-terminal",
      "request": "launch",
      "command": "npm run dev"
    },
    {
      "name": "Next.js: debug client-side",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3000"
    }
  ]
}
```

### Logging en Développement

```typescript
// lib/shared/utils/logger.ts
import winston from 'winston';

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = winston.createLogger({
  level: isDevelopment ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    isDevelopment 
      ? winston.format.simple()
      : winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    ...(isDevelopment ? [] : [
      new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
      new winston.transports.File({ filename: 'logs/combined.log' })
    ])
  ]
});
```

## Performance

### Optimisations Next.js

```typescript
// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ['@/components/ui'],
  },
  images: {
    formats: ['image/webp', 'image/avif'],
  },
  webpack: (config) => {
    config.optimization.splitChunks = {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
      },
    };
    return config;
  },
};

export default nextConfig;
```

### Monitoring des Performances

```typescript
// lib/shared/utils/performance.ts
export class PerformanceMonitor {
  private static timers = new Map<string, number>();

  static start(label: string): void {
    this.timers.set(label, performance.now());
  }

  static end(label: string): number {
    const start = this.timers.get(label);
    if (!start) {
      console.warn(`Timer ${label} not found`);
      return 0;
    }

    const duration = performance.now() - start;
    this.timers.delete(label);

    if (process.env.NODE_ENV === 'development') {
      console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`);
    }

    return duration;
  }

  static async measure<T>(label: string, fn: () => Promise<T>): Promise<T> {
    this.start(label);
    try {
      return await fn();
    } finally {
      this.end(label);
    }
  }
}
```

## Bonnes Pratiques

### Sécurité

1. **Validation des entrées**: Toujours valider avec Zod
2. **Sanitisation**: Échapper les données utilisateur
3. **Authentification**: Vérifier les permissions
4. **HTTPS**: Utiliser HTTPS en production
5. **Variables d'environnement**: Ne jamais commiter les secrets

### Performance

1. **Lazy Loading**: Charger les composants à la demande
2. **Memoization**: Utiliser React.memo et useMemo
3. **Optimisation des images**: Utiliser next/image
4. **Bundle splitting**: Diviser le code par routes
5. **Cache**: Implémenter une stratégie de cache

### Maintenabilité

1. **Tests**: Maintenir une couverture > 80%
2. **Documentation**: Documenter les APIs publiques
3. **Refactoring**: Refactoriser régulièrement
4. **Code Review**: Réviser tout le code
5. **Monitoring**: Surveiller les performances

Cette approche garantit un code de qualité, maintenable et performant.