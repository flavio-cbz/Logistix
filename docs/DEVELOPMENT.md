> **ℹ️ Ce guide a été consolidé. Pour une vue d’ensemble et les instructions essentielles, voir le [README.md](../README.md). Ce fichier détaille les aspects avancés du développement.**

# Guide de Développement - LogistiX

Ce guide fournit toutes les informations nécessaires pour développer et contribuer au projet LogistiX.

## 🏗️ Architecture du Projet

### Structure des Dossiers

```
LogistiX/
├── app/                    # Next.js App Router (routes et pages)
│   ├── (dashboard)/        # Groupe de routes protégées
│   │   ├── dashboard/      # Page principale du tableau de bord
│   │   ├── parcelles/      # Gestion des parcelles
│   │   ├── produits/       # Gestion des produits
│   │   ├── statistiques/   # Analyses et statistiques
│   │   └── profile/        # Profil utilisateur
│   ├── api/v1/            # Endpoints API REST
│   │   ├── auth/          # Authentification
│   │   ├── parcelles/     # CRUD parcelles
│   │   ├── produits/      # CRUD produits
│   │   └── market-analysis/ # Analyse de marché
│   ├── auth/              # Pages d'authentification
│   ├── globals.css        # Styles globaux
│   ├── layout.tsx         # Layout racine
│   └── page.tsx           # Page d'accueil
├── components/            # Composants React réutilisables
│   ├── ui/               # Composants de base (shadcn/ui)
│   ├── features/         # Composants métier spécifiques
│   ├── auth/             # Composants d'authentification
│   └── layout/           # Composants de mise en page
├── lib/                  # Logique métier et services
│   ├── services/         # Services métier
│   │   ├── auth/         # Service d'authentification
│   │   ├── database/     # Accès aux données
│   │   └── logging/      # Services de logging
│   ├── utils/            # Fonctions utilitaires
│   ├── middlewares/      # Middlewares personnalisés
│   └── constants/        # Constantes de l'application
├── types/                # Définitions TypeScript
├── hooks/                # Hooks React personnalisés
├── store/                # État global (Zustand)
├── tests/                # Tests
│   ├── unit/            # Tests unitaires
│   ├── integration/     # Tests d'intégration
│   └── e2e/            # Tests end-to-end
├── docs/                # Documentation
├── scripts/             # Scripts utilitaires
└── public/              # Assets statiques
```

## 🛠️ Configuration de l'Environnement de Développement

### Prérequis

- **Node.js** 18.0.0+
- **npm** 9.0.0+
- **Git**
- **VSCode** (recommandé)

### Extensions VSCode Recommandées

```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense",
    "ms-playwright.playwright"
  ]
}
```

### Configuration Git

```bash
# Configuration des hooks Git
git config core.hooksPath .githooks

# Configuration des fins de ligne
git config core.autocrlf false
git config core.eol lf
```

## 📝 Standards de Code

### TypeScript

- **Mode strict** activé
- **Types explicites** pour les paramètres de fonction
- **Interfaces** plutôt que types pour les objets
- **Enums** pour les constantes groupées

```typescript
// ✅ Bon
interface UserData {
  id: string;
  name: string;
  email: string;
}

function createUser(data: UserData): Promise<User> {
  // ...
}

// ❌ Éviter
function createUser(data: any) {
  // ...
}
```

### React

- **Composants fonctionnels** avec hooks
- **Props typées** avec TypeScript
- **Noms explicites** pour les composants
- **Composition** plutôt qu'héritage

```tsx
// ✅ Bon
interface ButtonProps {
  variant: 'primary' | 'secondary';
  children: React.ReactNode;
  onClick?: () => void;
}

export function Button({ variant, children, onClick }: ButtonProps) {
  return (
    <button 
      className={cn('btn', `btn-${variant}`)}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

// ❌ Éviter
export function Button(props: any) {
  return <button {...props} />;
}
```

### CSS/Tailwind

- **Classes utilitaires** Tailwind en priorité
- **Composants CSS** pour les styles complexes
- **Variables CSS** pour les thèmes
- **Mobile-first** responsive design

```tsx
// ✅ Bon
<div className="flex flex-col gap-4 p-6 bg-white rounded-lg shadow-sm">
  <h2 className="text-xl font-semibold text-gray-900">Titre</h2>
  <p className="text-gray-600">Description</p>
</div>

// ❌ Éviter
<div style={{ display: 'flex', flexDirection: 'column' }}>
  <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>Titre</h2>
</div>
```

## 🔧 Outils de Développement

### Linting et Formatage

```bash
# Linter le code
npm run lint

# Corriger automatiquement
npm run lint:fix

# Vérification TypeScript
npm run type-check
```

### Tests

```bash
# Tests unitaires
npm run test

# Tests en mode watch
npm run test:watch

# Tests avec couverture
npm run test:coverage

# Tests end-to-end
npx playwright test
```

### Analyse et Optimisation

```bash
# Analyser les dépendances
npm run analyze:deps

# Analyser le bundle
npm run analyze:bundle

# Nettoyer les fichiers inutiles
npm run cleanup:files

# Audit de performance
npm run perf:audit
```

## 🗃️ Base de Données

### Schema

La base de données utilise **Better-SQLite3** avec les tables principales :

- `users` - Utilisateurs
- `parcelles` - Parcelles agricoles
- `produits` - Produits et stocks
- `ventes` - Historique des ventes
- `market_analysis` - Données d'analyse de marché

### Migrations

```bash
# Exécuter les migrations
npm run db:migrate

# Créer une sauvegarde
npm run db:backup

# Restaurer une sauvegarde
npm run db:restore
```

### Requêtes

Utiliser **Drizzle ORM** pour les requêtes type-safe :

