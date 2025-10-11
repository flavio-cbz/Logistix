# LogistiX — Analyse & Automatisation pour Vinted

[![CI](https://github.com/flavio-cbz/Logistix/actions/workflows/checks.yml/badge.svg)](https://github.com/flavio-cbz/Logistix/actions/workflows/checks.yml)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-ISC-blue)](LICENSE)

LogistiX est un outil d'analyse et d'automatisation orienté marketplace, conçu pour collecter, normaliser et analyser les annonces produits (Vinted) afin d'aider aux prises de décisions : scoring, alertes, automatisation des tâches et extraction d'insights marché.

## Architecture

**LogistiX** suit une **architecture en couches DDD-inspired** avec séparation stricte des responsabilités, clean architecture et use-cases isolés.

### 🏗️ Backend Refactoring (Phases 0-4 Complétées)

Le backend a été **entièrement refactorisé** en 2025-01/02 avec :

✅ **Phase 1-2** : Architecture use-case (Domain → Application → Infrastructure)  
✅ **Phase 3** : RBAC + Audit Logging + Tests (30+ tests auth + RBAC)  
✅ **Phase 4** : Observabilité & Performance (métriques p95/p99, 11 indexes SQL, HTTP metrics)

**Résultats** :

- 📈 **Performance** : Requêtes listing **94% plus rapides** (150ms → 8ms avec indexes)
- 🔒 **Sécurité** : RBAC avec roles (user/admin), rate limiting, audit logs structurés
- 📊 **Observabilité** : Métriques temps réel (use-cases + HTTP), API admin `/api/v1/metrics`
- 🧪 **Tests** : 50+ tests unitaires + intégration (use-cases, repos, middleware)

Voir **[docs/PHASE4_OBSERVABILITY_REPORT.md](docs/PHASE4_OBSERVABILITY_REPORT.md)** pour détails complets.

### Structure du Projet

```
lib/
├── domain/                # Entités métier (User, Parcelle, Produit)
│   ├── entities/          # Objets avec identité + logique métier
│   └── value-objects/     # Objets immuables
├── application/           # Use-cases (orchestration)
│   └── use-cases/         # CreateProduitUseCase, UpdateParcelleUseCase, etc.
├── infrastructure/        # Implémentations concrètes
│   └── repositories/      # SQLiteParcelleRepository, SQLiteProduitRepository
├── repositories/          # Interfaces + base classes (BaseRepository)
├── services/             # Services métier (ParcelleService, AIFallbackService)
├── middleware/           # Auth, rate-limit, error-handling, http-metrics
├── monitoring/           # Performance metrics collection (p50/p95/p99)
├── utils/logging/        # Audit mutations + structured logging
├── database/             # Schema Drizzle (consolidé)
├── validations/          # Zod schemas (API + forms)
└── errors/               # Hiérarchie d'erreurs custom
```

### Fonctionnalités

- **Application Next.js** (UI & API) pour visualiser les résultats et lancer des actions
- **Scripts d'ingestion** (scraping contrôlé via Puppeteer) et de traitement
- **Base de données** SQLite avec Drizzle ORM pour l'usage local
- **Architecture modulaire** avec injection de dépendances
- **Gestion d'erreurs standardisée** avec logging centralisé
- **Validation de données** avec Zod
- **Tests** unitaires et d'intégration avec Vitest

## Quickstart (local)

1. Cloner le dépôt

```bash
git clone https://github.com/flavio-cbz/Logistix.git
cd Logistix
```

2. Créer un fichier `.env.local` (exemple)

```
# Variables d'environnement sensibles
NEXT_PUBLIC_VERCEL_ENV=development
# Ajouter les clés API nécessaires (OpenAI, Vinted token, etc.)
```

3. Installer les dépendances

```bash
npm install
```

4. Développer

```bash
npm run dev
```

L'app sera disponible sur <http://localhost:3000>

## Scripts utiles

- `npm run dev` – serveur dev Next.js
- `npm run build` – build production
- `npm run start` – start production
- `npm run typecheck` – TypeScript (noEmit)
- `npm run lint` – ESLint
- `npm run test:unit` – tests unitaires (Jest)
- `npm run test:e2e` – tests end-to-end (définir la commande)
- `npm run checks` – typecheck + lint + tests (utilisé dans CI)

## Architecture & dossiers clés

- `app/` – pages/Route server-components (Next.js app dir)
- `components/` – composants réutilisables
- `lib/` – services, hooks, utilitaires
- `scripts/` – outils d'ingestion, maintenance
- `drizzle/` – migrations Drizzle

## Contribuer

1. Ouvrez une issue décrivant votre changement.
2. Créez une branche `feat/` ou `fix/`.
3. Respectez `npm run checks` avant de pousser.

## CI

Le dépôt contient un workflow GitHub Actions minimal qui exécute `npm ci` puis `npm run checks` sur les PRs.

## Documentation Technique

La documentation complète est disponible dans le dossier `docs/` :

### 📚 Guides Principaux

- **[Architecture](docs/ARCHITECTURE.md)** - Vue d'ensemble de l'architecture technique, patterns utilisés et structure du code
- **[Guide de Développement](docs/DEVELOPMENT_GUIDE.md)** - Configuration de l'environnement, conventions de code, tests et debugging
- **[Guide de Maintenance](docs/MAINTENANCE_GUIDE.md)** - Procédures de maintenance, surveillance du système et dépannage
- **[Guide de Déploiement](docs/DEPLOYMENT_GUIDE.md)** - Instructions de déploiement pour tous les environnements

### 📋 Documentation Existante

- **[Documentation Complète du Projet](docs/COMPLETE-PROJECT-DOCUMENTATION.md)** - Vue d'ensemble détaillée
- **[Rapport Phase 4 - Observabilité](docs/PHASE4_OBSERVABILITY_REPORT.md)** - Métriques et monitoring
- **[Guide de Tests](docs/TESTING.md)** - Stratégies et procédures de test
- **[Guide de Contribution](docs/CONTRIBUTING.md)** - Comment contribuer au projet

### 🔧 Spécifications Techniques

La refactorisation complète de la codebase est documentée dans `.kiro/specs/codebase-cleanup-refactoring/` avec :

- **Requirements** - Exigences détaillées pour l'amélioration de la qualité du code
- **Design** - Architecture cible et patterns de conception
- **Tasks** - Plan d'implémentation par phases

---

Pour toute question technique, consultez d'abord la documentation appropriée ou ouvrez une issue.
