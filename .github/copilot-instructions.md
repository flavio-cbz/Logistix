# LogistiX - AI Agent Instructions

Guide rapide pour être immédiatement productif sur ce projet Next.js d'analyse marketplace (Vinted).

## Architecture Multicouche (DDD-Inspired)

Le projet suit une **architecture en couches stricte** avec séparation claire des responsabilités :

```
lib/
├── domain/               # Entités métier (User, Parcelle, Produit)
│   ├── entities/         # Objets avec identité (ex: User.rename())
│   └── value-objects/    # Objets immuables
├── infrastructure/       # Implémentations concrètes (SQLite repos)
│   └── repositories/     # SQLiteParcelleRepository, etc.
├── application/          # Cas d'usage orchestrant domain + infra
├── repositories/         # Interfaces + base classes (BaseRepository)
├── services/             # Services métier (ParcelleService, AIFallbackService)
├── middleware/           # Auth, validation, error handling
└── validations/          # Zod schemas pour API/forms
```

**Règle critique** : Ne jamais court-circuiter les couches. Services → Repositories → DB. Les entités de `domain/` encapsulent la logique métier (ex: validation dans `rename()`).

## Commandes Essentielles

```bash
npm run dev              # Dev server (auto port-free check)
npm run checks           # Typecheck + lint + tests (pre-commit)
npm run test:unit        # Vitest unit tests
npm run test:e2e         # Playwright E2E tests
npm run db:migrate       # Appliquer migrations Drizzle
npm run db:seed          # Seed initial data
npm run analyze:deps     # Analyser dépendances (custom script)
npm run cleanup:files    # Nettoyer cache/temp
npm run security:check   # Pre-commit security checks
```

TypeScript en mode **strict** (`exactOptionalPropertyTypes: true`) — tout code doit passer `npm run checks` avant commit.

## Base de Données (SQLite + Drizzle)

- **Schema unique** : `lib/database/schema.ts` (consolidation post-refactoring, voir ADR-001)
- **Migrations** : Ajouter dans `drizzle/migrations/` via `npm run db:generate`
- **Emplacement** : `data/logistix.db` (fichier local, `.gitignore`)
- **Accès** : TOUJOURS via `lib/repositories/` (BaseRepository pattern)

**Pattern Repository** :
```typescript
// Exemple : lib/repositories/parcelle-repository.ts
export class ParcelleRepository extends BaseRepository<typeof parcelles> {
  async findById(id: string) { ... }  // Gestion d'erreurs intégrée
}
```

## Authentification & Middleware

- **Middleware racine** : `middleware.ts` (gestion JWT, cookies, route guards)
- **Routes protégées** : Définies dans `PROTECTED_ROUTES` Set (dashboard, produits, parcelles, etc.)
- **Helper middleware** : `lib/middleware/auth-middleware.ts` (`requireAuth`, `optionalAuth`)
- **Format cookies** : `logistix_session` (prod) / `logistix_session_dev` (dev) — voir `lib/config/edge-config.ts`

**Pattern API protégée** :
```typescript
// app/api/v1/parcelles/route.ts
import { requireAuth } from '@/lib/middleware/auth-middleware';

export async function GET(req: NextRequest) {
  const { user } = await requireAuth(req); // Throws AuthenticationError si invalide
  // ... business logic
}
```

## Validation Zod

- **Localisation** : `lib/validations/` (schémas réutilisables)
- **Usage** : Forms (`profileFormSchema`) + API endpoints validation
- **Pattern** : `schema.parse(data)` lance ZodError, géré par error middleware

## Gestion d'Erreurs Centralisée

- **Erreurs custom** : `lib/errors/custom-error.ts`
- **Error middleware** : `lib/middleware/error-handling.ts` (`apiHandler` wrapper)
- **Pattern** : Toutes les API routes utilisent `apiHandler()` pour logging + réponses cohérentes

## Frontend (Next.js App Router)

- **Server Components par défaut** : Pages dans `app/` sont RSC
- **Client Components** : Encapsuler dans `components/client-only.tsx` si nécessaire
- **Styling** : Tailwind CSS + Radix UI (`components/ui/` pour primitives shadcn/ui)
- **État global** : Zustand (`lib/store.ts`)

**Structure route groups** :
```
app/
├── (dashboard)/       # Protected routes group
│   ├── dashboard/
│   ├── parcelles/
│   └── produits/
├── api/v1/            # API endpoints versioned
└── login/             # Public auth pages
```

## Tests

- **Unit** : Vitest (`tests/unit/`) + React Testing Library
- **Integration** : Vitest (`tests/integration/`) avec DB de test
- **E2E** : Playwright (`tests/e2e/`) multi-browser
- **Coverage** : `npm run test:coverage` (seuils définis dans `vitest.config.ts`)

## Scripts Utilitaires (scripts/)

100+ scripts pour automatisation. Exemples clés :
- `dependency-analyzer.ts` : Analyse import graph
- `clean-dormant-files.ts` : Détecte fichiers non référencés
- `database-manager.ts` : CLI interactif DB
- `security-dashboard.js` : Rapport sécurité API

**Préférer les scripts** aux tâches manuelles répétitives.

## Conventions de Code

1. **Imports absolus** : `@/lib/...` (via `tsconfig.json` paths)
2. **Nommage** : camelCase (vars), PascalCase (classes/components), kebab-case (files)
3. **Types** : Export explicite des interfaces publiques
4. **Comments** : JSDoc pour fonctions publiques (paramètres, retours, erreurs)

## Intégrations Externes

- **OpenAI** : `lib/services/ai-fallback-service.ts` (fallback multi-modèles GPT-4 → 3.5)
- **Puppeteer** : `scripts/` (scraping Vinted automatisé)
- **Sentry** : Monitoring erreurs (config dans `lib/monitoring/`)

## Points Critiques à Retenir

❌ **Ne JAMAIS faire** :
- Modifier directement `data/logistix.db` (toujours via migrations)
- Court-circuiter les repositories pour accéder à la DB
- Committer secrets/clés API (utiliser `.env.local`)
- Ajouter des console.log dans le code final (utiliser `lib/utils/logging/`)

✅ **Toujours faire** :
- Lancer `npm run checks` avant commit
- Ajouter migration pour tout changement de schéma
- Valider inputs avec Zod dans les API routes
- Utiliser `requireAuth` pour endpoints protégés
- Respecter l'architecture en couches (domain → repos → services)

## Ressources Approfondies

- `docs/ARCHITECTURE.md` : Diagrammes détaillés
- `docs/ADR-001-service-layer-refactoring.md` : Décisions architecturales
- `docs/TESTING.md` : Stratégie de test complète
- `docs/DATABASE.md` : Schema détaillé + patterns

**Note** : Ce projet a subi un refactoring majeur (2025-09) consolidant DB/services. L'architecture actuelle dans `lib/` est la source de vérité.