```typescript
import { db } from '@/lib/services/database/db';
import { produits } from '@/lib/services/database/schema';
import { eq } from 'drizzle-orm';

// Récupérer tous les produits d'un utilisateur
const userProducts = await db
  .select()
  .from(produits)
  .where(eq(produits.userId, userId));

// Créer un nouveau produit
const newProduct = await db
  .insert(produits)
  .values({
    nom: 'Tomates',
    prix: 2.50,
    quantite: 100,
    userId,
    parcelleId
  })
  .returning();
```

## 🔐 Authentification

### JWT Tokens

```typescript
import jwt from 'jsonwebtoken';

// Créer un token
const token = jwt.sign(
  { userId, email },
  process.env.JWT_SECRET!,
  { expiresIn: '7d' }
);

// Vérifier un token
const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
```

### Middleware d'Authentification

```typescript
import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/services/auth';

export async function withAuth(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return new Response('Unauthorized', { status: 401 });
  }

  const user = await verifyToken(token);
  if (!user) {
    return new Response('Invalid token', { status: 401 });
  }

  return user;
}
```

## 📊 Logging et Monitoring

### Configuration Winston

```typescript
import { getLogger } from '@/lib/utils/logging';

const logger = getLogger('ProductService');

// Différents niveaux de log
logger.info('Product created', { productId, userId });
logger.warn('Low stock detected', { productId, quantity });
logger.error('Failed to create product', error, { productId });

// Logging de performance
logger.performance('DATABASE_QUERY', 150, { query: 'SELECT * FROM products' });

// Logging des actions utilisateur
logger.userAction('CREATE_PRODUCT', userId, { productId });
```

### Audit Trail

```typescript
import { auditLogger } from '@/lib/services/audit-logger';

// Logger une action utilisateur
await auditLogger.logUserAction(userId, {
  action: 'CREATE_PRODUCT',
  resource: 'product',
  resourceId: productId,
  details: { name: 'Tomates', price: 2.50 }
}, {
  sessionId,
  ip: request.ip,
  userAgent: request.headers['user-agent']
});
```

## 🧪 Tests

### Tests Unitaires (Vitest)

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('Button Component', () => {
  it('should render with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  it('should handle click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    screen.getByRole('button').click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Tests d'Intégration

```typescript
import { describe, it, expect } from 'vitest';
import { POST } from '@/app/api/v1/produits/route';

describe('Products API', () => {
  it('should create a new product', async () => {
    const request = new Request('http://localhost:3000/api/v1/produits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nom: 'Test Product',
        prix: 10.50,
        quantite: 100
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.produit.nom).toBe('Test Product');
  });
});
```

### Tests E2E (Playwright)

```typescript
import { test, expect } from '@playwright/test';

test('should create a new product', async ({ page }) => {
  // Login
  await page.goto('/auth/login');
  await page.fill('[data-testid="email"]', 'test@example.com');
  await page.fill('[data-testid="password"]', 'password');
  await page.click('[data-testid="login-button"]');

  // Navigate to products
  await page.goto('/produits');
  
  // Create product
  await page.click('[data-testid="create-product"]');
  await page.fill('[data-testid="product-name"]', 'E2E Test Product');
  await page.fill('[data-testid="product-price"]', '15.99');
  await page.click('[data-testid="submit"]');

  // Verify creation
  await expect(page.locator('text=E2E Test Product')).toBeVisible();
});
```

## 🚀 Déploiement

### Build de Production

```bash
# Build optimisé
npm run build:prod

# Analyser le bundle
npm run build:analyze

# Démarrer en production
npm start
```

### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

### Variables d'Environnement

```env
# Production
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://logistix.com
DATABASE_URL=./data/logistix.db
JWT_SECRET=super-secret-production-key
SENTRY_DSN=https://your-sentry-dsn
LOG_LEVEL=warn
```

## 🔍 Debugging

### Logs de Développement

```bash
# Logs détaillés
LOG_LEVEL=debug npm run dev

# Logs silencieux
npm run dev:quiet
```

### Debugging avec VSCode

Configuration `.vscode/launch.json` :

```json
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

## 📈 Performance

### Optimisations

- **Code splitting** automatique avec Next.js
- **Bundle analysis** régulière
- **Image optimization** avec Next.js Image
- **Caching** avec Redis (optionnel)
- **Compression** gzip/brotli

### Monitoring

```typescript
import { PerformanceTimer } from '@/lib/utils/logging';

// Mesurer les performances
const timer = new PerformanceTimer('DATABASE_QUERY');
const result = await db.query('SELECT * FROM products');
timer.end({ resultCount: result.length });
```

## 🤝 Contribution

### Workflow Git

1. **Fork** le repository
2. **Créer** une branche feature : `git checkout -b feature/amazing-feature`
3. **Développer** avec tests
4. **Commit** : `git commit -m 'feat: add amazing feature'`
5. **Push** : `git push origin feature/amazing-feature`
6. **Pull Request** avec description détaillée

### Convention de Commit

Utiliser [Conventional Commits](https://www.conventionalcommits.org/) :

```
feat: add user authentication
fix: resolve database connection issue
docs: update API documentation
style: format code with prettier
refactor: simplify user service
test: add unit tests for product service
chore: update dependencies
```

### Code Review

- **Tests** obligatoires pour les nouvelles fonctionnalités
- **Documentation** mise à jour
- **Performance** vérifiée
- **Sécurité** validée
- **Accessibilité** respectée

## 📚 Ressources

- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Radix UI](https://www.radix-ui.com/docs)
- [Vitest](https://vitest.dev/guide/)
- [Playwright](https://playwright.dev/docs/intro)

---

Pour toute question, consultez la [documentation complète](../README.md) ou créez une [issue GitHub](https://github.com/flavio-cbz/Logistix/issues).